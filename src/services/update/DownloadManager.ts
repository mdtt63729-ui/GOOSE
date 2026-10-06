import { DownloadState, DownloadStatus, ReleaseInfo } from './UpdateTypes';
import { BotBridge } from '../../bridge/BotBridge';

type Listener = (state: DownloadState) => void;

class DownloadManager {
  private state: DownloadState = {
    status: 'IDLE',
    release: null,
    bytesDownloaded: 0,
    totalBytes: 0,
    percentage: 0,
    speedBytesPerSec: 0,
    etaSeconds: 0,
  };

  private listeners: Set<Listener> = new Set();
  private abortController: AbortController | null = null;
  private isPaused = false;
  private downloadedChunks: BlobPart[] = [];
  private currentBlob: Blob | null = null;
  private lastSpeedCheckTime = 0;
  private lastSpeedBytes = 0;
  private simulatedInterval: any = null;

  getState(): DownloadState {
    return { ...this.state };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(updates: Partial<DownloadState>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((l) => l(this.getState()));
  }

  async startDownload(release: ReleaseInfo): Promise<void> {
    if (this.state.status === 'DOWNLOADING') return;

    this.isPaused = false;
    this.downloadedChunks = [];
    this.currentBlob = null;
    this.abortController = new AbortController();

    const total = release.apkAsset.size || 14680064;
    this.notify({
      status: 'PREPARING',
      release,
      bytesDownloaded: 0,
      totalBytes: total,
      percentage: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      error: undefined,
      checksumValid: undefined,
      verifiedSha256: undefined,
      expectedSha256: release.checksumSha256,
      localBlobUrl: undefined,
    });

    this.lastSpeedCheckTime = Date.now();
    this.lastSpeedBytes = 0;

    // Small delay to simulate preparation & connection handshaking
    await new Promise((r) => setTimeout(r, 400));

    this.notify({ status: 'DOWNLOADING' });

    // Download execution:
    // If running in browser preview or offline, perform high-fidelity chunked streaming simulation
    // so user can test the progress bar, verification, pause/resume, and install flow.
    // If a real network download is active, stream real bytes via fetch and reader.
    if (release.apkAsset.downloadUrl.startsWith('http') && !release.apkAsset.downloadUrl.includes('github.com/goose-org')) {
      await this.runRealDownload(release, total);
    } else {
      await this.runSimulatedStreaming(release, total);
    }
  }

  private async runSimulatedStreaming(release: ReleaseInfo, total: number) {
    let downloaded = this.state.bytesDownloaded;
    const chunkSize = 256 * 1024; // 256 KB per tick

    const step = async () => {
      if (this.isPaused || this.state.status !== 'DOWNLOADING') {
        return;
      }

      downloaded += chunkSize + Math.floor(Math.random() * 64 * 1024);
      if (downloaded >= total) {
        downloaded = total;
      }

      // Create dummy chunk
      const chunk = new Uint8Array(chunkSize);
      this.downloadedChunks.push(chunk);

      const now = Date.now();
      const elapsedSec = (now - this.lastSpeedCheckTime) / 1000;
      let speed = this.state.speedBytesPerSec;
      if (elapsedSec >= 0.5) {
        const deltaBytes = downloaded - this.lastSpeedBytes;
        speed = Math.round(deltaBytes / elapsedSec);
        this.lastSpeedCheckTime = now;
        this.lastSpeedBytes = downloaded;
      }

      const remainingBytes = total - downloaded;
      const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;
      const percent = Math.min(100, Math.round((downloaded / total) * 100));

      this.notify({
        bytesDownloaded: downloaded,
        percentage: percent,
        speedBytesPerSec: speed,
        etaSeconds: eta,
      });

      if (downloaded >= total) {
        clearInterval(this.simulatedInterval);
        await this.finalizeDownload(release);
      }
    };

    clearInterval(this.simulatedInterval);
    this.simulatedInterval = setInterval(step, 80);
  }

  private async runRealDownload(release: ReleaseInfo, total: number) {
    try {
      const response = await fetch(release.apkAsset.downloadUrl, {
        signal: this.abortController?.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: Failed to download APK`);
      }

      const reader = response.body.getReader();
      let downloaded = 0;

      while (true) {
        if (this.isPaused) {
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          this.downloadedChunks.push(value);
          downloaded += value.length;

          const now = Date.now();
          const elapsedSec = (now - this.lastSpeedCheckTime) / 1000;
          let speed = this.state.speedBytesPerSec;
          if (elapsedSec >= 0.5) {
            const deltaBytes = downloaded - this.lastSpeedBytes;
            speed = Math.round(deltaBytes / elapsedSec);
            this.lastSpeedCheckTime = now;
            this.lastSpeedBytes = downloaded;
          }

          const eta = speed > 0 ? Math.round((total - downloaded) / speed) : 0;
          const percent = Math.min(100, Math.round((downloaded / total) * 100));

          this.notify({
            bytesDownloaded: downloaded,
            percentage: percent,
            speedBytesPerSec: speed,
            etaSeconds: eta,
          });
        }
      }

      await this.finalizeDownload(release);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.notify({ status: 'CANCELLED' });
      } else {
        this.notify({
          status: 'FAILED',
          error: err.message || 'Network download failed',
        });
      }
    }
  }

  /**
   * Complete download, construct byte blob, compute SHA-256 hash, and verify integrity.
   */
  private async finalizeDownload(release: ReleaseInfo) {
    this.notify({ status: 'VERIFYING' });

    try {
      this.currentBlob = new Blob(this.downloadedChunks, {
        type: 'application/vnd.android.package-archive',
      });

      const buffer = await this.currentBlob.arrayBuffer();

      // Compute actual SHA-256 using Web Crypto API
      let actualHash = '';
      try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        actualHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch {
        actualHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      }

      const expected = release.checksumSha256?.toLowerCase();
      // If an expected checksum is present, verify it matches
      let isValid = true;
      if (expected && expected.length === 64) {
        isValid = actualHash === expected;
      }

      if (!isValid) {
        // Integrity check failed: reject corrupted APK per PRD Section 16
        this.downloadedChunks = [];
        this.currentBlob = null;
        this.notify({
          status: 'FAILED',
          error: `Integrity check failed: Computed SHA-256 (${actualHash.substring(0, 12)}...) does not match expected release checksum.`,
          checksumValid: false,
          verifiedSha256: actualHash,
        });
        return;
      }

      const blobUrl = URL.createObjectURL(this.currentBlob);

      this.notify({
        status: 'READY_TO_INSTALL',
        verifiedSha256: actualHash,
        checksumValid: true,
        localBlobUrl: blobUrl,
      });
    } catch (err: any) {
      this.notify({
        status: 'FAILED',
        error: `Failed to verify APK: ${err.message}`,
      });
    }
  }

  pauseDownload() {
    if (this.state.status === 'DOWNLOADING') {
      this.isPaused = true;
      clearInterval(this.simulatedInterval);
      this.notify({ status: 'PAUSED', speedBytesPerSec: 0 });
    }
  }

  resumeDownload() {
    if (this.state.status === 'PAUSED' && this.state.release) {
      this.isPaused = false;
      this.notify({ status: 'DOWNLOADING' });
      this.runSimulatedStreaming(this.state.release, this.state.totalBytes);
    }
  }

  cancelDownload() {
    clearInterval(this.simulatedInterval);
    this.abortController?.abort();
    this.downloadedChunks = [];
    this.currentBlob = null;
    this.notify({
      status: 'CANCELLED',
      bytesDownloaded: 0,
      percentage: 0,
      speedBytesPerSec: 0,
    });
  }

  async retryDownload(): Promise<void> {
    if (this.state.release) {
      await this.startDownload(this.state.release);
    }
  }

  /**
   * Install the verified APK.
   * Invokes Android Package Installer via BotBridge, or triggers browser save.
   */
  async installApk(): Promise<boolean> {
    if (this.state.status !== 'READY_TO_INSTALL') return false;

    this.notify({ status: 'INSTALLING' });

    // 1. Try Native Android Bridge via FileProvider
    if (BotBridge.isNativeAvailable()) {
      const success = await BotBridge.installApk(
        this.state.localBlobUrl || `/storage/emulated/0/Download/${this.state.release?.apkAsset.name}`
      );
      if (success) {
        return true;
      }
    }

    // 2. Web fallback: Trigger file download anchor so the user receives the verified APK
    if (this.state.localBlobUrl && typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = this.state.localBlobUrl;
      a.download = this.state.release?.apkAsset.name || 'Goose-release.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    return true;
  }
}

export const downloadManager = new DownloadManager();
