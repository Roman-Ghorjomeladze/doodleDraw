/**
 * Sliding-window rate limiter for Socket.IO events.
 *
 * Each (socketId, event) pair has its own bucket of timestamps.
 * A request is allowed only when the number of timestamps within
 * the sliding window is below the configured maximum.
 */

export interface RateLimitRule {
  /** Maximum number of requests allowed within the window. */
  max: number;
  /** Sliding window duration in milliseconds. */
  windowMs: number;
}

/** Per-event rate limit configuration. */
export const EVENT_RATE_LIMITS: Record<string, RateLimitRule> = {
  // Drawing – high frequency, but still bounded
  'draw:action': { max: 120, windowMs: 1_000 },
  'draw:clear': { max: 3, windowMs: 5_000 },
  'draw:undo': { max: 5, windowMs: 5_000 },

  // Chat
  'chat:message': { max: 6, windowMs: 5_000 },

  // Room lifecycle – low frequency
  'room:create': { max: 2, windowMs: 10_000 },
  'room:join': { max: 3, windowMs: 10_000 },
  'room:spectate': { max: 3, windowMs: 10_000 },
  'room:leave': { max: 3, windowMs: 5_000 },
  'room:kick': { max: 3, windowMs: 10_000 },
  'room:settings': { max: 8, windowMs: 5_000 },

  // Game actions
  'game:start': { max: 2, windowMs: 5_000 },
  'game:selectWord': { max: 3, windowMs: 5_000 },
  'game:reconnect': { max: 3, windowMs: 10_000 },

  // Team
  'team:switch': { max: 4, windowMs: 10_000 },

  // Reactions
  'reaction:send': { max: 3, windowMs: 5_000 },

  // Profile & Leaderboard
  'profile:get': { max: 5, windowMs: 10_000 },
  'leaderboard:get': { max: 3, windowMs: 10_000 },
};

/** Global rate limit across ALL events from a single socket. */
export const GLOBAL_RATE_LIMIT: RateLimitRule = {
  max: 200,
  windowMs: 1_000,
};

/** Number of rate-limit violations before auto-disconnect. */
export const MAX_VIOLATIONS = 25;

/** Window for counting violations (ms). */
export const VIOLATION_WINDOW_MS = 60_000;

export class RateLimiter {
  /** Buckets: "socketId:event" → sorted array of timestamps. */
  private buckets = new Map<string, number[]>();

  /** Per-socket violation timestamps. */
  private violations = new Map<string, number[]>();

  /** Periodic cleanup interval handle. */
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically purge stale entries every 30 seconds.
    this.cleanupInterval = setInterval(() => this.purgeStale(), 30_000);
  }

  /**
   * Check whether a request from `socketId` for `event` is within limits.
   * Returns `true` if allowed, `false` if rate-limited.
   */
  check(socketId: string, event: string): boolean {
    const now = Date.now();

    // 1. Check global rate limit.
    if (!this.checkBucket(`${socketId}:__global__`, GLOBAL_RATE_LIMIT, now)) {
      this.recordViolation(socketId, now);
      return false;
    }

    // 2. Check per-event rate limit.
    const rule = EVENT_RATE_LIMITS[event];
    if (rule && !this.checkBucket(`${socketId}:${event}`, rule, now)) {
      this.recordViolation(socketId, now);
      return false;
    }

    return true;
  }

  /**
   * Returns whether the socket should be disconnected due to
   * excessive violations.
   */
  shouldDisconnect(socketId: string): boolean {
    const now = Date.now();
    const v = this.violations.get(socketId);
    if (!v) return false;

    // Filter to violations within the window.
    const recent = v.filter((t) => now - t < VIOLATION_WINDOW_MS);
    this.violations.set(socketId, recent);

    return recent.length >= MAX_VIOLATIONS;
  }

  /** Clean up all data for a disconnected socket. */
  removeSocket(socketId: string): void {
    const prefix = `${socketId}:`;
    for (const key of this.buckets.keys()) {
      if (key.startsWith(prefix)) {
        this.buckets.delete(key);
      }
    }
    this.violations.delete(socketId);
  }

  /** Shut down the periodic cleanup timer. */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private checkBucket(key: string, rule: RateLimitRule, now: number): boolean {
    let timestamps = this.buckets.get(key);

    if (!timestamps) {
      timestamps = [];
      this.buckets.set(key, timestamps);
    }

    // Evict expired entries.
    const cutoff = now - rule.windowMs;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= rule.max) {
      return false;
    }

    timestamps.push(now);
    return true;
  }

  private recordViolation(socketId: string, now: number): void {
    let v = this.violations.get(socketId);
    if (!v) {
      v = [];
      this.violations.set(socketId, v);
    }
    v.push(now);
  }

  /** Remove all expired entries to prevent memory leaks. */
  private purgeStale(): void {
    const now = Date.now();

    for (const [key, timestamps] of this.buckets) {
      // Find the largest window any rule uses.
      const filtered = timestamps.filter((t) => now - t < 60_000);
      if (filtered.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, filtered);
      }
    }

    for (const [socketId, v] of this.violations) {
      const filtered = v.filter((t) => now - t < VIOLATION_WINDOW_MS);
      if (filtered.length === 0) {
        this.violations.delete(socketId);
      } else {
        this.violations.set(socketId, filtered);
      }
    }
  }
}
