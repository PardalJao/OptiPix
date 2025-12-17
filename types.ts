export enum ImageFormat {
  WEBP = 'image/webp',
  AVIF = 'image/avif',
  JPEG = 'image/jpeg',
  PNG = 'image/png'
}

export enum ProcessingStatus {
  IDLE = 'idle',
  CONVERTING = 'converting',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ConversionSettings {
  format: ImageFormat;
  quality: number; // 0.1 to 1.0
}

export interface ProcessedImage {
  id: string;
  originalFile: File;
  previewUrl: string; // Original Image URL
  convertedBlob: Blob | null;
  convertedUrl: string | null; // Optimized Image URL
  status: ProcessingStatus;
  originalSize: number;
  convertedSize: number;
  settings: ConversionSettings; // Individual settings per image
  altText?: string;
  isGeneratingAlt?: boolean;
}