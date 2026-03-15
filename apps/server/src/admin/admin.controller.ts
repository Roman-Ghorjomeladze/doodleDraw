import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
// Use inline type to avoid @types/express dependency.
type ExpressRequest = { ip?: string };
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomService } from '../game/room.service';
import { GameService } from '../game/game.service';
import { GameGateway } from '../game/game.gateway';
import { Language, LanguageDocument } from '../database/schemas/language.schema';
import { Word, WordDocument } from '../database/schemas/word.schema';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('api/admin')
export class AdminController implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminController.name);
  private cleanupInterval!: NodeJS.Timeout;

  /** IP-based login rate limiting: IP → { count, blockedUntil } */
  private readonly loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
  private static readonly MAX_LOGIN_ATTEMPTS = 7;
  private static readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
    private readonly gameGateway: GameGateway,
    @InjectModel(Language.name) private readonly languageModel: Model<LanguageDocument>,
    @InjectModel(Word.name) private readonly wordModel: Model<WordDocument>,
  ) {}

  onModuleInit(): void {
    // Clean expired tokens and login attempts every 10 minutes.
    this.cleanupInterval = setInterval(() => {
      AdminAuthGuard.cleanExpired();
      this.cleanExpiredLoginAttempts();
    }, 10 * 60 * 1000);
  }

  private cleanExpiredLoginAttempts(): void {
    const now = Date.now();
    for (const [ip, entry] of this.loginAttempts) {
      if (entry.blockedUntil > 0 && now > entry.blockedUntil) {
        this.loginAttempts.delete(ip);
      }
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  @Post('login')
  login(
    @Body() body: { username?: string; password?: string },
    @Req() req: ExpressRequest,
  ) {
    const ip = req.ip || 'unknown';

    // Check if IP is blocked.
    const attempt = this.loginAttempts.get(ip);
    if (attempt && attempt.blockedUntil > Date.now()) {
      const remainingMs = attempt.blockedUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60_000);
      throw new HttpException(
        `Too many failed login attempts. Try again in ${remainingMin} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const adminUsername = this.configService.get<string>('ADMIN_USERNAME');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminUsername || !adminPassword) {
      throw new UnauthorizedException('Admin access is not configured');
    }

    if (
      !body.username ||
      !body.password ||
      body.username !== adminUsername ||
      body.password !== adminPassword
    ) {
      // Record failed attempt.
      const current = this.loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
      current.count += 1;
      if (current.count >= AdminController.MAX_LOGIN_ATTEMPTS) {
        current.blockedUntil = Date.now() + AdminController.BLOCK_DURATION_MS;
        this.logger.warn(`IP ${ip} blocked for ${AdminController.BLOCK_DURATION_MS / 60_000}min after ${current.count} failed login attempts`);
      }
      this.loginAttempts.set(ip, current);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — clear attempts for this IP.
    this.loginAttempts.delete(ip);

    const token = AdminAuthGuard.issueToken();
    this.logger.log('Admin logged in');
    return { token };
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  getDashboard() {
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

    return {
      totalRooms: rooms.size,
      totalPlayers,
      connectedPlayers,
      roomsByPhase,
      roomsByMode,
    };
  }

  // ---------------------------------------------------------------------------
  // Rooms
  // ---------------------------------------------------------------------------

  @Get('rooms')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
  endGame(@Param('id') id: string) {
    const room = this.roomService.getRoom(id);
    if (!room) throw new NotFoundException('Room not found');

    if (room.phase === 'game_end' || room.phase === 'lobby') {
      return { message: 'Game is not in progress' };
    }

    // Force transition to game_end.
    this.gameService.endRound(id, this.gameGateway.server);
    // The endRound will schedule next turn, but we want game_end.
    // Set phase directly after clearing timers.
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

    this.logger.log(`Admin force-ended game in room ${id}`);
    return { message: 'Game ended' };
  }

  @Post('rooms/:id/kick/:playerId')
  @UseGuards(AdminAuthGuard)
  async kickPlayer(
    @Param('id') roomId: string,
    @Param('playerId') playerId: string,
  ) {
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new NotFoundException('Room not found');

    const player = room.players.get(playerId);
    if (!player) throw new NotFoundException('Player not found in room');

    // Find the socket and disconnect it.
    const sockets = await this.gameGateway.server.fetchSockets();
    const target = sockets.find((s) => s.id === playerId);

    if (target) {
      target.emit('room:error', { message: 'You have been kicked by an admin.' });
      target.disconnect(true);
    }

    // Clean up via leaveRoom.
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
  @UseGuards(AdminAuthGuard)
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

    // Send to all rooms.
    for (const [roomId] of this.roomService.rooms) {
      this.gameGateway.server.to(roomId).emit('chat:message', chatMessage);
    }

    this.logger.log(`Admin broadcast: ${text}`);
    return { message: 'Broadcast sent', roomCount: this.roomService.rooms.size };
  }

  // ---------------------------------------------------------------------------
  // Word stats
  // ---------------------------------------------------------------------------

  @Get('words/stats')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
  async getWords(
    @Query('language') languageCode?: string,
    @Query('difficulty') difficulty?: string,
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
          languageCode: '$language.code',
          languageName: '$language.name',
        },
      },
      { $sort: { word: 1 } },
    ]);

    return { words: rows };
  }

  @Get('words/languages')
  @UseGuards(AdminAuthGuard)
  async getLanguages() {
    const rows = await this.languageModel.find().sort({ code: 1 }).exec();
    return { languages: rows };
  }

  @Post('words')
  @UseGuards(AdminAuthGuard)
  async addWord(
    @Body() body: { languageCode?: string; word?: string; difficulty?: number },
  ) {
    const { languageCode, word: rawWord, difficulty } = body;

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

    // Find language by code.
    const lang = await this.languageModel.findOne({ code: languageCode });
    if (!lang) {
      throw new NotFoundException(`Language '${languageCode}' not found`);
    }

    // Check for duplicate.
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
    });

    this.logger.log(`Admin added word '${wordText}' to ${languageCode} (difficulty ${difficulty})`);
    return { word: { id: result._id, word: result.word, difficulty: result.difficulty, languageCode, languageName: lang.name } };
  }

  @Delete('words/:id')
  @UseGuards(AdminAuthGuard)
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
