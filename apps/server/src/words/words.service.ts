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
   */
  async getRandomWords(
    languageCode: string,
    difficulty: number,
    count: number,
  ): Promise<{ word: string; difficulty: number }[]> {
    const language = await this.languageModel.findOne({ code: languageCode });
    if (!language) {
      this.logger.warn(`Language not found: ${languageCode}`);
      return [];
    }

    // $sample is MongoDB's equivalent of ORDER BY RANDOM() LIMIT N
    const rows = await this.wordModel.aggregate<{ word: string; difficulty: number }>([
      { $match: { languageId: language._id, difficulty } },
      { $sample: { size: count } },
      { $project: { _id: 0, word: 1, difficulty: 1 } },
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
