/**
 * Main Application Entry Point
 *
 * Handles all frontend logic:
 * - Authentication (login/register)
 * - File encryption and upload
 * - File decryption and download
 * - UI state management
 */

import {
  generateKey,
  generateIV,
  encryptFile,
  decryptFile,
  exportKey,
  importKey,
  toBase64Url,
  fromBase64Url,
  formatFileSize,
  storeFileKey,
  getStoredFileKey,
  removeStoredFileKey,
} from './crypto';
import {
  register,
  login,
  uploadFile,
  getFileMetadata,
  downloadFile,
  isAuthenticated,
  clearToken,
  getMyFiles,
  deleteFile,
} from './api';
import {
  show,
  hide,
  showMessage,
  showLoading,
  hideLoading,
  downloadBlob,
  copyToClipboard,
  formatDate,
  getTimeRemaining,
} from './ui';

/**
 * Initialize the application
 */
function init(): void {
  // Check which page we're on based on URL
  const path = window.location.pathname;

  if (path.includes('/file/')) {
    // Download page
    initDownloadPage();
  } else {
    // Main page (login/upload)
    initMainPage();
  }
}

/**
 * Initialize the main page (login/upload)
 */
function initMainPage(): void {
  const authSection = document.getElementById('auth-section');
  const uploadSection = document.getElementById('upload-section');

  if (!authSection || !uploadSection) return;

  // Check if user is authenticated
  if (isAuthenticated()) {
    hide(authSection);
    show(uploadSection);
    // Load files if already logged in
    loadMyFiles();
  } else {
    show(authSection);
    hide(uploadSection);
  }

  // Setup event listeners
  setupAuthListeners();
  setupUploadListeners();
}

/**
 * Setup authentication event listeners
 */
function setupAuthListeners(): void {
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const registerForm = document.getElementById('register-form') as HTMLFormElement;
  const showRegisterBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  const logoutBtn = document.getElementById('logout-btn');

  // Toggle between login and register forms
  showRegisterBtn?.addEventListener('click', () => {
    hide(loginForm);
    show(registerForm);
  });

  showLoginBtn?.addEventListener('click', () => {
    hide(registerForm);
    show(loginForm);
  });

  // Handle login
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (document.getElementById('login-email') as HTMLInputElement).value;
    const password = (document.getElementById('login-password') as HTMLInputElement).value;

    try {
      showLoading('Logging in...');
      await login(email, password);
      hideLoading();

      showMessage('Login successful!', 'success');

      // Switch to upload section
      hide(document.getElementById('auth-section')!);
      show(document.getElementById('upload-section')!);

      loginForm.reset();

      // Load My Files after login
      loadMyFiles();
    } catch (error) {
      hideLoading();
      showMessage(error instanceof Error ? error.message : 'Login failed', 'error');
    }
  });

  // Handle registration
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (document.getElementById('register-email') as HTMLInputElement).value;
    const password = (document.getElementById('register-password') as HTMLInputElement).value;
    const confirmPassword = (document.getElementById('register-confirm-password') as HTMLInputElement).value;

    // Validate passwords match
    if (password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    try {
      showLoading('Creating account...');
      await register(email, password);
      hideLoading();

      showMessage('Account created successfully!', 'success');

      // Switch to upload section
      hide(document.getElementById('auth-section')!);
      show(document.getElementById('upload-section')!);

      registerForm.reset();

      // Load My Files after registration
      loadMyFiles();
    } catch (error) {
      hideLoading();
      showMessage(error instanceof Error ? error.message : 'Registration failed', 'error');
    }
  });

  // Handle logout
  logoutBtn?.addEventListener('click', () => {
    clearToken();
    location.reload();
  });
}

/**
 * Setup upload event listeners
 */
