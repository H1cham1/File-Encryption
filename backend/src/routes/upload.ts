/**
 * Upload routes for encrypted file storage.
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';
import { logRequest } from '../middleware/logging';
import { dbRun } from '../db';
import { UploadFileInput } from '../models/File';

const router = Router();

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50');
const DEFAULT_EXPIRY_HOURS = parseInt(process.env.DEFAULT_EXPIRY_HOURS || '24');

// Configure multer for file upload
// Store files in memory temporarily, then save with custom filename
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
});

/**
 * POST /api/upload
 *
 * Upload an encrypted file
 *
 * Expected form data:
 * - file: encrypted file (binary)
 * - iv: base64 encoded initialization vector
 * - filename: original filename
 * - mimetype: file MIME type
 * - expiresIn: (optional) hours until expiry
 */
router.post(
  '/',
  authenticateToken,
  uploadLimiter,
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate file was uploaded
      if (!req.file) {
        await logRequest(req, 'UPLOAD_FAILED', undefined, { reason: 'No file provided' });
        res.status(400).json({ error: 'File is required' });
        return;
      }

      // Get metadata from request body
      const { iv, filename, mimetype, expiresIn } = req.body;

      // Validate required fields
      if (!iv || !filename || !mimetype) {
        await logRequest(req, 'UPLOAD_FAILED', undefined, { reason: 'Missing metadata' });
        res.status(400).json({ error: 'IV, filename, and mimetype are required' });
        return;
      }

      // Validate IV format (should be base64 string)
      if (typeof iv !== 'string' || iv.length === 0) {
        res.status(400).json({ error: 'Invalid IV format' });
        return;
      }

      // Generate unique file ID
      const fileId = uuidv4();

      // Calculate expiry time
      const hoursUntilExpiry = expiresIn ? parseInt(expiresIn) : DEFAULT_EXPIRY_HOURS;
      const createdAt = new Date();
      const expiryTime = new Date(createdAt.getTime() + hoursUntilExpiry * 60 * 60 * 1000);

      // Create file path
      const filePath = path.join(UPLOAD_DIR, `${fileId}.bin`);

      // Ensure upload directory exists
      await fs.mkdir(UPLOAD_DIR, { recursive: true });

      // Save encrypted file to disk
      await fs.writeFile(filePath, req.file.buffer);

      // Store metadata in database
      const uploadData: UploadFileInput = {
        ownerId: req.user.id,
        filename,
        mimetype,
        filesize: req.file.size,
        iv,
        expiresIn: hoursUntilExpiry,
      };

      await dbRun(
        `INSERT INTO files (id, path, iv, ownerId, filename, mimetype, filesize, createdAt, expiryTime, downloadCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          filePath,
          iv,
          uploadData.ownerId,
          uploadData.filename,
          uploadData.mimetype,
          uploadData.filesize,
          createdAt.toISOString(),
          expiryTime.toISOString(),
          0,
        ]
      );

      // Log successful upload
      await logRequest(req, 'UPLOAD_OK', fileId, {
        filename: uploadData.filename,
        filesize: uploadData.filesize,
        expiryHours: hoursUntilExpiry,
      });

      // Return file ID to client
      res.status(201).json({
        fileId,
        expiryTime: expiryTime.toISOString(),
      });
    } catch (error) {
      console.error('Upload error:', error);

      // Log failed upload
      await logRequest(req, 'UPLOAD_FAILED', undefined, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Handle specific errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: `File too large. Max size: ${MAX_FILE_SIZE_MB}MB` });
          return;
        }
      }

      res.status(500).json({ error: 'Failed to upload file' });
    }
  }
);

export default router;
