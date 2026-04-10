import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedbackService, FeedbackCategory, FeedbackStatus } from './feedback.service';
import { AuthService } from '../auth/auth.service';
import { AdminGuard } from '../admin/admin.guard';
import { ProfileDoc, ProfileDocument } from '../database/schemas/profile.schema';

// -------------------------------------------------------------------------
// Simple IP-based rate limiter for POST /api/feedback.
// -------------------------------------------------------------------------
const MAX_SUBMISSIONS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const submissions = new Map<string, number[]>();

function checkAndRecordRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const existing = submissions.get(ip) ?? [];
  const recent = existing.filter((t) => t > cutoff);
  if (recent.length >= MAX_SUBMISSIONS) {
    submissions.set(ip, recent);
    return false;
  }
  recent.push(now);
  submissions.set(ip, recent);
  return true;
}

// -------------------------------------------------------------------------
// Public controller — anonymous-friendly POST
// -------------------------------------------------------------------------
@Controller('api/feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly authService: AuthService,
    @InjectModel(ProfileDoc.name)
    private readonly profileModel: Model<ProfileDocument>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Body() body: {
      message?: string;
      category?: string;
      pageUrl?: string;
      trace?: Record<string, any> | null;
    },
    @Req() req: any,
    @Headers('authorization') authHeader?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkAndRecordRateLimit(ip)) {
      throw new HttpException('Too many submissions. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Optional auth: if a Bearer token is present and valid, capture submitter info.
    let submitter: { persistentId?: string; username?: string; nickname?: string } | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const persistentId = await this.authService.validateToken(token);
        if (persistentId) {
          const profile = await this.profileModel.findOne({ persistentId }).lean().exec();
          if (profile) {
            submitter = {
              persistentId: profile.persistentId,
              username: profile.username ?? undefined,
              nickname: profile.nickname,
            };
          }
        }
      } catch {
        // Anonymous fallback.
      }
    }

    try {
      const doc = await this.feedbackService.createFeedback({
        message: body?.message ?? '',
        category: body?.category as FeedbackCategory | undefined,
        submitter,
        pageUrl: body?.pageUrl,
        userAgent,
        trace: body?.trace ?? null,
      });
      return { id: (doc._id as any).toString() };
    } catch (err: any) {
      throw new HttpException(err.message ?? 'Failed to submit feedback', HttpStatus.BAD_REQUEST);
    }
  }
}

// -------------------------------------------------------------------------
// Admin controller — full CRUD, AdminGuard-protected
// -------------------------------------------------------------------------
@Controller('api/admin/feedback')
@UseGuards(AdminGuard)
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.feedbackService.getFeedback({
      page: Number.isFinite(parsedPage) ? parsedPage : 1,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 20,
      status,
      category,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const feedback = await this.feedbackService.getFeedbackById(id);
    if (!feedback) {
      throw new HttpException('Feedback not found', HttpStatus.NOT_FOUND);
    }
    return feedback;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { message?: string; category?: FeedbackCategory; status?: FeedbackStatus; adminNotes?: string },
  ) {
    try {
      const updated = await this.feedbackService.updateFeedback(id, body);
      if (!updated) {
        throw new HttpException('Feedback not found', HttpStatus.NOT_FOUND);
      }
      return updated;
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err.message ?? 'Failed to update feedback', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const deleted = await this.feedbackService.deleteFeedback(id);
    if (!deleted) {
      throw new HttpException('Feedback not found', HttpStatus.NOT_FOUND);
    }
  }
}
