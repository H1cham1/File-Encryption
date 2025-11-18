/**
 * Zero-Knowledge File Sharing - Backend Server
 *
 * Express server with:
 * - AES-256-GCM encrypted file storage
 * - JWT authentication
 * - Rate limiting
 * - Security headers (Helmet)
 * - Access logging
 *
 * The server NEVER sees encryption keys (zero-knowledge principle)
 */

import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import fileRoutes from './routes/file';
import myFilesRoutes from './routes/myfiles';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();

/**
 * MIDDLEWARE SETUP
 */

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for simplicity
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow file downloads
}));

// CORS - Allow frontend to communicate with backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * ROUTES
 */

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/myfiles', myFilesRoutes);

// Serve static frontend files in production
if (NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

/**
 * ERROR HANDLING
 */

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : undefined,
  });
});

/**
 * START SERVER
 */

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🔐 Zero-Knowledge File Sharing Server');
  console.log('='.repeat(60));
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
  console.log('');
  console.log('API Endpoints:');
  console.log('  POST   /api/auth/register   - Register new user');
  console.log('  POST   /api/auth/login      - Login');
  console.log('  POST   /api/upload          - Upload encrypted file');
  console.log('  GET    /api/file/:id/metadata - Get file info');
  console.log('  GET    /api/file/:id/blob   - Download encrypted file');
  console.log('='.repeat(60));
  console.log('');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