function setupUploadListeners(): void {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const uploadBtn = document.getElementById('upload-btn');
  const fileInfo = document.getElementById('file-info');

  // Show file info when file is selected
  fileInput?.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (fileInfo) {
        fileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
        show(fileInfo);
      }
    }
  });

  // Handle file upload
  uploadBtn?.addEventListener('click', async () => {
    if (!fileInput.files || !fileInput.files[0]) {
      showMessage('Please select a file', 'error');
      return;
    }

    const file = fileInput.files[0];

    try {
      showLoading('Encrypting and uploading file...');

      // Step 1: Generate encryption key and IV
      const key = await generateKey();
      const iv = generateIV();

      // Step 2: Encrypt the file
      const ciphertext = await encryptFile(file, key, iv);

      // Step 3: Upload encrypted file to server
      const response = await uploadFile(
        ciphertext,
        iv,
        file.name,
        file.type || 'application/octet-stream',
        file.size
      );

      // Step 4: Export key and create shareable link
      const keyBytes = await exportKey(key);
      const keyBase64Url = toBase64Url(keyBytes);

      // Store the encryption key in localStorage for later retrieval
      storeFileKey(response.fileId, keyBase64Url);

      // Create share link with key in URL fragment
      const shareLink = `${window.location.origin}/file/${response.fileId}#${keyBase64Url}`;

      hideLoading();

      // Show success message and share link
      showShareLink(shareLink, response.expiryTime);

      // Reload "My Files" section
      loadMyFiles();

      // Reset form
      fileInput.value = '';
      hide(fileInfo!);
    } catch (error) {
      hideLoading();
      showMessage(error instanceof Error ? error.message : 'Upload failed', 'error');
    }
  });
}

/**
 * Show share link after successful upload
 */
function showShareLink(link: string, expiryTime: string): void {
  const shareLinkSection = document.getElementById('share-link-section');
  const shareLinkInput = document.getElementById('share-link') as HTMLInputElement;
  const expiryInfo = document.getElementById('expiry-info');
  const copyLinkBtn = document.getElementById('copy-link-btn');

  if (!shareLinkSection || !shareLinkInput) return;

  shareLinkInput.value = link;
  if (expiryInfo) {
    expiryInfo.textContent = `Expires: ${formatDate(expiryTime)} (${getTimeRemaining(expiryTime)})`;
  }

  show(shareLinkSection);

  // Copy link button
  copyLinkBtn?.addEventListener('click', () => {
    copyToClipboard(link);
  }, { once: true });
}

/**
 * Initialize the download page
 */
function initDownloadPage(): void {
  // Extract file ID from URL path
  const pathParts = window.location.pathname.split('/');
  const fileId = pathParts[pathParts.length - 1];

  // Extract encryption key from URL fragment
  const keyBase64Url = window.location.hash.substring(1); // Remove '#'

  if (!fileId || !keyBase64Url) {
    showMessage('Invalid download link', 'error');
    return;
  }

  // Load file metadata and setup download
  loadFileForDownload(fileId, keyBase64Url);
}

/**
 * Load file metadata and prepare for download
 */
async function loadFileForDownload(fileId: string, keyBase64Url: string): Promise<void> {
  const fileMetadataDiv = document.getElementById('file-metadata');
  const downloadBtn = document.getElementById('download-btn');

  try {
    showLoading('Loading file information...');

    // Get file metadata
    const metadata = await getFileMetadata(fileId);

    hideLoading();

    if (!metadata.exists) {
      showMessage('File not found', 'error');
      return;
    }

    if (metadata.expired) {
      showMessage('This file has expired and is no longer available', 'error');
      return;
    }

    // Display file metadata
    if (fileMetadataDiv) {
      fileMetadataDiv.innerHTML = `
        <h3>File Information</h3>
        <p><strong>Filename:</strong> ${metadata.filename}</p>
        <p><strong>Size:</strong> ${formatFileSize(metadata.filesize)}</p>
        <p><strong>Type:</strong> ${metadata.mimetype}</p>
        <p><strong>Uploaded:</strong> ${formatDate(metadata.createdAt)}</p>
        <p><strong>Expires:</strong> ${formatDate(metadata.expiryTime)} (${getTimeRemaining(metadata.expiryTime)})</p>
        <p><strong>Downloads:</strong> ${metadata.downloadCount}</p>
      `;
      show(fileMetadataDiv);
    }

    // Setup download button
    if (downloadBtn) {
      show(downloadBtn);
      downloadBtn.addEventListener('click', async () => {
        await downloadAndDecryptFile(fileId, keyBase64Url, metadata.filename, metadata.mimetype);
      });
    }
  } catch (error) {
    hideLoading();
    showMessage(error instanceof Error ? error.message : 'Failed to load file', 'error');
  }
}

