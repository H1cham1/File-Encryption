/**
 * API Module
 *
 * Handles all communication with the backend server.
 * Manages authentication tokens and API requests.
 */

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Local storage key for auth token
const TOKEN_KEY = 'auth_token';

/**
 * Type definitions for API responses
 */
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface UploadResponse {
  fileId: string;
  expiryTime: string;
}

export interface FileMetadata {
  filename: string;
  mimetype: string;
  filesize: number;
  createdAt: string;
  expiryTime: string;
  downloadCount: number;
  exists: boolean;
  expired: boolean;
}

export interface FileBlob {
  ciphertext: string; // Base64 encoded
  iv: string;         // Base64 encoded
  filename: string;
  mimetype: string;
  filesize: number;
}

/**
 * Get stored authentication token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store authentication token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove authentication token (logout)
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Register a new user
 */
export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const data: AuthResponse = await response.json();
  setToken(data.token);
  return data;
}

/**
 * Login with existing credentials
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data: AuthResponse = await response.json();
  setToken(data.token);
  return data;
}

/**
 * Upload an encrypted file
 *
 * @param ciphertext - Encrypted file data
 * @param iv - Initialization vector
 * @param filename - Original filename
 * @param mimetype - File MIME type
 * @param filesize - File size in bytes
 * @param expiresIn - Hours until expiry (optional)
 */
export async function uploadFile(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  filename: string,
  mimetype: string,
  filesize: number,
  expiresIn?: number
): Promise<UploadResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  // Create FormData for multipart upload
  const formData = new FormData();

  // Add encrypted file as Blob
  const blob = new Blob([ciphertext], { type: 'application/octet-stream' });
  formData.append('file', blob);

  // Add metadata
  formData.append('iv', btoa(String.fromCharCode(...iv))); // Base64 encode IV
  formData.append('filename', filename);
  formData.append('mimetype', mimetype);
  formData.append('filesize', filesize.toString());

  if (expiresIn) {
    formData.append('expiresIn', expiresIn.toString());
  }

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return await response.json();
}

/**
 * Get file metadata
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata> {
  const response = await fetch(`${API_BASE_URL}/api/file/${fileId}/metadata`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get file metadata');
  }

  return await response.json();
}

/**
 * Download encrypted file
 */
export async function downloadFile(fileId: string): Promise<FileBlob> {
  const response = await fetch(`${API_BASE_URL}/api/file/${fileId}/blob`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to download file');
  }

  return await response.json();
}

/**
 * My Files API
 */
export interface MyFile {
  id: string;
  filename: string;
  mimetype: string;
  filesize: number;
  createdAt: string;
  expiryTime: string;
  downloadCount: number;
  expired: boolean;
}

export interface MyFilesResponse {
  files: MyFile[];
}

/**
 * Get all files uploaded by current user
 */
export async function getMyFiles(): Promise<MyFilesResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/api/myfiles`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get files');
  }

  return await response.json();
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/api/myfiles/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete file');
  }
}
