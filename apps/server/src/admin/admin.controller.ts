import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomService } from '../game/room.service';
import { GameService } from '../game/game.service';
import { GameGateway } from '../game/game.gateway';
import { GameHistoryService } from '../game/game-history.service';
import { AuthService } from '../auth/auth.service';
import { Language, LanguageDocument } from '../database/schemas/language.schema';
import { Word, WordDocument } from '../database/schemas/word.schema';
import { ProfileDoc, ProfileDocument } from '../database/schemas/profile.schema';
import { AdminGuard } from './admin.guard';

/** Default password handed out when an admin resets a user without specifying one. */
const DEFAULT_RESET_PASSWORD = 'DoodleDraw!';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
    private readonly gameGateway: GameGateway,
    private readonly gameHistoryService: GameHistoryService,
    private readonly authService: AuthService,
    @InjectModel(Language.name) private readonly languageModel: Model<LanguageDocument>,
    @InjectModel(Word.name) private readonly wordModel: Model<WordDocument>,
    @InjectModel(ProfileDoc.name) private readonly profileModel: Model<ProfileDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // Dashboard — live stats + historical stats
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  async getDashboard() {
    const rooms = this.roomService.rooms;

    let totalPlayers = 0;
    let connectedPlayers = 0;
    const roomsByPhase: Record<string, number> = {};
    const roomsByMode: Record<string, number> = {};

    for (const [, room] of rooms) {
      for (const [, player] of room.players) {
        totalPlayers++;
        if (player.isConnected) connectedPlayers++;
      }

      roomsByPhase[room.phase] = (roomsByPhase[room.phase] || 0) + 1;
      roomsByMode[room.mode] = (roomsByMode[room.mode] || 0) + 1;
    }

    // Historical stats from GameHistory.
    const history = await this.gameHistoryService.getGlobalStats();

    return {
      totalRooms: rooms.size,
      totalPlayers,
      connectedPlayers,
      roomsByPhase,
      roomsByMode,
      ...history,
    };
  }

  // ---------------------------------------------------------------------------
  // Rooms (live)
  // ---------------------------------------------------------------------------

  @Get('rooms')
  getRooms() {
    const result: any[] = [];

    for (const [, room] of this.roomService.rooms) {
      const connectedCount = Array.from(room.players.values()).filter(
        (p) => p.isConnected,
      ).length;

      result.push({
        id: room.id,
        mode: room.mode,
        phase: room.phase,
        playerCount: room.players.size,
        connectedCount,
        currentRound: room.currentRound,
        totalRounds: room.settings.totalRounds,
        teamAScore: room.teamAScore,
        teamBScore: room.teamBScore,
      });
    }

    return { rooms: result };
  }

  @Get('rooms/:id')
  getRoom(@Param('id') id: string) {
    const room = this.roomService.getRoom(id);
    if (!room) throw new NotFoundException('Room not found');

    const players = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      team: p.team,
      isHost: p.isHost,
      isConnected: p.isConnected,
      isDrawing: p.isDrawing,
    }));

    return {
      id: room.id,
      mode: room.mode,
      phase: room.phase,
      settings: room.settings,
      currentRound: room.currentRound,
      drawerId: room.drawerId,
      teamADrawerId: room.teamADrawerId,
      teamBDrawerId: room.teamBDrawerId,
      teamAScore: room.teamAScore,
      teamBScore: room.teamBScore,
      isRedrawRound: room.isRedrawRound,
      players,
    };
  }

  // ---------------------------------------------------------------------------
  // Room actions
  // ---------------------------------------------------------------------------

  @Post('rooms/:id/end')
  async endGame(@Param('id') id: string) {
    const room = this.roomService.getRoom(id);
    if (!room) throw new NotFoundException('Room not found');

    if (room.phase === 'game_end' || room.phase === 'lobby') {
      return { message: 'Game is not in progress' };
    }

    // Force transition to game_end.
    this.gameService.endRound(id, this.gameGateway.server);
    room.phase = 'game_end';

    const serialized = this.roomService.serializeRoom(room);
    this.gameGateway.server.to(id).emit('game:phaseChange', { phase: 'game_end' });
    this.gameGateway.server.to(id).emit('room:updated', { room: serialized });
    this.gameGateway.server.to(id).emit('game:end', {
      finalScores: Array.from(room.players.values()).map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        score: p.score,
        team: p.team,
        correctGuesses: 0,
        drawingScore: 0,
      })),
      winner: room.mode === 'team'
        ? (room.teamAScore >= room.teamBScore ? 'A' : 'B')
        : '',
    });

    // Archive to permanent history as admin_ended (fire-and-forget).
    this.gameHistoryService.archiveGame(room, 'admin_ended').catch((err) => {
      this.logger.error(`Failed to archive admin-ended room ${id}: ${err.message}`);
    });

    this.logger.log(`Admin force-ended game in room ${id}`);
    return { message: 'Game ended' };
  }

  @Post('rooms/:id/kick/:playerId')
  async kickPlayer(
    @Param('id') roomId: string,
    @Param('playerId') playerId: string,
  ) {
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new NotFoundException('Room not found');

    const player = room.players.get(playerId);
    if (!player) throw new NotFoundException('Player not found in room');

    const sockets = await this.gameGateway.server.fetchSockets();
    const target = sockets.find((s) => s.id === playerId);

    if (target) {
      target.emit('room:error', { message: 'You have been kicked by an admin.' });
      target.disconnect(true);
    }

    this.roomService.leaveRoom(playerId);

    this.gameGateway.server.to(roomId).emit('room:playerLeft', { playerId });
    this.gameGateway.server.to(roomId).emit('room:updated', {
      room: this.roomService.serializeRoom(room),
    });

    this.logger.log(`Admin kicked player ${player.nickname} from room ${roomId}`);
    return { message: `Player ${player.nickname} kicked` };
  }

  // ---------------------------------------------------------------------------
  // Broadcast
  // ---------------------------------------------------------------------------

  @Post('broadcast')
  broadcast(@Body() body: { message?: string }) {
    const text = body.message?.trim();
    if (!text || text.length === 0 || text.length > 500) {
      return { message: 'Message must be 1-500 characters' };
    }

    const chatMessage = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      playerId: 'admin',
      nickname: 'Admin',
      text,
      timestamp: Date.now(),
      isCorrectGuess: false,
      isSystemMessage: true,
      isCloseGuess: false,
    };

    for (const [roomId] of this.roomService.rooms) {
      this.gameGateway.server.to(roomId).emit('chat:message', chatMessage);
    }

    this.logger.log(`Admin broadcast: ${text}`);
    return { message: 'Broadcast sent', roomCount: this.roomService.rooms.size };
  }

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  @Get('users')
  async getUsers(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') search?: string,
  ) {
    const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(limitRaw ?? '20', 10) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      persistentId: { $not: /^bot-/ },
    };
    if (search && search.trim().length > 0) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escaped}`, 'i');
      filter.$or = [{ username: regex }, { nickname: regex }];
    }

    const [rows, total] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.profileModel.countDocuments(filter).exec(),
    ]);

    const users = rows.map((p: any) => ({
      persistentId: p.persistentId,
      username: p.username ?? null,
      nickname: p.nickname,
      avatar: p.avatar,
      totalGames: p.totalGames ?? 0,
      totalWins: p.totalWins ?? 0,
      eloRating: p.eloRating ?? 1200,
      country: p.country ?? null,
      birthYear: p.birthYear ?? null,
      isAdmin: !!p.isAdmin,
      isRegistered: Boolean(p.username),
      createdAt: p.createdAt ?? null,
      deletedAt: p.deletedAt ?? null,
    }));

    return {
      users,
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Reset a user's password. If no password is provided in the body, a
   * default one is used. Returns the plaintext password so the admin can
   * share it with the user. All existing tokens for the target user are
   * invalidated, forcing them to sign in again.
   */
  @Put('users/:persistentId/password')
  async resetUserPassword(
    @Param('persistentId') persistentId: string,
    @Body() body: { password?: string } = {},
  ) {
    const custom = typeof body.password === 'string' ? body.password.trim() : '';
    const newPassword = custom.length > 0 ? custom : DEFAULT_RESET_PASSWORD;

    try {
      await this.authService.resetUserPassword(persistentId, newPassword);
    } catch (err: any) {
      throw new HttpException(err.message ?? 'Failed to reset password', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Admin reset password for user ${persistentId}`);
    return {
      message: 'Password reset',
      password: newPassword,
      isDefault: custom.length === 0,
    };
  }

  /**
   * Soft-delete a user by setting `deletedAt`. Profile, friendships, friend
   * requests, and game history are preserved so the account can be restored
   * later. All active auth tokens are invalidated so the user is immediately
   * signed out. Admins cannot delete themselves.
   */
  @Delete('users/:persistentId')
  async deleteUser(
    @Param('persistentId') persistentId: string,
    @Req() req: any,
  ) {
    if (!persistentId) {
      throw new BadRequestException('persistentId is required');
    }
    if (persistentId === req.persistentId) {
      throw new ForbiddenException('You cannot delete your own admin account');
    }

    const profile = await this.profileModel.findOne({ persistentId }).lean().exec();
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    if (profile.deletedAt) {
      // Already soft-deleted — return idempotently.
      return { message: 'User already deleted', deletedAt: profile.deletedAt };
    }

    try {
      const ok = await this.authService.deleteUserAccount(persistentId);
      if (!ok) {
        throw new NotFoundException('User not found');
      }
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err.message ?? 'Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.log(`Admin soft-deleted user ${persistentId} (${profile.username ?? 'anonymous'})`);
    return { message: 'User deleted', deletedAt: new Date().toISOString() };
  }

  /**
   * Restore a previously soft-deleted user by clearing their `deletedAt`
   * field. The user will need to sign in again because their old tokens
   * were removed at delete time.
   */
  @Post('users/:persistentId/restore')
  async restoreUser(@Param('persistentId') persistentId: string) {
    if (!persistentId) {
      throw new BadRequestException('persistentId is required');
    }

    const profile = await this.profileModel.findOne({ persistentId }).lean().exec();
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    if (!profile.deletedAt) {
      return { message: 'User is not deleted' };
    }

    const ok = await this.authService.undeleteUserAccount(persistentId);
    if (!ok) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`Admin restored user ${persistentId} (${profile.username ?? 'anonymous'})`);
    return { message: 'User restored' };
  }

  // ---------------------------------------------------------------------------
  // Game history (archived)
  // ---------------------------------------------------------------------------

  @Get('games')
  async getGames(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('endReason') endReason?: string,
    @Query('playerPersistentId') playerPersistentId?: string,
  ) {
    const page = parseInt(pageRaw ?? '1', 10) || 1;
    const limit = parseInt(limitRaw ?? '20', 10) || 20;

    return this.gameHistoryService.getGames({
      page,
      limit,
      endReason,
      playerPersistentId,
    });
  }

  @Get('games/:id')
  async getGameById(@Param('id') id: string) {
    const game = await this.gameHistoryService.getGameById(id);
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  // ---------------------------------------------------------------------------
  // Word stats
  // ---------------------------------------------------------------------------

  @Get('words/stats')
  async getWordStats() {
    const stats = await this.wordModel.aggregate([
      {
        $lookup: {
          from: 'languages',
          localField: 'languageId',
          foreignField: '_id',
          as: 'language',
        },
      },
      { $unwind: '$language' },
      {
        $group: {
          _id: {
            languageCode: '$language.code',
            languageName: '$language.name',
            difficulty: '$difficulty',
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          languageCode: '$_id.languageCode',
          languageName: '$_id.languageName',
          difficulty: '$_id.difficulty',
          count: 1,
        },
      },
      { $sort: { languageCode: 1, difficulty: 1 } },
    ]);

    return { stats };
  }

  @Get('words/list')
  async getWords(
    @Query('language') languageCode?: string,
    @Query('difficulty') difficulty?: string,
    @Query('botCompatible') botCompatible?: string,
  ) {
    const matchStage: Record<string, unknown> = {};

    if (languageCode) {
      const lang = await this.languageModel.findOne({ code: languageCode });
      if (lang) {
        matchStage.languageId = lang._id;
      } else {
        return { words: [] };
      }
    }

    if (difficulty) {
      const diff = parseInt(difficulty, 10);
      if (!isNaN(diff) && diff >= 1 && diff <= 3) {
        matchStage.difficulty = diff;
      }
    }

    // Tri-state filter: "true" → only bot-compatible, "false" → only
    // non-bot-compatible, anything else (undefined/empty) → no filter.
    if (botCompatible === 'true') {
      matchStage.botCompatible = true;
    } else if (botCompatible === 'false') {
      matchStage.botCompatible = { $ne: true };
    }

    const rows = await this.wordModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'languages',
          localField: 'languageId',
          foreignField: '_id',
          as: 'language',
        },
      },
      { $unwind: '$language' },
      {
        $project: {
          _id: 0,
          id: '$_id',
          word: 1,
          difficulty: 1,
          botCompatible: { $ifNull: ['$botCompatible', false] },
          languageCode: '$language.code',
          languageName: '$language.name',
        },
      },
      { $sort: { word: 1 } },
    ]);

    return { words: rows };
  }

  @Get('words/languages')
  async getLanguages() {
    const rows = await this.languageModel.find().sort({ code: 1 }).exec();
    return { languages: rows };
  }

  @Post('words')
  async addWord(
    @Body()
    body: {
      languageCode?: string;
      word?: string;
      difficulty?: number;
      botCompatible?: boolean;
    },
  ) {
    const { languageCode, word: rawWord, difficulty, botCompatible } = body;

    if (!languageCode || !rawWord || !difficulty) {
      throw new BadRequestException('languageCode, word, and difficulty are required');
    }

    const wordText = rawWord.trim().toLowerCase();
    if (wordText.length === 0 || wordText.length > 100) {
      throw new BadRequestException('Word must be 1-100 characters');
    }
    if (![1, 2, 3].includes(difficulty)) {
      throw new BadRequestException('Difficulty must be 1, 2, or 3');
    }

    const lang = await this.languageModel.findOne({ code: languageCode });
    if (!lang) {
      throw new NotFoundException(`Language '${languageCode}' not found`);
    }

    const existing = await this.wordModel.findOne({
      languageId: lang._id,
      word: wordText,
      difficulty,
    });

    if (existing) {
      throw new BadRequestException(`Word '${wordText}' already exists for ${languageCode} at difficulty ${difficulty}`);
    }

    const result = await this.wordModel.create({
      languageId: lang._id,
      word: wordText,
      difficulty,
      botCompatible: Boolean(botCompatible),
    });

    this.logger.log(
      `Admin added word '${wordText}' to ${languageCode} (difficulty ${difficulty}, bot=${Boolean(botCompatible)})`,
    );
    return {
      word: {
        id: result._id,
        word: result.word,
        difficulty: result.difficulty,
        botCompatible: result.botCompatible ?? false,
        languageCode,
        languageName: lang.name,
      },
    };
  }

  @Put('words/:id')
  async updateWord(
    @Param('id') id: string,
    @Body()
    body: {
      word?: string;
      difficulty?: number;
      languageCode?: string;
      botCompatible?: boolean;
    },
  ) {
    const existing = await this.wordModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Word not found');
    }

    const updates: Record<string, unknown> = {};

    if (body.word !== undefined) {
      const wordText = String(body.word).trim().toLowerCase();
      if (wordText.length === 0 || wordText.length > 100) {
        throw new BadRequestException('Word must be 1-100 characters');
      }
      updates.word = wordText;
    }

    if (body.difficulty !== undefined) {
      const diff = Number(body.difficulty);
      if (![1, 2, 3].includes(diff)) {
        throw new BadRequestException('Difficulty must be 1, 2, or 3');
      }
      updates.difficulty = diff;
    }

    if (body.botCompatible !== undefined) {
      updates.botCompatible = Boolean(body.botCompatible);
    }

    let targetLang: LanguageDocument | null = null;
    if (body.languageCode !== undefined) {
      targetLang = await this.languageModel.findOne({ code: body.languageCode });
      if (!targetLang) {
        throw new NotFoundException(`Language '${body.languageCode}' not found`);
      }
      updates.languageId = targetLang._id;
    }

    // Duplicate-detection: if the (languageId, word, difficulty) tuple after
    // the update would collide with another row, reject with a clear message.
    const finalLanguageId = updates.languageId ?? existing.languageId;
    const finalWord = (updates.word as string | undefined) ?? existing.word;
    const finalDifficulty = (updates.difficulty as number | undefined) ?? existing.difficulty;

    const duplicate = await this.wordModel.findOne({
      _id: { $ne: existing._id },
      languageId: finalLanguageId,
      word: finalWord,
      difficulty: finalDifficulty,
    });
    if (duplicate) {
      throw new BadRequestException(
        `Word '${finalWord}' already exists for this language at difficulty ${finalDifficulty}`,
      );
    }

    const finalBotCompatible =
      (updates.botCompatible as boolean | undefined) ?? existing.botCompatible ?? false;

    if (Object.keys(updates).length === 0) {
      // Nothing to change — still return the current row for UI convenience.
      const lang =
        targetLang ?? (await this.languageModel.findById(existing.languageId));
      return {
        word: {
          id: existing._id,
          word: existing.word,
          difficulty: existing.difficulty,
          botCompatible: existing.botCompatible ?? false,
          languageCode: lang?.code ?? '',
          languageName: lang?.name ?? '',
        },
      };
    }

    await this.wordModel.updateOne({ _id: existing._id }, { $set: updates });

    const lang =
      targetLang ?? (await this.languageModel.findById(finalLanguageId));

    this.logger.log(
      `Admin updated word ID ${id} → '${finalWord}' (${lang?.code ?? '?'} / difficulty ${finalDifficulty}, bot=${finalBotCompatible})`,
    );
    return {
      word: {
        id: existing._id,
        word: finalWord,
        difficulty: finalDifficulty,
        botCompatible: finalBotCompatible,
        languageCode: lang?.code ?? '',
        languageName: lang?.name ?? '',
      },
    };
  }

  @Delete('words/:id')
  async deleteWord(@Param('id') id: string) {
    const existing = await this.wordModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Word not found');
    }

    await this.wordModel.deleteOne({ _id: id });

    this.logger.log(`Admin deleted word ID ${id}`);
    return { message: 'Word deleted' };
  }
}
