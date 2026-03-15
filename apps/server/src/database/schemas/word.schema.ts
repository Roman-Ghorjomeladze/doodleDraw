import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WordDocument = HydratedDocument<Word>;

@Schema({ timestamps: true })
export class Word {
  @Prop({ type: Types.ObjectId, ref: 'Language', required: true })
  languageId!: Types.ObjectId;

  @Prop({ required: true })
  word!: string;

  @Prop({ required: true })
  difficulty!: number;
}

export const WordSchema = SchemaFactory.createForClass(Word);

// Index for the primary query: getRandomWords(languageCode, difficulty)
WordSchema.index({ languageId: 1, difficulty: 1 });
