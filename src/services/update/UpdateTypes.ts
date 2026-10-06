export interface ApkAsset {
  name: string;
  size: number;
  downloadUrl: string;
  contentType?: string;
}

export interface ReleaseInfo {
  version: string;
  versionCode: number;
  name: string;
  releaseNotes: string;
  publishedAt: string;
  apkAsset: ApkAsset;
  checksumSha256?: string;
  htmlUrl: string;
  isPreRelease?: boolean;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestRelease: ReleaseInfo | null;
  checkedAt: number;
  error?: string;
  source: 'cache' | 'network' | 'simulated';
}

export type DownloadStatus =
  | 'IDLE'
  | 'PREPARING'
  | 'DOWNLOADING'
  | 'PAUSED'
  | 'VERIFYING'
  | 'READY_TO_INSTALL'
  | 'INSTALLING'
  | 'FAILED'
  | 'CANCELLED';

export interface DownloadState {
  status: DownloadStatus;
  release: ReleaseInfo | null;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  verifiedSha256?: string;
  expectedSha256?: string;
  checksumValid?: boolean;
  error?: string;
  localBlobUrl?: string;
}
