import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';

type LeaderboardType = 'allTime' | 'weekly' | 'country' | 'age';
const VALID_TYPES: LeaderboardType[] = ['allTime', 'weekly', 'country', 'age'];

@Controller('api/leaderboard')
export class LeaderboardController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async get(
    @Query('type') typeRaw?: string,
    @Query('country') country?: string,
    @Query('ageGroup') ageGroup?: string,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
    @Query('page') pageRaw?: string,
  ) {
    const type: LeaderboardType = VALID_TYPES.includes(typeRaw as LeaderboardType)
      ? (typeRaw as LeaderboardType)
      : 'allTime';

    // Parse limit (pageSize): default 20, max 100.
    let limit = 20;
    if (limitRaw) {
      const parsed = parseInt(limitRaw, 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 100) {
        limit = parsed;
      }
    }

    // Parse offset — either directly, or derived from 1-indexed page.
    let offset = 0;
    if (offsetRaw) {
      const parsed = parseInt(offsetRaw, 10);
      if (Number.isFinite(parsed) && parsed >= 0) offset = parsed;
    } else if (pageRaw) {
      const page = parseInt(pageRaw, 10);
      if (Number.isFinite(page) && page >= 1) offset = (page - 1) * limit;
    }

    try {
      const { players, total } = await this.profileService.getLeaderboard(
        type,
        { country, ageGroup, offset },
        limit,
      );
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return {
        players,
        type,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages,
          hasMore: offset + players.length < total,
        },
      };
    } catch (err: any) {
      throw new HttpException(err.message ?? 'Failed to load leaderboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
