export interface CachedWheel {
  name: string;
  version: string;
  wheelFileName: string;
  sizeBytes: number;
  cachedAt: string;
}

// Pre-seeded local wheel package cache in Goose/Cache/packages/
const DEFAULT_GLOBAL_CACHE: Record<string, CachedWheel> = {
  'python-telegram-bot': {
    name: 'python-telegram-bot',
    version: '20.7',
    wheelFileName: 'python_telegram_bot-20.7-py3-none-any.whl',
    sizeBytes: 1240500,
    cachedAt: '2026-03-25 10:00',
  },
  'requests': {
    name: 'requests',
    version: '2.32.5',
    wheelFileName: 'requests-2.32.5-py3-none-any.whl',
    sizeBytes: 64200,
    cachedAt: '2026-03-25 10:00',
  },
  'aiohttp': {
    name: 'aiohttp',
    version: '3.12.0',
    wheelFileName: 'aiohttp-3.12.0-cp311-cp311-manylinux2014_aarch64.whl',
    sizeBytes: 1840000,
    cachedAt: '2026-03-25 10:00',
  },
  'feedparser': {
    name: 'feedparser',
    version: '6.0.10',
    wheelFileName: 'feedparser-6.0.10-py3-none-any.whl',
    sizeBytes: 42100,
    cachedAt: '2026-03-25 10:00',
  },
  'python-dotenv': {
    name: 'python-dotenv',
    version: '1.0.1',
    wheelFileName: 'python_dotenv-1.0.1-py3-none-any.whl',
    sizeBytes: 35400,
    cachedAt: '2026-03-25 10:00',
  },
  'urllib3': {
    name: 'urllib3',
    version: '1.26.18',
    wheelFileName: 'urllib3-1.26.18-py2.py3-none-any.whl',
    sizeBytes: 128900,
    cachedAt: '2026-03-25 10:00',
  },
  'pytelegrambotapi': {
    name: 'pytelegrambotapi',
    version: '4.18.0',
    wheelFileName: 'pyTelegramBotAPI-4.18.0-py3-none-any.whl',
    sizeBytes: 245000,
    cachedAt: '2026-03-25 10:00',
  },
  'flask': {
    name: 'flask',
    version: '3.0.3',
    wheelFileName: 'flask-3.0.3-py3-none-any.whl',
    sizeBytes: 104200,
    cachedAt: '2026-03-25 10:00',
  },
  'certifi': {
    name: 'certifi',
    version: '2024.2.2',
    wheelFileName: 'certifi-2024.2.2-py3-none-any.whl',
    sizeBytes: 164000,
    cachedAt: '2026-03-25 10:00',
  },
};

const CACHE_STORAGE_KEY = 'goose_global_package_cache';
const OFFLINE_STORAGE_KEY = 'goose_offline_mode';

class PackageCacheService {
  private cache: Record<string, CachedWheel>;
  private isOfflineMode: boolean = false;

  constructor() {
    this.cache = { ...DEFAULT_GLOBAL_CACHE };
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(CACHE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.cache = { ...DEFAULT_GLOBAL_CACHE, ...parsed };
        }
        const offlineVal = localStorage.getItem(OFFLINE_STORAGE_KEY);
        this.isOfflineMode = offlineVal === 'true';
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.cache));
      }
    } catch {
      // ignore
    }
  }

  isOffline(): boolean {
    return this.isOfflineMode;
  }

  setOffline(offline: boolean) {
    this.isOfflineMode = offline;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(OFFLINE_STORAGE_KEY, String(offline));
      }
    } catch {
      // ignore
    }
  }

  getCachedPackage(name: string): CachedWheel | null {
    const key = name.toLowerCase().replace(/_/g, '-');
    return this.cache[key] || null;
  }

  addPackageToCache(name: string, version: string, sizeBytes: number = 75000): CachedWheel {
    const key = name.toLowerCase().replace(/_/g, '-');
    const wheel: CachedWheel = {
      name: key,
      version,
      wheelFileName: `${key}-${version}-py3-none-any.whl`,
      sizeBytes,
      cachedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    this.cache[key] = wheel;
    this.saveToStorage();
    return wheel;
  }

  getAllCachedPackages(): CachedWheel[] {
    return Object.values(this.cache);
  }

  clearCache() {
    this.cache = { ...DEFAULT_GLOBAL_CACHE };
    this.saveToStorage();
  }
}

export const packageCache = new PackageCacheService();
