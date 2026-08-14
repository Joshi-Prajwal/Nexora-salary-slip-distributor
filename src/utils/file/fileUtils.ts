/**
 * File utilities abstraction
 */

export function isPdfFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf');
}

export function extractFileName(filePath: string): string {
  if (!filePath) return '';
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
}
