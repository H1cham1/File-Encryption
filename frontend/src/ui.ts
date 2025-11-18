/**
 * UI Helper Module
 *
 * Contains helper functions for DOM manipulation and UI updates
 */

/**
 * Show an element by removing the 'hidden' class
 */
export function show(element: HTMLElement): void {
  element.classList.remove('hidden');
}

/**
 * Hide an element by adding the 'hidden' class
 */
export function hide(element: HTMLElement): void {
  element.classList.add('hidden');
}

/**
 * Show a message to the user
 *
 * @param message - Message text
 * @param type - Message type (success, error, info)
 */
export function showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;

  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  show(messageDiv);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    hide(messageDiv);
  }, 5000);
}

/**
 * Show loading state
 */
export function showLoading(text: string = 'Loading...'): void {
  const loading = document.getElementById('loading');
  if (!loading) return;

  const loadingText = loading.querySelector('.loading-text');
  if (loadingText) {
    loadingText.textContent = text;
  }

  show(loading);
}

/**
 * Hide loading state
 */
export function hideLoading(): void {
  const loading = document.getElementById('loading');
  if (!loading) return;

  hide(loading);
}

/**
 * Trigger a file download in the browser
 *
 * @param data - File data as Blob
 * @param filename - Filename for download
 */
export function downloadBlob(data: Blob, filename: string): void {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 *
 * @param text - Text to copy
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showMessage('Copied to clipboard!', 'success');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    showMessage('Failed to copy to clipboard', 'error');
  }
}

/**
 * Format a date for display
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Get time remaining until a date
 *
 * @param dateString - ISO date string
 * @returns Human-readable time remaining
 */
export function getTimeRemaining(dateString: string): string {
  const now = new Date().getTime();
  const expiry = new Date(dateString).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
