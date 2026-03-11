import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private sqlite!: Database.Database;
  private db!: BetterSQLite3Database<typeof schema>;

  onModuleInit(): void {
    const dbPath = path.resolve('./data/doodledraw.db');
    const dbDir = path.dirname(dbPath);

    // Ensure the data directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      this.logger.log(`Created data directory: ${dbDir}`);
    }

    // Open SQLite connection
    this.sqlite = new Database(dbPath);
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('foreign_keys = ON');

    this.db = drizzle(this.sqlite, { schema });

    this.logger.log(`SQLite database connected at ${dbPath}`);

    // Create tables if they don't exist
    this.createTables();
  }

  onModuleDestroy(): void {
    this.sqlite?.close();
    this.logger.log('SQLite database connection closed');
  }

  getDb(): BetterSQLite3Database<typeof schema> {
    return this.db;
  }

  private createTables(): void {
    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS languages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        native_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        word TEXT NOT NULL,
        difficulty INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    this.logger.log('Database tables verified / created');
  }
}
