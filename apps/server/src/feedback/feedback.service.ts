import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedbackDoc, FeedbackDocument } from '../database/schemas/feedback.schema';

const VALID_CATEGORIES = ['bug', 'feedback', 'other'] as const;
const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'dismissed'] as const;

export type FeedbackCategory = (typeof VALID_CATEGORIES)[number];
export type FeedbackStatus = (typeof VALID_STATUSES)[number];

export interface CreateFeedbackInput {
  message: string;
  category?: FeedbackCategory;
  submitter?: {
    persistentId?: string;
    username?: string;
    nickname?: string;
  };
  pageUrl?: string;
  userAgent?: string;
  trace?: Record<string, any> | null;
}

/** Reject trace payloads larger than this (bytes of JSON) to keep documents small. */
const MAX_TRACE_JSON_BYTES = 64 * 1024;

function sanitizeTrace(raw: any): Record<string, any> | null {
  if (!raw || typeof raw !== 'object') return null;
  try {
    const serialized = JSON.stringify(raw);
    if (serialized.length > MAX_TRACE_JSON_BYTES) {
      // Truncate: keep a best-effort "hint" that something was dropped.
      return {
        _truncated: true,
        _originalSizeBytes: serialized.length,
        _hint: `Client trace exceeded ${MAX_TRACE_JSON_BYTES} bytes and was dropped.`,
      };
    }
    return raw;
  } catch {
    return null;
  }
}

export interface UpdateFeedbackInput {
  message?: string;
  category?: FeedbackCategory;
  status?: FeedbackStatus;
  adminNotes?: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectModel(FeedbackDoc.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
  ) {}

  async createFeedback(input: CreateFeedbackInput): Promise<FeedbackDocument> {
    const message = input.message?.trim();
    if (!message || message.length < 1 || message.length > 2000) {
      throw new Error('Feedback message must be 1-2000 characters.');
    }

    const category: FeedbackCategory =
      input.category && VALID_CATEGORIES.includes(input.category)
        ? input.category
        : 'feedback';

    const doc = await this.feedbackModel.create({
      message,
      category,
      status: 'open',
      submitterPersistentId: input.submitter?.persistentId ?? null,
      submitterUsername: input.submitter?.username ?? null,
      submitterNickname: input.submitter?.nickname ?? null,
      pageUrl: input.pageUrl ?? null,
      userAgent: input.userAgent ?? null,
      adminNotes: null,
      trace: sanitizeTrace(input.trace),
    });

    return doc;
  }

  async getFeedback(options: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  }): Promise<{
    feedback: any[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.max(1, Math.min(100, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (options.status && VALID_STATUSES.includes(options.status as FeedbackStatus)) {
      query.status = options.status;
    }
    if (options.category && VALID_CATEGORIES.includes(options.category as FeedbackCategory)) {
      query.category = options.category;
    }

    const [feedback, total] = await Promise.all([
      this.feedbackModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.feedbackModel.countDocuments(query).exec(),
    ]);

    return {
      feedback,
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getFeedbackById(id: string): Promise<any | null> {
    try {
      return await this.feedbackModel.findById(id).lean().exec();
    } catch {
      return null;
    }
  }

  async updateFeedback(id: string, updates: UpdateFeedbackInput): Promise<any | null> {
    const sanitized: Record<string, any> = {};

    if (updates.message !== undefined) {
      const m = updates.message.trim();
      if (m.length < 1 || m.length > 2000) {
        throw new Error('Feedback message must be 1-2000 characters.');
      }
      sanitized.message = m;
    }
    if (updates.category !== undefined) {
      if (!VALID_CATEGORIES.includes(updates.category)) {
        throw new Error('Invalid category.');
      }
      sanitized.category = updates.category;
    }
    if (updates.status !== undefined) {
      if (!VALID_STATUSES.includes(updates.status)) {
        throw new Error('Invalid status.');
      }
      sanitized.status = updates.status;
    }
    if (updates.adminNotes !== undefined) {
      const notes = String(updates.adminNotes).trim();
      sanitized.adminNotes = notes.length === 0 ? null : notes.slice(0, 2000);
    }

    try {
      return await this.feedbackModel
        .findByIdAndUpdate(id, { $set: sanitized }, { new: true })
        .lean()
        .exec();
    } catch {
      return null;
    }
  }

  async deleteFeedback(id: string): Promise<boolean> {
    try {
      const result = await this.feedbackModel.deleteOne({ _id: id }).exec();
      return result.deletedCount > 0;
    } catch {
      return false;
    }
  }
}
