/**
 * File model for encrypted storage.
 */

export interface EncryptedFile {
  id: string;              // UUID - unique file identifier
  path: string;            // Path to encrypted file on disk (e.g., uploads/abc-123.bin)
  iv: string;              // Initialization Vector (12 bytes, base64 encoded)
  ownerId: string;         // User ID who uploaded the file
  filename: string;        // Original filename (for display purposes)
  mimetype: string;        // MIME type (e.g., image/png, application/pdf)
  filesize: number;        // File size in bytes
  createdAt: string;       // ISO timestamp of upload
  expiryTime: string;      // ISO timestamp when file expires
  downloadCount: number;   // Number of times file was downloaded
}

export interface UploadFileInput {
  ownerId: string;
  filename: string;
  mimetype: string;
  filesize: number;
  iv: string;              // Base64 encoded IV
  expiresIn?: number;      // Hours until expiry (default from env)
}

export interface FileMetadataResponse {
  filename: string;
  mimetype: string;
  filesize: number;
  createdAt: string;
  expiryTime: string;
  downloadCount: number;
  exists: boolean;
  expired: boolean;
}

export interface FileBlobResponse {
  ciphertext: Buffer;      // Encrypted file data
  iv: string;              // IV needed for decryption
  filename: string;        // Original filename
  mimetype: string;        // MIME type
  filesize: number;        // File size
}
