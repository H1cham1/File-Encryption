/**
 * Rate limiting middleware.
 */

import rateLimit from 'express-rate-limit';

// Configuration from environment variables
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

/**
 * Rate limiter for download endpoints
 *
 * Stricter limits to prevent mass downloading attempts
 * Default: 100 requests per 15 minutes per IP
 */
export const downloadLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: {
    error: 'Too many download requests from this IP, please try again later',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  // Custom key generator to ensure we're tracking by IP
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Rate limiter for upload endpoints
 *
 * More lenient than downloads since uploads are authenticated
 * Default: 50 uploads per 15 minutes per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: Math.floor(RATE_LIMIT_MAX / 2), // Half of download limit
  message: {
    error: 'Too many upload requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Rate limiter for authentication endpoints
 *
 * Very strict to prevent brute force attacks
 * Default: 5 login attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 5,
  message: {
    error: 'Too many login attempts from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});
