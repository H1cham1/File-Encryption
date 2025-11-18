/**
 * Database Migration - Initial Schema
 *
 * Creates the initial database schema with tables for:
 * - users: User accounts for authentication
 * - files: Encrypted file metadata
 * - logs: Security and access logs
 *
 * Run with: npm run migrate
 */

import { dbRun, closeDatabase } from '../index';

function migrate() {
  console.log('Starting database migration...');

  try {
    // Create users table
    dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);
    console.log('✓ Created users table');

    // Create files table
    dbRun(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        iv TEXT NOT NULL,
        ownerId TEXT NOT NULL,
        filename TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        filesize INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        expiryTime TEXT NOT NULL,
        downloadCount INTEGER DEFAULT 0,
        FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created files table');

    // Create index on expiryTime for faster cleanup queries
    dbRun(`
      CREATE INDEX IF NOT EXISTS idx_files_expiry
      ON files(expiryTime)
    `);
    console.log('✓ Created index on files.expiryTime');

    // Create logs table
    dbRun(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        ip TEXT NOT NULL,
        userAgent TEXT NOT NULL,
        fileId TEXT,
        eventType TEXT NOT NULL,
        extra TEXT,
        FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ Created logs table');

    // Create index on timestamp for faster log queries
    dbRun(`
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp
      ON logs(timestamp)
    `);
    console.log('✓ Created index on logs.timestamp');

    // Create index on eventType for filtering
    dbRun(`
      CREATE INDEX IF NOT EXISTS idx_logs_eventType
      ON logs(eventType)
    `);
    console.log('✓ Created index on logs.eventType');

    console.log('\n✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

export default migrate;
