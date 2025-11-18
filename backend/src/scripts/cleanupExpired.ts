/**
 * Cleanup script for expired files.
 * Run with: npm run cleanup
 */

import { dbAll, dbRun, closeDatabase } from '../db';
import { EncryptedFile } from '../models/File';
import fs from 'fs';

function cleanupExpiredFiles() {
  console.log('Starting cleanup of expired files...');
  console.log(`Current time: ${new Date().toISOString()}\n`);

  try {
    // Find all expired files
    const now = new Date().toISOString();
    const expiredFiles = dbAll<EncryptedFile>(
      'SELECT * FROM files WHERE expiryTime < ?',
      [now]
    );

    if (expiredFiles.length === 0) {
      console.log('No expired files found');
      return;
    }

    console.log(`Found ${expiredFiles.length} expired file(s):\n`);

    let deletedCount = 0;
    let errorCount = 0;

    // Delete each expired file
    for (const file of expiredFiles) {
      try {
        console.log(`Processing: ${file.filename}`);
        console.log(`  - File ID: ${file.id}`);
        console.log(`  - Expired: ${file.expiryTime}`);
        console.log(`  - Downloads: ${file.downloadCount}`);

        // Delete file from disk
        try {
          fs.unlinkSync(file.path);
          console.log(`  Deleted from disk: ${file.path}`);
        } catch (error) {
          // File might already be deleted, log but continue
          console.log(`  Warning: File not found on disk: ${file.path}`);
        }

        // Delete from database
        dbRun('DELETE FROM files WHERE id = ?', [file.id]);
        console.log(`  Deleted from database`);

        deletedCount++;
        console.log('');
      } catch (error) {
        console.error(`  Error deleting file ${file.id}:`, error);
        errorCount++;
        console.log('');
      }
    }

    // Summary
    console.log('='.repeat(50));
    console.log('Cleanup Summary:');
    console.log(`  Total expired: ${expiredFiles.length}`);
    console.log(`  Successfully deleted: ${deletedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupExpiredFiles();
}

export default cleanupExpiredFiles;
