import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FriendRequestDocument = HydratedDocument<FriendRequestDoc>;

@Schema({
  timestamps: true,
  collection: 'friendRequests',
})
export class FriendRequestDoc {
  @Prop({ required: true, index: true })
  fromPersistentId!: string;

  @Prop({ required: true, index: true })
  toPersistentId!: string;

  @Prop({ required: true, default: 'pending', enum: ['pending', 'accepted', 'rejected'] })
  status!: string;
}

export const FriendRequestDocSchema = SchemaFactory.createForClass(FriendRequestDoc);

// Prevent duplicate pending requests between the same pair.
FriendRequestDocSchema.index(
  { fromPersistentId: 1, toPersistentId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);
