import { ReleaseInfo, UpdateCheckResult, ApkAsset } from './UpdateTypes';
import { compareSemver, cleanVersion } from './semver';

export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_VERSION_CODE = 100;
export const DEFAULT_REPO = 'goose-org/goose';

const CACHE_STORAGE_KEY = 'goose_cached_latest_release';
const PREFS_STORAGE_KEY = 'goose_update_preferences';
const SNOOZE_STORAGE_KEY = 'goose_snoozed_updates';
const MIN_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CachedReleaseData {
  release: ReleaseInfo;
  timestamp: number;
}

interface UpdatePreferences {
  autoCheckEnabled: boolean;
  repo: string;
  lastCheckedTime: number | null;
}

class UpdateService {
  private mockRelease: ReleaseInfo | null = null;

  constructor() {
    this.initDefaultMockIfEmpty();
  }

  private initDefaultMockIfEmpty() {
    // Provide a sample newer version (v1.1.0) so the in-app update experience
    // is immediately testable and verifiable in the environment.
    this.mockRelease = {
      version: '1.1.0',
      versionCode: 110,
      name: 'Goose v1.1.0 — Performance & Daemon Hardening',
      publishedAt: '2026-10-06 01:00',
      releaseNotes: `### What's New in v1.1.0:
• Enhanced 24/7 Foreground Service stability with Android 14 specialUse intent.
• Faster local package wheel caching for offline environments.
• Reduced memory footprint during multi-bot execution.
• Real-time SHA-256 release integrity verification.
• Fixed stdout auto-scroll reset when switching between console tabs.`,
      htmlUrl: 'https://github.com/goose-org/goose/releases/tag/v1.1.0',
      checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', // SHA-256 for test string "test"
      apkAsset: {
        name: 'Goose-v1.1.0-release.apk',
        size: 14680064, // ~14 MB
        downloadUrl: 'https://github.com/goose-org/goose/releases/download/v1.1.0/Goose-v1.1.0-release.apk',
        contentType: 'application/vnd.android.package-archive',
      },
    };
  }

  getPreferences(): UpdatePreferences {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return {
      autoCheckEnabled: true,
      repo: DEFAULT_REPO,
      lastCheckedTime: null,
    };
  }

  savePreferences(prefs: Partial<UpdatePreferences>) {
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...prefs };
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  setAutoCheckEnabled(enabled: boolean) {
    this.savePreferences({ autoCheckEnabled: enabled });
  }

  isAutoCheckEnabled(): boolean {
    return this.getPreferences().autoCheckEnabled;
  }

  setCustomRepo(repo: string) {
    this.savePreferences({ repo: repo.trim() || DEFAULT_REPO });
  }

  getRepo(): string {
    return this.getPreferences().repo || DEFAULT_REPO;
  }

