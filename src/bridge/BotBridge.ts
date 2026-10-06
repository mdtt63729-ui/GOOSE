import { Bot, BotLogLine, BotStatus } from '../models/bot';
import { packageCache } from '../services/runtime/PackageCache';

export interface SelectFileOptions {
  accept: string;
  expectedType: 'bot' | 'requirements' | 'env';
}

export interface SelectedFileResult {
  fileName: string;
  fileSize: number;
  content?: string;
}

export interface IBotBridge {
  isNativeAvailable(): boolean;
  getBridgeVersion(): string;
  selectFile(options: SelectFileOptions): Promise<SelectedFileResult | null>;
  startBot(bot: Bot): Promise<boolean>;
  stopBot(botId: string): Promise<boolean>;
  rerunBot(bot: Bot): Promise<boolean>;
  restartBot(bot: Bot): Promise<boolean>;
  resetBot(bot: Bot): Promise<boolean>;
  deleteBot(botId: string): Promise<boolean>;
  sendStdin(bot: Bot, command: string): Promise<void>;
  getBotStatus(botId: string): Promise<BotStatus>;
  getLogs(botId: string): Promise<BotLogLine[]>;
  ping(): Promise<{ success: boolean; latencyMs: number; mode: 'native' | 'mock' }>;
  isOffline(): boolean;
  setOffline(offline: boolean): void;
  startForegroundService(botId: string, botName: string): Promise<boolean>;
  stopForegroundService(): Promise<boolean>;
  isForegroundServiceRunning(): Promise<boolean>;
  installApk(filePath: string): Promise<boolean>;

  // Event listeners
  onLogReceived(callback: (botId: string, log: BotLogLine) => void): () => void;
  onStatusChanged(callback: (botId: string, status: BotStatus) => void): () => void;
  notifyLog(botId: string, log: BotLogLine): void;
  notifyStatus(botId: string, status: BotStatus): void;
}

declare global {
  interface Window {
    GooseNative?: {
      postMessage?: (message: string) => void;
      selectFile?: (accept: string, type: string) => string;
      startBot?: (botId: string) => boolean;
      stopBot?: (botId: string) => boolean;
      restartBot?: (botId: string) => boolean;
      resetBot?: (botId: string) => boolean;
      deleteBot?: (botId: string) => boolean;
      sendStdin?: (botId: string, input: string) => boolean;
      startForegroundService?: (botId: string, botName: string) => boolean;
      stopForegroundService?: () => boolean;
      isForegroundServiceRunning?: () => boolean;
      installApk?: (filePath: string) => boolean;
      getBotStatus?: (botId: string) => string;
      getLogs?: (botId: string) => string;
      ping?: () => string;
    };
  }
}

class BotBridgeImpl implements IBotBridge {
  private logListeners: Set<(botId: string, log: BotLogLine) => void> = new Set();
  private statusListeners: Set<(botId: string, status: BotStatus) => void> = new Set();

  isNativeAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.GooseNative);
  }

  getBridgeVersion(): string {
    return '4.0.0-phase4';
  }

  isOffline(): boolean {
    return packageCache.isOffline();
  }

  setOffline(offline: boolean): void {
    packageCache.setOffline(offline);
  }

  async ping(): Promise<{ success: boolean; latencyMs: number; mode: 'native' | 'mock' }> {
    const start = performance.now();
    if (this.isNativeAvailable() && window.GooseNative?.ping) {
      try {
        window.GooseNative.ping();
        const latency = Math.round(performance.now() - start);
        return { success: true, latencyMs: latency, mode: 'native' };
      } catch {
        // fallback
      }
    }
    await new Promise((r) => setTimeout(r, 8));
    const latency = Math.round(performance.now() - start);
    return { success: true, latencyMs: latency, mode: 'mock' };
  }

  async selectFile(options: SelectFileOptions): Promise<SelectedFileResult | null> {
    if (this.isNativeAvailable() && window.GooseNative?.selectFile) {
      try {
        const raw = window.GooseNative.selectFile(options.accept, options.expectedType);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch {
        // Fall back to web file input
      }
    }

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept;
      input.style.display = 'none';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const lowerName = file.name.toLowerCase();
        if (options.expectedType === 'bot' && !lowerName.endsWith('.py')) {
          resolve(null);
          return;
        }
        if (options.expectedType === 'requirements' && !lowerName.endsWith('.txt')) {
          resolve(null);
          return;
        }

        let content = '';
        try {
          content = await file.text();
        } catch {
          // ignore read error
        }

        resolve({
          fileName: file.name,
          fileSize: file.size,
          content,
        });

        document.body.removeChild(input);
      };

      input.oncancel = () => {
        resolve(null);
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  async startBot(bot: Bot): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.startBot) {
      try {
        return window.GooseNative.startBot(bot.id);
      } catch {
        // Fall through
      }
    }
    return true;
  }

  async stopBot(botId: string): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.stopBot) {
      try {
        return window.GooseNative.stopBot(botId);
      } catch {
        // Fall through
      }
    }
    return true;
  }

  async rerunBot(bot: Bot): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.restartBot) {
      try {
        return window.GooseNative.restartBot(bot.id);
      } catch {
        // Fall through
      }
    }
    return true;
  }

  async restartBot(bot: Bot): Promise<boolean> {
    return this.rerunBot(bot);
  }

  async resetBot(bot: Bot): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.resetBot) {
      try {
        return window.GooseNative.resetBot(bot.id);
      } catch {
        // Fall through
      }
    }
    return true;
  }

  async deleteBot(botId: string): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.deleteBot) {
      try {
        return window.GooseNative.deleteBot(botId);
      } catch {
        // Fall through
      }
    }
    return true;
  }

  async sendStdin(bot: Bot, command: string): Promise<void> {
    if (this.isNativeAvailable() && window.GooseNative?.sendStdin) {
      try {
        window.GooseNative.sendStdin(bot.id, command);
        return;
      } catch {
        // Fall through
      }
    }
  }

  async startForegroundService(botId: string, botName: string): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.startForegroundService) {
      try {
        return window.GooseNative.startForegroundService(botId, botName);
      } catch {
        // Fall through
      }
    }
    return true;
  }

  async stopForegroundService(): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.stopForegroundService) {
      try {
        return window.GooseNative.stopForegroundService();
      } catch {
        // Fall through
      }
    }
    return true;
  }

  async isForegroundServiceRunning(): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.isForegroundServiceRunning) {
      try {
        return window.GooseNative.isForegroundServiceRunning();
      } catch {
        // Fall through
      }
    }
    return false;
  }

  async installApk(filePath: string): Promise<boolean> {
    if (this.isNativeAvailable() && window.GooseNative?.installApk) {
      try {
        return window.GooseNative.installApk(filePath);
      } catch {
        // Fall through
      }
    }
    return false;
  }

  async getBotStatus(botId: string): Promise<BotStatus> {
    if (this.isNativeAvailable() && window.GooseNative?.getBotStatus) {
      try {
        return window.GooseNative.getBotStatus(botId) as BotStatus;
      } catch {
        // Fall through
      }
    }
    return 'STOPPED';
  }

  async getLogs(botId: string): Promise<BotLogLine[]> {
    if (this.isNativeAvailable() && window.GooseNative?.getLogs) {
      try {
        const raw = window.GooseNative.getLogs(botId);
        return JSON.parse(raw);
      } catch {
        // Fall through
      }
    }
    return [];
  }

  onLogReceived(callback: (botId: string, log: BotLogLine) => void): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  onStatusChanged(callback: (botId: string, status: BotStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  notifyLog(botId: string, log: BotLogLine) {
    this.logListeners.forEach((cb) => cb(botId, log));
  }

  notifyStatus(botId: string, status: BotStatus) {
    this.statusListeners.forEach((cb) => cb(botId, status));
  }
}

export const BotBridge: IBotBridge = new BotBridgeImpl();
