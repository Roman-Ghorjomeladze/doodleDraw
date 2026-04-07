import { Injectable } from '@nestjs/common';

@Injectable()
export class OnlineTrackerService {
  /** persistentId → Set of socket IDs (supports multiple tabs). */
  private readonly onlineMap = new Map<string, Set<string>>();

  /** Returns true if user was previously offline (first tab). */
  addSocket(socketId: string, persistentId: string): boolean {
    let sockets = this.onlineMap.get(persistentId);
    if (!sockets) {
      sockets = new Set();
      this.onlineMap.set(persistentId, sockets);
    }
    const wasOffline = sockets.size === 0;
    sockets.add(socketId);
    return wasOffline;
  }

  /** Returns true if user is now fully offline (no tabs left). */
  removeSocket(socketId: string, persistentId: string): boolean {
    const sockets = this.onlineMap.get(persistentId);
    if (!sockets) return false;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.onlineMap.delete(persistentId);
      return true;
    }
    return false;
  }

  isOnline(persistentId: string): boolean {
    const sockets = this.onlineMap.get(persistentId);
    return !!sockets && sockets.size > 0;
  }

  getSocketIds(persistentId: string): Set<string> {
    return this.onlineMap.get(persistentId) ?? new Set();
  }
}
