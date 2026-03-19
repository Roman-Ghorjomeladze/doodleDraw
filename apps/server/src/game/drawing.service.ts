import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { DrawAction, Room } from '@doodledraw/shared';
import { RoomService } from './room.service';

@Injectable()
export class DrawingService {
  private readonly logger = new Logger(DrawingService.name);

  constructor(private readonly roomService: RoomService) {}

  /**
   * Handle an incoming draw action from a player.
   * Validates that the player is the current drawer, stores the action in history,
   * and broadcasts appropriately based on game mode.
   */
  handleDrawAction(playerId: string, action: DrawAction, server: Server): void {
    const room = this.roomService.getRoomForPlayer(playerId);
    if (!room) return;

    if (!this.isPlayerDrawer(room, playerId)) {
      return;
    }

    // Stamp the action with the player id.
    action.playerId = playerId;
    action.timestamp = Date.now();

    // Store in drawing history.
    room.drawingHistory.push(action);

    // Broadcast based on mode.
    if (room.mode === 'classic') {
      server.to(room.id).emit('draw:action', action);
    } else {
      // Team mode: send full action to drawer's team, blurred to the other team.
      const drawerPlayer = room.players.get(playerId);
      if (!drawerPlayer || !drawerPlayer.team) return;

      const drawerTeam = drawerPlayer.team;

      // Send to each player individually based on their team.
      for (const [pid, player] of room.players) {
        if (pid === playerId) continue; // Don't send back to drawer.
        if (!player.isConnected) continue;

        // Spectators see all draw actions unblurred.
        if (player.isSpectator || player.team === drawerTeam) {
          server.to(pid).emit('draw:action', action);
        } else {
          server.to(pid).emit('draw:actionBlurred', action);
        }
      }
    }
  }

  /**
   * Handle undo action: remove the last stroke from history and broadcast.
   */
  handleUndo(playerId: string, server: Server): void {
    const room = this.roomService.getRoomForPlayer(playerId);
    if (!room) return;

    if (!this.isPlayerDrawer(room, playerId)) {
      return;
    }

    // Find the last stroke action by this player and get its strokeId.
    let targetStrokeId: string | undefined;
    for (let i = room.drawingHistory.length - 1; i >= 0; i--) {
      if (
        room.drawingHistory[i].playerId === playerId &&
        room.drawingHistory[i].type === 'stroke'
      ) {
        targetStrokeId = room.drawingHistory[i].strokeId;
        break;
      }
    }

    if (targetStrokeId) {
      // Remove all actions with the same strokeId (streaming partial strokes).
      room.drawingHistory = room.drawingHistory.filter(
        (a) => a.strokeId !== targetStrokeId,
      );
    } else {
      // Fallback: remove just the last stroke by this player.
      for (let i = room.drawingHistory.length - 1; i >= 0; i--) {
        if (
          room.drawingHistory[i].playerId === playerId &&
          room.drawingHistory[i].type === 'stroke'
        ) {
          room.drawingHistory.splice(i, 1);
          break;
        }
      }
    }

    // Create an undo action and broadcast.
    const undoAction: DrawAction = {
      type: 'undo',
      timestamp: Date.now(),
      playerId,
    };

    if (room.mode === 'classic') {
      server.to(room.id).emit('draw:action', undoAction);
    } else {
      const drawerPlayer = room.players.get(playerId);
      if (!drawerPlayer || !drawerPlayer.team) return;

      for (const [pid, player] of room.players) {
        if (pid === playerId) continue;
        if (!player.isConnected) continue;

        if (player.isSpectator || player.team === drawerPlayer.team) {
          server.to(pid).emit('draw:action', undoAction);
        } else {
          server.to(pid).emit('draw:actionBlurred', undoAction);
        }
      }
    }
  }

  /**
   * Clear the canvas for a room and broadcast to all players.
   */
  clearCanvas(roomId: string, playerId: string, server: Server): void {
    const room = this.roomService.getRoom(roomId);
    if (!room) return;

    if (!this.isPlayerDrawer(room, playerId)) {
      return;
    }

    room.drawingHistory = [];

    const clearAction: DrawAction = {
      type: 'clear',
      timestamp: Date.now(),
      playerId,
    };

    if (room.mode === 'classic') {
      server.to(room.id).emit('draw:action', clearAction);
    } else {
      // Team mode: send clear to same team as draw:action, to opponent as draw:actionBlurred.
      const drawerPlayer = room.players.get(playerId);
      if (!drawerPlayer || !drawerPlayer.team) return;

      for (const [pid, player] of room.players) {
        if (pid === playerId) continue;
        if (!player.isConnected) continue;

        if (player.isSpectator || player.team === drawerPlayer.team) {
          server.to(pid).emit('draw:action', clearAction);
        } else {
          server.to(pid).emit('draw:actionBlurred', clearAction);
        }
      }
    }
  }

  /**
   * Check whether a player is a current drawer in the room.
   */
  private isPlayerDrawer(room: Room, playerId: string): boolean {
    if (room.mode === 'classic') {
      return room.drawerId === playerId;
    }
    // Team mode: either team's drawer.
    return room.teamADrawerId === playerId || room.teamBDrawerId === playerId;
  }
}
