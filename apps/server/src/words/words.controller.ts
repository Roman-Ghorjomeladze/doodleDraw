import { Controller, Get, Query } from '@nestjs/common';
import { WordsService } from './words.service';

@Controller('api/words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  /**
   * GET /api/words/random?lang=en&difficulty=1&count=3
   */
  @Get('random')
  async getRandomWords(
    @Query('lang') lang: string = 'en',
    @Query('difficulty') difficulty: string = '1',
    @Query('count') count: string = '3',
  ) {
    return this.wordsService.getRandomWords(
      lang,
      parseInt(difficulty, 10),
      parseInt(count, 10),
    );
  }

  /**
   * GET /api/words/languages
   */
  @Get('languages')
  async getLanguages() {
    return this.wordsService.getLanguages();
  }
}
