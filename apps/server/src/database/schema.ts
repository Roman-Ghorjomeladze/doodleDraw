import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------
export const languages = sqliteTable('languages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  nativeName: text('native_name').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Language = InferSelectModel<typeof languages>;
export type NewLanguage = InferInsertModel<typeof languages>;

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------
export const words = sqliteTable('words', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  languageId: integer('language_id')
    .notNull()
    .references(() => languages.id, { onDelete: 'cascade' }),
  word: text('word').notNull(),
  difficulty: integer('difficulty').notNull(), // 1 = easy, 2 = medium, 3 = hard
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Word = InferSelectModel<typeof words>;
export type NewWord = InferInsertModel<typeof words>;
