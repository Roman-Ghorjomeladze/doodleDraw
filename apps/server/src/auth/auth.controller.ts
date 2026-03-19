import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserAuthGuard } from './auth.guard';
import type { AuthRegisterRequest, AuthLoginRequest } from '@doodledraw/shared';

/** Simple IP-based rate limiter for auth endpoints. */
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 10;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): void {
  const entry = loginAttempts.get(ip);
  if (entry) {
    if (Date.now() < entry.blockedUntil) {
      throw new HttpException('Too many attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (entry.count >= MAX_ATTEMPTS) {
      entry.blockedUntil = Date.now() + BLOCK_DURATION_MS;
      throw new HttpException('Too many attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}

function recordAttempt(ip: string): void {
  const entry = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  entry.count++;
  loginAttempts.set(ip, entry);
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() data: AuthRegisterRequest,
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection?.remoteAddress || '';
    checkRateLimit(ip);

    try {
      const result = await this.authService.register(data);
      clearAttempts(ip);
      return result;
    } catch (err: any) {
      recordAttempt(ip);
      if (err.message === 'Username already taken') {
        throw new HttpException(err.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() data: AuthLoginRequest,
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection?.remoteAddress || '';
    checkRateLimit(ip);

    try {
      const result = await this.authService.login(data);
      clearAttempts(ip);
      return result;
    } catch (err: any) {
      recordAttempt(ip);
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('me')
  @UseGuards(UserAuthGuard)
  async getMe(@Req() req: any) {
    const user = await this.authService.getAuthUser(req.persistentId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Put('profile')
  @UseGuards(UserAuthGuard)
  async updateProfile(
    @Req() req: any,
    @Body() data: { nickname?: string; avatar?: string; country?: string; birthYear?: number },
  ) {
    const user = await this.authService.updateProfile(req.persistentId, data);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Post('logout')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: any) {
    await this.authService.logout(req.authToken);
  }
}
