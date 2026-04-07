import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { FriendService } from './friend.service';
import { OnlineTrackerService } from './online-tracker.service';
import { GameGateway } from './game.gateway';
import { UserAuthGuard } from '../auth/auth.guard';

@Controller('api/friends')
export class FriendsController {
  constructor(
    private readonly friendService: FriendService,
    private readonly onlineTracker: OnlineTrackerService,
    private readonly gateway: GameGateway,
  ) {}

  private get server(): Server {
    return this.gateway.server;
  }

  private emitToUser(persistentId: string, event: string, data: any): void {
    const sockets = this.onlineTracker.getSocketIds(persistentId);
    for (const sid of sockets) {
      this.server.to(sid).emit(event as any, data);
    }
  }

  @Get('search')
  @UseGuards(UserAuthGuard)
  async search(
    @Req() req: any,
    @Query('q') query: string,
  ) {
    if (!query || query.trim().length < 2 || query.trim().length > 20) {
      return { users: [] };
    }

    try {
      const users = await this.friendService.searchUsers(query.trim(), req.persistentId);
      return { users };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('list')
  @UseGuards(UserAuthGuard)
  async list(@Req() req: any) {
    const friends = await this.friendService.getFriends(req.persistentId);
    return { friends };
  }

  @Get('requests')
  @UseGuards(UserAuthGuard)
  async pendingRequests(@Req() req: any) {
    const { incoming, outgoing } = await this.friendService.getPendingRequests(req.persistentId);
    return { incoming, outgoing };
  }

  @Post('request')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendRequest(
    @Req() req: any,
    @Body() body: { targetPersistentId: string },
  ) {
    const persistentId = req.persistentId;
    if (!body?.targetPersistentId) {
      throw new HttpException('Target user is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const { request, autoAccepted } = await this.friendService.sendFriendRequest(
        persistentId,
        body.targetPersistentId,
      );

      if (autoAccepted) {
        // Both users become friends — push real-time notifications via socket.
        this.emitToUser(persistentId, 'friends:requestUpdated', {
          requestId: request.id,
          status: 'accepted',
        });
        this.emitToUser(body.targetPersistentId, 'friends:requestUpdated', {
          requestId: request.id,
          status: 'accepted',
        });
        const [myFriends, theirFriends] = await Promise.all([
          this.friendService.getFriends(persistentId),
          this.friendService.getFriends(body.targetPersistentId),
        ]);
        this.emitToUser(persistentId, 'friends:list', { friends: myFriends });
        this.emitToUser(body.targetPersistentId, 'friends:list', { friends: theirFriends });
      } else {
        // Notify the target user in real-time via socket.
        this.emitToUser(body.targetPersistentId, 'friends:requestReceived', { request });
      }

      return { request, autoAccepted };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('request/respond')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async respondToRequest(
    @Req() req: any,
    @Body() body: { requestId: string; action: 'accept' | 'reject' },
  ) {
    const persistentId = req.persistentId;
    if (!body?.requestId || !['accept', 'reject'].includes(body?.action)) {
      throw new HttpException('Invalid input', HttpStatus.BAD_REQUEST);
    }

    try {
      const { fromPersistentId, toPersistentId } = await this.friendService.respondToRequest(
        body.requestId,
        persistentId,
        body.action,
      );

      const status = body.action === 'accept' ? 'accepted' : 'rejected';

      // Push real-time notifications via socket.
      this.emitToUser(fromPersistentId, 'friends:requestUpdated', { requestId: body.requestId, status });
      this.emitToUser(toPersistentId, 'friends:requestUpdated', { requestId: body.requestId, status });

      if (body.action === 'accept') {
        const [senderFriends, responderFriends] = await Promise.all([
          this.friendService.getFriends(fromPersistentId),
          this.friendService.getFriends(toPersistentId),
        ]);
        this.emitToUser(fromPersistentId, 'friends:list', { friends: senderFriends });
        this.emitToUser(toPersistentId, 'friends:list', { friends: responderFriends });
      }

      return { status };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('remove')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeFriend(
    @Req() req: any,
    @Body() body: { friendPersistentId: string },
  ) {
    const persistentId = req.persistentId;
    if (!body?.friendPersistentId) {
      throw new HttpException('Friend ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.friendService.removeFriend(persistentId, body.friendPersistentId);

      // Push real-time notifications via socket.
      this.emitToUser(persistentId, 'friends:removed', { friendPersistentId: body.friendPersistentId });
      this.emitToUser(body.friendPersistentId, 'friends:removed', { friendPersistentId: persistentId });

      return { success: true };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}
