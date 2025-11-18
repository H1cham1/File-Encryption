/**
 * File download routes (public endpoints).
 */

import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import { dbGet, dbRun } from '../db';
import { EncryptedFile, FileMetadataResponse } from '../models/File';
import { downloadLimiter } from '../middleware/rateLimit';
import { logRequest } from '../middleware/logging';

const router = Router();

/**
 * GET /api/file/:fileId/metadata
 *
 * Get file metadata without downloading the file
 * Useful for displaying file info before download
 */
router.get('/:fileId/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    // Validate fileId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
      res.status(400).json({ error: 'Invalid file ID format' });
      return;
    }

    // Get file from database
    const file = await dbGet<EncryptedFile>(
      'SELECT * FROM files WHERE id = ?',
      [fileId]
    );

    if (!file) {
      await logRequest(req, 'NOT_FOUND', fileId);
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Check if file is expired
    const now = new Date();
    const expiryTime = new Date(file.expiryTime);
    const expired = now > expiryTime;

    const response: FileMetadataResponse = {
      filename: file.filename,
      mimetype: file.mimetype,
      filesize: file.filesize,
      createdAt: file.createdAt,
      expiryTime: file.expiryTime,
      downloadCount: file.downloadCount,
      exists: true,
      expired,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to get file metadata' });
  }
});

/**
 * GET /api/file/:fileId/blob
 *
 * Download encrypted file
 *
 * Returns:
 * - Encrypted file data (ciphertext)
 * - IV needed for decryption
 * - Original filename and metadata
 *
 * Rate limited to prevent abuse
 */
router.get('/:fileId/blob', downloadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    // Validate fileId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
      res.status(400).json({ error: 'Invalid file ID format' });
      return;
    }

    // Get file from database
    const file = await dbGet<EncryptedFile>(
      'SELECT * FROM files WHERE id = ?',
      [fileId]
    );

    if (!file) {
      await logRequest(req, 'NOT_FOUND', fileId);
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Check if file is expired
    const now = new Date();
    const expiryTime = new Date(file.expiryTime);

    if (now > expiryTime) {
      await logRequest(req, 'EXPIRED', fileId);
      res.status(410).json({ error: 'File has expired' });
      return;
    }

    // Check if file exists on disk
    try {
      await fs.access(file.path);
    } catch {
      console.error(`File not found on disk: ${file.path}`);
      res.status(404).json({ error: 'File data not found' });
      return;
    }

    // Read encrypted file from disk
    const ciphertext = await fs.readFile(file.path);

    // Increment download count
    await dbRun(
      'UPDATE files SET downloadCount = downloadCount + 1 WHERE id = ?',
      [fileId]
    );

    // Log successful download
    await logRequest(req, 'DOWNLOAD_OK', fileId, {
      filename: file.filename,
      downloadCount: file.downloadCount + 1,
    });

    // Send response with encrypted data + metadata
    res.status(200).json({
      ciphertext: ciphertext.toString('base64'), // Send as base64 for JSON
      iv: file.iv,
      filename: file.filename,
      mimetype: file.mimetype,
      filesize: file.filesize,
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

export default router;
