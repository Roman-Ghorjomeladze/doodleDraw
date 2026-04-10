import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  Room,
  GameScore,
  Team,
} from '@doodledraw/shared';
import {
  MIN_PLAYERS_CLASSIC,
  MIN_PLAYERS_TEAM,
  WORD_OPTIONS_COUNT,
  HINT_REVEAL_INTERVAL,
} from '@doodledraw/shared';
import { RoomService } from './room.service';
import { ClassicModeService } from './classic-mode.service';
import { TeamModeService } from './team-mode.service';
import { WordsService } from '../words/words.service';
import { RoomPersistenceService } from './room-persistence.service';
import { ProfileService } from './profile.service';
import { GameHistoryService } from './game-history.service';
import { generateHint, revealLetter } from './utils/hints';
import { levenshteinDistance } from './utils/levenshtein';
import { calculateGuessScore, calculateDrawerScore } from './utils/scoring';
import { botStates, isBotId } from './bot/bot-player';
import { BotDrawingService } from './bot/bot-drawing.service';
import { BotSchedulerService } from './bot/bot-scheduler.service';
import { PermanentLobbiesService } from './bot/permanent-lobbies.service';

/** Duration of the round_end phase before the next round starts. */
const ROUND_END_DELAY_MS = 5_000;

/** Interval for the countdown timer (1 second). */
const TIMER_INTERVAL_MS = 1_000;

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  /** Active countdown timers keyed by room id. */
  private readonly roundTimers: Map<string, NodeJS.Timeout> = new Map();

  /** Active hint reveal timers keyed by room id. */
  private readonly hintTimers: Map<string, NodeJS.Timeout> = new Map();

  /** Active start-game countdown timers keyed by room id. */
  private readonly startCountdownTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly roomService: RoomService,
    private readonly classicMode: ClassicModeService,
    private readonly teamMode: TeamModeService,
    private readonly wordsService: WordsService,
    private readonly persistence: RoomPersistenceService,
    private readonly profileService: ProfileService,
    private readonly gameHistoryService: GameHistoryService,
    @Inject(forwardRef(() => BotDrawingService))
    private readonly botDrawing: BotDrawingService,
    @Inject(forwardRef(() => PermanentLobbiesService))
    private readonly permanentLobbies: PermanentLobbiesService,
  ) {}

  // ---------------------------------------------------------------------------
  // Start game
  // ---------------------------------------------------------------------------

  async startGame(roomId: string, server: Server): Promise<void> {
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const connectedCount = Array.from(room.players.values()).filter(
      (p) => p.isConnected && !p.isSpectator,
    ).length;

    const minPlayers =
      room.mode === 'classic' ? MIN_PLAYERS_CLASSIC : MIN_PLAYERS_TEAM;

    if (connectedCount < minPlayers) {
      throw new Error(`Need at least ${minPlayers} players to start`);
    }

    // Initialise the appropriate mode.
    if (room.mode === 'classic') {
      this.classicMode.initGame(room);
    } else {
      this.teamMode.initGame(room);
    }

    this.logger.log(`Game started in room ${roomId}`);

    // Start the first turn.
    await this.nextTurn(room, server);

    this.persistence.persistRoom(room);
  }

  // ---------------------------------------------------------------------------
  // Start countdown (3…2…1 before game starts)
  // ---------------------------------------------------------------------------

  startCountdown(roomId: string, server: Server): void {
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (room.phase !== 'lobby') throw new Error('Game already started');

    // Validate minimum players.
    const connectedCount = Array.from(room.players.values()).filter(
      (p) => p.isConnected && !p.isSpectator,
    ).length;
    const minPlayers =
      room.mode === 'classic' ? MIN_PLAYERS_CLASSIC : MIN_PLAYERS_TEAM;
    if (connectedCount < minPlayers) {
      throw new Error(`Need at least ${minPlayers} players to start`);
    }

    // Prevent double countdown.
    if (this.startCountdownTimers.has(roomId)) {
      return;
    }

    let seconds = 3;

    // Emit the first tick immediately.
    server.to(roomId).emit('game:countdownTick', { seconds });

    const timer = setInterval(async () => {
      seconds--;
      if (seconds <= 0) {
        // Countdown finished — start the game.
        this.clearStartCountdown(roomId);
        server.to(roomId).emit('game:countdownTick', { seconds: 0 });
        try {
          await this.startGame(roomId, server);
        } catch (err: any) {
          this.logger.error(`Failed to start game after countdown: ${err.message}`);
        }
      } else {
        server.to(roomId).emit('game:countdownTick', { seconds });
      }
    }, TIMER_INTERVAL_MS);

    this.startCountdownTimers.set(roomId, timer);
    this.logger.log(`Start countdown initiated for room ${roomId}`);
  }

  cancelCountdown(roomId: string, server: Server): void {
    if (!this.startCountdownTimers.has(roomId)) return;

    this.clearStartCountdown(roomId);
    server.to(roomId).emit('game:countdownCancelled');
    this.logger.log(`Start countdown cancelled for room ${roomId}`);
  }

  private clearStartCountdown(roomId: string): void {
    const timer = this.startCountdownTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.startCountdownTimers.delete(roomId);
    }
  }

  // ---------------------------------------------------------------------------
  // Word selection
  // ---------------------------------------------------------------------------

  async selectWord(
    roomId: string,
    playerId: string,
    wordIndex: number,
    server: Server,
  ): Promise<void> {
    const room = this.roomService.getRoom(roomId);
    if (!room) return;

    if (room.phase !== 'selecting_word') return;

    // Validate caller is a drawer.
    if (room.mode === 'classic' && room.drawerId !== playerId) return;
    if (
      room.mode === 'team' &&
      room.teamADrawerId !== playerId &&
      room.teamBDrawerId !== playerId
    ) {
      return;
    }

    // Use the stored pending words from the word selection phase.
    if (wordIndex < 0 || wordIndex >= room.pendingWords.length) return;

    const selectedEntry = room.pendingWords[wordIndex];
    const selectedWord = selectedEntry.word;
    room.pendingWords = [];
    room.currentWord = selectedWord;
    room.currentWordQuickDraw = selectedEntry.quickDrawCategory ?? null;

    // Track word history for redraw round.
    if (!room.isRedrawRound) {
      const drawers = room.mode === 'classic'
        ? [room.drawerId!]
        : [room.teamADrawerId, room.teamBDrawerId].filter(Boolean) as string[];
      for (const did of drawers) {
        const history = room.playerWordHistory.get(did) || [];
        history.push(selectedWord);
        room.playerWordHistory.set(did, history);
      }
    }
    room.wordHint = generateHint(selectedWord);
    room.phase = 'drawing';
    room.roundStartTime = Date.now();
    room.correctGuessers = [];
    room.drawingHistory = [];

    // Emit round start to all players.
    if (room.mode === 'classic') {
      // Send the actual word only to the drawer.
      server.to(room.drawerId!).emit('game:roundStart', {
        drawerId: room.drawerId!,
        wordHint: room.wordHint,
        roundNumber: room.currentRound,
        currentWord: room.currentWord,
      });

      // Send hint-only version to everyone else.
      for (const [pid, player] of room.players) {
        if (pid === room.drawerId || !player.isConnected) continue;
        server.to(pid).emit('game:roundStart', {
          drawerId: room.drawerId!,
          wordHint: room.wordHint,
          roundNumber: room.currentRound,
        });
      }
    } else {
      // Team mode: send word to both drawers, hint to everyone else.
      const handicap = this.teamMode.getHandicap(room);
      const handicapTeam = room.lastWinningTeam || undefined;

      const drawerIds = [room.teamADrawerId, room.teamBDrawerId].filter(Boolean) as string[];

      for (const did of drawerIds) {
        server.to(did).emit('team:roundStart', {
          teamADrawerId: room.teamADrawerId!,
          teamBDrawerId: room.teamBDrawerId!,
          wordHint: room.wordHint,
          roundNumber: room.currentRound,
          currentWord: room.currentWord,
          handicap: handicap || undefined,
          handicapTeam,
        });
      }

      for (const [pid, player] of room.players) {
        if (drawerIds.includes(pid) || !player.isConnected) continue;
        server.to(pid).emit('team:roundStart', {
          teamADrawerId: room.teamADrawerId!,
          teamBDrawerId: room.teamBDrawerId!,
          wordHint: room.wordHint,
          roundNumber: room.currentRound,
          handicap: handicap || undefined,
          handicapTeam,
        });
      }
    }

    server.to(roomId).emit('game:phaseChange', { phase: 'drawing' });
    server.to(roomId).emit('room:updated', { room: this.roomService.serializeRoom(room) });

    // Start the round timer.
    this.startRoundTimer(roomId, server);

    // Reset bot states for the new round.
    this.resetBotStatesForRound(room);

    // If the drawer is a bot, trigger drawing.
    this.triggerBotDrawing(room, server);

    this.persistence.persistRoom(room);
  }

  // ---------------------------------------------------------------------------
  // Guess handling
  // ---------------------------------------------------------------------------

  handleGuess(
    playerId: string,
    text: string,
    server: Server,
  ): { isCorrect: boolean; isClose: boolean } {
    const room = this.roomService.getRoomForPlayer(playerId);
    if (!room || room.phase !== 'drawing' || !room.currentWord) {
      return { isCorrect: false, isClose: false };
    }

    // Spectators and drawers cannot guess.
    const guesser = room.players.get(playerId);
    if (guesser?.isSpectator) {
      return { isCorrect: false, isClose: false };
    }
    if (room.mode === 'classic' && room.drawerId === playerId) {
      return { isCorrect: false, isClose: false };
    }
    if (
      room.mode === 'team' &&
      (room.teamADrawerId === playerId || room.teamBDrawerId === playerId)
    ) {
      return { isCorrect: false, isClose: false };
    }

    // Already guessed correctly.
    if (room.correctGuessers.includes(playerId)) {
      return { isCorrect: false, isClose: false };
    }

    const guess = text.trim().toLowerCase();
    const answer = room.currentWord.toLowerCase();

    // Exact match.
    if (guess === answer) {
      room.correctGuessers.push(playerId);

      const player = room.players.get(playerId);
      if (!player) return { isCorrect: true, isClose: false };

      const position = room.correctGuessers.length;
      const elapsed = room.roundStartTime
        ? (Date.now() - room.roundStartTime) / 1000
        : 0;
      const timeLeft = Math.max(0, room.settings.roundTime - elapsed);

      const points = calculateGuessScore(position, timeLeft, room.settings.roundTime);
      player.score += points;

      // Award drawer points.
      this.awardDrawerPoints(room);

      server.to(room.id).emit('chat:correctGuess', {
        playerId,
        nickname: player.nickname,
        points,
      });

      server.to(room.id).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });

      this.logger.log(
        `Player ${player.nickname} guessed correctly in room ${room.id} (+${points} pts, position ${position})`,
      );

      // Check if all non-drawers have guessed.
      if (this.allPlayersGuessed(room)) {
        this.endRound(room.id, server);
      }

      return { isCorrect: true, isClose: false };
    }

    // Close guess (Levenshtein distance <= 2).
    const distance = levenshteinDistance(guess, answer);
    if (distance <= 2 && distance > 0) {
      server.to(playerId).emit('chat:closeGuess', { playerId });
      return { isCorrect: false, isClose: true };
    }

    return { isCorrect: false, isClose: false };
  }

  // ---------------------------------------------------------------------------
  // Round lifecycle
  // ---------------------------------------------------------------------------

  endRound(roomId: string, server: Server): void {
    const room = this.roomService.getRoom(roomId);
    if (!room) return;

    // Stop timers.
    this.clearRoundTimer(roomId);
    this.clearHintTimer(roomId);

    // Stop all bot activity for this round.
    this.stopBotsForRound(room);

    room.phase = 'round_end';

    const scores = this.buildScores(room);

    server.to(roomId).emit('game:roundEnd', {
      word: room.currentWord || '',
      scores,
    });
    server.to(roomId).emit('game:phaseChange', { phase: 'round_end' });
    server.to(roomId).emit('room:updated', { room: this.roomService.serializeRoom(room) });

    // Handle team scoring if in team mode.
    if (room.mode === 'team') {
      this.resolveTeamRound(room, server);
    }

    this.persistence.persistRoom(room);

    // After delay, proceed to next turn or end game.
    setTimeout(() => {
      this.nextTurn(room, server);
    }, ROUND_END_DELAY_MS);
  }

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------

  startRoundTimer(roomId: string, server: Server): void {
    const room = this.roomService.getRoom(roomId);
    if (!room) return;

    let timeLeft = room.settings.roundTime;
    let hintCounter = 0;

    // Emit initial time.
    server.to(roomId).emit('game:timerUpdate', { timeLeft });

    const timer = setInterval(() => {
      timeLeft--;
      hintCounter++;

      if (timeLeft <= 0) {
        this.endRound(roomId, server);
        return;
      }

      server.to(roomId).emit('game:timerUpdate', { timeLeft });

      // Reveal hints at the configured interval.
      if (
        room.settings.hintsEnabled &&
        hintCounter >= HINT_REVEAL_INTERVAL &&
        room.phase === 'drawing'
      ) {
        hintCounter = 0;
        this.revealHint(roomId, server);
      }
    }, TIMER_INTERVAL_MS);

    this.roundTimers.set(roomId, timer);
  }

  revealHint(roomId: string, server: Server): void {
    const room = this.roomService.getRoom(roomId);
    if (!room || !room.currentWord) return;

    room.wordHint = revealLetter(room.wordHint, room.currentWord);

    server.to(roomId).emit('game:hintReveal', { hint: room.wordHint });
  }

  // ---------------------------------------------------------------------------
  // Internal: next turn logic
  // ---------------------------------------------------------------------------

  private async nextTurn(room: Room, server: Server): Promise<void> {
    if (room.mode === 'classic') {
      await this.nextTurnClassic(room, server);
    } else {
      await this.nextTurnTeam(room, server);
    }
  }

  private async nextTurnClassic(room: Room, server: Server): Promise<void> {
    const nextDrawer = this.classicMode.getNextDrawer(room);

    if (nextDrawer === null) {
      // Current round cycle is complete.
      if (this.classicMode.isGameComplete(room)) {
        // Check if we should enter redraw round.
        if (room.settings.redrawEnabled && !room.isRedrawRound) {
          room.isRedrawRound = true;
          this.classicMode.prepareNextRound(room);
          const firstDrawer = this.classicMode.getNextDrawer(room);
          if (firstDrawer === null) {
            this.endGame(room, server);
            return;
          }
          await this.presentRedrawTurn(room, server);
          return;
        }
        this.endGame(room, server);
        return;
      }

      // Prepare next cycle.
      this.classicMode.prepareNextRound(room);

      // Get the first drawer of the new cycle.
      const firstDrawer = this.classicMode.getNextDrawer(room);
      if (firstDrawer === null) {
        this.endGame(room, server);
        return;
      }
    }

    if (room.isRedrawRound) {
      await this.presentRedrawTurn(room, server);
    } else {
      await this.presentWordOptions(room, server);
    }
  }

  private async nextTurnTeam(room: Room, server: Server): Promise<void> {
    const drawers = this.teamMode.getNextDrawers(room);

    if (drawers === null) {
      if (this.teamMode.isGameComplete(room)) {
        if (room.settings.redrawEnabled && !room.isRedrawRound) {
          room.isRedrawRound = true;
          this.teamMode.prepareNextRound(room);
          const newDrawers = this.teamMode.getNextDrawers(room);
          if (newDrawers === null) {
            this.endGame(room, server);
            return;
          }
          await this.presentRedrawTurn(room, server);
          return;
        }
        this.endGame(room, server);
        return;
      }

      this.teamMode.prepareNextRound(room);

      const newDrawers = this.teamMode.getNextDrawers(room);
      if (newDrawers === null) {
        this.endGame(room, server);
        return;
      }
    }

    if (room.isRedrawRound) {
      await this.presentRedrawTurn(room, server);
    } else {
      await this.presentWordOptions(room, server);
    }
  }

  // ---------------------------------------------------------------------------
  // Word options
  // ---------------------------------------------------------------------------

  private async presentWordOptions(room: Room, server: Server): Promise<void> {
    // Clear round-level state before the async DB call.
    room.currentWord = null;
    room.currentWordQuickDraw = null;
    room.wordHint = '';
    room.correctGuessers = [];
    room.drawingHistory = [];

    // Clear the per-round drawer score tracker so the next drawer's
    // cumulative score isn't overwritten by a stale snapshot.
    for (const player of room.players.values()) {
      delete (player as any)._prevRoundScore;
    }

    // Fetch words BEFORE setting phase so that room.pendingWords and
    // room.phase are always consistent.  If a reconnection happens during
    // this await, the phase is still the previous one (e.g. round_end)
    // and the client correctly restores that state.
    // In rooms with bots, only use bot-compatible words (ones with Quick Draw drawings)
    const hasBots = [...room.players.values()].some(p => p.isBot);
    const words = await this.wordsService.getRandomWords(
      room.settings.language,
      room.settings.difficulty,
      WORD_OPTIONS_COUNT,
      hasBots,
    );

    const wordOptions = words.map((w) => ({
      word: w.word,
      difficulty: w.difficulty,
      quickDrawCategory: w.quickDrawCategory,
    }));

    // Store word options and set phase atomically (no await between them).
    room.pendingWords = wordOptions;
    room.phase = 'selecting_word';

    // Send word options to the drawer(s).
    if (room.mode === 'classic') {
      if (room.drawerId) {
        server.to(room.drawerId).emit('game:wordOptions', { words: wordOptions });
      }
    } else {
      // In team mode both drawers pick the same word, send to team A drawer first.
      if (room.teamADrawerId) {
        server.to(room.teamADrawerId).emit('game:wordOptions', { words: wordOptions });
      }
    }

    server.to(room.id).emit('game:phaseChange', {
      phase: 'selecting_word',
      context: {
        drawerId: room.drawerId,
        teamADrawerId: room.teamADrawerId,
        teamBDrawerId: room.teamBDrawerId,
      },
    });
    server.to(room.id).emit('room:updated', { room: this.roomService.serializeRoom(room) });

    // If the drawer is a bot, auto-select a word after a short delay.
    const botDrawerId = room.mode === 'classic' ? room.drawerId : room.teamADrawerId;
    if (botDrawerId && isBotId(botDrawerId)) {
      setTimeout(() => {
        if (room.phase === 'selecting_word') {
          this.selectWord(room.id, botDrawerId, 0, server);
        }
      }, 1500);
    }
  }

  // ---------------------------------------------------------------------------
  // Redraw turn (auto-assign a previous word, skip word selection)
  // ---------------------------------------------------------------------------

  private async presentRedrawTurn(room: Room, server: Server): Promise<void> {
    room.currentWord = null;
    room.currentWordQuickDraw = null;
    room.wordHint = '';
    room.correctGuessers = [];
    room.drawingHistory = [];

    // Clear the per-round drawer score tracker (same as presentWordOptions).
    for (const player of room.players.values()) {
      delete (player as any)._prevRoundScore;
    }

    // Pick a word from the drawer's history.
    const drawerId = room.mode === 'classic' ? room.drawerId : room.teamADrawerId;
    const history = drawerId ? room.playerWordHistory.get(drawerId) || [] : [];
    const word = history.length > 0 ? history.shift()! : null;

    if (!word) {
      // No more words to redraw – end the game.
      this.endGame(room, server);
      return;
    }

    room.currentWord = word;
    room.wordHint = generateHint(word);
    room.phase = 'drawing';
    room.roundStartTime = Date.now();

    // Emit round start (same as selectWord flow).
    if (room.mode === 'classic') {
      server.to(room.drawerId!).emit('game:roundStart', {
        drawerId: room.drawerId!,
        wordHint: room.wordHint,
        roundNumber: room.currentRound,
        currentWord: room.currentWord,
      });
      for (const [pid, player] of room.players) {
        if (pid === room.drawerId || !player.isConnected) continue;
        server.to(pid).emit('game:roundStart', {
          drawerId: room.drawerId!,
          wordHint: room.wordHint,
          roundNumber: room.currentRound,
        });
      }
    } else {
      const handicap = this.teamMode.getHandicap(room);
      const handicapTeam = room.lastWinningTeam || undefined;
      const drawerIds = [room.teamADrawerId, room.teamBDrawerId].filter(Boolean) as string[];
      for (const did of drawerIds) {
        server.to(did).emit('team:roundStart', {
          teamADrawerId: room.teamADrawerId!,
          teamBDrawerId: room.teamBDrawerId!,
          wordHint: room.wordHint,
          roundNumber: room.currentRound,
          currentWord: room.currentWord,
          handicap: handicap || undefined,
          handicapTeam,
        });
      }
      for (const [pid, player] of room.players) {
        if (drawerIds.includes(pid) || !player.isConnected) continue;
        server.to(pid).emit('team:roundStart', {
          teamADrawerId: room.teamADrawerId!,
          teamBDrawerId: room.teamBDrawerId!,
          wordHint: room.wordHint,
          roundNumber: room.currentRound,
          handicap: handicap || undefined,
          handicapTeam,
        });
      }
    }

    server.to(room.id).emit('game:phaseChange', { phase: 'drawing' });
    server.to(room.id).emit('room:updated', { room: this.roomService.serializeRoom(room) });
    this.startRoundTimer(room.id, server);

    // Reset bot states and trigger bot drawing.
    this.resetBotStatesForRound(room);
    this.triggerBotDrawing(room, server);
  }

  // ---------------------------------------------------------------------------
  // End game
  // ---------------------------------------------------------------------------

  private endGame(room: Room, server: Server): void {
    this.clearRoundTimer(room.id);
    this.clearHintTimer(room.id);

    room.phase = 'game_end';

    const finalScores = this.buildScores(room);

    let winner: string | Team;
    if (room.mode === 'classic') {
      // Player with highest score wins.
      const sorted = [...finalScores].sort((a, b) => b.score - a.score);
      winner = sorted[0]?.playerId || '';
    } else {
      winner = room.teamAScore >= room.teamBScore ? 'A' : 'B';
    }

    // Initialize rematch votes — all eligible (non-spectator, connected) players start as 'pending'.
    room.rematchVotes = new Map();
    for (const [id, p] of room.players) {
      if (!p.isSpectator && p.isConnected) {
        room.rematchVotes.set(id, 'pending');
      }
    }

    server.to(room.id).emit('game:end', { finalScores, winner });
    server.to(room.id).emit('game:phaseChange', { phase: 'game_end' });
    server.to(room.id).emit('room:updated', { room: this.roomService.serializeRoom(room) });

    // Clean up team mode state.
    if (room.mode === 'team') {
      this.teamMode.cleanupRoom(room.id);
    }

    this.logger.log(`Game ended in room ${room.id} – winner: ${winner}`);

    this.persistence.persistRoom(room);
    this.persistence.markCompleted(room.id);

    // Update player profiles (fire-and-forget, skip bots).
    this.profileService.updateProfilesAfterGame(room, finalScores, winner);

    // Archive the completed game to permanent history (fire-and-forget).
    this.gameHistoryService.archiveGame(room, 'completed').catch((err) => {
      this.logger.error(`Failed to archive completed game ${room.id}: ${err.message}`);
    });

    // If this is a permanent lobby, auto-restart.
    if (room.isPermanentLobby) {
      this.permanentLobbies.handleGameEnd(room.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Scoring helpers
  // ---------------------------------------------------------------------------

  private awardDrawerPoints(room: Room): void {
    const totalGuessers = this.countNonDrawers(room);

    if (room.mode === 'classic' && room.drawerId) {
      const drawer = room.players.get(room.drawerId);
      if (drawer) {
        drawer.score = this.recalculateDrawerScore(
          room.correctGuessers.length,
          totalGuessers,
          room.settings.roundTime,
          drawer,
        );
      }
    } else if (room.mode === 'team') {
      // Award both drawers proportionally.
      for (const did of [room.teamADrawerId, room.teamBDrawerId]) {
        if (!did) continue;
        const drawer = room.players.get(did);
        if (!drawer) continue;
        const teamGuessers = this.countTeamGuessers(room, drawer.team!);
        const totalTeamNonDrawers = this.countTeamNonDrawers(room, drawer.team!);
        drawer.score = this.recalculateDrawerScore(
          teamGuessers,
          totalTeamNonDrawers,
          room.settings.roundTime,
          drawer,
        );
      }
    }
  }

  private recalculateDrawerScore(
    correctGuessers: number,
    totalPlayers: number,
    roundTime: number,
    drawer: { score: number },
  ): number {
    // The drawer's base score from previous rounds is preserved.
    // We need to track the drawer's score from this round separately.
    // For simplicity, we recalculate the drawer bonus each time a guesser succeeds.
    const previousRoundScore = (drawer as any)._prevRoundScore ?? drawer.score;
    if ((drawer as any)._prevRoundScore === undefined) {
      (drawer as any)._prevRoundScore = drawer.score;
    }
    const drawerPoints = calculateDrawerScore(correctGuessers, totalPlayers, roundTime);
    return previousRoundScore + drawerPoints;
  }

  private countNonDrawers(room: Room): number {
    let count = 0;
    for (const [id, player] of room.players) {
      if (!player.isConnected || player.isSpectator) continue;
      if (room.mode === 'classic' && id === room.drawerId) continue;
      if (
        room.mode === 'team' &&
        (id === room.teamADrawerId || id === room.teamBDrawerId)
      ) {
        continue;
      }
      count++;
    }
    return count;
  }

  private countTeamGuessers(room: Room, team: Team): number {
    let count = 0;
    for (const gid of room.correctGuessers) {
      const p = room.players.get(gid);
      if (p && p.team === team) count++;
    }
    return count;
  }

  private countTeamNonDrawers(room: Room, team: Team): number {
    let count = 0;
    for (const [id, player] of room.players) {
      if (!player.isConnected || player.isSpectator) continue;
      if (player.team !== team) continue;
      if (id === room.teamADrawerId || id === room.teamBDrawerId) continue;
      count++;
    }
    return count;
  }

  private allPlayersGuessed(room: Room): boolean {
    for (const [id, player] of room.players) {
      if (!player.isConnected || player.isSpectator) continue;

      // Skip drawers.
      if (room.mode === 'classic' && id === room.drawerId) continue;
      if (
        room.mode === 'team' &&
        (id === room.teamADrawerId || id === room.teamBDrawerId)
      ) {
        continue;
      }

      if (!room.correctGuessers.includes(id)) {
        return false;
      }
    }
    return true;
  }

  private buildScores(room: Room): GameScore[] {
    const scores: GameScore[] = [];

    for (const [, player] of room.players) {
      if (player.isSpectator) continue;
      scores.push({
        playerId: player.id,
        nickname: player.nickname,
        score: player.score,
        team: player.team,
        correctGuesses: 0, // Could be tracked more granularly.
        drawingScore: 0,
      });
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  // ---------------------------------------------------------------------------
  // Team round resolution
  // ---------------------------------------------------------------------------

  private resolveTeamRound(room: Room, server: Server): void {
    // Count correct guesses per team.
    let teamACorrect = 0;
    let teamBCorrect = 0;

    for (const gid of room.correctGuessers) {
      const p = room.players.get(gid);
      if (!p) continue;
      if (p.team === 'A') teamACorrect++;
      else if (p.team === 'B') teamBCorrect++;
    }

    let winningTeam: Team | null = null;

    if (teamACorrect > teamBCorrect) {
      winningTeam = 'A';
      room.teamAScore += teamACorrect;
    } else if (teamBCorrect > teamACorrect) {
      winningTeam = 'B';
      room.teamBScore += teamBCorrect;
    } else {
      // Tie: both teams get points.
      room.teamAScore += teamACorrect;
      room.teamBScore += teamBCorrect;
    }

    if (winningTeam) {
      room.lastWinningTeam = winningTeam;
      server.to(room.id).emit('team:roundWon', {
        winningTeam,
        points: winningTeam === 'A' ? teamACorrect : teamBCorrect,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Reset to lobby
  // ---------------------------------------------------------------------------

  /**
   * Abort the current game and send all players back to the lobby.
   * Clears all timers and resets round-level room state.
   */
  resetToLobby(roomId: string, server: Server): void {
    const room = this.roomService.getRoom(roomId);
    if (!room || room.phase === 'lobby') return;

    // Stop all timers.
    this.clearRoundTimer(roomId);
    this.clearHintTimer(roomId);
    this.clearStartCountdown(roomId);

    // Reset game state.
    room.phase = 'lobby';
    room.currentRound = 0;
    room.currentWord = null;
    room.currentWordQuickDraw = null;
    room.wordHint = '';
    room.drawerId = null;
    room.teamADrawerId = null;
    room.teamBDrawerId = null;
    room.roundStartTime = null;
    room.correctGuessers = [];
    room.drawingHistory = [];
    room.pendingWords = [];
    room.drawOrder = [];
    room.drawOrderIndex = 0;
    room.teamAScore = 0;
    room.teamBScore = 0;
    room.lastWinningTeam = null;
    room.isRedrawRound = false;
    room.playerWordHistory = new Map();
    room.chatHistory = [];

    // Reset player-level game state.
    for (const [, player] of room.players) {
      player.score = 0;
      player.isDrawing = false;
      player.hasDrawn = false;
    }

    // Notify everyone.
    server.to(roomId).emit('game:phaseChange', { phase: 'lobby' });
    server.to(roomId).emit('room:updated', { room: this.roomService.serializeRoom(room) });

    this.logger.log(`Room ${roomId} reset to lobby (player left mid-game)`);

    this.persistence.persistRoom(room);
  }

  // ---------------------------------------------------------------------------
  // Rematch
  // ---------------------------------------------------------------------------

  handleRematchVote(
    playerId: string,
    vote: 'accepted' | 'declined',
    server: Server,
  ): void {
    const room = this.roomService.getRoomForPlayer(playerId);
    if (!room || room.phase !== 'game_end') return;

    const player = room.players.get(playerId);
    if (!player || player.isSpectator) return;

    room.rematchVotes.set(playerId, vote);

    // Build the rematch state to broadcast.
    const votes: Record<string, 'pending' | 'accepted' | 'declined'> = {};
    for (const [id, status] of room.rematchVotes) {
      votes[id] = status;
    }
    const totalEligible = Array.from(room.players.values()).filter(
      (p) => !p.isSpectator && p.isConnected,
    ).length;
    const rematchState = { votes, totalEligible };

    server.to(room.id).emit('game:rematchUpdate', { rematchState });

    // Check if all connected non-spectator players voted 'accepted'.
    const eligiblePlayers = Array.from(room.players.entries()).filter(
      ([, p]) => !p.isSpectator && p.isConnected,
    );
    const allAccepted = eligiblePlayers.every(
      ([id]) => room.rematchVotes.get(id) === 'accepted',
    );

    if (allAccepted && eligiblePlayers.length >= 2) {
      this.startRematch(room, server);
    }
  }

  /**
   * Mark a player who left during game_end as 'declined' in rematch votes.
   */
  markRematchDeclined(playerId: string, room: import('@doodledraw/shared').Room, server: Server): void {
    if (room.phase !== 'game_end') return;
    if (!room.rematchVotes.has(playerId)) return;

    room.rematchVotes.set(playerId, 'declined');

    const votes: Record<string, 'pending' | 'accepted' | 'declined'> = {};
    for (const [id, status] of room.rematchVotes) {
      votes[id] = status;
    }
    const totalEligible = Array.from(room.players.values()).filter(
      (p) => !p.isSpectator && p.isConnected,
    ).length;

    server.to(room.id).emit('game:rematchUpdate', { rematchState: { votes, totalEligible } });

    // Check if remaining players all accepted.
    const eligiblePlayers = Array.from(room.players.entries()).filter(
      ([, p]) => !p.isSpectator && p.isConnected,
    );
    const allAccepted = eligiblePlayers.every(
      ([id]) => room.rematchVotes.get(id) === 'accepted',
    );

    if (allAccepted && eligiblePlayers.length >= 2) {
      this.startRematch(room, server);
    }
  }

  private startRematch(room: import('@doodledraw/shared').Room, server: Server): void {
    // Notify clients that rematch is starting.
    server.to(room.id).emit('game:rematchStart');

    // Reset the game state (same as resetToLobby but keep the room settings).
    room.phase = 'lobby';
    room.currentRound = 0;
    room.currentWord = null;
    room.currentWordQuickDraw = null;
    room.wordHint = '';
    room.drawerId = null;
    room.teamADrawerId = null;
    room.teamBDrawerId = null;
    room.roundStartTime = null;
    room.correctGuessers = [];
    room.drawingHistory = [];
    room.pendingWords = [];
    room.drawOrder = [];
    room.drawOrderIndex = 0;
    room.teamAScore = 0;
    room.teamBScore = 0;
    room.lastWinningTeam = null;
    room.isRedrawRound = false;
    room.playerWordHistory = new Map();
    room.chatHistory = [];
    room.rematchVotes = new Map();

    // Reset player-level game state.
    for (const [, player] of room.players) {
      player.score = 0;
      player.isDrawing = false;
      player.hasDrawn = false;
    }

    // Notify everyone of lobby state, then auto-start the game.
    server.to(room.id).emit('game:phaseChange', { phase: 'lobby' });
    server.to(room.id).emit('room:updated', { room: this.roomService.serializeRoom(room) });

    // Auto-start the game after a short delay.
    setTimeout(async () => {
      try {
        await this.startGame(room.id, server);
      } catch (err) {
        this.logger.error(`Failed to auto-start rematch: ${err}`);
      }
    }, 1500);

    this.logger.log(`Rematch starting in room ${room.id}`);

    this.persistence.persistRoom(room);
  }

  // ---------------------------------------------------------------------------
  // Timer cleanup
  // ---------------------------------------------------------------------------

  private clearRoundTimer(roomId: string): void {
    const timer = this.roundTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.roundTimers.delete(roomId);
    }
  }

  private clearHintTimer(roomId: string): void {
    const timer = this.hintTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.hintTimers.delete(roomId);
    }
  }

  /**
   * Clean up all timers for a room (e.g., when the room is destroyed).
   */
  cleanupRoom(roomId: string): void {
    this.clearRoundTimer(roomId);
    this.clearHintTimer(roomId);
    this.clearStartCountdown(roomId);
  }

  // ---------------------------------------------------------------------------
  // Bot helpers
  // ---------------------------------------------------------------------------

  /**
   * Reset bot states at the start of a new round.
   */
  private resetBotStatesForRound(room: Room): void {
    room.currentCanvasSnapshot = undefined;

    for (const [, player] of room.players) {
      if (!player.isBot) continue;
      const state = botStates.get(player.id);
      if (state) {
        state.stopGuessing = false;
        state.drawingAborted = false;
        state.firstGuessAt = 0;
        state.previousGuesses = [];
      }
    }
  }

  /**
   * Stop all bot activity at the end of a round.
   */
  private stopBotsForRound(room: Room): void {
    for (const [, player] of room.players) {
      if (!player.isBot) continue;
      const state = botStates.get(player.id);
      if (state) {
        state.stopGuessing = true;
        state.drawingAborted = true;
      }
      // Cancel any active drawing.
      this.botDrawing.cancelDrawing(player.id);
    }
  }

  /**
   * If the current drawer is a bot, start the drawing process.
   */
  private triggerBotDrawing(room: Room, server: Server): void {
    if (!room.currentWord) return;

    const drawerIds: string[] = [];
    if (room.mode === 'classic' && room.drawerId) {
      drawerIds.push(room.drawerId);
    } else if (room.mode === 'team') {
      if (room.teamADrawerId) drawerIds.push(room.teamADrawerId);
      if (room.teamBDrawerId) drawerIds.push(room.teamBDrawerId);
    }

    for (const drawerId of drawerIds) {
      if (isBotId(drawerId)) {
        this.botDrawing.startDrawing(drawerId, room, room.currentWord, server, room.currentWordQuickDraw ?? undefined);
      }
    }
  }
}
