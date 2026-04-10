import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FriendshipDoc } from '../database/schemas/friendship.schema';
import { FriendRequestDoc } from '../database/schemas/friend-request.schema';
import { ProfileDoc } from '../database/schemas/profile.schema';
import { OnlineTrackerService } from './online-tracker.service';
import { RoomService } from './room.service';
import type { FriendInfo, FriendRequest, FriendSearchResult } from '@doodledraw/shared';

@Injectable()
export class FriendService {
  private readonly logger = new Logger(FriendService.name);

  constructor(
    @InjectModel(FriendshipDoc.name) private readonly friendshipModel: Model<FriendshipDoc>,
    @InjectModel(FriendRequestDoc.name) private readonly friendRequestModel: Model<FriendRequestDoc>,
    @InjectModel(ProfileDoc.name) private readonly profileModel: Model<ProfileDoc>,
    private readonly onlineTracker: OnlineTrackerService,
    private readonly roomService: RoomService,
  ) {}

  private normalizePair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  private toFriendInfo(profile: ProfileDoc): FriendInfo {
    const roomId = this.roomService.persistentPlayerRoomMap.get(profile.persistentId) ?? null;
    return {
      persistentId: profile.persistentId,
      username: profile.username ?? '',
      nickname: profile.nickname,
      avatar: profile.avatar,
      isOnline: this.onlineTracker.isOnline(profile.persistentId),
      currentRoomId: roomId,
    };
  }

  async getFriends(persistentId: string): Promise<FriendInfo[]> {
    const friendships = await this.friendshipModel.find({
      $or: [{ userA: persistentId }, { userB: persistentId }],
    }).lean();

    const friendIds = friendships.map(f =>
      f.userA === persistentId ? f.userB : f.userA,
    );

    if (friendIds.length === 0) return [];

    // Skip soft-deleted accounts so they don't appear in the friends list.
    const profiles = await this.profileModel.find({
      persistentId: { $in: friendIds },
      deletedAt: null,
    }).lean();

    return profiles.map(p => this.toFriendInfo(p as ProfileDoc));
  }

  async getFriendPersistentIds(persistentId: string): Promise<string[]> {
    const friendships = await this.friendshipModel.find({
      $or: [{ userA: persistentId }, { userB: persistentId }],
    }).lean();

    const friendIds = friendships.map(f =>
      f.userA === persistentId ? f.userB : f.userA,
    );

    if (friendIds.length === 0) return [];

    // Filter out soft-deleted friends so downstream features (invites, online
    // counts, etc.) don't target accounts that an admin has marked deleted.
    const activeProfiles = await this.profileModel
      .find({ persistentId: { $in: friendIds }, deletedAt: null })
      .select({ persistentId: 1 })
      .lean();

    return activeProfiles.map(p => p.persistentId);
  }

  async areFriends(a: string, b: string): Promise<boolean> {
    const [userA, userB] = this.normalizePair(a, b);
    const exists = await this.friendshipModel.exists({ userA, userB });
    return !!exists;
  }

  async searchUsers(query: string, requesterPersistentId: string): Promise<FriendSearchResult[]> {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const profiles = await this.profileModel.find({
      username: { $regex: new RegExp(`^${escaped}`, 'i') },
      persistentId: { $ne: requesterPersistentId },
      deletedAt: null,
    }).limit(10).lean();

    const results: FriendSearchResult[] = [];

    for (const profile of profiles) {
      const isFriend = await this.areFriends(requesterPersistentId, profile.persistentId);
      const hasPendingRequest = !!(await this.friendRequestModel.exists({
        $or: [
          { fromPersistentId: requesterPersistentId, toPersistentId: profile.persistentId, status: 'pending' },
          { fromPersistentId: profile.persistentId, toPersistentId: requesterPersistentId, status: 'pending' },
        ],
      }));

      results.push({
        persistentId: profile.persistentId,
        username: profile.username ?? '',
        nickname: profile.nickname,
        avatar: profile.avatar,
        isFriend,
        hasPendingRequest,
      });
    }

    return results;
  }

