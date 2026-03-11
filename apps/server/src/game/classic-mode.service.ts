import { Injectable, Logger } from '@nestjs/common';
import { Room, Player } from '@doodledraw/shared';

@Injectable()
export class ClassicModeService {
  private readonly logger = new Logger(ClassicModeService.name);

  /**
   * Initialise a classic-mode game.
   * Shuffles connected players into a random draw order and resets per-round state.
   */
  initGame(room: Room): void {
    const connectedIds = Array.from(room.players.entries())
      .filter(([, p]) => p.isConnected && !p.isSpectator)
      .map(([id]) => id);

    // Fisher-Yates shuffle.
    for (let i = connectedIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [connectedIds[i], connectedIds[j]] = [connectedIds[j], connectedIds[i]];
    }

    room.drawOrder = connectedIds;
    room.drawOrderIndex = 0;
    room.currentRound = 1;

    // Reset player state (only non-spectators).
    for (const [, player] of room.players) {
      if (player.isSpectator) continue;
      player.score = 0;
      player.isDrawing = false;
      player.hasDrawn = false;
    }

    this.logger.log(
      `Classic game initialised in room ${room.id} – draw order: ${connectedIds.join(', ')}`,
    );
  }

  /**
   * Advance to the next drawer in the draw order.
   * Returns the player id of the next drawer, or null if the round cycle is complete.
   */
  getNextDrawer(room: Room): string | null {
    // Mark current drawer as having drawn.
    if (room.drawerId) {
      const current = room.players.get(room.drawerId);
      if (current) {
        current.isDrawing = false;
        current.hasDrawn = true;
      }
    }

    // Find the next connected player in the draw order who hasn't drawn yet.
    while (room.drawOrderIndex < room.drawOrder.length) {
      const candidateId = room.drawOrder[room.drawOrderIndex];
      room.drawOrderIndex++;

      const candidate = room.players.get(candidateId);
      if (candidate && candidate.isConnected && !candidate.hasDrawn) {
        candidate.isDrawing = true;
        room.drawerId = candidateId;
        this.logger.log(`Next drawer in room ${room.id}: ${candidate.nickname}`);
        return candidateId;
      }
    }

    // All players in the current cycle have drawn.
    return null;
  }

  /**
   * Check whether every player in the draw order has drawn this cycle.
   */
  isRoundComplete(room: Room): boolean {
    return room.drawOrderIndex >= room.drawOrder.length;
  }

  /**
   * Check whether the game is complete (all configured rounds/cycles have been played).
   */
  isGameComplete(room: Room): boolean {
    return room.currentRound > room.settings.totalRounds;
  }

  /**
   * Prepare state for the next round cycle.
   * Resets `hasDrawn` for all players, re-shuffles draw order, resets index, and increments round.
   */
  prepareNextRound(room: Room): void {
    room.currentRound++;

    for (const [, player] of room.players) {
      if (player.isSpectator) continue;
      player.hasDrawn = false;
      player.isDrawing = false;
    }

    // Re-shuffle connected non-spectator players for the new cycle.
    const connectedIds = Array.from(room.players.entries())
      .filter(([, p]) => p.isConnected && !p.isSpectator)
      .map(([id]) => id);

    for (let i = connectedIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [connectedIds[i], connectedIds[j]] = [connectedIds[j], connectedIds[i]];
    }

    room.drawOrder = connectedIds;
    room.drawOrderIndex = 0;
  }
}
