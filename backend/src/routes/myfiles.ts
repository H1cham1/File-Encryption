/**
 * User file management routes.
 */

import { Router, Response } from 'express';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../db';
import { EncryptedFile } from '../models/File';

const router = Router();

/**
 * GET /api/myfiles
 *
 * Get all files uploaded by the authenticated user
 */
router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get all files for this user, ordered by newest first
    const files = dbAll<EncryptedFile>(
      'SELECT * FROM files WHERE ownerId = ? ORDER BY createdAt DESC',
      [req.user.id]
    );

    // Add additional info to each file
    const filesWithInfo = files.map((file) => {
      const now = new Date();
      const expiryTime = new Date(file.expiryTime);
      const expired = now > expiryTime;

      return {
        id: file.id,
        filename: file.filename,
        mimetype: file.mimetype,
        filesize: file.filesize,
        createdAt: file.createdAt,
        expiryTime: file.expiryTime,
        downloadCount: file.downloadCount,
        expired,
      };
    });

    res.status(200).json({ files: filesWithInfo });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

/**
 * DELETE /api/myfiles/:fileId
 *
 * Delete a file (only owner can delete)
 */
router.delete('/:fileId', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { fileId } = req.params;

    // Get file from database
    const file = dbGet<EncryptedFile>(
      'SELECT * FROM files WHERE id = ? AND ownerId = ?',
      [fileId, req.user.id]
    );

    if (!file) {
      res.status(404).json({ error: 'File not found or you do not own this file' });
      return;
    }

    // Delete file from disk
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error('Failed to delete file from disk:', error);
      // Continue anyway to remove from database
    }

    // Delete from database
    dbRun('DELETE FROM files WHERE id = ?', [fileId]);

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
