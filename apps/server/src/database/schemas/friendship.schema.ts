import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FriendshipDocument = HydratedDocument<FriendshipDoc>;

@Schema({
  timestamps: true,
  collection: 'friendships',
})
export class FriendshipDoc {
  /** Always the lexicographically smaller persistentId. */
  @Prop({ required: true, index: true })
  userA!: string;

  /** Always the lexicographically larger persistentId. */
  @Prop({ required: true, index: true })
  userB!: string;
}

export const FriendshipDocSchema = SchemaFactory.createForClass(FriendshipDoc);

FriendshipDocSchema.index({ userA: 1, userB: 1 }, { unique: true });
