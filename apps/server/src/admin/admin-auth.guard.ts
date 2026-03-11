import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AdminAuthGuard implements CanActivate {
  /** In-memory token store: token → expiry timestamp. */
  private static readonly tokens = new Map<string, number>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers['authorization'] as string | undefined;

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = auth.slice(7);
    const expiry = AdminAuthGuard.tokens.get(token);

    if (!expiry || Date.now() > expiry) {
      AdminAuthGuard.tokens.delete(token);
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  /** Issue a new token and return it. */
  static issueToken(): string {
    const token = Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2),
    ).join('');
    AdminAuthGuard.tokens.set(token, Date.now() + TOKEN_TTL_MS);
    return token;
  }

  /** Periodically clean expired tokens (called from controller). */
  static cleanExpired(): void {
    const now = Date.now();
    for (const [token, expiry] of AdminAuthGuard.tokens) {
      if (now > expiry) AdminAuthGuard.tokens.delete(token);
    }
  }
}
