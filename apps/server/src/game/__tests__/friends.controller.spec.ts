import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { FriendsController } from '../friends.controller';
import { FriendService } from '../friend.service';
import { OnlineTrackerService } from '../online-tracker.service';
import { GameGateway } from '../game.gateway';
import { UserAuthGuard } from '../../auth/auth.guard';

describe('FriendsController', () => {
  let app: INestApplication;

  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

  const mockFriendService = {
    searchUsers: jest.fn(),
    getFriends: jest.fn(),
    getPendingRequests: jest.fn(),
    sendFriendRequest: jest.fn(),
    respondToRequest: jest.fn(),
    removeFriend: jest.fn(),
  };

  const mockOnlineTracker = {
    getSocketIds: jest.fn().mockReturnValue(new Set(['sock-1'])),
  };

  const mockGateway = {
    server: { to: mockTo },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [
        { provide: FriendService, useValue: mockFriendService },
        { provide: OnlineTrackerService, useValue: mockOnlineTracker },
        { provide: GameGateway, useValue: mockGateway },
      ],
    })
      .overrideGuard(UserAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.persistentId = 'test-user-1';
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTo.mockReturnValue({ emit: mockEmit });
    mockOnlineTracker.getSocketIds.mockReturnValue(new Set(['sock-1']));
  });

  // -----------------------------------------------------------------------
  // GET /api/friends/search
  // -----------------------------------------------------------------------

  describe('GET /api/friends/search', () => {
    it('should return search results', async () => {
      const users = [
        { persistentId: 'u2', username: 'bob', nickname: 'Bob', avatar: 'av', isFriend: false, hasPendingRequest: false },
      ];
      mockFriendService.searchUsers.mockResolvedValue(users);

      const res = await request(app.getHttpServer())
        .get('/api/friends/search?q=bob')
        .expect(HttpStatus.OK);

      expect(res.body.users).toEqual(users);
      expect(mockFriendService.searchUsers).toHaveBeenCalledWith('bob', 'test-user-1');
    });

    it('should return empty users when query is too short', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/friends/search?q=a')
        .expect(HttpStatus.OK);

      expect(res.body.users).toEqual([]);
      expect(mockFriendService.searchUsers).not.toHaveBeenCalled();
    });

    it('should return empty users when query is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/friends/search')
        .expect(HttpStatus.OK);

      expect(res.body.users).toEqual([]);
    });

    it('should return 400 when service throws', async () => {
      mockFriendService.searchUsers.mockRejectedValue(new Error('DB error'));

      await request(app.getHttpServer())
        .get('/api/friends/search?q=bob')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/friends/list
  // -----------------------------------------------------------------------

  describe('GET /api/friends/list', () => {
    it('should return the friends list', async () => {
      const friends = [{ persistentId: 'u2', nickname: 'Bob' }];
      mockFriendService.getFriends.mockResolvedValue(friends);

      const res = await request(app.getHttpServer())
        .get('/api/friends/list')
        .expect(HttpStatus.OK);

      expect(res.body.friends).toEqual(friends);
      expect(mockFriendService.getFriends).toHaveBeenCalledWith('test-user-1');
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/friends/requests
  // -----------------------------------------------------------------------

  describe('GET /api/friends/requests', () => {
    it('should return incoming and outgoing requests', async () => {
      mockFriendService.getPendingRequests.mockResolvedValue({
        incoming: [{ id: 'r1' }],
        outgoing: [{ id: 'r2' }],
      });

      const res = await request(app.getHttpServer())
        .get('/api/friends/requests')
        .expect(HttpStatus.OK);

      expect(res.body.incoming).toHaveLength(1);
      expect(res.body.outgoing).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/friends/request
  // -----------------------------------------------------------------------

  describe('POST /api/friends/request', () => {
    it('should return 400 when targetPersistentId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/friends/request')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should send a friend request and return the result', async () => {
      const mockRequest = { id: 'req-1', status: 'pending' };
      mockFriendService.sendFriendRequest.mockResolvedValue({
        request: mockRequest,
        autoAccepted: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/friends/request')
        .send({ targetPersistentId: 'user-2' })
        .expect(HttpStatus.OK);

      expect(res.body.request).toEqual(mockRequest);
      expect(res.body.autoAccepted).toBe(false);
      expect(mockFriendService.sendFriendRequest).toHaveBeenCalledWith('test-user-1', 'user-2');
    });

    it('should emit socket events to the target user on new request', async () => {
      const mockRequest = { id: 'req-1', status: 'pending' };
      mockFriendService.sendFriendRequest.mockResolvedValue({
        request: mockRequest,
        autoAccepted: false,
      });

      await request(app.getHttpServer())
        .post('/api/friends/request')
        .send({ targetPersistentId: 'user-2' })
        .expect(HttpStatus.OK);

      // emitToUser calls getSocketIds, then server.to(sid).emit for each
      expect(mockOnlineTracker.getSocketIds).toHaveBeenCalledWith('user-2');
      expect(mockEmit).toHaveBeenCalledWith('friends:requestReceived', { request: mockRequest });
    });

    it('should emit socket events to both users on auto-accept', async () => {
      const mockRequest = { id: 'req-1', status: 'accepted' };
      mockFriendService.sendFriendRequest.mockResolvedValue({
        request: mockRequest,
        autoAccepted: true,
      });
      mockFriendService.getFriends.mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/api/friends/request')
        .send({ targetPersistentId: 'user-2' })
        .expect(HttpStatus.OK);

      // Both users should receive requestUpdated and friends:list
      expect(mockEmit).toHaveBeenCalledWith('friends:requestUpdated', {
        requestId: 'req-1',
        status: 'accepted',
      });
      expect(mockEmit).toHaveBeenCalledWith('friends:list', { friends: [] });
    });

    it('should return 400 when service throws', async () => {
      mockFriendService.sendFriendRequest.mockRejectedValue(new Error('Already friends'));

      await request(app.getHttpServer())
        .post('/api/friends/request')
        .send({ targetPersistentId: 'user-2' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/friends/request/respond
  // -----------------------------------------------------------------------

  describe('POST /api/friends/request/respond', () => {
    it('should return 400 when requestId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/friends/request/respond')
        .send({ action: 'accept' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when action is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/friends/request/respond')
        .send({ requestId: 'r1', action: 'invalid' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should accept a request and emit socket events', async () => {
      mockFriendService.respondToRequest.mockResolvedValue({
        fromPersistentId: 'user-2',
        toPersistentId: 'test-user-1',
      });
      mockFriendService.getFriends.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .post('/api/friends/request/respond')
        .send({ requestId: 'req-1', action: 'accept' })
        .expect(HttpStatus.OK);

      expect(res.body.status).toBe('accepted');
      expect(mockEmit).toHaveBeenCalledWith('friends:requestUpdated', {
        requestId: 'req-1',
        status: 'accepted',
      });
      // friends:list should be emitted on accept
      expect(mockEmit).toHaveBeenCalledWith('friends:list', expect.any(Object));
    });

    it('should reject a request and emit socket events without friends:list', async () => {
      mockFriendService.respondToRequest.mockResolvedValue({
        fromPersistentId: 'user-2',
        toPersistentId: 'test-user-1',
      });

      const res = await request(app.getHttpServer())
        .post('/api/friends/request/respond')
        .send({ requestId: 'req-1', action: 'reject' })
        .expect(HttpStatus.OK);

      expect(res.body.status).toBe('rejected');
      expect(mockEmit).toHaveBeenCalledWith('friends:requestUpdated', {
        requestId: 'req-1',
        status: 'rejected',
      });
      // friends:list should NOT be emitted on reject
      expect(mockEmit).not.toHaveBeenCalledWith('friends:list', expect.any(Object));
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/friends/remove
  // -----------------------------------------------------------------------

  describe('DELETE /api/friends/remove', () => {
    it('should return 400 when friendPersistentId is missing', async () => {
      await request(app.getHttpServer())
        .delete('/api/friends/remove')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should remove a friend and emit socket events', async () => {
      mockFriendService.removeFriend.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .delete('/api/friends/remove')
        .send({ friendPersistentId: 'user-2' })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(mockFriendService.removeFriend).toHaveBeenCalledWith('test-user-1', 'user-2');
      // Both users should receive friends:removed
      expect(mockEmit).toHaveBeenCalledWith('friends:removed', { friendPersistentId: 'user-2' });
      expect(mockEmit).toHaveBeenCalledWith('friends:removed', { friendPersistentId: 'test-user-1' });
    });
  });
});
