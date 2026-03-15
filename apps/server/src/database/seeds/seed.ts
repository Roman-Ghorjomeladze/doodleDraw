import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as path from 'node:path';
import * as fs from 'node:fs';

import * as schema from '../schema';
import { WordSeedData } from './seed-types';
import { enWords } from './words-en';
import { kaWords } from './words-ka';
import { trWords } from './words-tr';
import { ruWords } from './words-ru';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg: string): void {
  console.log(`[seed] ${msg}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  // Use the same path as DatabaseService: resolve from CWD (project root), not __dirname.
  const dbPath = path.resolve('./data/doodledraw.db');
  const dbDir = path.dirname(dbPath);

  // Ensure the data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    log(`Created data directory: ${dbDir}`);
  }

  log(`Opening database at ${dbPath}`);
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  // Create tables if they don't exist (mirrors DatabaseService.createTables)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      native_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  log('Tables verified / created');

  // Clear existing data (disable FK checks to avoid constraint issues)
  log('Clearing existing data...');
  sqlite.pragma('foreign_keys = OFF');
  db.run(sql`DELETE FROM words`);
  db.run(sql`DELETE FROM languages`);
  sqlite.pragma('foreign_keys = ON');
  log('Existing data cleared');

  // Seed all languages
  const allWords: WordSeedData[] = [enWords, kaWords, trWords, ruWords];

  for (const data of allWords) {
    const { code, name, nativeName } = data.language;

    // Insert language
    const langResult = db
      .insert(schema.languages)
      .values({ code, name, nativeName })
      .returning()
      .get();

    const languageId = langResult.id;
    log(`Inserted language: ${name} (${nativeName}) [id=${languageId}]`);

    // Insert words by difficulty
    const difficultyMap: { level: number; label: string; words: string[] }[] = [
      { level: 1, label: 'easy', words: data.words.easy },
      { level: 2, label: 'medium', words: data.words.medium },
      { level: 3, label: 'hard', words: data.words.hard },
    ];

    for (const { level, label, words } of difficultyMap) {
      const rows = words.map((word) => ({
        languageId,
        word,
        difficulty: level,
      }));

      // Insert in batches to avoid SQLite variable limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        db.insert(schema.words).values(batch).run();
      }

      log(`  ${label}: ${words.length} words inserted`);
    }

    const totalWords =
      data.words.easy.length + data.words.medium.length + data.words.hard.length;
    log(`  Total for ${code}: ${totalWords} words`);
  }

  // Summary
  const langCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.languages)
    .get();
  const wordCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.words)
    .get();

  log('');
  log('=== Seed complete ===');
  log(`Languages: ${langCount?.count ?? 0}`);
  log(`Words:     ${wordCount?.count ?? 0}`);

  sqlite.close();
  log('Database connection closed');
}

main();
