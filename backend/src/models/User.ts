/**
 * User model for authentication.
 */

export interface User {
  id: string;              // UUID
  email: string;           // Unique email address
  passwordHash: string;    // Bcrypt hash of password
  createdAt: string;       // ISO timestamp
}

export interface CreateUserInput {
  email: string;
  password: string;        // Plain password (will be hashed before storage)
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}
