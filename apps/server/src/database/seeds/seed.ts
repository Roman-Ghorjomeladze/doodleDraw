import mongoose from 'mongoose';

import { LanguageSchema } from '../schemas/language.schema';
import { WordSchema } from '../schemas/word.schema';
import { WordSeedData } from './seed-types';
import { enWords } from './words-en';
import { kaWords } from './words-ka';
import { trWords } from './words-tr';
import { ruWords } from './words-ru';

// Note: .env is loaded via -r dotenv/config in the db:seed script

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg: string): void {
  console.log(`[seed] ${msg}`);
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

  // Seed all languages
  const allWords: WordSeedData[] = [enWords, kaWords, trWords, ruWords];

  for (const data of allWords) {
    const { code, name, nativeName } = data.language;

    // Insert language
    const lang = await Language.create({ code, name, nativeName });
    log(`Inserted language: ${name} (${nativeName}) [id=${lang._id}]`);

    // Insert words by difficulty
    const difficultyMap: { level: number; label: string; words: string[] }[] = [
      { level: 1, label: 'easy', words: data.words.easy },
      { level: 2, label: 'medium', words: data.words.medium },
      { level: 3, label: 'hard', words: data.words.hard },
    ];

    for (const { level, label, words } of difficultyMap) {
      const docs = words.map((word) => ({
        languageId: lang._id,
        word,
        difficulty: level,
      }));

      await Word.insertMany(docs);
      log(`  ${label}: ${words.length} words inserted`);
    }

    const totalWords =
      data.words.easy.length + data.words.medium.length + data.words.hard.length;
    log(`  Total for ${code}: ${totalWords} words`);
  }

  // Summary
  const langCount = await Language.countDocuments();
  const wordCount = await Word.countDocuments();

  log('');
  log('=== Seed complete ===');
  log(`Languages: ${langCount}`);
  log(`Words:     ${wordCount}`);

  await mongoose.disconnect();
  log('Connection closed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
