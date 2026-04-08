import { OnlineTrackerService } from '../online-tracker.service';

describe('OnlineTrackerService', () => {
  let service: OnlineTrackerService;

  beforeEach(() => {
    service = new OnlineTrackerService();
  });

  describe('addSocket', () => {
    it('should return true when the first socket is added (user comes online)', () => {
      const result = service.addSocket('socket-1', 'user-1');
      expect(result).toBe(true);
    });

    it('should return false when a second socket is added (user already online)', () => {
      service.addSocket('socket-1', 'user-1');
      const result = service.addSocket('socket-2', 'user-1');
      expect(result).toBe(false);
    });
  });

  describe('removeSocket', () => {
    it('should return true when the last socket is removed (user goes offline)', () => {
      service.addSocket('socket-1', 'user-1');
      const result = service.removeSocket('socket-1', 'user-1');
      expect(result).toBe(true);
    });

    it('should return false when a non-last socket is removed (user still online)', () => {
      service.addSocket('socket-1', 'user-1');
      service.addSocket('socket-2', 'user-1');
      const result = service.removeSocket('socket-1', 'user-1');
      expect(result).toBe(false);
    });

    it('should return false when removing a socket for an unknown user', () => {
      const result = service.removeSocket('socket-1', 'unknown');
      expect(result).toBe(false);
    });
  });

  describe('isOnline', () => {
    it('should return true when the user has at least one socket', () => {
      service.addSocket('socket-1', 'user-1');
      expect(service.isOnline('user-1')).toBe(true);
    });

    it('should return false when the user has no sockets', () => {
      expect(service.isOnline('user-1')).toBe(false);
    });

    it('should return false after all sockets are removed', () => {
      service.addSocket('socket-1', 'user-1');
      service.removeSocket('socket-1', 'user-1');
      expect(service.isOnline('user-1')).toBe(false);
    });
  });

  describe('getSocketIds', () => {
    it('should return an empty set for an unknown user', () => {
      const sockets = service.getSocketIds('unknown');
      expect(sockets.size).toBe(0);
    });

    it('should return all socket IDs for a known user', () => {
      service.addSocket('socket-1', 'user-1');
      service.addSocket('socket-2', 'user-1');
      const sockets = service.getSocketIds('user-1');
      expect(sockets.size).toBe(2);
      expect(sockets.has('socket-1')).toBe(true);
      expect(sockets.has('socket-2')).toBe(true);
    });

    it('should not include removed sockets', () => {
      service.addSocket('socket-1', 'user-1');
      service.addSocket('socket-2', 'user-1');
      service.removeSocket('socket-1', 'user-1');
      const sockets = service.getSocketIds('user-1');
      expect(sockets.size).toBe(1);
      expect(sockets.has('socket-2')).toBe(true);
    });
  });
});
