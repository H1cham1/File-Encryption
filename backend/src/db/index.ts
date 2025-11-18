/**
 * Database Connection
 *
 * Manages SQLite database connection using better-sqlite3.
 * Provides synchronous API which is faster and simpler than sqlite3.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');

// Create database connection
const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

console.log(`Connected to SQLite database at ${DB_PATH}`);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Run a query that doesn't return data (INSERT, UPDATE, DELETE)
 */
export const dbRun = (sql: string, params?: unknown[]): Database.RunResult => {
  const stmt = db.prepare(sql);
  return stmt.run(...(params || []));
};

/**
 * Get a single row
 */
export const dbGet = <T = unknown>(sql: string, params?: unknown[]): T | undefined => {
  const stmt = db.prepare(sql);
  return stmt.get(...(params || [])) as T | undefined;
};

/**
 * Get all rows
 */
export const dbAll = <T = unknown>(sql: string, params?: unknown[]): T[] => {
  const stmt = db.prepare(sql);
  return stmt.all(...(params || [])) as T[];
};

/**
 * Close database connection
 */
export const closeDatabase = (): void => {
  db.close();
};

export default db;
