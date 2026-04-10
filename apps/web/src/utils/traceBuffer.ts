/**
 * Lightweight in-memory diagnostic buffer that the Feedback modal attaches
 * to every submission. Installs once on module load (via side-effect import
 * from main.tsx). Never throws, never forwards anything off the device
 * except when the user explicitly sends feedback.
 */

const MAX_CONSOLE_ENTRIES = 50;
const MAX_NETWORK_ENTRIES = 30;
const MAX_STRING_LENGTH = 500; // truncate each argument to keep total payload small

interface ConsoleEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  timestamp: number;
  message: string;
}

interface NetworkEntry {
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  ok?: boolean;
  error?: string;
}

const consoleBuffer: ConsoleEntry[] = [];
const networkBuffer: NetworkEntry[] = [];

let installed = false;

function truncate(str: string): string {
  if (str.length <= MAX_STRING_LENGTH) return str;
  return str.slice(0, MAX_STRING_LENGTH) + `…(+${str.length - MAX_STRING_LENGTH} chars)`;
}

function stringifyArg(arg: unknown): string {
  try {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
    }
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean' || arg == null) return String(arg);
    return JSON.stringify(arg);
  } catch {
    return '[unserializable]';
  }
}

function recordConsole(level: ConsoleEntry['level'], args: unknown[]) {
  const message = truncate(args.map(stringifyArg).join(' '));
  consoleBuffer.push({ level, timestamp: Date.now(), message });
  if (consoleBuffer.length > MAX_CONSOLE_ENTRIES) {
    consoleBuffer.shift();
  }
}

function recordNetwork(entry: NetworkEntry) {
  networkBuffer.push(entry);
  if (networkBuffer.length > MAX_NETWORK_ENTRIES) {
    networkBuffer.shift();
  }
}

export function installTraceBuffer(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // ── Wrap console methods ────────────────────────────────────────────
  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  (['log', 'info', 'warn', 'error'] as const).forEach((level) => {
    const original = originalConsole[level];
    console[level] = (...args: unknown[]) => {
      try {
        recordConsole(level, args);
      } catch {
        // Never let buffer bookkeeping break the app.
      }
      original(...args);
    };
  });

  // ── Wrap fetch ──────────────────────────────────────────────────────
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const [input, init] = args;
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET')).toUpperCase();
    const url = typeof input === 'string' ? input : (input as URL | Request).toString();
    const started = Date.now();
    try {
      const res = await originalFetch(...args);
      // Only buffer non-success responses and a few errors — successful chatter is noise.
      if (!res.ok) {
        recordNetwork({
          timestamp: started,
          method,
          url: truncate(url),
          status: res.status,
          durationMs: Date.now() - started,
          ok: false,
        });
      }
      return res;
    } catch (err: any) {
      recordNetwork({
        timestamp: started,
        method,
        url: truncate(url),
        durationMs: Date.now() - started,
        ok: false,
        error: err?.message ?? String(err),
      });
      throw err;
    }
  };

  // ── Capture uncaught errors ─────────────────────────────────────────
  window.addEventListener('error', (e) => {
    recordConsole('error', [
      `Uncaught: ${e.message}`,
      e.filename ? `at ${e.filename}:${e.lineno}:${e.colno}` : '',
    ]);
  });

  window.addEventListener('unhandledrejection', (e) => {
    recordConsole('error', [
      'Unhandled promise rejection:',
      e.reason instanceof Error ? e.reason : String(e.reason),
    ]);
  });
}

/**
 * Collect a full diagnostic snapshot to attach to a feedback submission.
 * Reads from the buffers plus a few live values (viewport, locale, etc.).
 */
export function collectTrace(extra?: {
  gameState?: Record<string, any>;
  appVersion?: string;
}): Record<string, any> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const win = typeof window !== 'undefined' ? window : undefined;
  const conn: any = (nav as any)?.connection;

  return {
    capturedAt: new Date().toISOString(),
    // Environment
    env: {
      userAgent: nav?.userAgent ?? null,
      platform: (nav as any)?.userAgentData?.platform ?? (nav as any)?.platform ?? null,
      language: nav?.language ?? null,
      languages: nav?.languages ? Array.from(nav.languages) : null,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      onLine: nav?.onLine ?? null,
      cookieEnabled: nav?.cookieEnabled ?? null,
      hardwareConcurrency: nav?.hardwareConcurrency ?? null,
      deviceMemory: (nav as any)?.deviceMemory ?? null,
      connection: conn
        ? {
            effectiveType: conn.effectiveType ?? null,
            downlink: conn.downlink ?? null,
            rtt: conn.rtt ?? null,
            saveData: conn.saveData ?? null,
          }
        : null,
    },
    // Viewport
    viewport: win
      ? {
          innerWidth: win.innerWidth,
          innerHeight: win.innerHeight,
          devicePixelRatio: win.devicePixelRatio,
          screenWidth: win.screen?.width ?? null,
          screenHeight: win.screen?.height ?? null,
          orientation: (win.screen as any)?.orientation?.type ?? null,
        }
      : null,
    // URL + referrer
    location: win
      ? {
          href: win.location.href,
          pathname: win.location.pathname,
          hash: win.location.hash,
          referrer: (typeof document !== 'undefined' ? document.referrer : null) || null,
        }
      : null,
    // App-level context injected by the caller.
    app: {
      version: extra?.appVersion ?? null,
      gameState: extra?.gameState ?? null,
    },
    // Recent logs (most recent first for easier scanning).
    consoleLogs: [...consoleBuffer].reverse(),
    networkIssues: [...networkBuffer].reverse(),
    // Storage size hints.
    storage: (() => {
      try {
        const local = Object.keys(localStorage).length;
        const session = Object.keys(sessionStorage).length;
        return { localStorageKeys: local, sessionStorageKeys: session };
      } catch {
        return null;
      }
    })(),
  };
}
