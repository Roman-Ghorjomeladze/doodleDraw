import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProfileDocument = HydratedDocument<ProfileDoc>;

@Schema({
  timestamps: true,
  collection: 'playerProfiles',
})
export class ProfileDoc {
  @Prop({ required: true, unique: true, index: true })
  persistentId!: string;

  @Prop({ required: true })
  nickname!: string;

  @Prop({ required: true })
  avatar!: string;

  @Prop({ default: 0 })
  totalGames!: number;

  @Prop({ default: 0 })
  totalWins!: number;

  @Prop({ default: 0 })
  totalScore!: number;

  /** Elo rating — starts at 1200. */
  @Prop({ default: 1200 })
  eloRating!: number;

  @Prop({ default: 0 })
  correctGuesses!: number;

  @Prop({ default: 0 })
  totalDrawings!: number;

  /** Aggregate score earned during the current week (resets weekly). */
  @Prop({ default: 0 })
  weeklyScore!: number;

  @Prop({ default: 0 })
  weeklyGames!: number;

  /** ISO date string of last Monday 00:00 when weekly stats were reset. */
  @Prop({ type: String, default: null })
  lastWeekReset!: string | null;

  /** Most frequently drawn/guessed word. */
  @Prop({ type: String, default: null })
  favoriteWord!: string | null;

  /** Word frequency map for computing favoriteWord. */
  @Prop({ type: Object, default: {} })
  wordFrequency!: Record<string, number>;

  // --- Auth fields (optional — null for anonymous users) ---

  @Prop({ type: String, default: undefined })
  username?: string;

  @Prop({ type: String, default: undefined })
  passwordHash?: string;

  @Prop({ type: String, default: undefined })
  country?: string;

  @Prop({ type: Number, default: undefined })
  birthYear?: number;

  /** All anonymous persistentIds that have been merged into this account. */
  @Prop({ type: [String], default: [] })
  linkedPersistentIds!: string[];

  /** Admin flag — toggled manually via Mongo shell. Default false. */
  @Prop({ type: Boolean, default: false, index: true })
  isAdmin!: boolean;

  /**
   * Soft-delete timestamp. `null` means the user is active. Set to a Date
   * when an admin deletes the user; the profile is preserved so it can be
   * restored. Login, leaderboards, search, and profile lookups all filter
   * out accounts with a non-null `deletedAt`.
   */
  @Prop({ type: Date, default: null, index: true })
  deletedAt!: Date | null;
}

export const ProfileDocSchema = SchemaFactory.createForClass(ProfileDoc);

// For leaderboard queries.
ProfileDocSchema.index({ totalScore: -1 });
ProfileDocSchema.index({ eloRating: -1 });
ProfileDocSchema.index({ weeklyScore: -1 });
ProfileDocSchema.index({ username: 1 }, { unique: true, sparse: true });
ProfileDocSchema.index({ country: 1, eloRating: -1 });
ProfileDocSchema.index({ birthYear: 1, eloRating: -1 });
