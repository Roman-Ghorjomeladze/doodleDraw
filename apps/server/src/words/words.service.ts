import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Language, LanguageDocument } from '../database/schemas/language.schema';
import { Word, WordDocument } from '../database/schemas/word.schema';

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);

  constructor(
    @InjectModel(Language.name) private languageModel: Model<LanguageDocument>,
    @InjectModel(Word.name) private wordModel: Model<WordDocument>,
  ) {}

  /**
   * Retrieve N random words for a given language and difficulty level.
   * If botOnly is true, only returns words that have a matching Quick Draw drawing.
   */
  async getRandomWords(
    languageCode: string,
    difficulty: number,
    count: number,
    botOnly = false,
  ): Promise<{ word: string; difficulty: number; quickDrawCategory?: string }[]> {
    const language = await this.languageModel.findOne({ code: languageCode });
    if (!language) {
      this.logger.warn(`Language not found: ${languageCode}`);
      return [];
    }

    const match: Record<string, unknown> = { languageId: language._id, difficulty };
    if (botOnly) {
      match.botCompatible = true;
    }

    const rows = await this.wordModel.aggregate<{ word: string; difficulty: number; quickDrawCategory?: string }>([
      { $match: match },
      { $sample: { size: count } },
      { $project: { _id: 0, word: 1, difficulty: 1, quickDrawCategory: 1 } },
    ]);

    return rows;
  }

  /**
   * Retrieve all available languages.
   */
  async getLanguages(): Promise<LanguageDocument[]> {
    return this.languageModel.find().exec();
  }
}
