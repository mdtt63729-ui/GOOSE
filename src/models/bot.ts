export type BotStatus =
  | 'IDLE'
  | 'PREPARING'
  | 'INSTALLING'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'CRASHED'
  | 'ERROR';

export interface BotLogLine {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'stdout' | 'stderr' | 'install';
  message: string;
}

export interface BotFileEntry {
  name: string;
  size: number;
  lastModified: string;
  content?: string;
  lineCount?: number;
  isMasked?: boolean;
}

export interface BotFiles {
  main: BotFileEntry;
  requirements: BotFileEntry;
  env?: BotFileEntry;
}

export interface InstalledPackage {
  name: string;
  version: string;
  installedAt: string;
  fromCache?: boolean;
}

export interface BotEnvironment {
  pythonVersion: string;
  isPrepared: boolean;
  installedPackages: Record<string, InstalledPackage>; // pkgName -> InstalledPackage
  envVarsCount: number;
}

export interface ProcessMetrics {
  pid?: number;
  cpuPercent: number;
  memoryMb: number;
  uptimeSeconds: number;
  lastExitCode?: number;
}

export interface Bot {
  id: string;
  name: string;
  username: string; // e.g. @my_telegram_bot
  status: BotStatus;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: number; // Unix timestamp for sorting Recent bots
  lastRunAt?: string;
  hasEnv: boolean;
  is24x7Enabled?: boolean; // Phase 4 Foreground Service 24/7 background running mode
  consecutiveCrashes?: number;
  files: BotFiles;
  logs: BotLogLine[];
  avatarColor?: string;
  description?: string;
  environment: BotEnvironment;
  metrics: ProcessMetrics;
}

export type GooseErrorCategory =
  | 'Runtime Error'
  | 'Dependency Error'
  | 'Python Error'
  | 'File Error'
  | 'Permission Error'
  | 'Network Error'
  | 'Storage Error'
  | 'Service Error'
  | 'Update Error'
  | 'Unknown Error';

export interface StorageBreakdown {
  botSourceBytes: number;
  runtimeBytes: number;
  environmentBytes: number;
  packageCacheBytes: number;
  logsBytes: number;
  updateCacheBytes: number;
  totalBytes: number;
}

