// Export and download utility functions

/**
 * Generate a timestamp string for filenames
 * Format: YYYY-MM-DDTHH-MM-SS
 */
export function generateTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Download a blob as a file with the given filename
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Convert a canvas element to a PNG blob
 */
export function canvasToPNGBlob(
  canvas: HTMLCanvasElement,
  callback: (blob: Blob | null) => void
): void {
  canvas.toBlob(callback);
}

/**
 * Convert a canvas element to a JPEG blob
 */
export function canvasToJPEGBlob(
  canvas: HTMLCanvasElement,
  callback: (blob: Blob | null) => void,
  quality: number = 0.9
): void {
  canvas.toBlob(callback, 'image/jpeg', quality);
}

/**
 * Export canvas as PNG and download it
 */
export function exportCanvasAsPNG(canvas: HTMLCanvasElement, baseFilename: string = 'easygraphs'): void {
  canvasToPNGBlob(canvas, (blob) => {
    if (blob) {
      const timestamp = generateTimestamp();
      downloadBlob(blob, `${baseFilename}-${timestamp}.png`);
    }
  });
}

/**
 * Export canvas as JPEG and download it
 */
export function exportCanvasAsJPEG(
  canvas: HTMLCanvasElement,
  baseFilename: string = 'easygraphs',
  quality: number = 0.9
): void {
  canvasToJPEGBlob(canvas, (blob) => {
    if (blob) {
      const timestamp = generateTimestamp();
      downloadBlob(blob, `${baseFilename}-${timestamp}.jpg`);
    }
  }, quality);
}
