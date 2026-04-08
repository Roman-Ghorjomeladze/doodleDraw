import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FriendService } from '../friend.service';
import { OnlineTrackerService } from '../online-tracker.service';
import { RoomService } from '../room.service';
import { FriendshipDoc } from '../../database/schemas/friendship.schema';
import { FriendRequestDoc } from '../../database/schemas/friend-request.schema';
import { ProfileDoc } from '../../database/schemas/profile.schema';

describe('FriendService', () => {
  let service: FriendService;

  const mockFriendshipModel: Record<string, jest.Mock> = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockFriendRequestModel: Record<string, jest.Mock> = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockProfileModel: Record<string, jest.Mock> = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockOnlineTracker = {
    isOnline: jest.fn().mockReturnValue(false),
    getSocketIds: jest.fn().mockReturnValue(new Set()),
  };

  const mockRoomService = {
    persistentPlayerRoomMap: new Map<string, string>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendService,
        { provide: getModelToken(FriendshipDoc.name), useValue: mockFriendshipModel },
        { provide: getModelToken(FriendRequestDoc.name), useValue: mockFriendRequestModel },
        { provide: getModelToken(ProfileDoc.name), useValue: mockProfileModel },
        { provide: OnlineTrackerService, useValue: mockOnlineTracker },
        { provide: RoomService, useValue: mockRoomService },
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
  });

  // -----------------------------------------------------------------------
  // getFriends
  // -----------------------------------------------------------------------

  describe('getFriends', () => {
    it('should return an empty array when the user has no friendships', async () => {
      mockFriendshipModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await service.getFriends('user-1');
      expect(result).toEqual([]);
    });

    it('should return enriched friend info for each friendship', async () => {
      mockFriendshipModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userA: 'user-1', userB: 'user-2' },
        ]),
      });
      mockProfileModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { persistentId: 'user-2', username: 'bob', nickname: 'Bob', avatar: 'av2' },
        ]),
      });
      mockOnlineTracker.isOnline.mockReturnValue(true);

      const result = await service.getFriends('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].persistentId).toBe('user-2');
      expect(result[0].isOnline).toBe(true);
    });

    it('should extract the correct friend ID regardless of position in the pair', async () => {
      mockFriendshipModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userA: 'alice', userB: 'user-1' },
        ]),
      });
      mockProfileModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { persistentId: 'alice', username: 'alice', nickname: 'Alice', avatar: 'av1' },
        ]),
      });

      const result = await service.getFriends('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].persistentId).toBe('alice');
    });
  });

  // -----------------------------------------------------------------------
  // getFriendPersistentIds
  // -----------------------------------------------------------------------

  describe('getFriendPersistentIds', () => {
    it('should return an array of friend persistent IDs', async () => {
      mockFriendshipModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userA: 'user-1', userB: 'user-2' },
          { userA: 'user-1', userB: 'user-3' },
        ]),
      });

      const ids = await service.getFriendPersistentIds('user-1');
      expect(ids).toEqual(['user-2', 'user-3']);
    });
  });

  // -----------------------------------------------------------------------
  // areFriends
  // -----------------------------------------------------------------------

  describe('areFriends', () => {
    it('should return true when a friendship exists', async () => {
      mockFriendshipModel.exists.mockResolvedValue({ _id: 'some-id' });

      const result = await service.areFriends('user-1', 'user-2');
      expect(result).toBe(true);
      // Should normalize pair: user-1 < user-2 so userA = user-1
      expect(mockFriendshipModel.exists).toHaveBeenCalledWith({
        userA: 'user-1',
        userB: 'user-2',
      });
    });

    it('should normalize the pair so the smaller ID is userA', async () => {
      mockFriendshipModel.exists.mockResolvedValue(null);

      await service.areFriends('zzz', 'aaa');
      expect(mockFriendshipModel.exists).toHaveBeenCalledWith({
        userA: 'aaa',
        userB: 'zzz',
      });
    });

    it('should return false when no friendship exists', async () => {
      mockFriendshipModel.exists.mockResolvedValue(null);

      const result = await service.areFriends('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // searchUsers
  // -----------------------------------------------------------------------

  describe('searchUsers', () => {
    it('should search profiles and enrich with friendship/pending status', async () => {
      mockProfileModel.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { persistentId: 'user-2', username: 'bob', nickname: 'Bob', avatar: 'av2' },
          ]),
        }),
      });
      mockFriendshipModel.exists.mockResolvedValue(null);
      mockFriendRequestModel.exists.mockResolvedValue(null);

      const result = await service.searchUsers('bob', 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0].isFriend).toBe(false);
      expect(result[0].hasPendingRequest).toBe(false);
    });

    it('should mark isFriend true when users are friends', async () => {
      mockProfileModel.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { persistentId: 'user-2', username: 'bob', nickname: 'Bob', avatar: 'av2' },
          ]),
        }),
      });
      mockFriendshipModel.exists.mockResolvedValue({ _id: 'id' });
      mockFriendRequestModel.exists.mockResolvedValue(null);

      const result = await service.searchUsers('bob', 'user-1');
      expect(result[0].isFriend).toBe(true);
    });

    it('should mark hasPendingRequest true when a pending request exists', async () => {
      mockProfileModel.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { persistentId: 'user-2', username: 'bob', nickname: 'Bob', avatar: 'av2' },
          ]),
        }),
      });
      mockFriendshipModel.exists.mockResolvedValue(null);
      mockFriendRequestModel.exists.mockResolvedValue({ _id: 'req-id' });

      const result = await service.searchUsers('bob', 'user-1');
      expect(result[0].hasPendingRequest).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // sendFriendRequest
  // -----------------------------------------------------------------------

  describe('sendFriendRequest', () => {
    it('should throw when sending a request to yourself', async () => {
      await expect(service.sendFriendRequest('user-1', 'user-1')).rejects.toThrow(
        'Cannot send a friend request to yourself.',
      );
    });

    it('should throw when the sender is not registered', async () => {
      mockProfileModel.findOne
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ persistentId: 'user-2', username: 'bob' }) });

      await expect(service.sendFriendRequest('user-1', 'user-2')).rejects.toThrow(
        'You must be registered to send friend requests.',
      );
    });

    it('should throw when the target user is not found', async () => {
      mockProfileModel.findOne
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ persistentId: 'user-1', username: 'alice' }) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) });

      await expect(service.sendFriendRequest('user-1', 'user-2')).rejects.toThrow(
        'User not found.',
      );
    });

    it('should throw a helpful error when target is an anonymous (unregistered) profile', async () => {
      mockProfileModel.findOne
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ persistentId: 'user-1', username: 'alice' }) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ persistentId: 'anon-1' /* no username */ }) });

      await expect(service.sendFriendRequest('user-1', 'anon-1')).rejects.toThrow(
        'This player is not registered and cannot receive friend requests.',
      );
    });

    it('should throw when users are already friends', async () => {
      mockProfileModel.findOne
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ persistentId: 'user-1', username: 'alice' }) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ persistentId: 'user-2', username: 'bob' }) });
      mockFriendshipModel.exists.mockResolvedValue({ _id: 'id' });

      await expect(service.sendFriendRequest('user-1', 'user-2')).rejects.toThrow(
        'You are already friends.',
      );
    });

    it('should auto-accept when a reverse pending request exists', async () => {
      const fromProfile = { persistentId: 'user-1', username: 'alice', nickname: 'Alice', avatar: 'av1' };
      const toProfile = { persistentId: 'user-2', username: 'bob', nickname: 'Bob', avatar: 'av2' };

      mockProfileModel.findOne
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(fromProfile) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(toProfile) });
      mockFriendshipModel.exists.mockResolvedValue(null);

      const reverseDoc = {
        _id: { toString: () => 'req-123' },
        fromPersistentId: 'user-2',
        toPersistentId: 'user-1',
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
        createdAt: new Date(),
      };
      mockFriendRequestModel.findOne.mockResolvedValue(reverseDoc);
      mockFriendshipModel.create.mockResolvedValue({});

      const result = await service.sendFriendRequest('user-1', 'user-2');
      expect(result.autoAccepted).toBe(true);
      expect(reverseDoc.status).toBe('accepted');
      expect(reverseDoc.save).toHaveBeenCalled();
      expect(mockFriendshipModel.create).toHaveBeenCalledWith({
        userA: 'user-1',
        userB: 'user-2',
      });
    });

    it('should create a new pending request when no reverse request exists', async () => {
      const fromProfile = { persistentId: 'user-1', username: 'alice', nickname: 'Alice', avatar: 'av1' };
      const toProfile = { persistentId: 'user-2', username: 'bob', nickname: 'Bob', avatar: 'av2' };

      mockProfileModel.findOne
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(fromProfile) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(toProfile) });
      mockFriendshipModel.exists.mockResolvedValue(null);
      mockFriendRequestModel.findOne.mockResolvedValue(null);

      const createdDoc = {
        _id: { toString: () => 'req-456' },
        fromPersistentId: 'user-1',
        toPersistentId: 'user-2',
        status: 'pending',
      };
      mockFriendRequestModel.create.mockResolvedValue(createdDoc);

      const result = await service.sendFriendRequest('user-1', 'user-2');
      expect(result.autoAccepted).toBe(false);
      expect(result.request.status).toBe('pending');
      expect(result.request.id).toBe('req-456');
    });
  });

  // -----------------------------------------------------------------------
  // respondToRequest
  // -----------------------------------------------------------------------

  describe('respondToRequest', () => {
    it('should throw when the request is not found', async () => {
      mockFriendRequestModel.findById.mockResolvedValue(null);

      await expect(service.respondToRequest('req-1', 'user-2', 'accept')).rejects.toThrow(
        'Friend request not found.',
      );
    });

    it('should throw when the request has already been handled', async () => {
      mockFriendRequestModel.findById.mockResolvedValue({
        status: 'accepted',
        toPersistentId: 'user-2',
      });

      await expect(service.respondToRequest('req-1', 'user-2', 'accept')).rejects.toThrow(
        'This request has already been handled.',
      );
    });

    it('should throw when the responder is not the target user', async () => {
      mockFriendRequestModel.findById.mockResolvedValue({
        status: 'pending',
        toPersistentId: 'user-2',
      });

      await expect(service.respondToRequest('req-1', 'user-3', 'accept')).rejects.toThrow(
        'You cannot respond to this request.',
      );
    });

    it('should accept the request and create a friendship', async () => {
      const doc = {
        fromPersistentId: 'user-1',
        toPersistentId: 'user-2',
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockFriendRequestModel.findById.mockResolvedValue(doc);
      mockFriendshipModel.create.mockResolvedValue({});

      const result = await service.respondToRequest('req-1', 'user-2', 'accept');
      expect(doc.status).toBe('accepted');
      expect(doc.save).toHaveBeenCalled();
      expect(mockFriendshipModel.create).toHaveBeenCalledWith({
        userA: 'user-1',
        userB: 'user-2',
      });
      expect(result).toEqual({
        fromPersistentId: 'user-1',
        toPersistentId: 'user-2',
      });
    });

    it('should reject the request without creating a friendship', async () => {
      const doc = {
        fromPersistentId: 'user-1',
        toPersistentId: 'user-2',
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockFriendRequestModel.findById.mockResolvedValue(doc);

      const result = await service.respondToRequest('req-1', 'user-2', 'reject');
      expect(doc.status).toBe('rejected');
      expect(mockFriendshipModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        fromPersistentId: 'user-1',
        toPersistentId: 'user-2',
      });
    });
  });

  // -----------------------------------------------------------------------
  // removeFriend
  // -----------------------------------------------------------------------

  describe('removeFriend', () => {
    it('should delete the friendship with the normalized pair', async () => {
      mockFriendshipModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.removeFriend('user-2', 'user-1');
      expect(mockFriendshipModel.deleteOne).toHaveBeenCalledWith({
        userA: 'user-1',
        userB: 'user-2',
      });
    });
  });

  // -----------------------------------------------------------------------
  // getPendingRequests
  // -----------------------------------------------------------------------

  describe('getPendingRequests', () => {
    it('should return hydrated incoming and outgoing requests', async () => {
      const incomingDoc = {
        _id: { toString: () => 'req-in-1' },
        fromPersistentId: 'user-2',
        toPersistentId: 'user-1',
        status: 'pending',
        createdAt: new Date(1000),
      };
      const outgoingDoc = {
        _id: { toString: () => 'req-out-1' },
        fromPersistentId: 'user-1',
        toPersistentId: 'user-3',
        status: 'pending',
        createdAt: new Date(2000),
      };

      mockFriendRequestModel.find
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([incomingDoc]) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([outgoingDoc]) });

      mockProfileModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { persistentId: 'user-1', username: 'alice', nickname: 'Alice', avatar: 'av1' },
          { persistentId: 'user-2', username: 'bob', nickname: 'Bob', avatar: 'av2' },
          { persistentId: 'user-3', username: 'charlie', nickname: 'Charlie', avatar: 'av3' },
        ]),
      });

      const result = await service.getPendingRequests('user-1');
      expect(result.incoming).toHaveLength(1);
      expect(result.incoming[0].id).toBe('req-in-1');
      expect(result.incoming[0].from.persistentId).toBe('user-2');
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].id).toBe('req-out-1');
      expect(result.outgoing[0].to.persistentId).toBe('user-3');
    });

    it('should filter out requests with missing profiles', async () => {
      const incomingDoc = {
        _id: { toString: () => 'req-1' },
        fromPersistentId: 'deleted-user',
        toPersistentId: 'user-1',
        status: 'pending',
        createdAt: new Date(),
      };

      mockFriendRequestModel.find
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([incomingDoc]) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });

      mockProfileModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { persistentId: 'user-1', username: 'alice', nickname: 'Alice', avatar: 'av1' },
          // deleted-user profile is missing
        ]),
      });

      const result = await service.getPendingRequests('user-1');
      expect(result.incoming).toHaveLength(0);
    });
  });
});
