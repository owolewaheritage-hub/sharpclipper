export type AppPage = 'home' | 'editor' | 'dashboard' | 'pricing' | 'auth';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type PlanTier = 'free' | 'pro';

export interface CaptionCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface SplitSegment {
  id: string;
  label: string;
  start: number;
  end: number;
}

export interface VideoSource {
  id: string;
  title: string;
  origin: 'upload' | 'youtube' | 'sample';
  url: string;
  file?: File;
  blob?: Blob;
  duration: number;
  posterUrl?: string;
  youtubeUrl?: string;
}

export interface SavedClip {
  id: string;
  title: string;
  createdAt: string;
  duration: number;
  startTime: number;
  endTime: number;
  aspectRatio: AspectRatio;
  quality: '720p' | '1080p';
  hasWatermark: boolean;
  captionsEnabled: boolean;
  captionsCount: number;
  thumbnailDataUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  plan: PlanTier;
  freeClipsUsed: number;
  freeClipsMonth: string; // YYYY-MM
  singleClipCredits: number;
  proActivatedAt?: string;
  createdAt: string;
}

export interface PaymentIntent {
  kind: 'pro_subscription' | 'single_clip';
  amountNgn: number;
  title: string;
  description: string;
}
