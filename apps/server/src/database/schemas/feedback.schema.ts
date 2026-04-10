import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FeedbackDocument = HydratedDocument<FeedbackDoc>;

@Schema({
  timestamps: true,
  collection: 'feedback',
})
export class FeedbackDoc {
  @Prop({ required: true })
  message!: string;

  @Prop({
    required: true,
    enum: ['bug', 'feedback', 'other'],
    default: 'feedback',
    index: true,
  })
  category!: string;

  @Prop({
    required: true,
    enum: ['open', 'in_progress', 'resolved', 'dismissed'],
    default: 'open',
    index: true,
  })
  status!: string;

  @Prop({ type: String, default: null, index: true })
  submitterPersistentId!: string | null;

  @Prop({ type: String, default: null })
  submitterUsername!: string | null;

  @Prop({ type: String, default: null })
  submitterNickname!: string | null;

  @Prop({ type: String, default: null })
  pageUrl!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: String, default: null })
  adminNotes!: string | null;

  /**
   * Free-form client-side diagnostic snapshot captured at submit time:
   * viewport size, locale, timezone, recent console logs, recent network
   * errors, game state snapshot, app version, etc. Shape is intentionally
   * loose so the client can evolve what it sends without schema migrations.
   */
  @Prop({ type: Object, default: null })
  trace!: Record<string, any> | null;
}

export const FeedbackDocSchema = SchemaFactory.createForClass(FeedbackDoc);

// Indexes for admin list queries.
FeedbackDocSchema.index({ createdAt: -1 });
// NO TTL — feedback is permanent.
