import { Injectable, Logger } from '@nestjs/common';
import { Room, Player, Team, Handicap } from '@doodledraw/shared';
import { HANDICAP_COLORS, HANDICAP_MIN_BRUSH_SIZE } from '@doodledraw/shared';

@Injectable()
export class TeamModeService {
  private readonly logger = new Logger(TeamModeService.name);

  /** Per-room draw order for each team. */
  private teamADrawOrder: Map<string, string[]> = new Map();
  private teamBDrawOrder: Map<string, string[]> = new Map();
  private teamAIndex: Map<string, number> = new Map();
  private teamBIndex: Map<string, number> = new Map();

  /**
   * Initialise a team-mode game.
   * Assigns players to teams if not already assigned, sets up per-team draw orders.
   */
  initGame(room: Room): void {
    this.assignTeamsIfNeeded(room);

    const teamA: string[] = [];
    const teamB: string[] = [];

    for (const [id, player] of room.players) {
      if (!player.isConnected || player.isSpectator) continue;
      player.score = 0;
      player.isDrawing = false;
      player.hasDrawn = false;

      if (player.team === 'A') {
        teamA.push(id);
      } else {
        teamB.push(id);
      }
    }

    // Shuffle each team's draw order.
    this.shuffle(teamA);
    this.shuffle(teamB);

    this.teamADrawOrder.set(room.id, teamA);
    this.teamBDrawOrder.set(room.id, teamB);
    this.teamAIndex.set(room.id, 0);
    this.teamBIndex.set(room.id, 0);

    room.currentRound = 1;
    room.teamAScore = 0;
    room.teamBScore = 0;
    room.lastWinningTeam = null;

    this.logger.log(
      `Team game initialised in room ${room.id} – A: ${teamA.length} players, B: ${teamB.length} players`,
    );
  }

  /**
   * Get the next pair of drawers (one from each team).
   * Returns { teamADrawer, teamBDrawer } or null if the round cycle is complete.
   */
  getNextDrawers(room: Room): { teamADrawer: string; teamBDrawer: string } | null {
    // Clear current drawers.
    if (room.teamADrawerId) {
      const prev = room.players.get(room.teamADrawerId);
      if (prev) {
        prev.isDrawing = false;
        prev.hasDrawn = true;
      }
    }
    if (room.teamBDrawerId) {
      const prev = room.players.get(room.teamBDrawerId);
      if (prev) {
        prev.isDrawing = false;
        prev.hasDrawn = true;
      }
    }

    const teamAOrder = this.teamADrawOrder.get(room.id) || [];
    const teamBOrder = this.teamBDrawOrder.get(room.id) || [];
    let aIdx = this.teamAIndex.get(room.id) || 0;
    let bIdx = this.teamBIndex.get(room.id) || 0;

    // Find next connected drawer on team A.
    let teamADrawer: string | null = null;
    while (aIdx < teamAOrder.length) {
      const candidate = room.players.get(teamAOrder[aIdx]);
      aIdx++;
      if (candidate && candidate.isConnected && !candidate.hasDrawn) {
        teamADrawer = teamAOrder[aIdx - 1];
        break;
      }
    }
    this.teamAIndex.set(room.id, aIdx);

    // Find next connected drawer on team B.
    let teamBDrawer: string | null = null;
    while (bIdx < teamBOrder.length) {
      const candidate = room.players.get(teamBOrder[bIdx]);
      bIdx++;
      if (candidate && candidate.isConnected && !candidate.hasDrawn) {
        teamBDrawer = teamBOrder[bIdx - 1];
        break;
      }
    }
    this.teamBIndex.set(room.id, bIdx);

    // Both teams need a drawer to continue.
    if (!teamADrawer || !teamBDrawer) {
      return null;
    }

    // Mark as drawing.
    const playerA = room.players.get(teamADrawer)!;
    const playerB = room.players.get(teamBDrawer)!;
    playerA.isDrawing = true;
    playerB.isDrawing = true;

    room.teamADrawerId = teamADrawer;
    room.teamBDrawerId = teamBDrawer;

    return { teamADrawer, teamBDrawer };
  }

  /**
   * Get the handicap for the team that won the last round (if any).
   */
  getHandicap(room: Room): Handicap | null {
    if (!room.lastWinningTeam) return null;

    return {
      limitedColors: true,
      minBrushSize: HANDICAP_MIN_BRUSH_SIZE,
      availableColors: [...HANDICAP_COLORS],
    };
  }

  /**
   * Check whether the current round cycle is complete
   * (both teams have exhausted their draw orders).
   */
  isRoundComplete(room: Room): boolean {
    const teamAOrder = this.teamADrawOrder.get(room.id) || [];
    const teamBOrder = this.teamBDrawOrder.get(room.id) || [];
    const aIdx = this.teamAIndex.get(room.id) || 0;
    const bIdx = this.teamBIndex.get(room.id) || 0;

    return aIdx >= teamAOrder.length || bIdx >= teamBOrder.length;
  }

  /**
   * Check whether the game is complete (all configured rounds have been played).
   */
  isGameComplete(room: Room): boolean {
    return room.currentRound > room.settings.totalRounds;
  }

  /**
   * Prepare state for the next round cycle.
   */
  prepareNextRound(room: Room): void {
    room.currentRound++;

    for (const [, player] of room.players) {
      if (player.isSpectator) continue;
      player.hasDrawn = false;
      player.isDrawing = false;
    }

    const teamA: string[] = [];
    const teamB: string[] = [];

    for (const [id, player] of room.players) {
      if (!player.isConnected || player.isSpectator) continue;
      if (player.team === 'A') teamA.push(id);
      else teamB.push(id);
    }

    this.shuffle(teamA);
    this.shuffle(teamB);

    this.teamADrawOrder.set(room.id, teamA);
    this.teamBDrawOrder.set(room.id, teamB);
    this.teamAIndex.set(room.id, 0);
    this.teamBIndex.set(room.id, 0);
  }

  /**
   * Assign teams evenly if players haven't chosen teams yet.
   */
  private assignTeamsIfNeeded(room: Room): void {
    const unassigned: string[] = [];

    for (const [id, player] of room.players) {
      if (!player.team && !player.isSpectator) {
        unassigned.push(id);
      }
    }

    if (unassigned.length === 0) return;

    // Shuffle unassigned players and split evenly.
    this.shuffle(unassigned);

    const half = Math.ceil(unassigned.length / 2);
    for (let i = 0; i < unassigned.length; i++) {
      const player = room.players.get(unassigned[i])!;
      player.team = i < half ? 'A' : 'B';
    }

    this.logger.log(`Teams auto-assigned in room ${room.id}`);
  }

  /**
   * Clean up internal state when a room is destroyed.
   */
  cleanupRoom(roomId: string): void {
    this.teamADrawOrder.delete(roomId);
    this.teamBDrawOrder.delete(roomId);
    this.teamAIndex.delete(roomId);
    this.teamBIndex.delete(roomId);
  }

  /**
   * Fisher-Yates shuffle (in-place).
   */
  private shuffle(arr: string[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