  async sendFriendRequest(
    fromPersistentId: string,
    toPersistentId: string,
  ): Promise<{ request: FriendRequest; autoAccepted: boolean }> {
    if (fromPersistentId === toPersistentId) {
      throw new Error('Cannot send a friend request to yourself.');
    }

    // Verify both users are registered and not soft-deleted.
    const [fromProfile, toProfile] = await Promise.all([
      this.profileModel.findOne({ persistentId: fromPersistentId }).lean(),
      this.profileModel.findOne({ persistentId: toPersistentId }).lean(),
    ]);

    if (!fromProfile?.username) throw new Error('You must be registered to send friend requests.');
    if (fromProfile.deletedAt) throw new Error('Your account is not available.');
    if (!toProfile) throw new Error('User not found.');
    if (!toProfile.username) throw new Error('This player is not registered and cannot receive friend requests.');
    if (toProfile.deletedAt) throw new Error('User not found.');

    // Check if already friends.
    if (await this.areFriends(fromPersistentId, toPersistentId)) {
      throw new Error('You are already friends.');
    }

    // Check for reverse pending request → auto-accept.
    const reverseRequest = await this.friendRequestModel.findOne({
      fromPersistentId: toPersistentId,
      toPersistentId: fromPersistentId,
      status: 'pending',
    });

    if (reverseRequest) {
      reverseRequest.status = 'accepted';
      await reverseRequest.save();

      const [userA, userB] = this.normalizePair(fromPersistentId, toPersistentId);
      await this.friendshipModel.create({ userA, userB });

      const request: FriendRequest = {
        id: reverseRequest._id.toString(),
        from: this.toFriendInfo(toProfile as ProfileDoc),
        to: this.toFriendInfo(fromProfile as ProfileDoc),
        status: 'accepted',
        createdAt: (reverseRequest as any).createdAt?.getTime?.() ?? Date.now(),
      };

      return { request, autoAccepted: true };
    }

    // Create new request.
    const doc = await this.friendRequestModel.create({
      fromPersistentId,
      toPersistentId,
      status: 'pending',
    });

    const request: FriendRequest = {
      id: doc._id.toString(),
      from: this.toFriendInfo(fromProfile as ProfileDoc),
      to: this.toFriendInfo(toProfile as ProfileDoc),
      status: 'pending',
      createdAt: Date.now(),
    };

    return { request, autoAccepted: false };
  }

  async respondToRequest(
    requestId: string,
    responderPersistentId: string,
    action: 'accept' | 'reject',
  ): Promise<{ fromPersistentId: string; toPersistentId: string }> {
    const doc = await this.friendRequestModel.findById(requestId);
    if (!doc) throw new Error('Friend request not found.');
    if (doc.status !== 'pending') throw new Error('This request has already been handled.');
    if (doc.toPersistentId !== responderPersistentId) {
      throw new Error('You cannot respond to this request.');
    }

    doc.status = action === 'accept' ? 'accepted' : 'rejected';
    await doc.save();

    if (action === 'accept') {
      const [userA, userB] = this.normalizePair(doc.fromPersistentId, doc.toPersistentId);
      await this.friendshipModel.create({ userA, userB });
    }

    return { fromPersistentId: doc.fromPersistentId, toPersistentId: doc.toPersistentId };
  }

  async removeFriend(persistentId: string, friendPersistentId: string): Promise<void> {
    const [userA, userB] = this.normalizePair(persistentId, friendPersistentId);
    await this.friendshipModel.deleteOne({ userA, userB });
  }

  async getPendingRequests(persistentId: string): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
    const [incomingDocs, outgoingDocs] = await Promise.all([
      this.friendRequestModel.find({ toPersistentId: persistentId, status: 'pending' }).lean(),
      this.friendRequestModel.find({ fromPersistentId: persistentId, status: 'pending' }).lean(),
    ]);

    // Collect all unique persistent IDs to load profiles in one query.
    const allIds = new Set<string>();
    for (const d of [...incomingDocs, ...outgoingDocs]) {
      allIds.add(d.fromPersistentId);
      allIds.add(d.toPersistentId);
    }

    const profiles = await this.profileModel.find({
      persistentId: { $in: [...allIds] },
      deletedAt: null,
    }).lean();

    const profileMap = new Map(profiles.map(p => [p.persistentId, p]));

    const hydrate = (doc: any): FriendRequest | null => {
      const fromProfile = profileMap.get(doc.fromPersistentId);
      const toProfile = profileMap.get(doc.toPersistentId);
      // Drop requests where either side has been soft-deleted.
      if (!fromProfile || !toProfile) return null;
      return {
        id: doc._id.toString(),
        from: this.toFriendInfo(fromProfile as ProfileDoc),
        to: this.toFriendInfo(toProfile as ProfileDoc),
        status: doc.status,
        createdAt: doc.createdAt?.getTime?.() ?? Date.now(),
      };
    };

    return {
      incoming: incomingDocs.map(hydrate).filter((r): r is FriendRequest => r !== null),
      outgoing: outgoingDocs.map(hydrate).filter((r): r is FriendRequest => r !== null),
    };
  }
}
