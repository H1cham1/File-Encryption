/**
 * Authentication routes.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet } from '../db';
import { User, LoginInput, CreateUserInput, AuthResponse } from '../models/User';
import { generateToken } from '../middleware/auth';
import { logRequest } from '../middleware/logging';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * POST /api/auth/register
 *
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: CreateUserInput = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Password strength check (at least 8 characters)
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Check if user already exists
    const existingUser = await dbGet<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    const createdAt = new Date().toISOString();

    await dbRun(
      'INSERT INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, createdAt]
    );

    // Generate token
    const token = generateToken({ id: userId, email });

    const response: AuthResponse = {
      token,
      user: { id: userId, email },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 *
 * Login with existing credentials
 * Rate limited to prevent brute force attacks
 */
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginInput = req.body;

    // Validate input
    if (!email || !password) {
      await logRequest(req, 'AUTH_FAILED', undefined, { reason: 'Missing credentials' });
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await dbGet<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      await logRequest(req, 'AUTH_FAILED', undefined, { reason: 'User not found', email });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      await logRequest(req, 'AUTH_FAILED', undefined, { reason: 'Invalid password', email });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    const response: AuthResponse = {
      token,
      user: { id: user.id, email: user.email },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
