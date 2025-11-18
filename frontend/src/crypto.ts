/**
 * Cryptography module using Web Crypto API.
 * AES-256-GCM encryption with client-side key generation.
 */

/**
 * Generate a random 256-bit AES-GCM key
 *
 * @returns CryptoKey object suitable for AES-GCM encryption/decryption
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256, // 256-bit key
    },
    true, // Extractable (we need to export it for the URL)
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random 12-byte Initialization Vector (IV)
 *
 * @returns Uint8Array of 12 random bytes
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt a file using AES-256-GCM
 *
 * @param file - File to encrypt
 * @param key - AES-GCM encryption key
 * @param iv - Initialization vector (12 bytes)
 * @returns Encrypted data as ArrayBuffer
 */
export async function encryptFile(
  file: File,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  // Read file as ArrayBuffer
  const fileData = await file.arrayBuffer();

  // Encrypt using AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    fileData
  );

  return ciphertext;
}

/**
 * Decrypt a file using AES-256-GCM
 *
 * @param ciphertext - Encrypted data
 * @param key - AES-GCM decryption key
 * @param iv - Initialization vector (must be same as used for encryption)
 * @returns Decrypted data as ArrayBuffer
 */
export async function decryptFile(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  return plaintext;
}

/**
 * Export a CryptoKey to raw bytes
 *
 * @param key - CryptoKey to export
 * @returns Raw key bytes as Uint8Array
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

/**
 * Import raw bytes as a CryptoKey
 *
 * @param keyData - Raw key bytes
 * @returns CryptoKey object
 */
export async function importKey(keyData: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert Uint8Array to base64url string
 *
 * Base64URL is URL-safe (no +, /, or = characters)
 * Used for encoding the key in the URL fragment
 *
 * @param bytes - Data to encode
 * @returns Base64URL encoded string
 */
export function toBase64Url(bytes: Uint8Array): string {
  // Convert to base64
  const base64 = btoa(String.fromCharCode(...bytes));

  // Convert to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert base64url string to Uint8Array
 *
 * @param base64url - Base64URL encoded string
 * @returns Decoded bytes
 */
export function fromBase64Url(base64url: string): Uint8Array {
  // Convert base64url to base64
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  // Decode base64
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Store encryption key for a file in localStorage
 * This allows users to retrieve share links later
 *
 * @param fileId - File ID
 * @param keyBase64Url - Base64URL encoded encryption key
 */
export function storeFileKey(fileId: string, keyBase64Url: string): void {
  const keys = getStoredFileKeys();
  keys[fileId] = keyBase64Url;
  sessionStorage.setItem('file_keys', JSON.stringify(keys));
}

/**
 * Get stored encryption key for a file
 *
 * @param fileId - File ID
 * @returns Base64URL encoded key or null if not found
 */
export function getStoredFileKey(fileId: string): string | null {
  const keys = getStoredFileKeys();
  return keys[fileId] || null;
}

/**
 * Get all stored file keys
 *
 * @returns Object mapping fileId to keyBase64Url
 */
export function getStoredFileKeys(): Record<string, string> {
  const stored = sessionStorage.getItem('file_keys');
  return stored ? JSON.parse(stored) : {};
}

/**
 * Remove stored key for a file
 *
 * @param fileId - File ID
 */
export function removeStoredFileKey(fileId: string): void {
  const keys = getStoredFileKeys();
  delete keys[fileId];
  sessionStorage.setItem('file_keys', JSON.stringify(keys));
}
