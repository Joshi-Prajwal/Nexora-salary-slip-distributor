/**
 * Formatting utilities for confidence, file size, status badges
 */

export function formatConfidence(confidence: number): string {
  if (isNaN(confidence)) return '0%';
  return `${Math.round(confidence * 100)}%`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}
