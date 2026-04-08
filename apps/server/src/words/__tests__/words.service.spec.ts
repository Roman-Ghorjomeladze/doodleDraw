import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WordsService } from '../words.service';
import { Language } from '../../database/schemas/language.schema';
import { Word } from '../../database/schemas/word.schema';

describe('WordsService', () => {
  let service: WordsService;

  const mockLanguageModel = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockWordModel = {
    aggregate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordsService,
        { provide: getModelToken(Language.name), useValue: mockLanguageModel },
        { provide: getModelToken(Word.name), useValue: mockWordModel },
      ],
    }).compile();

    service = module.get<WordsService>(WordsService);
  });

  // -------------------------------------------------------------------------
  // getRandomWords
  // -------------------------------------------------------------------------

  describe('getRandomWords', () => {
    it('returns an empty array when the language cannot be found', async () => {
      mockLanguageModel.findOne.mockResolvedValueOnce(null);

      const result = await service.getRandomWords('zz', 1, 3);

      expect(result).toEqual([]);
      expect(mockLanguageModel.findOne).toHaveBeenCalledWith({ code: 'zz' });
      expect(mockWordModel.aggregate).not.toHaveBeenCalled();
    });

    it('queries words by language id and difficulty and returns aggregate result', async () => {
      mockLanguageModel.findOne.mockResolvedValueOnce({ _id: 'lang-en', code: 'en' });
      mockWordModel.aggregate.mockResolvedValueOnce([
        { word: 'cat', difficulty: 1 },
        { word: 'dog', difficulty: 1 },
      ]);

      const result = await service.getRandomWords('en', 1, 2);

      expect(result).toEqual([
        { word: 'cat', difficulty: 1 },
        { word: 'dog', difficulty: 1 },
      ]);
      expect(mockWordModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = mockWordModel.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({
        $match: { languageId: 'lang-en', difficulty: 1 },
      });
      expect(pipeline[1]).toEqual({ $sample: { size: 2 } });
    });

    it('does NOT add the botCompatible filter when botOnly is false', async () => {
      mockLanguageModel.findOne.mockResolvedValueOnce({ _id: 'lang-en' });
      mockWordModel.aggregate.mockResolvedValueOnce([]);

      await service.getRandomWords('en', 2, 3, false);

      const pipeline = mockWordModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.botCompatible).toBeUndefined();
    });

    it('adds the botCompatible filter when botOnly is true', async () => {
      mockLanguageModel.findOne.mockResolvedValueOnce({ _id: 'lang-en' });
      mockWordModel.aggregate.mockResolvedValueOnce([
        { word: 'cat', difficulty: 1, quickDrawCategory: 'cat' },
      ]);

      await service.getRandomWords('en', 1, 1, true);

      const pipeline = mockWordModel.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({
        $match: {
          languageId: 'lang-en',
          difficulty: 1,
          botCompatible: true,
        },
      });
    });

    it('uses the requested sample size in the $sample stage', async () => {
      mockLanguageModel.findOne.mockResolvedValueOnce({ _id: 'lang-en' });
      mockWordModel.aggregate.mockResolvedValueOnce([]);

      await service.getRandomWords('en', 1, 7);

      const pipeline = mockWordModel.aggregate.mock.calls[0][0];
      expect(pipeline[1]).toEqual({ $sample: { size: 7 } });
    });
  });

  // -------------------------------------------------------------------------
  // getLanguages
  // -------------------------------------------------------------------------

  describe('getLanguages', () => {
    it('returns all languages from the language model', async () => {
      const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
      ];
      const execMock = jest.fn().mockResolvedValue(languages);
      mockLanguageModel.find.mockReturnValue({ exec: execMock });

      const result = await service.getLanguages();

      expect(mockLanguageModel.find).toHaveBeenCalled();
      expect(execMock).toHaveBeenCalled();
      expect(result).toEqual(languages);
    });
  });
});
