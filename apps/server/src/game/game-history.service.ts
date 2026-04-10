import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameHistoryDoc, GameHistoryDocument } from '../database/schemas/game-history.schema';
import type { Room, Player } from '@doodledraw/shared';

export type EndReason = 'completed' | 'admin_ended' | 'cleaned_up' | 'abandoned';

export interface DashboardHistoricalStats {
  gamesLastWeek: number;
  gamesLastMonth: number;
  gamesLastYear: number;
  unfinishedTotal: number;
  unfinishedByReason: {
    admin_ended: number;
    cleaned_up: number;
    abandoned: number;
  };
  unfinishedByPhase: {
    lobby: number;
    selecting_word: number;
    drawing: number;
    round_end: number;
    game_end: number;
  };
}

interface HistoryInsert {
  roomId: string;
  mode: string;
  endReason: EndReason;
  finalPhase: string;
  players: Array<{
    persistentId: string;
    nickname: string;
    avatar: string;
    finalScore: number;
    isBot: boolean;
    team: string | null;
    isHost: boolean;
    wasConnected: boolean;
  }>;
  winnerPersistentId: string | null;
  winnerTeam: string | null;
  teamAScore: number;
  teamBScore: number;
  roundsPlayed: number;
  totalRounds: number;
  language: string;
  startedAt: Date;
  endedAt: Date;
  settings: Record<string, any>;
}

/**
 * Build a GameHistory insert payload from an in-memory Room.
 * Used by GameHistoryService.archiveGame.
 */
function buildHistoryInsertFromRoom(room: Room, endReason: EndReason): HistoryInsert {
  const now = new Date();
  const players: HistoryInsert['players'] = [];
  for (const [, p] of room.players) {
    const player = p as Player;
    if (player.isSpectator) continue;
    players.push({
      persistentId: player.persistentId,
      nickname: player.nickname,
      avatar: player.avatar,
      finalScore: player.score ?? 0,
      isBot: !!player.isBot,
      team: player.team ?? null,
      isHost: !!player.isHost,
      wasConnected: !!player.isConnected,
    });
  }

  // Winner derivation.
  let winnerPersistentId: string | null = null;
  let winnerTeam: string | null = null;
  if (room.mode === 'team') {
    if (room.teamAScore > room.teamBScore) winnerTeam = 'A';
    else if (room.teamBScore > room.teamAScore) winnerTeam = 'B';
  } else {
    let best = -Infinity;
    for (const p of players) {
      if (p.finalScore > best) {
        best = p.finalScore;
        winnerPersistentId = p.persistentId;
      }
    }
    if (best <= 0) winnerPersistentId = null;
  }

  const totalRounds = room.settings?.totalRounds ?? 0;
  // Rounds played: min(currentRound, totalRounds). If phase is game_end, all rounds ran.
  const roundsPlayed = room.phase === 'game_end'
    ? totalRounds
    : Math.max(0, Math.min(room.currentRound ?? 0, totalRounds));

  return {
    roomId: room.id,
    mode: room.mode,
    endReason,
    finalPhase: room.phase,
    players,
    winnerPersistentId,
    winnerTeam,
    teamAScore: room.teamAScore ?? 0,
    teamBScore: room.teamBScore ?? 0,
    roundsPlayed,
    totalRounds,
    language: room.settings?.language ?? 'en',
    startedAt: new Date(room.createdAt ?? Date.now()),
    endedAt: now,
    settings: {
      mode: room.mode,
      totalRounds,
      roundTime: room.settings?.roundTime,
      difficulty: room.settings?.difficulty,
      language: room.settings?.language,
      teamAName: room.settings?.teamAName,
      teamBName: room.settings?.teamBName,
      isPublic: room.settings?.isPublic,
    },
  };
}

/**
 * Build a GameHistory insert payload from a persisted (lean) RoomDoc.
 * Used by RoomPersistenceService during startup stale-room archiving
 * where no in-memory Room exists.
 */
