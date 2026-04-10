import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, Player, RoomSettings, GamePhase, GameMode, Team, RematchStatus } from '@doodledraw/shared';
import { RoomDoc, RoomDocument, PlayerDoc } from '../database/schemas/room.schema';
import { GameHistoryDoc, GameHistoryDocument } from '../database/schemas/game-history.schema';
import { buildHistoryInsertFromPersistedDoc } from './game-history.service';

/** Maximum age (ms) for a room to be restored on startup. */
const MAX_ROOM_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

@Injectable()
export class RoomPersistenceService {
  private readonly logger = new Logger(RoomPersistenceService.name);

  constructor(
    @InjectModel(RoomDoc.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(GameHistoryDoc.name) private readonly gameHistoryModel: Model<GameHistoryDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Persist the current in-memory room state to MongoDB.
   * Fire-and-forget — errors are logged, never thrown.
   */
  persistRoom(room: Room): void {
    const doc = this.toDocument(room);
    this.fireAndForget(
      this.roomModel.updateOne(
        { _id: room.id },
        { $set: doc },
        { upsert: true },
      ).exec(),
      `persistRoom(${room.id})`,
    );
  }

  /**
   * Mark a room as completed in MongoDB.
   * Fire-and-forget.
   */
  markCompleted(roomId: string): void {
    this.fireAndForget(
      this.roomModel.updateOne(
        { _id: roomId },
        { $set: { status: 'completed' } },
      ).exec(),
      `markCompleted(${roomId})`,
    );
  }

  /**
   * Hard-delete a room document from MongoDB.
   * Fire-and-forget.
   */
  deleteRoom(roomId: string): void {
    this.fireAndForget(
      this.roomModel.deleteOne({ _id: roomId }).exec(),
      `deleteRoom(${roomId})`,
    );
  }

  /**
   * Load all active rooms from MongoDB that are not too old.
   * Called once on server startup.
   */
  async loadActiveRooms(): Promise<Room[]> {
    const cutoff = new Date(Date.now() - MAX_ROOM_AGE_MS);

    // 1. Fetch stale docs first so we can archive them to history before marking abandoned.
    const staleDocs = await this.roomModel
      .find({ status: 'active', updatedAt: { $lt: cutoff } })
      .lean()
      .exec();

    if (staleDocs.length > 0) {
      const rows = staleDocs.map((d) => buildHistoryInsertFromPersistedDoc(d, 'abandoned'));
      try {
        await this.gameHistoryModel.insertMany(rows, { ordered: false });
        this.logger.log(`Archived ${rows.length} stale room(s) as abandoned on startup`);
      } catch (err: any) {
        this.logger.error(`Failed to archive stale rooms: ${err.message}`);
      }

      // 2. Mark stale rooms as abandoned.
      await this.roomModel.updateMany(
        { status: 'active', updatedAt: { $lt: cutoff } },
        { $set: { status: 'abandoned' } },
      ).exec();
    }

    const docs = await this.roomModel
      .find({ status: 'active' })
      .lean()
      .exec();

    const rooms: Room[] = [];
    for (const doc of docs) {
      try {
        rooms.push(this.toRoom(doc as any));
      } catch (err: any) {
        this.logger.error(`Failed to restore room ${doc._id}: ${err.message}`);
        // Archive the broken room before marking abandoned.
        try {
          await this.gameHistoryModel.create(
            buildHistoryInsertFromPersistedDoc(doc, 'abandoned'),
          );
        } catch (archiveErr: any) {
          this.logger.error(
            `Also failed to archive broken room ${doc._id}: ${archiveErr.message}`,
          );
        }
        this.fireAndForget(
          this.roomModel.updateOne({ _id: doc._id }, { $set: { status: 'abandoned' } }).exec(),
          `markAbandoned(${doc._id})`,
        );
      }
    }

    return rooms;
  }

  // ---------------------------------------------------------------------------
  // Serialization: in-memory Room → MongoDB document
  // ---------------------------------------------------------------------------

  private toDocument(room: Room): Record<string, any> {
    // Build socketId → persistentId lookup.
    const socketToPersistent = new Map<string, string>();
    for (const [socketId, player] of room.players) {
      socketToPersistent.set(socketId, player.persistentId);
    }

    const lookupPersistent = (socketId: string | null): string | null => {
      if (!socketId) return null;
      return socketToPersistent.get(socketId) ?? socketId;
    };

    // Serialize players.
    const players: PlayerDoc[] = [];
    for (const [, player] of room.players) {
      players.push({
        persistentId: player.persistentId,
        nickname: player.nickname,
        avatar: player.avatar,
        score: player.score,
        team: player.team,
        isDrawing: player.isDrawing,
        hasDrawn: player.hasDrawn,
        isHost: player.isHost,
        isConnected: player.isConnected,
        isSpectator: player.isSpectator ?? false,
        isBot: player.isBot ?? false,
        botDifficulty: player.botDifficulty,
      });
    }

    // Serialize playerWordHistory (socketId keys → persistentId keys).
    const playerWordHistory: Record<string, string[]> = {};
    for (const [socketId, words] of room.playerWordHistory) {
      const pid = lookupPersistent(socketId) ?? socketId;
      playerWordHistory[pid] = words;
    }

    // Serialize rematchVotes (socketId keys → persistentId keys).
    const rematchVotes: Record<string, string> = {};
    for (const [socketId, status] of room.rematchVotes) {
      const pid = lookupPersistent(socketId) ?? socketId;
      rematchVotes[pid] = status;
    }

    return {
      _id: room.id,
      mode: room.mode,
      phase: room.phase,
      status: 'active',
      settings: room.settings,
      players,
      currentRound: room.currentRound,
      currentWord: room.currentWord,
      wordHint: room.wordHint,
      drawerPersistentId: lookupPersistent(room.drawerId),
      teamADrawerPersistentId: lookupPersistent(room.teamADrawerId),
      teamBDrawerPersistentId: lookupPersistent(room.teamBDrawerId),
      correctGuesserPersistentIds: room.correctGuessers.map(
        (id) => lookupPersistent(id) ?? id,
      ),
      pendingWords: room.pendingWords,
      drawOrderPersistentIds: room.drawOrder.map(
        (id) => lookupPersistent(id) ?? id,
      ),
      drawOrderIndex: room.drawOrderIndex,
      teamAScore: room.teamAScore,
      teamBScore: room.teamBScore,
      lastWinningTeam: room.lastWinningTeam,
      isRedrawRound: room.isRedrawRound,
      playerWordHistory,
      rematchVotes,
      createdAt: room.createdAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Deserialization: MongoDB document → in-memory Room
  // ---------------------------------------------------------------------------

  private toRoom(doc: any): Room {
    // Reconstruct players Map. Since no sockets exist on startup,
    // use persistentId as the temporary Map key (and player.id).
    const players = new Map<string, Player>();
    for (const p of doc.players ?? []) {
      const player: Player = {
        id: p.persistentId, // temporary — will be replaced on reconnect
        persistentId: p.persistentId,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score ?? 0,
        team: p.team as Team | undefined,
        isDrawing: false, // reset — no active drawing on startup
        hasDrawn: p.hasDrawn ?? false,
        isHost: p.isHost ?? false,
        isConnected: p.isBot ? true : false, // bots are always connected, humans disconnected on startup
        isSpectator: p.isSpectator ?? false,
        isBot: p.isBot ?? false,
        botDifficulty: p.botDifficulty,
      };
      players.set(p.persistentId, player);
    }

    // Determine phase. Mid-game phases get downgraded to lobby
    // because timers and canvas state can't be restored.
    let phase: GamePhase = doc.phase as GamePhase;
    let currentRound = doc.currentRound ?? 0;
    let currentWord = doc.currentWord ?? null;
    let wordHint = doc.wordHint ?? '';
    let drawerId = doc.drawerPersistentId ?? null;
    let teamADrawerId = doc.teamADrawerPersistentId ?? null;
    let teamBDrawerId = doc.teamBDrawerPersistentId ?? null;
    let correctGuessers = doc.correctGuesserPersistentIds ?? [];
    let drawOrder = doc.drawOrderPersistentIds ?? [];
    let drawOrderIndex = doc.drawOrderIndex ?? 0;

    if (phase === 'drawing' || phase === 'selecting_word' || phase === 'round_end') {
      this.logger.warn(
        `Room ${doc._id} was in '${phase}' phase — downgrading to 'lobby'`,
      );
      phase = 'lobby';
      currentRound = 0;
      currentWord = null;
      wordHint = '';
      drawerId = null;
      teamADrawerId = null;
      teamBDrawerId = null;
      correctGuessers = [];
      drawOrder = [];
      drawOrderIndex = 0;

      // Reset player game state.
      for (const [, player] of players) {
        player.score = 0;
        player.isDrawing = false;
        player.hasDrawn = false;
      }
    }

    // Reconstruct playerWordHistory.
    const playerWordHistory = new Map<string, string[]>();
    if (doc.playerWordHistory) {
      for (const [pid, words] of Object.entries(doc.playerWordHistory)) {
        playerWordHistory.set(pid, words as string[]);
      }
    }

    // Reconstruct rematchVotes.
    const rematchVotes = new Map<string, RematchStatus>();
    if (doc.rematchVotes && phase === 'game_end') {
      for (const [pid, status] of Object.entries(doc.rematchVotes)) {
        rematchVotes.set(pid, status as RematchStatus);
      }
    }

    const settings: RoomSettings = {
      maxPlayers: doc.settings?.maxPlayers ?? 16,
      roundTime: doc.settings?.roundTime ?? 80,
      language: doc.settings?.language ?? 'en',
      difficulty: doc.settings?.difficulty ?? 1,
      totalRounds: doc.settings?.totalRounds ?? 3,
      hintsEnabled: doc.settings?.hintsEnabled ?? true,
      redrawEnabled: doc.settings?.redrawEnabled ?? false,
      isPublic: doc.settings?.isPublic ?? false,
      teamAName: doc.settings?.teamAName ?? 'Team A',
      teamBName: doc.settings?.teamBName ?? 'Team B',
    };

    return {
      id: doc._id,
      mode: doc.mode as GameMode,
      phase,
      settings,
      players,
      createdAt: doc.createdAt ?? Date.now(),
      currentRound,
      currentWord,
      currentWordQuickDraw: null,
      wordHint,
      drawerId,
      teamADrawerId,
      teamBDrawerId,
      roundStartTime: null,
      correctGuessers,
      drawingHistory: [], // ephemeral — not persisted
      pendingWords: doc.pendingWords ?? [],
      drawOrder,
      drawOrderIndex,
      teamAScore: doc.teamAScore ?? 0,
      teamBScore: doc.teamBScore ?? 0,
      lastWinningTeam: (doc.lastWinningTeam as Team) ?? null,
      isRedrawRound: doc.isRedrawRound ?? false,
      playerWordHistory,
      chatHistory: [], // ephemeral — not persisted
      rematchVotes,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private fireAndForget(promise: Promise<any>, context: string): void {
    promise.catch((err) =>
      this.logger.error(`Persistence failed [${context}]: ${err.message}`),
    );
  }
}
