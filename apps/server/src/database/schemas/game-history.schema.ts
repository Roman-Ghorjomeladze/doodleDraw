import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GameHistoryDocument = HydratedDocument<GameHistoryDoc>;

@Schema({ _id: false })
export class GameHistoryPlayerDoc {
  @Prop({ required: true })
  persistentId!: string;

  @Prop({ required: true })
  nickname!: string;

  @Prop({ required: true })
  avatar!: string;

  @Prop({ default: 0 })
  finalScore!: number;

  @Prop({ default: false })
  isBot!: boolean;

  @Prop({ type: String, default: null })
  team!: string | null;

  @Prop({ default: false })
  isHost!: boolean;

  @Prop({ default: true })
  wasConnected!: boolean;
}

const GameHistoryPlayerDocSchema = SchemaFactory.createForClass(GameHistoryPlayerDoc);

@Schema({
  timestamps: true,
  collection: 'gameHistory',
})
export class GameHistoryDoc {
  @Prop({ required: true })
  roomId!: string;

  @Prop({ required: true, enum: ['classic', 'team'] })
  mode!: string;

  @Prop({
    required: true,
    enum: ['completed', 'admin_ended', 'cleaned_up', 'abandoned'],
  })
  endReason!: string;

  /** Game phase at the moment the game was archived. */
  @Prop({ required: true })
  finalPhase!: string;

  @Prop({ type: [GameHistoryPlayerDocSchema], default: [] })
  players!: GameHistoryPlayerDoc[];

  @Prop({ type: String, default: null })
  winnerPersistentId!: string | null;

  @Prop({ type: String, enum: ['A', 'B', null], default: null })
  winnerTeam!: string | null;

  @Prop({ type: Number, default: 0 })
  teamAScore!: number;

  @Prop({ type: Number, default: 0 })
  teamBScore!: number;

  @Prop({ default: 0 })
  roundsPlayed!: number;

  @Prop({ default: 0 })
  totalRounds!: number;

  @Prop({ default: 'en' })
  language!: string;

  @Prop({ type: Date, required: true })
  startedAt!: Date;

  @Prop({ type: Date, required: true })
  endedAt!: Date;

  /** Snapshot of settings at end time. */
  @Prop({ type: Object, default: {} })
  settings!: Record<string, any>;
}

export const GameHistoryDocSchema = SchemaFactory.createForClass(GameHistoryDoc);

// Indexes.
GameHistoryDocSchema.index({ endedAt: -1 });
GameHistoryDocSchema.index({ endReason: 1 });
GameHistoryDocSchema.index({ 'players.persistentId': 1 });
// NO TTL — history is permanent.