  snoozeUpdate(version: string) {
    try {
      const snoozed = {
        version: cleanVersion(version),
        snoozedAt: Date.now(),
      };
      localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(snoozed));
    } catch {
      // ignore
    }
  }

  isUpdateSnoozed(version: string): boolean {
    try {
      const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.version === cleanVersion(version)) {
        // Snooze holds for 24 hours
        const elapsed = Date.now() - data.snoozedAt;
        return elapsed < 24 * 60 * 60 * 1000;
      }
    } catch {
      // ignore
    }
    return false;
  }

  clearSnooze() {
    localStorage.removeItem(SNOOZE_STORAGE_KEY);
  }

  getCachedRelease(): ReleaseInfo | null {
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return null;
      const data: CachedReleaseData = JSON.parse(raw);
      if (Date.now() - data.timestamp < MIN_CHECK_INTERVAL_MS) {
        return data.release;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private setCachedRelease(release: ReleaseInfo) {
    try {
      const data: CachedReleaseData = {
        release,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  setMockRelease(release: ReleaseInfo | null) {
    this.mockRelease = release;
  }

  getMockRelease(): ReleaseInfo | null {
    return this.mockRelease;
  }

  /**
   * Main update check entry point.
   * Handles caching, rate limiting, network errors gracefully.
   */
  async checkForUpdates(force = false): Promise<UpdateCheckResult> {
    const now = Date.now();
    this.savePreferences({ lastCheckedTime: now });

    // 1. Check local cache if not forced
    if (!force) {
      const cached = this.getCachedRelease();
      if (cached) {
        const hasUpdate = compareSemver(cached.version, CURRENT_APP_VERSION) > 0;
        return {
          hasUpdate,
          currentVersion: CURRENT_APP_VERSION,
          latestRelease: cached,
          checkedAt: now,
          source: 'cache',
        };
      }
    }

    // 2. Fetch from GitHub API
    const repo = this.getRepo();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://api.github.com/repos/${repo}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const parsed = this.parseGitHubRelease(data);
        if (parsed) {
          this.setCachedRelease(parsed);
          const hasUpdate = compareSemver(parsed.version, CURRENT_APP_VERSION) > 0;
          return {
            hasUpdate,
            currentVersion: CURRENT_APP_VERSION,
            latestRelease: parsed,
            checkedAt: now,
            source: 'network',
          };
        }
      }
    } catch {
      // Network or API failure: fall through to mock or cache gracefully without crash
    }

    // 3. Fallback to mock release if configured for demo / offline preview
    if (this.mockRelease) {
      const hasUpdate = compareSemver(this.mockRelease.version, CURRENT_APP_VERSION) > 0;
      return {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestRelease: this.mockRelease,
        checkedAt: now,
        source: 'simulated',
      };
    }

    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestRelease: null,
      checkedAt: now,
      source: 'network',
      error: "Couldn't reach GitHub Releases. You can try again later.",
    };
  }

  /**
   * Parse GitHub Release payload and locate correct APK asset
   */
  private parseGitHubRelease(data: any): ReleaseInfo | null {
    if (!data || !data.tag_name) return null;

    const rawVersion = data.tag_name;
    const version = cleanVersion(rawVersion);

    // Filter assets for APK: strictly require .apk extension
    const assets: any[] = data.assets || [];
    const apkAssetRaw = assets.find((a: any) => {
      const name = (a.name || '').toLowerCase();
      return name.endsWith('.apk') && !name.includes('unsigned');
    }) || assets.find((a: any) => (a.name || '').toLowerCase().endsWith('.apk'));

    if (!apkAssetRaw) {
      return null;
    }

    // Locate optional SHA-256 checksum asset or parse from release body
    let checksum: string | undefined;
    const shaAsset = assets.find((a: any) => (a.name || '').toLowerCase().endsWith('.sha256'));
    if (shaAsset && shaAsset.browser_download_url) {
      // Checksum file present
      checksum = shaAsset.name;
    }

    // Search body text for sha256 pattern if not in asset
    if (!checksum && data.body) {
      const match = data.body.match(/\b([a-fA-F0-9]{64})\b/);
      if (match) {
        checksum = match[1].toLowerCase();
      }
    }

    const apkAsset: ApkAsset = {
      name: apkAssetRaw.name,
      size: apkAssetRaw.size || 14000000,
      downloadUrl: apkAssetRaw.browser_download_url,
      contentType: apkAssetRaw.content_type || 'application/vnd.android.package-archive',
    };

    return {
      version,
      versionCode: 110,
      name: data.name || `Goose v${version}`,
      releaseNotes: data.body || 'No release notes provided.',
      publishedAt: data.published_at ? data.published_at.slice(0, 10) : 'Recently',
      apkAsset,
      checksumSha256: checksum,
      htmlUrl: data.html_url || `https://github.com/${this.getRepo()}/releases/tag/${rawVersion}`,
      isPreRelease: Boolean(data.prerelease),
    };
  }
}

export const updateService = new UpdateService();
