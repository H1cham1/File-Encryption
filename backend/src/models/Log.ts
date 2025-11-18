/**
 * Log Model
 *
 * Defines types for security and access logging.
 * Used to track downloads, rate limiting, and suspicious activity.
 */

export type EventType =
  | 'DOWNLOAD_OK'         // Successful download
  | 'NOT_FOUND'           // File not found
  | 'EXPIRED'             // File has expired
  | 'RATE_LIMITED'        // Request blocked by rate limiting
  | 'AUTH_FAILED'         // Authentication failed
  | 'UPLOAD_OK'           // Successful upload
  | 'UPLOAD_FAILED';      // Upload failed

export interface Log {
  id: number;              // Auto-increment ID
  timestamp: string;       // ISO timestamp
  ip: string;              // Client IP address
  userAgent: string;       // Client User-Agent header
  fileId: string | null;   // File ID (if applicable)
  eventType: EventType;    // Type of event
  extra: string | null;    // Additional JSON data
}

export interface CreateLogInput {
  ip: string;
  userAgent: string;
  fileId?: string;
  eventType: EventType;
  extra?: Record<string, unknown>;
}