/**
 * Download and decrypt file
 */
async function downloadAndDecryptFile(
  fileId: string,
  keyBase64Url: string,
  filename: string,
  mimetype: string
): Promise<void> {
  try {
    showLoading('Downloading and decrypting file...');

    // Step 1: Download encrypted file from server
    const fileBlob = await downloadFile(fileId);

    // Step 2: Decode the encryption key from URL
    const keyBytes = fromBase64Url(keyBase64Url);
    const key = await importKey(keyBytes);

    // Step 3: Decode IV from base64
    const ivBytes = Uint8Array.from(atob(fileBlob.iv), c => c.charCodeAt(0));

    // Step 4: Decode ciphertext from base64
    const ciphertextBytes = Uint8Array.from(atob(fileBlob.ciphertext), c => c.charCodeAt(0));

    // Step 5: Decrypt the file
    const plaintext = await decryptFile(ciphertextBytes.buffer, key, ivBytes);

    hideLoading();

    // Step 6: Trigger download
    const blob = new Blob([plaintext], { type: mimetype });
    downloadBlob(blob, filename);

    showMessage('File downloaded and decrypted successfully!', 'success');
  } catch (error) {
    hideLoading();
    console.error('Decryption error:', error);
    showMessage('Failed to decrypt file. The link may be invalid or corrupted.', 'error');
  }
}

/**
 * Load and display user's uploaded files
 */
async function loadMyFiles(): Promise<void> {
  const myFilesSection = document.getElementById('my-files-section');
  const myFilesList = document.getElementById('my-files-list');

  if (!myFilesSection || !myFilesList) return;

  try {
    const response = await getMyFiles();
    const files = response.files;

    if (files.length === 0) {
      myFilesList.innerHTML = '<p class="no-files">No files uploaded yet. Upload a file to get started!</p>';
      show(myFilesSection);
      return;
    }

    // Build files list HTML
    let html = '';
    for (const file of files) {
      const key = getStoredFileKey(file.id);
      const hasKey = key !== null;
      const shareLink = hasKey ? `${window.location.origin}/file/${file.id}#${key}` : null;

      html += `
        <div class="file-item ${file.expired ? 'expired' : ''}">
          <div class="file-info">
            <div class="file-name">${file.filename}</div>
            <div class="file-meta">
              <span>${formatFileSize(file.filesize)}</span>
              <span>•</span>
              <span>${formatDate(file.createdAt)}</span>
              <span>•</span>
              <span>${file.downloadCount} downloads</span>
            </div>
            <div class="file-expiry ${file.expired ? 'expired' : ''}">
              ${file.expired ? '❌ Expired' : `⏰ Expires: ${getTimeRemaining(file.expiryTime)}`}
            </div>
          </div>
          <div class="file-actions">
            ${shareLink && !file.expired ? `
              <button class="btn btn-sm" onclick="copyFileLink('${shareLink}')">📋 Copy Link</button>
            ` : ''}
            ${!hasKey ? `<span class="no-key-warning">⚠️ Key not found</span>` : ''}
            <button class="btn btn-sm btn-delete" onclick="deleteMyFile('${file.id}')">🗑️ Delete</button>
          </div>
        </div>
      `;
    }

    myFilesList.innerHTML = html;
    show(myFilesSection);
  } catch (error) {
    console.error('Failed to load files:', error);
    myFilesList.innerHTML = '<p class="error">Failed to load files. Please try again.</p>';
  }
}

/**
 * Copy file link to clipboard (global function for onclick)
 */
(window as any).copyFileLink = (link: string) => {
  copyToClipboard(link);
};

/**
 * Delete a file (global function for onclick)
 */
(window as any).deleteMyFile = async (fileId: string) => {
  if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) {
    return;
  }

  try {
    showLoading('Deleting file...');
    await deleteFile(fileId);
    removeStoredFileKey(fileId);
    hideLoading();
    showMessage('File deleted successfully', 'success');
    loadMyFiles();
  } catch (error) {
    hideLoading();
    showMessage(error instanceof Error ? error.message : 'Failed to delete file', 'error');
  }
};

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
