import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ProfileDoc, ProfileDocument } from '../database/schemas/profile.schema';
import { AuthTokenDoc, AuthTokenDocument } from '../database/schemas/auth-token.schema';
import { COUNTRIES } from '@doodledraw/shared';
import type { AuthRegisterRequest, AuthLoginRequest, AuthResponse, AuthUser } from '@doodledraw/shared';

const TOKEN_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(ProfileDoc.name)
    private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(AuthTokenDoc.name)
    private readonly tokenModel: Model<AuthTokenDocument>,
  ) {}

  async register(data: AuthRegisterRequest): Promise<AuthResponse> {
    // Validate username format.
    const username = data.username?.toLowerCase().trim();
    if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
      throw new Error('Username must be 3-20 characters (letters, numbers, underscores)');
    }

    // Validate password.
    if (!data.password || data.password.length < 6 || data.password.length > 100) {
      throw new Error('Password must be 6-100 characters');
    }

    // Validate country (optional).
    const country = data.country && (COUNTRIES as readonly { code: string; name: string }[]).some((c) => c.code === data.country)
      ? data.country
      : undefined;

    // Validate birth year (optional).
    const currentYear = new Date().getFullYear();
    const birthYear = data.birthYear && data.birthYear >= 1930 && data.birthYear <= currentYear - 5
      ? data.birthYear
      : undefined;

    // Validate nickname.
    const nickname = data.nickname?.trim();
    if (!nickname || nickname.length < 1 || nickname.length > 20) {
      throw new Error('Nickname must be 1-20 characters');
    }

    // Check username uniqueness.
    const existing = await this.profileModel.findOne({ username }).exec();
    if (existing) {
      throw new Error('Username already taken');
    }

    // Hash password.
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Check if there's an anonymous profile to merge.
    const anonProfile = data.persistentId
      ? await this.profileModel.findOne({ persistentId: data.persistentId, username: { $exists: false } }).exec()
      : null;

    let profile: ProfileDocument;

    if (anonProfile) {
      // Upgrade anonymous profile to authenticated.
      anonProfile.username = username;
      anonProfile.passwordHash = passwordHash;
      anonProfile.nickname = nickname;
      anonProfile.avatar = data.avatar;
      if (country) anonProfile.country = country;
      if (birthYear) anonProfile.birthYear = birthYear;
      await anonProfile.save();
      profile = anonProfile;
    } else {
      // Create new profile.
      profile = await this.profileModel.create({
        persistentId: data.persistentId || crypto.randomUUID(),
        username,
        passwordHash,
        nickname,
        avatar: data.avatar,
        country,
        birthYear,
      });
    }

    // Issue token.
    const token = await this.issueToken(profile.persistentId);

    return {
      token,
      user: this.toAuthUser(profile),
    };
  }

  async login(data: AuthLoginRequest): Promise<AuthResponse> {
    const username = data.username?.toLowerCase().trim();
    if (!username) {
      throw new Error('Username is required');
    }

    if (!data.password) {
      throw new Error('Password is required');
    }

    const profile = await this.profileModel.findOne({ username }).exec();
    if (!profile || !profile.passwordHash) {
      throw new Error('Invalid username or password');
    }

    const valid = await bcrypt.compare(data.password, profile.passwordHash);
    if (!valid) {
      throw new Error('Invalid username or password');
    }

    // Merge anonymous profile stats if a persistentId was provided.
    if (data.persistentId && data.persistentId !== profile.persistentId) {
      await this.mergeAnonymousProfile(data.persistentId, profile.persistentId);
    }

    // Issue token.
    const token = await this.issueToken(profile.persistentId);

    return {
      token,
      user: this.toAuthUser(profile),
    };
  }

  async validateToken(token: string): Promise<string | null> {
    if (!token) return null;

    const doc = await this.tokenModel.findOne({ token }).exec();
    if (!doc) return null;

    if (doc.expiresAt < new Date()) {
      await doc.deleteOne();
      return null;
    }

    return doc.persistentId;
  }

  async getAuthUser(persistentId: string): Promise<AuthUser | null> {
    const profile = await this.profileModel.findOne({ persistentId }).exec();
    if (!profile || !profile.username) return null;
    return this.toAuthUser(profile);
  }

  async updateProfile(
    persistentId: string,
    data: { nickname?: string; avatar?: string; country?: string; birthYear?: number },
  ): Promise<AuthUser | null> {
    const profile = await this.profileModel.findOne({ persistentId }).exec();
    if (!profile || !profile.username) return null;

    if (data.nickname !== undefined) {
      const n = data.nickname.trim();
      if (n.length >= 1 && n.length <= 20) profile.nickname = n;
    }
    if (data.avatar !== undefined) profile.avatar = data.avatar;
    if (data.country !== undefined) {
      if ((COUNTRIES as readonly { code: string; name: string }[]).some((c) => c.code === data.country)) {
        profile.country = data.country;
      }
    }
    if (data.birthYear !== undefined) {
      const currentYear = new Date().getFullYear();
      if (data.birthYear >= 1930 && data.birthYear <= currentYear - 5) {
        profile.birthYear = data.birthYear;
      }
    }

    await profile.save();
    return this.toAuthUser(profile);
  }

  async logout(token: string): Promise<void> {
    await this.tokenModel.deleteOne({ token }).exec();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async issueToken(persistentId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.tokenModel.create({ token, persistentId, expiresAt });

    return token;
  }

  private async mergeAnonymousProfile(
    anonymousPersistentId: string,
    targetPersistentId: string,
  ): Promise<void> {
    try {
      const anonProfile = await this.profileModel
        .findOne({ persistentId: anonymousPersistentId, username: { $exists: false } })
        .exec();

      if (!anonProfile) return;

      const targetProfile = await this.profileModel
        .findOne({ persistentId: targetPersistentId })
        .exec();

      if (!targetProfile) return;

      // Merge stats.
      targetProfile.totalGames += anonProfile.totalGames;
      targetProfile.totalWins += anonProfile.totalWins;
      targetProfile.totalScore += anonProfile.totalScore;
      targetProfile.correctGuesses += anonProfile.correctGuesses;
      targetProfile.totalDrawings += anonProfile.totalDrawings;
      targetProfile.weeklyScore += anonProfile.weeklyScore;
      targetProfile.weeklyGames += anonProfile.weeklyGames;

      // Merge word frequency.
      const freq = targetProfile.wordFrequency ?? {};
      for (const [word, count] of Object.entries(anonProfile.wordFrequency ?? {})) {
        freq[word] = (freq[word] || 0) + count;
      }
      targetProfile.wordFrequency = freq;
      targetProfile.markModified('wordFrequency');

      // Recompute favorite word.
      let maxCount = 0;
      let favWord: string | null = null;
      for (const [word, count] of Object.entries(freq)) {
        if (count > maxCount) {
          maxCount = count;
          favWord = word;
        }
      }
      targetProfile.favoriteWord = favWord;

      // Track merged IDs.
      if (!targetProfile.linkedPersistentIds.includes(anonymousPersistentId)) {
        targetProfile.linkedPersistentIds.push(anonymousPersistentId);
      }

      await targetProfile.save();

      // Delete anonymous profile.
      await anonProfile.deleteOne();

      this.logger.log(`Merged anonymous profile ${anonymousPersistentId} into ${targetPersistentId}`);
    } catch (err: any) {
      this.logger.error(`Failed to merge profiles: ${err.message}`);
    }
  }

  private toAuthUser(profile: ProfileDocument): AuthUser {
    return {
      username: profile.username!,
      nickname: profile.nickname,
      avatar: profile.avatar,
      country: profile.country || '',
      birthYear: profile.birthYear || 0,
      persistentId: profile.persistentId,
    };
  }
}
