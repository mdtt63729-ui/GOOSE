import { Bot, BotFileEntry, StorageBreakdown } from '../../models/bot';
import { packageCache } from '../runtime/PackageCache';

const DB_NAME = 'GooseBotDatabase';
const DB_VERSION = 2;
const STORE_NAME = 'bots';
const STORAGE_KEY = 'goose_bots_v3';

const SEED_BOTS: Bot[] = [
  {
    id: 'bot_001',
    name: 'Goose Alerter',
    username: '@goose_alerter_bot',
    status: 'RUNNING',
    createdAt: '2026-03-28 14:20',
    updatedAt: '2026-04-06 08:30',
    lastOpenedAt: Date.now() - 1000 * 60 * 10,
    lastRunAt: '2026-04-06 08:30',
    hasEnv: true,
    avatarColor: '#006874',
    description: 'Autonomous health check and uptime monitor telegram bot.',
    files: {
      main: {
        name: 'bot.py',
        size: 3420,
        lastModified: '2026-03-28 14:20',
        lineCount: 94,
        content: `# Goose Alerter Bot
import logging
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_message(chat_id=update.effective_chat.id, text="Goose Alerter Online!")

async def ping(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_message(chat_id=update.effective_chat.id, text="Pong! Latency 12ms.")

if __name__ == '__main__':
    application = ApplicationBuilder().token("YOUR_TOKEN").build()
    application.add_handler(CommandHandler('start', start))
    application.add_handler(CommandHandler('ping', ping))
    application.run_polling()
`,
      },
      requirements: {
        name: 'requirements.txt',
        size: 84,
        lastModified: '2026-03-28 14:20',
        lineCount: 3,
        content: `python-telegram-bot==20.7\nrequests>=2.28.0\nurllib3<2.0.0\n`,
      },
      env: {
        name: '.env',
        size: 120,
        lastModified: '2026-03-28 14:20',
        isMasked: true,
        content: `TELEGRAM_BOT_TOKEN="748291048:AAEzq9X1K8uYw7Z0p_DemoSecret"\nALERT_INTERVAL_SECONDS="60"\nDEBUG="False"\n`,
      },
    },
    logs: [
      { id: 'l1', timestamp: '14:20:01', level: 'info', message: 'Goose Runtime v3.11.8 initializing environment...' },
      { id: 'l2', timestamp: '14:20:02', level: 'info', message: 'Reading requirements.txt: Found 3 dependencies' },
      { id: 'l3', timestamp: '14:20:03', level: 'success', message: 'python-telegram-bot 20.7 already installed ✓' },
      { id: 'l4', timestamp: '14:20:04', level: 'success', message: 'requests 2.32.5 already installed ✓' },
      { id: 'l5', timestamp: '14:20:04', level: 'success', message: 'urllib3 1.26.18 already installed ✓' },
      { id: 'l6', timestamp: '14:20:05', level: 'info', message: 'Loading .env (TELEGRAM_BOT_TOKEN=••••••••••••)' },
      { id: 'l7', timestamp: '14:20:06', level: 'stdout', message: 'Bot authorized: @goose_alerter_bot [ID: 619284019]' },
      { id: 'l8', timestamp: '14:20:07', level: 'success', message: '✓ Bot process active. Listening on Telegram polling loop.' },
    ],
    environment: {
      pythonVersion: '3.11.8',
      isPrepared: true,
      installedPackages: {
        'python-telegram-bot': { name: 'python-telegram-bot', version: '20.7', installedAt: '2026-03-28 14:20', fromCache: true },
        'requests': { name: 'requests', version: '2.32.5', installedAt: '2026-03-28 14:20', fromCache: true },
        'urllib3': { name: 'urllib3', version: '1.26.18', installedAt: '2026-03-28 14:20', fromCache: true },
      },
      envVarsCount: 3,
    },
    metrics: {
      pid: 4092,
      cpuPercent: 0.8,
      memoryMb: 34.2,
      uptimeSeconds: 84320,
    },
  },
  {
    id: 'bot_002',
    name: 'Support Concierge',
    username: '@goose_support_bot',
    status: 'STOPPED',
    createdAt: '2026-03-29 09:15',
    updatedAt: '2026-04-05 18:00',
    lastOpenedAt: Date.now() - 1000 * 60 * 60 * 2,
    lastRunAt: '2026-04-05 18:00',
    hasEnv: false,
    avatarColor: '#4a6267',
    description: 'Automated FAQ respondent for customer questions.',
    files: {
      main: {
        name: 'bot.py',
        size: 5210,
        lastModified: '2026-03-29 09:15',
        lineCount: 142,
        content: `# Support Concierge Bot\nfrom telegram import Update\n# FAQ handling logic\n`,
      },
      requirements: {
        name: 'requirements.txt',
        size: 112,
        lastModified: '2026-03-29 09:15',
        lineCount: 4,
        content: `python-telegram-bot==20.7\npython-dotenv>=1.0.0\n`,
      },
    },
    logs: [
      { id: 'l20', timestamp: '09:15:00', level: 'info', message: 'Config loaded.' },
      { id: 'l21', timestamp: '09:15:02', level: 'stdout', message: 'Connected to Telegram Dispatcher.' },
      { id: 'l22', timestamp: '11:42:10', level: 'warn', message: 'Stop signal received from user interface.' },
      { id: 'l23', timestamp: '11:42:11', level: 'info', message: 'Bot process terminated cleanly.' },
    ],
    environment: {
      pythonVersion: '3.11.8',
      isPrepared: true,
      installedPackages: {
        'python-telegram-bot': { name: 'python-telegram-bot', version: '20.7', installedAt: '2026-03-29 09:15', fromCache: true },
        'python-dotenv': { name: 'python-dotenv', version: '1.0.1', installedAt: '2026-03-29 09:15', fromCache: true },
      },
      envVarsCount: 0,
    },
    metrics: {
      pid: undefined,
      cpuPercent: 0,
      memoryMb: 0,
      uptimeSeconds: 0,
    },
  },
  {
    id: 'bot_003',
    name: 'Feed Broadcaster',
    username: '@rss_goose_bot',
    status: 'IDLE',
    createdAt: '2026-03-30 16:45',
    updatedAt: '2026-04-04 12:00',
    lastOpenedAt: Date.now() - 1000 * 60 * 60 * 24,
    hasEnv: false,
    avatarColor: '#1a60a5',
    description: 'Broadcasts new blog posts to Telegram subscribers.',
    files: {
      main: {
        name: 'bot.py',
        size: 2840,
        lastModified: '2026-03-30 16:45',
        lineCount: 80,
        content: `# Feed Broadcaster\nimport feedparser\nfrom telegram.ext import ApplicationBuilder\n`,
      },
      requirements: {
        name: 'requirements.txt',
        size: 68,
        lastModified: '2026-03-30 16:45',
        lineCount: 2,
        content: `python-telegram-bot==20.7\nfeedparser==6.0.10\n`,
      },
    },
    logs: [
      { id: 'l30', timestamp: '16:45:10', level: 'info', message: 'Package validated.' },
      { id: 'l31', timestamp: '16:45:12', level: 'success', message: 'Virtualenv prepared. Ready to execute.' },
    ],
    environment: {
      pythonVersion: '3.11.8',
      isPrepared: true,
      installedPackages: {
        'python-telegram-bot': { name: 'python-telegram-bot', version: '20.7', installedAt: '2026-03-30 16:45', fromCache: true },
        'feedparser': { name: 'feedparser', version: '6.0.10', installedAt: '2026-03-30 16:45', fromCache: true },
      },
      envVarsCount: 0,
    },
    metrics: {
      pid: undefined,
      cpuPercent: 0,
      memoryMb: 0,
      uptimeSeconds: 0,
    },
  },
  {
    id: 'bot_004',
    name: 'Crypto Ticker Watcher',
    username: '@goose_crypto_ticker_bot',
    status: 'CRASHED',
    createdAt: '2026-04-01 11:10',
    updatedAt: '2026-04-03 14:12',
    lastOpenedAt: Date.now() - 1000 * 60 * 60 * 48,
    lastRunAt: '2026-04-03 14:12',
    hasEnv: true,
    avatarColor: '#9c4327',
    description: 'Price fluctuation alert bot with webhook integration.',
    files: {
      main: {
        name: 'bot.py',
        size: 4120,
        lastModified: '2026-04-01 11:10',
        lineCount: 110,
        content: `# Crypto Ticker Watcher\nimport requests\nfrom telegram import Bot\n`,
      },
      requirements: {
        name: 'requirements.txt',
        size: 145,
        lastModified: '2026-04-01 11:10',
        lineCount: 4,
        content: `python-telegram-bot==20.7\nrequests>=2.28.0\n`,
      },
      env: {
        name: '.env',
        size: 95,
        lastModified: '2026-04-01 11:10',
        isMasked: true,
        content: `TELEGRAM_BOT_TOKEN="••••••••••••••••"\nAPI_KEY="••••••••••••"\n`,
      },
    },
    logs: [
      { id: 'l40', timestamp: '11:10:02', level: 'info', message: 'Starting crypto monitor...' },
      { id: 'l41', timestamp: '11:10:05', level: 'stdout', message: 'Querying Binance API endpoint /api/v3/ticker...' },
      { id: 'l42', timestamp: '11:10:07', level: 'error', message: 'NetworkError: HTTPSConnectionPool: Max retries exceeded' },
      { id: 'l43', timestamp: '11:10:08', level: 'stderr', message: 'Traceback (most recent call last):\n  File "bot.py", line 42, in fetch_prices\n    res = requests.get(URL, timeout=5)\nrequests.exceptions.ConnectTimeout: DNS lookup timed out' },
      { id: 'l44', timestamp: '11:10:09', level: 'error', message: '✕ Process terminated with exit code 1. Status: CRASHED.' },
    ],
    environment: {
      pythonVersion: '3.11.8',
      isPrepared: true,
      installedPackages: {
        'python-telegram-bot': { name: 'python-telegram-bot', version: '20.7', installedAt: '2026-04-01 11:10', fromCache: true },
        'requests': { name: 'requests', version: '2.32.5', installedAt: '2026-04-01 11:10', fromCache: true },
      },
      envVarsCount: 2,
    },
    metrics: {
      pid: undefined,
      cpuPercent: 0,
      memoryMb: 0,
      uptimeSeconds: 124,
      lastExitCode: 1,
    },
  },
];

class BotRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private normalizeBot(bot: any): Bot {
    return {
      ...bot,
      environment: bot.environment || {
        pythonVersion: '3.11.8',
        isPrepared: true,
        installedPackages: {},
        envVarsCount: bot.hasEnv ? 1 : 0,
      },
      metrics: bot.metrics || {
        cpuPercent: 0,
        memoryMb: 0,
        uptimeSeconds: 0,
      },
    };
  }

  // Fallback storage sync
  private syncFallback(bots: Bot[]) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bots));
      }
    } catch {
      // quota or private browsing
    }
  }

  private loadFallback(): Bot[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((b) => this.normalizeBot(b));
          }
        }
      }
    } catch {
      // ignore
    }
    return SEED_BOTS;
  }

  async getAllBots(): Promise<Bot[]> {
    try {
      const db = await this.openDB();
      return new Promise<Bot[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const res = req.result as any[];
          if (!res || res.length === 0) {
            const fallback = this.loadFallback();
            this.seedBots(fallback).then(() => resolve(fallback));
          } else {
            const normalized = res.map((b) => this.normalizeBot(b));
            this.syncFallback(normalized);
            resolve(normalized);
          }
        };

        req.onerror = () => {
          resolve(this.loadFallback());
        };
      });
    } catch {
      return this.loadFallback();
    }
  }

  async getBotById(id: string): Promise<Bot | null> {
    const all = await this.getAllBots();
    return all.find((b) => b.id === id) || null;
  }

  async saveBot(bot: Bot): Promise<void> {
    const normalized = this.normalizeBot(bot);
    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(normalized);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
    }

    const bots = await this.getAllBots();
    const updated = bots.some((b) => b.id === normalized.id)
      ? bots.map((b) => (b.id === normalized.id ? normalized : b))
      : [normalized, ...bots];
    this.syncFallback(updated);
  }

  async updateBot(bot: Bot): Promise<void> {
    return this.saveBot(bot);
  }

  async deleteBot(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
    }

    const bots = (await this.getAllBots()).filter((b) => b.id !== id);
    this.syncFallback(bots);
  }

  async replaceBotFile(
    botId: string,
    fileKey: 'main' | 'requirements' | 'env',
    fileData: BotFileEntry
  ): Promise<void> {
    const bot = await this.getBotById(botId);
    if (!bot) return;

    const updatedFiles = { ...bot.files };
    if (fileKey === 'main') {
      updatedFiles.main = fileData;
    } else if (fileKey === 'requirements') {
      updatedFiles.requirements = fileData;
    } else if (fileKey === 'env') {
      updatedFiles.env = { ...fileData, isMasked: true };
    }

    const updatedBot: Bot = {
      ...bot,
      files: updatedFiles,
      hasEnv: Boolean(updatedFiles.env),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      lastOpenedAt: Date.now(),
    };

    await this.saveBot(updatedBot);
  }

  async removeEnvFile(botId: string): Promise<void> {
    const bot = await this.getBotById(botId);
    if (!bot) return;

    const updatedFiles = { ...bot.files };
    delete updatedFiles.env;

    const updatedBot: Bot = {
      ...bot,
      files: updatedFiles,
      hasEnv: false,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    await this.saveBot(updatedBot);
  }

  async touchBot(botId: string): Promise<void> {
    const bot = await this.getBotById(botId);
    if (!bot) return;

    const updatedBot: Bot = {
      ...bot,
      lastOpenedAt: Date.now(),
    };
    await this.saveBot(updatedBot);
  }

  async seedBots(bots: Bot[]): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const bot of bots) {
        store.put(bot);
      }
      this.syncFallback(bots);
    } catch {
      this.syncFallback(bots);
    }
  }

  async resetToDefaults(): Promise<Bot[]> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const bot of SEED_BOTS) {
        store.put(bot);
      }
    } catch {
      // Fallback
    }
    this.syncFallback(SEED_BOTS);
    return SEED_BOTS;
  }

  async getStorageBreakdown(): Promise<StorageBreakdown> {
    const bots = await this.getAllBots();
    let botSourceBytes = 0;
    let logsBytes = 0;
    let environmentBytes = 0;

    for (const b of bots) {
      if (b.files.main) botSourceBytes += b.files.main.size || 0;
      if (b.files.requirements) botSourceBytes += b.files.requirements.size || 0;
      if (b.files.env) botSourceBytes += b.files.env.size || 0;

      for (const log of b.logs || []) {
        logsBytes += (log.message?.length || 0) + 32;
      }

      const pkgsCount = Object.keys(b.environment?.installedPackages || {}).length;
      environmentBytes += Math.round(pkgsCount * 2.2 * 1024 * 1024);
    }

    const packageCacheBytes = packageCache
      .getAllCachedPackages()
      .reduce((acc, p) => acc + (p.sizeBytes || 0), 0);
    const runtimeBytes = 34 * 1024 * 1024; // Embedded Python 3.11 Android runtime binaries
    const updateCacheBytes = 1.4 * 1024 * 1024; // Temporary APK download buffers & metadata

    return {
      botSourceBytes,
      runtimeBytes,
      environmentBytes,
      packageCacheBytes,
      logsBytes,
      updateCacheBytes,
      totalBytes:
        botSourceBytes +
        runtimeBytes +
        environmentBytes +
        packageCacheBytes +
        logsBytes +
        updateCacheBytes,
    };
  }

  async purgeTemporaryCaches(): Promise<void> {
    // Purge temporary logs over 300 lines per bot while preserving source code
    const bots = await this.getAllBots();
    for (const b of bots) {
      if (b.logs.length > 250) {
        b.logs = b.logs.slice(-250);
        await this.saveBot(b);
      }
    }
  }
}

export const botRepository = new BotRepository();
