import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers['authorization'] as string | undefined;

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = auth.slice(7);
    const persistentId = await this.authService.validateToken(token);

    if (!persistentId) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach persistentId to request for downstream use.
    request.persistentId = persistentId;
    request.authToken = token;

    return true;
  }
}