export function buildHistoryInsertFromPersistedDoc(doc: any, endReason: EndReason): HistoryInsert {
  const now = new Date();
  const players: HistoryInsert['players'] = [];
  for (const p of doc.players ?? []) {
    if (p.isSpectator) continue;
    players.push({
      persistentId: p.persistentId,
      nickname: p.nickname ?? 'Unknown',
      avatar: p.avatar ?? '',
      finalScore: p.score ?? 0,
      isBot: !!p.isBot,
      team: p.team ?? null,
      isHost: !!p.isHost,
      wasConnected: !!p.isConnected,
    });
  }

  let winnerPersistentId: string | null = null;
  let winnerTeam: string | null = null;
  if (doc.mode === 'team') {
    if ((doc.teamAScore ?? 0) > (doc.teamBScore ?? 0)) winnerTeam = 'A';
    else if ((doc.teamBScore ?? 0) > (doc.teamAScore ?? 0)) winnerTeam = 'B';
  } else {
    let best = -Infinity;
    for (const p of players) {
      if (p.finalScore > best) {
        best = p.finalScore;
        winnerPersistentId = p.persistentId;
      }
    }
    if (best <= 0) winnerPersistentId = null;
  }

  const totalRounds = doc.settings?.totalRounds ?? 0;
  const roundsPlayed = doc.phase === 'game_end'
    ? totalRounds
    : Math.max(0, Math.min(doc.currentRound ?? 0, totalRounds));

  return {
    roomId: doc._id ?? doc.id ?? 'unknown',
    mode: doc.mode ?? 'classic',
    endReason,
    finalPhase: doc.phase ?? 'lobby',
    players,
    winnerPersistentId,
    winnerTeam,
    teamAScore: doc.teamAScore ?? 0,
    teamBScore: doc.teamBScore ?? 0,
    roundsPlayed,
    totalRounds,
    language: doc.settings?.language ?? 'en',
    startedAt: doc.createdAt instanceof Date
      ? doc.createdAt
      : new Date(doc.createdAt ?? Date.now()),
    endedAt: now,
    settings: {
      mode: doc.mode,
      totalRounds,
      roundTime: doc.settings?.roundTime,
      difficulty: doc.settings?.difficulty,
      language: doc.settings?.language,
      teamAName: doc.settings?.teamAName,
      teamBName: doc.settings?.teamBName,
      isPublic: doc.settings?.isPublic,
    },
  };
}

@Injectable()
export class GameHistoryService {
  private readonly logger = new Logger(GameHistoryService.name);

  /** In-memory dedupe to prevent archiving the same room twice during one process lifetime. */
  private readonly archivedRoomIds = new Set<string>();

  constructor(
    @InjectModel(GameHistoryDoc.name)
    private readonly gameHistoryModel: Model<GameHistoryDocument>,
  ) {}

  /** Fire-and-forget archive of a live room. Never throws. */
  async archiveGame(room: Room, endReason: EndReason): Promise<void> {
    if (!room || !room.id) return;
    if (this.archivedRoomIds.has(room.id)) return;
    this.archivedRoomIds.add(room.id);

    try {
      const insert = buildHistoryInsertFromRoom(room, endReason);
      await this.gameHistoryModel.create(insert);
      this.logger.log(`Archived room ${room.id} (${endReason})`);
    } catch (err: any) {
      this.logger.error(`Failed to archive room ${room.id}: ${err.message}`);
    }
  }

  async getGames(options: {
    page?: number;
    limit?: number;
    endReason?: string;
    playerPersistentId?: string;
  }): Promise<{
    games: any[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.max(1, Math.min(100, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (options.endReason) query.endReason = options.endReason;
    if (options.playerPersistentId) {
      query['players.persistentId'] = options.playerPersistentId;
    }

    const [games, total] = await Promise.all([
      this.gameHistoryModel
        .find(query)
        .sort({ endedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.gameHistoryModel.countDocuments(query).exec(),
    ]);

    return {
      games,
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getGameById(id: string): Promise<any | null> {
    try {
      return await this.gameHistoryModel.findById(id).lean().exec();
    } catch {
      return null;
    }
  }

  /** Historical stats for the admin dashboard. */
  async getGlobalStats(): Promise<DashboardHistoricalStats> {
    const now = Date.now();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

    const unfinishedFilter = { endReason: { $ne: 'completed' } };

    const [
      gamesLastWeek,
      gamesLastMonth,
      gamesLastYear,
      unfinishedTotal,
      reasonAgg,
      phaseAgg,
    ] = await Promise.all([
      this.gameHistoryModel.countDocuments({ endedAt: { $gte: weekAgo } }).exec(),
      this.gameHistoryModel.countDocuments({ endedAt: { $gte: monthAgo } }).exec(),
      this.gameHistoryModel.countDocuments({ endedAt: { $gte: yearAgo } }).exec(),
      this.gameHistoryModel.countDocuments(unfinishedFilter).exec(),
      this.gameHistoryModel
        .aggregate([
          { $match: unfinishedFilter },
          { $group: { _id: '$endReason', count: { $sum: 1 } } },
        ])
        .exec(),
      this.gameHistoryModel
        .aggregate([
          { $match: unfinishedFilter },
          { $group: { _id: '$finalPhase', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const unfinishedByReason = {
      admin_ended: 0,
      cleaned_up: 0,
      abandoned: 0,
    };
    for (const row of reasonAgg) {
      if (row._id in unfinishedByReason) {
        (unfinishedByReason as any)[row._id] = row.count;
      }
    }

    const unfinishedByPhase = {
      lobby: 0,
      selecting_word: 0,
      drawing: 0,
      round_end: 0,
      game_end: 0,
    };
    for (const row of phaseAgg) {
      if (row._id in unfinishedByPhase) {
        (unfinishedByPhase as any)[row._id] = row.count;
      }
    }

    return {
      gamesLastWeek,
      gamesLastMonth,
      gamesLastYear,
      unfinishedTotal,
      unfinishedByReason,
      unfinishedByPhase,
    };
  }
}
