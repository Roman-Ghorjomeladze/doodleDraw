import { Injectable, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { languages, words, Language, Word } from '../database/schema';

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Retrieve N random words for a given language and difficulty level.
   */
  async getRandomWords(
    languageCode: string,
    difficulty: number,
    count: number,
  ): Promise<Word[]> {
    const db = this.databaseService.getDb();

    const rows = db
      .select({
        id: words.id,
        languageId: words.languageId,
        word: words.word,
        difficulty: words.difficulty,
        createdAt: words.createdAt,
      })
      .from(words)
      .innerJoin(languages, eq(words.languageId, languages.id))
      .where(
        and(
          eq(languages.code, languageCode),
          eq(words.difficulty, difficulty),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(count)
      .all();

    return rows;
  }

  /**
   * Retrieve all available languages.
   */
  async getLanguages(): Promise<Language[]> {
    const db = this.databaseService.getDb();
    return db.select().from(languages).all();
  }
}
