import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/* ------------------------------------------------------------------ */
/*  Sub-document: a single player snapshot (keyed by persistentId)    */
/* ------------------------------------------------------------------ */

export class PlayerDoc {
  @Prop({ required: true })
  persistentId!: string;

  @Prop({ required: true })
  nickname!: string;

  @Prop({ required: true })
  avatar!: string;

  @Prop({ default: 0 })
  score!: number;

  @Prop()
  team?: string;

  @Prop({ default: false })
  isDrawing!: boolean;

  @Prop({ default: false })
  hasDrawn!: boolean;

  @Prop({ default: false })
  isHost!: boolean;

  @Prop({ default: true })
  isConnected!: boolean;

  @Prop({ default: false })
  isSpectator!: boolean;

  @Prop({ default: false })
  isBot!: boolean;

  @Prop()
  botDifficulty?: string;
}

/* ------------------------------------------------------------------ */
/*  Sub-document: pending word option                                 */
/* ------------------------------------------------------------------ */

export class PendingWordDoc {
  @Prop({ required: true })
  word!: string;

  @Prop({ required: true })
  difficulty!: number;
}

/* ------------------------------------------------------------------ */
/*  Main Room document                                                */
/* ------------------------------------------------------------------ */

export type RoomDocument = HydratedDocument<RoomDoc>;

@Schema({
  timestamps: true,
  collection: 'rooms',
})
export class RoomDoc {
  /** Room code (6-char), used as _id. */
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  mode!: string; // 'classic' | 'team'

  @Prop({ required: true })
  phase!: string; // GamePhase

  @Prop({ required: true, default: 'active' })
  status!: string; // 'active' | 'completed' | 'abandoned'

  @Prop({ type: Object, required: true })
  settings!: Record<string, any>;

  @Prop({ type: [Object], default: [] })
  players!: PlayerDoc[];

  @Prop({ default: 0 })
  currentRound!: number;

  @Prop({ type: String, default: null })
  currentWord!: string | null;

  @Prop({ default: '' })
  wordHint!: string;

  /** Drawer references stored as persistentIds. */
  @Prop({ type: String, default: null })
  drawerPersistentId!: string | null;

  @Prop({ type: String, default: null })
  teamADrawerPersistentId!: string | null;

  @Prop({ type: String, default: null })
  teamBDrawerPersistentId!: string | null;

  @Prop({ type: [String], default: [] })
  correctGuesserPersistentIds!: string[];

  @Prop({ type: [Object], default: [] })
  pendingWords!: PendingWordDoc[];

  /** Draw order as persistentIds. */
  @Prop({ type: [String], default: [] })
  drawOrderPersistentIds!: string[];

  @Prop({ default: 0 })
  drawOrderIndex!: number;

  @Prop({ default: 0 })
  teamAScore!: number;

  @Prop({ default: 0 })
  teamBScore!: number;

  @Prop({ type: String, default: null })
  lastWinningTeam!: string | null;

  @Prop({ default: false })
  isRedrawRound!: boolean;

  /** Map<persistentId, string[]> — words each player has drawn. */
  @Prop({ type: Object, default: {} })
  playerWordHistory!: Record<string, string[]>;

  /** Map<persistentId, RematchStatus>. */
  @Prop({ type: Object, default: {} })
  rematchVotes!: Record<string, string>;

  @Prop({ required: true })
  createdAt!: number; // original Room.createdAt (epoch ms)
}

export const RoomDocSchema = SchemaFactory.createForClass(RoomDoc);

// TTL index: auto-delete documents 24 hours after last update.
RoomDocSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86_400 });

// Fast lookup by status for startup loading.
RoomDocSchema.index({ status: 1 });
