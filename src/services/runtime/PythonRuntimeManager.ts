import { Bot, BotLogLine, BotStatus, InstalledPackage, ProcessMetrics } from '../../models/bot';
import { parseRequirements, isVersionCompatible } from './RequirementsParser';
import { packageCache } from './PackageCache';

export interface RuntimeCallbacks {
  onLog: (botId: string, log: BotLogLine) => void;
  onStatusChange: (botId: string, status: BotStatus) => void;
  onMetricsUpdate: (botId: string, metrics: ProcessMetrics) => void;
  onEnvironmentUpdate: (botId: string, packages: Record<string, InstalledPackage>) => void;
  onForegroundServiceUpdate: (active: boolean, runningBotNames: string[]) => void;
}

// Regex to detect and mask Telegram bot tokens (e.g. 123456789:ABCdef-ghI_jklmnop...)
const TELEGRAM_TOKEN_REGEX = /\b[0-9]{8,12}:[a-zA-Z0-9_-]{30,45}\b/g;
const GENERIC_SECRET_REGEX = /(?:token|secret|api[_-]?key|password|auth|bearer)\s*[:=]\s*['"]?([a-zA-Z0-9_\-.~+=/]{8,})['"]?/gi;
const MAX_LOG_BUFFER_SIZE = 1000;
const MAX_CRASH_RETRIES = 3;

export function maskSecrets(text: string): string {
  if (!text) return '';
  let masked = text.replace(TELEGRAM_TOKEN_REGEX, (match) => {
    return `${match.substring(0, 4)}:••••••••••••••••`;
  });
  masked = masked.replace(GENERIC_SECRET_REGEX, (full, val) => {
    const keep = Math.min(3, Math.floor(val.length / 4));
    return full.replace(val, `${val.substring(0, keep)}••••••••`);
  });
  return masked;
}

class PythonRuntimeManager {
  private callbacks: RuntimeCallbacks | null = null;
  private runningProcesses: Map<
    string,
    {
      pid: number;
      startTime: number;
      intervalId: any;
      metrics: ProcessMetrics;
      botName: string;
      is24x7: boolean;
      consecutiveCrashes: number;
    }
  > = new Map();

  private isForegroundServiceRunning: boolean = false;

  constructor() {
    this.setupAppLifecycleListeners();
  }

  private setupAppLifecycleListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      // If 24/7 mode is NOT enabled for a bot, stop it gracefully when user closes app
      this.runningProcesses.forEach((proc, botId) => {
        if (!proc.is24x7) {
          this.stopBot(botId);
        }
      });
    });
  }

  setCallbacks(callbacks: RuntimeCallbacks) {
    this.callbacks = callbacks;
  }

  private emitLog(botId: string, level: BotLogLine['level'], rawMessage: string) {
    const masked = maskSecrets(rawMessage);
    const log: BotLogLine = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level,
      message: masked,
    };
    this.callbacks?.onLog(botId, log);
  }

  private emitStatus(botId: string, status: BotStatus) {
    this.callbacks?.onStatusChange(botId, status);
  }

  private updateForegroundServiceState() {
    const running24x7Bots: string[] = [];
    this.runningProcesses.forEach((proc) => {
      if (proc.is24x7) {
        running24x7Bots.push(proc.botName);
      }
    });

    const shouldServiceBeRunning = running24x7Bots.length > 0;
    this.isForegroundServiceRunning = shouldServiceBeRunning;
    this.callbacks?.onForegroundServiceUpdate(shouldServiceBeRunning, running24x7Bots);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Start Bot Execution
   * Checks dependencies, skips existing compatible ones, launches Python process.
   */
  async startBot(bot: Bot): Promise<boolean> {
    const botId = bot.id;

    if (this.runningProcesses.has(botId)) {
      this.emitLog(botId, 'warn', `[Runtime] Process already running (PID ${bot.metrics?.pid}).`);
      return false;
    }

    this.emitStatus(botId, 'PREPARING');
    this.emitLog(botId, 'info', `> Goose Python Runtime v3.11.8 (Android arm64-v8a)`);
    this.emitLog(botId, 'info', `> Preparing bot sandbox: Goose/Bots/${botId}/`);

    await this.sleep(200);

    // 1. Parse requirements.txt
    const reqText = bot.files.requirements?.content || '';
    const parsedReqs = parseRequirements(reqText);
    this.emitLog(
      botId,
      'info',
      `> Reading requirements.txt: Found ${parsedReqs.length} dependenc${parsedReqs.length === 1 ? 'y' : 'ies'}`
    );

    await this.sleep(180);

    // 2. Check installed packages in per-bot environment
    const currentInstalled = { ...(bot.environment?.installedPackages || {}) };
    const missingOrIncompatible: typeof parsedReqs = [];

    for (const req of parsedReqs) {
      const existing = currentInstalled[req.name];
      if (existing && isVersionCompatible(existing.version, req)) {
        // Skip existing compatible package
        this.emitLog(
          botId,
          'success',
          `> ${existing.name} ${existing.version} already installed ✓`
        );
      } else {
        missingOrIncompatible.push(req);
      }
    }

    // 3. Install missing packages (if any)
    if (missingOrIncompatible.length > 0) {
      this.emitStatus(botId, 'INSTALLING');

      for (const req of missingOrIncompatible) {
        this.emitLog(botId, 'install', `> Resolving ${req.raw}...`);
        await this.sleep(250);

        const isOffline = packageCache.isOffline();
        const cached = packageCache.getCachedPackage(req.name);

        if (isOffline && !cached) {
          this.emitStatus(botId, 'ERROR');
          this.emitLog(
            botId,
            'error',
            `✕ [NetworkError] Device is offline and "${req.name}" is not in local package cache.`
          );
          return false;
        }

        let installedVersion = req.targetVersion || '1.0.0';

        if (cached) {
          installedVersion = cached.version;
          this.emitLog(
            botId,
            'install',
            `  Using cached wheel: ${cached.wheelFileName} (${Math.round(cached.sizeBytes / 1024)} KB) ✓`
          );
        } else {
          this.emitLog(botId, 'install', `  Downloading ${req.name} from PyPI repository...`);
          await this.sleep(300);
          packageCache.addPackageToCache(req.name, installedVersion);
        }

        this.emitLog(botId, 'install', `  Installing package into Goose/Bots/${botId}/packages/...`);
        await this.sleep(250);

        currentInstalled[req.name] = {
          name: req.name,
          version: installedVersion,
          installedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          fromCache: Boolean(cached),
        };

        this.emitLog(botId, 'success', `> Successfully installed ${req.name}==${installedVersion} ✓`);
      }

      this.callbacks?.onEnvironmentUpdate(botId, currentInstalled);
    }

    this.emitLog(botId, 'info', `> Environment ready: Isolated sandbox initialized.`);

    // 4. Load .env
    if (bot.hasEnv) {
      this.emitLog(botId, 'info', `> Loading .env environment variables (token masked)`);
    }

    // 5. Spawn Python Process
    this.emitStatus(botId, 'STARTING');
    await this.sleep(250);

    const pid = Math.floor(1000 + Math.random() * 8000);
    this.emitLog(botId, 'info', `> Spawning python ${bot.files.main.name} (PID: ${pid})`);
    await this.sleep(200);

    this.emitStatus(botId, 'RUNNING');
    this.emitLog(botId, 'success', `✓ Bot process active. Listening on Telegram polling loop.`);
    this.emitLog(botId, 'stdout', `[INFO] Authorized as ${bot.username}`);

    if (bot.is24x7Enabled) {
      this.emitLog(botId, 'info', `[24/7] Foreground Service active. Process will continue running when app is closed.`);
    }

    // Track active process with real-time metrics ticker
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const metrics: ProcessMetrics = {
        pid,
        cpuPercent: Math.round((0.3 + Math.random() * 1.6) * 10) / 10,
        memoryMb: Math.round((28.5 + Math.random() * 4.5) * 10) / 10,
        uptimeSeconds: elapsedSeconds,
      };
      this.callbacks?.onMetricsUpdate(botId, metrics);
    }, 1000);

    this.runningProcesses.set(botId, {
      pid,
      startTime,
      intervalId,
      botName: bot.name,
      is24x7: Boolean(bot.is24x7Enabled),
      consecutiveCrashes: 0,
      metrics: {
        pid,
        cpuPercent: 0.8,
        memoryMb: 28.5,
        uptimeSeconds: 0,
      },
    });

    this.updateForegroundServiceState();
    return true;
  }

  /**
   * Stop Bot Execution
   */
  async stopBot(botId: string): Promise<boolean> {
    const proc = this.runningProcesses.get(botId);
    if (!proc) {
      this.emitStatus(botId, 'STOPPED');
      return true;
    }

    this.emitStatus(botId, 'STOPPING');
    this.emitLog(botId, 'warn', `[Process] Sending SIGINT to PID ${proc.pid}...`);

    clearInterval(proc.intervalId);
    this.runningProcesses.delete(botId);

    await this.sleep(250);
    this.emitLog(botId, 'info', `[Process] Python process ${proc.pid} terminated gracefully.`);
    this.emitStatus(botId, 'STOPPED');

    this.callbacks?.onMetricsUpdate(botId, {
      pid: undefined,
      cpuPercent: 0,
      memoryMb: 0,
      uptimeSeconds: 0,
      lastExitCode: 0,
    });

    this.updateForegroundServiceState();
    return true;
  }

  /**
   * Rerun Bot: Keeps environment & packages, stops and restarts without re-download!
   */
  async rerunBot(bot: Bot): Promise<boolean> {
    const botId = bot.id;
    this.emitLog(botId, 'info', `[Rerun] Rerun triggered: Keeping existing environment & packages intact.`);

    if (this.runningProcesses.has(botId)) {
      await this.stopBot(botId);
      await this.sleep(300);
    }

    return this.startBot(bot);
  }

  /**
   * Restart Bot
   */
  async restartBot(bot: Bot): Promise<boolean> {
    return this.rerunBot(bot);
  }

  /**
   * Reset Bot Runtime
   */
  async resetBot(bot: Bot): Promise<boolean> {
    const botId = bot.id;
    if (this.runningProcesses.has(botId)) {
      await this.stopBot(botId);
    }

    this.emitLog(botId, 'warn', `[Reset] Resetting virtual environment in Goose/Bots/${botId}/environment/`);
    this.emitLog(botId, 'info', `[Reset] Source files (bot.py, requirements.txt, .env) preserved intact.`);

    this.callbacks?.onEnvironmentUpdate(botId, {});
    this.emitStatus(botId, 'IDLE');
    return true;
  }

  /**
   * Delete Bot
   */
  async deleteBot(botId: string): Promise<boolean> {
    if (this.runningProcesses.has(botId)) {
      await this.stopBot(botId);
    }
    return true;
  }

  /**
   * Set 24/7 Mode for a Bot
   */
  set24x7Mode(botId: string, enabled: boolean) {
    const proc = this.runningProcesses.get(botId);
    if (proc) {
      proc.is24x7 = enabled;
      this.updateForegroundServiceState();
    }
  }

  /**
   * Handle Stdin Input Commands with crash trigger simulation
   */
  async handleStdinCommand(bot: Bot, command: string): Promise<void> {
    const botId = bot.id;
    const proc = this.runningProcesses.get(botId);

    if (!proc) {
      this.emitLog(botId, 'warn', `[Stdin] Process is not running. Tap 'Start' first.`);
      return;
    }

    const cmd = command.trim();

    if (cmd === '/crash') {
      this.emitLog(botId, 'stdout', `[Stdin] Triggering crash simulation test command...`);
      await this.sleep(200);

      this.emitLog(botId, 'stderr', `Traceback (most recent call last):`);
      this.emitLog(botId, 'stderr', `  File "${bot.files.main.name}", line 48, in handle_update`);
      this.emitLog(botId, 'stderr', `    raise RuntimeError("Simulated unhandled exception triggered via test command")`);
      this.emitLog(botId, 'error', `RuntimeError: Simulated unhandled exception triggered via test command`);

      clearInterval(proc.intervalId);
      const crashes = (proc.consecutiveCrashes || 0) + 1;
      this.runningProcesses.delete(botId);

      this.callbacks?.onMetricsUpdate(botId, {
        pid: undefined,
        cpuPercent: 0,
        memoryMb: 0,
        uptimeSeconds: proc.metrics.uptimeSeconds,
        lastExitCode: 1,
      });

      // Controlled recovery logic (PRD Section 13)
      if (proc.is24x7 && crashes < MAX_CRASH_RETRIES) {
        this.emitLog(botId, 'warn', `[Recovery] Controlled recovery: Attempting auto-restart (${crashes}/${MAX_CRASH_RETRIES})...`);
        this.emitStatus(botId, 'PREPARING');
        setTimeout(() => {
          this.startBot(bot);
        }, 1200);
      } else {
        if (crashes >= MAX_CRASH_RETRIES) {
          this.emitLog(botId, 'error', `✕ [Recovery] Retry limit (${MAX_CRASH_RETRIES}) reached. Bot halted.`);
        }
        this.emitStatus(botId, 'CRASHED');
        this.emitLog(botId, 'error', `✕ Process ${proc.pid} terminated with exit code 1. Status: CRASHED.`);
      }

      this.updateForegroundServiceState();
      return;
    }

    if (cmd === '/ping') {
      this.emitLog(botId, 'stdout', `[User -> Bot] /ping`);
      this.emitLog(botId, 'stdout', `[Bot -> User] Pong! Daemon PID ${proc.pid} active. Latency: 9ms.`);
      return;
    }

    if (cmd === '/status') {
      this.emitLog(botId, 'stdout', `[User -> Bot] /status`);
      this.emitLog(
        botId,
        'info',
        `[Status] PID: ${proc.pid} | Uptime: ${proc.metrics.uptimeSeconds}s | RAM: ${proc.metrics.memoryMb} MB | 24/7: ${proc.is24x7 ? 'ON' : 'OFF'}`
      );
      return;
    }

    if (cmd === '/packages') {
      const pkgs = Object.values(bot.environment?.installedPackages || {});
      this.emitLog(botId, 'info', `[Environment] Installed packages (${pkgs.length}):`);
      for (const p of pkgs) {
        this.emitLog(botId, 'info', `  - ${p.name}==${p.version} (installed ${p.installedAt})`);
      }
      return;
    }

    this.emitLog(botId, 'stdout', `[Stdin] Dispatch: "${cmd}"`);
    this.emitLog(botId, 'stdout', `[Echo] Handled message: "${cmd}"`);
  }

  isProcessRunning(botId: string): boolean {
    return this.runningProcesses.has(botId);
  }

  isForegroundActive(): boolean {
    return this.isForegroundServiceRunning;
  }
}

export const pythonRuntimeManager = new PythonRuntimeManager();
