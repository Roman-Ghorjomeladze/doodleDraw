import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProfileDoc, ProfileDocument } from '../database/schemas/profile.schema';
import type { Room, GameScore, Team, PlayerProfile, LeaderboardEntry } from '@doodledraw/shared';
import { calculateGameElo, DEFAULT_RATING } from './utils/elo';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectModel(ProfileDoc.name)
    private readonly profileModel: Model<ProfileDocument>,
  ) {}

  /**
   * Update profiles for all non-spectator players after a game ends.
   * Fire-and-forget — errors are logged, never thrown.
   */
  async updateProfilesAfterGame(
    room: Room,
    finalScores: GameScore[],
    winner: string | Team,
  ): Promise<void> {
    try {
      const currentWeekStart = this.getWeekStart();

      // Collect ALL non-spectator players for Elo calculation (including bots).
      // Bots get a fixed Elo so human players can gain/lose rating against them.
      const BOT_ELO = 1200;
      const eloPlayers: { persistentId: string; eloRating: number; isWinner: boolean; isBot?: boolean; socketId: string }[] = [];

      for (const [_socketId, player] of room.players) {
        if (player.isSpectator) continue;

        const scoreEntry = finalScores.find((s) => s.playerId === _socketId);
        if (!scoreEntry) continue;

        const isWinner =
          room.mode === 'classic'
            ? winner === _socketId
            : winner === player.team;

        let currentElo: number;
        if (player.isBot) {
          currentElo = BOT_ELO;
        } else {
          const existingProfile = await this.profileModel.findOne({ persistentId: player.persistentId }).exec();
          currentElo = existingProfile?.eloRating ?? DEFAULT_RATING;
        }

        eloPlayers.push({
          persistentId: player.persistentId,
          eloRating: currentElo,
          isWinner,
          isBot: player.isBot ?? false,
          socketId: _socketId,
        });
      }

      // Calculate Elo changes for all players.
      const eloResults = calculateGameElo(eloPlayers);
      this.logger.log(`Elo results: ${JSON.stringify(Object.fromEntries(eloResults))}`);

      // Update human players only — bots are not persisted.
      for (const [_socketId, player] of room.players) {
        if (player.isSpectator || player.isBot) continue;

        const scoreEntry = finalScores.find((s) => s.playerId === _socketId);
        if (!scoreEntry) continue;

        const isWinner =
          room.mode === 'classic'
            ? winner === _socketId
            : winner === player.team;

        const wordsDrawn = room.playerWordHistory.get(_socketId) ?? [];

        // Elo change only for human players.
        const newElo = player.isBot ? undefined : eloResults.get(player.persistentId);

        await this.updateProfile(
          player.persistentId,
          player.nickname,
          player.avatar,
          scoreEntry.score,
          scoreEntry.correctGuesses,
          wordsDrawn.length,
          isWinner,
          wordsDrawn,
          currentWeekStart,
          newElo,
        );
      }

      this.logger.log(`Updated ${finalScores.length} profiles for room ${room.id}`);
    } catch (err: any) {
      this.logger.error(`Failed to update profiles: ${err.message}`);
    }
  }

  private async updateProfile(
    persistentId: string,
    nickname: string,
    avatar: string,
    score: number,
    correctGuesses: number,
    drawingCount: number,
    isWinner: boolean,
    wordsDrawn: string[],
    currentWeekStart: string,
    newElo?: number,
  ): Promise<void> {
    // Find existing profile.
    let profile = await this.profileModel.findOne({ persistentId }).exec();

    if (!profile) {
      profile = new this.profileModel({
        persistentId,
        nickname,
        avatar,
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        eloRating: DEFAULT_RATING,
        correctGuesses: 0,
        totalDrawings: 0,
        weeklyScore: 0,
        weeklyGames: 0,
        lastWeekReset: currentWeekStart,
        wordFrequency: {},
      });
    }

    // Reset weekly stats if we're in a new week.
    if (profile.lastWeekReset !== currentWeekStart) {
      profile.weeklyScore = 0;
      profile.weeklyGames = 0;
      profile.lastWeekReset = currentWeekStart;
    }

    // Update stats.
    profile.nickname = nickname;
    profile.avatar = avatar;
    profile.totalGames += 1;
    profile.totalScore += score;
    profile.correctGuesses += correctGuesses;
    profile.totalDrawings += drawingCount;
    profile.weeklyScore += score;
    profile.weeklyGames += 1;

    if (isWinner) {
      profile.totalWins += 1;
    }

    // Update Elo rating if provided (human players only).
    if (newElo !== undefined) {
      profile.eloRating = newElo;
    }

    // Update word frequency.
    const freq = profile.wordFrequency ?? {};
    for (const word of wordsDrawn) {
      freq[word] = (freq[word] || 0) + 1;
    }
    profile.wordFrequency = freq;

    // Compute favorite word.
    let maxCount = 0;
    let favWord: string | null = null;
    for (const [word, count] of Object.entries(freq)) {
      if (count > maxCount) {
        maxCount = count;
        favWord = word;
      }
    }
    profile.favoriteWord = favWord;

    profile.markModified('wordFrequency');
    await profile.save();
  }

  async getProfile(persistentId: string): Promise<PlayerProfile | null> {
    const doc = await this.profileModel.findOne({ persistentId }).exec();
    if (!doc) return null;

    return {
      persistentId: doc.persistentId,
      nickname: doc.nickname,
      avatar: doc.avatar,
      totalGames: doc.totalGames,
      totalWins: doc.totalWins,
      totalScore: doc.totalScore,
      eloRating: doc.eloRating ?? DEFAULT_RATING,
      correctGuesses: doc.correctGuesses,
      totalDrawings: doc.totalDrawings,
      favoriteWord: doc.favoriteWord,
      country: doc.country,
      birthYear: doc.birthYear,
      isRegistered: !!doc.username,
    };
  }

  async getLeaderboard(
    type: 'allTime' | 'weekly' | 'country' | 'age',
    options?: { country?: string; ageGroup?: string; offset?: number },
    limit = 50,
  ): Promise<{ players: LeaderboardEntry[]; total: number }> {
    const currentWeekStart = this.getWeekStart();
    const offset = Math.max(0, options?.offset ?? 0);

    let query: any;
    let sortField: string;

    if (type === 'weekly') {
      query = { lastWeekReset: currentWeekStart, weeklyGames: { $gt: 0 } };
      sortField = 'weeklyScore';
    } else if (type === 'country') {
      if (!options?.country) return { players: [], total: 0 };
      query = { totalGames: { $gt: 0 }, country: options.country };
      sortField = 'eloRating';
    } else if (type === 'age') {
      const birthYear = parseInt(options?.ageGroup || '', 10);
      if (!birthYear || isNaN(birthYear)) return { players: [], total: 0 };
      query = { totalGames: { $gt: 0 }, birthYear };
      sortField = 'eloRating';
    } else {
      query = { totalGames: { $gt: 0 } };
      sortField = 'eloRating';
    }

    // Exclude bot profiles from leaderboards.
    query.persistentId = { $not: /^bot-/ };
    // Only registered users (anonymous players don't belong on public rankings).
    query.username = { $exists: true, $ne: null };

    const [docs, total] = await Promise.all([
      this.profileModel
        .find(query)
        .sort({ [sortField]: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.profileModel.countDocuments(query).exec(),
    ]);

    const players = docs.map((doc, index) => ({
      rank: offset + index + 1,
      persistentId: doc.persistentId,
      nickname: doc.nickname,
      avatar: doc.avatar,
      totalScore: type === 'weekly' ? doc.weeklyScore : doc.totalScore,
      eloRating: doc.eloRating ?? DEFAULT_RATING,
      totalWins: doc.totalWins,
      totalGames: type === 'weekly' ? doc.weeklyGames : doc.totalGames,
      country: doc.country,
    }));

    return { players, total };
  }

  /** ISO date string of this week's Monday 00:00 UTC. */
  private getWeekStart(): string {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }
}
