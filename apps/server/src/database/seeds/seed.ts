import mongoose from 'mongoose';

import { LanguageSchema } from '../schemas/language.schema';
import { WordSchema } from '../schemas/word.schema';
import { WordSeedData } from './seed-types';
import { enWords } from './words-en';
import { kaWords } from './words-ka';
import { trWords } from './words-tr';
import { ruWords } from './words-ru';
import { BOT_WORDS } from './bot-words';

// Note: .env is loaded via -r dotenv/config in the db:seed script

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg: string): void {
  console.log(`[seed] ${msg}`);
}

function normalizeWord(w: string): string {
  return w.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is required.');
    console.error('Set it in apps/server/.env or pass it directly.');
    process.exit(1);
  }

  log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  log('Connected');

  const Language = mongoose.model('Language', LanguageSchema);
  const Word = mongoose.model('Word', WordSchema);

  // Clear existing data
  log('Clearing existing data...');
  await Word.deleteMany({});
  await Language.deleteMany({});
  log('Existing data cleared');

  // Build a set of bot-compatible words per language for quick lookup
  const botWordSets: Record<string, Set<string>> = { en: new Set(), ka: new Set(), ru: new Set(), tr: new Set() };
  const botWordQuickDraw: Record<string, Map<string, string>> = { en: new Map(), ka: new Map(), ru: new Map(), tr: new Map() };
  const botWordDocs: Record<string, { word: string; difficulty: number; botCompatible: boolean; quickDrawCategory: string }[]> = {
    en: [], ka: [], ru: [], tr: [],
  };

  for (const entry of BOT_WORDS) {
    for (const lang of ['en', 'ka', 'ru', 'tr'] as const) {
      const word = entry[lang];
      if (word) {
        const normalized = normalizeWord(word);
        botWordSets[lang].add(normalized);
        botWordQuickDraw[lang].set(normalized, entry.quickDraw);
        botWordDocs[lang].push({ word, difficulty: entry.difficulty, botCompatible: true, quickDrawCategory: entry.quickDraw });
      }
    }
  }

  // Seed all languages
  const allWords: WordSeedData[] = [enWords, kaWords, trWords, ruWords];

  for (const data of allWords) {
    const { code, name, nativeName } = data.language;

    // Insert language
    const lang = await Language.create({ code, name, nativeName });
    log(`Inserted language: ${name} (${nativeName}) [id=${lang._id}]`);

    // Collect all words from seed file (mark bot-compatible if they match)
    const seenWords = new Set<string>();
    const allDocs: { languageId: typeof lang._id; word: string; difficulty: number; botCompatible: boolean; quickDrawCategory?: string }[] = [];

    // First, add regular seed words
    const difficultyMap: { level: number; label: string; words: (string | { word: string; botCompatible?: boolean })[] }[] = [
      { level: 1, label: 'easy', words: data.words.easy },
      { level: 2, label: 'medium', words: data.words.medium },
      { level: 3, label: 'hard', words: data.words.hard },
    ];

    for (const { level, words } of difficultyMap) {
      for (const w of words) {
        const word = typeof w === 'string' ? w : w.word;
        const normalized = normalizeWord(word);
        if (seenWords.has(normalized)) continue;
        seenWords.add(normalized);

        const isBotCompatible = botWordSets[code]?.has(normalized) ?? false;
        const quickDraw = botWordQuickDraw[code]?.get(normalized) ?? undefined;
        allDocs.push({
          languageId: lang._id,
          word,
          difficulty: level,
          botCompatible: isBotCompatible,
          quickDrawCategory: quickDraw,
        });
      }
    }

    // Then, add bot words that aren't already in the seed
    const langBotDocs = botWordDocs[code] || [];
    let botAdded = 0;
    for (const bd of langBotDocs) {
      const normalized = normalizeWord(bd.word);
      if (seenWords.has(normalized)) continue;
      seenWords.add(normalized);
      allDocs.push({
        languageId: lang._id,
        word: bd.word,
        difficulty: bd.difficulty,
        botCompatible: true,
        quickDrawCategory: bd.quickDrawCategory,
      });
      botAdded++;
    }

    await Word.insertMany(allDocs);

    const regularCount = allDocs.length - botAdded;
    const botCompatibleCount = allDocs.filter(d => d.botCompatible).length;
    log(`  ${code}: ${regularCount} regular + ${botAdded} bot-only = ${allDocs.length} total (${botCompatibleCount} bot-compatible)`);
  }

  // Summary
  const langCount = await Language.countDocuments();
  const wordCount = await Word.countDocuments();
  const botWordCount = await Word.countDocuments({ botCompatible: true });

  log('');
  log('=== Seed complete ===');
  log(`Languages:       ${langCount}`);
  log(`Words:           ${wordCount}`);
  log(`Bot-compatible:  ${botWordCount}`);

  await mongoose.disconnect();
  log('Connection closed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
