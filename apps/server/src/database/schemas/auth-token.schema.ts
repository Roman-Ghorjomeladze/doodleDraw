import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthTokenDocument = HydratedDocument<AuthTokenDoc>;

@Schema({
  timestamps: true,
  collection: 'authTokens',
})
export class AuthTokenDoc {
  @Prop({ required: true, unique: true, index: true })
  token!: string;

  @Prop({ required: true, index: true })
  persistentId!: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const AuthTokenDocSchema = SchemaFactory.createForClass(AuthTokenDoc);

// TTL index: MongoDB auto-deletes expired tokens.
AuthTokenDocSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
