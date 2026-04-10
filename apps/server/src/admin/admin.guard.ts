import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ProfileDoc, ProfileDocument } from '../database/schemas/profile.schema';

/**
 * Guards admin-only endpoints. Requires a valid user Bearer token AND
 * the profile must have `isAdmin: true`. No env var / legacy admin login.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(ProfileDoc.name)
    private readonly profileModel: Model<ProfileDocument>,
  ) {}

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

    const profile = await this.profileModel.findOne({ persistentId }).lean().exec();
    if (!profile || !profile.isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }

    // Attach for downstream handlers.
    request.persistentId = persistentId;
    request.authToken = token;
    request.isAdmin = true;

    return true;
  }
}
