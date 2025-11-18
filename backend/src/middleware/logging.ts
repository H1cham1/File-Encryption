/**
 * Logging Middleware
 *
 * Logs security events and access attempts to the database.
 * Used for audit trails and detecting suspicious activity.
 */

import { Request } from 'express';
import { dbRun } from '../db';
import { EventType, CreateLogInput } from '../models/Log';

/**
 * Get client IP address from request
 *
 * Handles various proxy configurations
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];

  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, take the first one
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Get user agent from request
 */
export const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Log an event to the database
 *
 * @param logData - Log data to store
 */
export const logEvent = async (logData: CreateLogInput): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    const extra = logData.extra ? JSON.stringify(logData.extra) : null;

    await dbRun(
      `INSERT INTO logs (timestamp, ip, userAgent, fileId, eventType, extra)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        timestamp,
        logData.ip,
        logData.userAgent,
        logData.fileId || null,
        logData.eventType,
        extra,
      ]
    );
  } catch (error) {
    // Don't throw - logging failures shouldn't break the application
    console.error('Failed to log event:', error);
  }
};

/**
 * Create a log entry for a request
 *
 * Helper function to easily log requests
 */
export const logRequest = async (
  req: Request,
  eventType: EventType,
  fileId?: string,
  extra?: Record<string, unknown>
): Promise<void> => {
  await logEvent({
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    eventType,
    fileId,
    extra,
  });
};
