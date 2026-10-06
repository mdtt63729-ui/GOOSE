import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Bot, BotFileEntry, BotLogLine } from '../models/bot';
import { useBots } from '../state/BotContext';
import { M3StatusBadge } from '../components/common/M3StatusBadge';
import { M3Dialog } from '../components/common/M3Dialog';
import { BotBridge } from '../bridge/BotBridge';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Send,
  AlertTriangle,
  RotateCw,
  Square,
  Terminal,
  FolderCode,
  Info,
  FileCode,
  FileText,
  KeyRound,
  Upload,
  Lock,
  Plus,
  Save,
  CheckCircle2,
  Package,
  Activity,
  ArrowDown,
  Moon,
  Sun,
  Shield,
  Zap,
} from 'lucide-react';

interface ConsoleScreenProps {
  bot: Bot;
  onBack: () => void;
  onBotDeleted: () => void;
  onShowToast: (msg: string) => void;
}

type BotTab = 'console' | 'files' | 'packages' | 'info';

export const ConsoleScreen: React.FC<ConsoleScreenProps> = ({
  bot,
  onBack,
  onBotDeleted,
  onShowToast,
}) => {
  const {
    startBot,
    stopBot,
    rerunBot,
    restartBot,
    resetBot,
    deleteBot,
    sendStdin,
    toggle24x7Mode,
    replaceBotFile,
    removeEnvFile,
    updateBotMetadata,
  } = useBots();

  const [activeTab, setActiveTab] = useState<BotTab>('console');
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Dialog states
  const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isRemoveEnvDialogOpen, setIsRemoveEnvDialogOpen] = useState<boolean>(false);
  const [is24x7ExplanationOpen, setIs24x7ExplanationOpen] = useState<boolean>(false);

  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [customCommand, setCustomCommand] = useState<string>('');

  // Editing bot info
  const [editName, setEditName] = useState(bot.name);
  const [editHandle, setEditHandle] = useState(bot.username);
  const [editDesc, setEditDesc] = useState(bot.description || '');

  // File replacement confirmation state
  const [replaceTarget, setReplaceTarget] = useState<'main' | 'requirements' | 'env' | null>(null);
  const [stagedReplacementFile, setStagedReplacementFile] = useState<BotFileEntry | null>(null);

  // Smart Auto-scroll State
  const [isUserScrolledUp, setIsUserScrolledUp] = useState<boolean>(false);
  const [unreadNewLogsCount, setUnreadNewLogsCount] = useState<number>(0);
  const [maxVisibleLogs, setMaxVisibleLogs] = useState<number>(250);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const prevLogsLengthRef = useRef<number>(bot.logs.length);

  // Bounded log windowing to prevent DOM memory bloat and frame drops (PRD Section 5)
  const visibleLogs = useMemo(() => {
    if (bot.logs.length <= maxVisibleLogs) return bot.logs;
    return bot.logs.slice(-maxVisibleLogs);
  }, [bot.logs, maxVisibleLogs]);
  const hiddenOlderLogsCount = Math.max(0, bot.logs.length - visibleLogs.length);

  // Sync edit form with bot prop
  useEffect(() => {
    setEditName(bot.name);
    setEditHandle(bot.username);
    setEditDesc(bot.description || '');
  }, [bot]);

  // Handle smart auto-scroll
  useEffect(() => {
    if (activeTab !== 'console') return;

    const newLogsCount = bot.logs.length - prevLogsLengthRef.current;
    prevLogsLengthRef.current = bot.logs.length;

    if (!isUserScrolledUp) {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
      setUnreadNewLogsCount(0);
    } else if (newLogsCount > 0) {
      setUnreadNewLogsCount((prev) => prev + newLogsCount);
    }
  }, [bot.logs, isUserScrolledUp, activeTab]);

  // Scroll listener to detect when user manually scrolls up
  const handleScroll = useCallback(() => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

    if (distanceToBottom > 45) {
      setIsUserScrolledUp(true);
    } else {
      setIsUserScrolledUp(false);
      setUnreadNewLogsCount(0);
    }
  }, []);

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setIsUserScrolledUp(false);
      setUnreadNewLogsCount(0);
    }
  };

  // Top Bar Action: Copy Logs
  const handleCopyLogs = async () => {
    const text = bot.logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onShowToast('Logs copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Failed to copy to clipboard');
    }
  };

  // Top Bar Action: Refresh Process Status
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 350));
    setIsRefreshing(false);
    onShowToast(`Refreshed ${bot.name} state: ${bot.status}`);
  };

  // State-driven button enable/disable rules (PRD Section 2)
  const canStart =
    bot.status === 'IDLE' ||
    bot.status === 'STOPPED' ||
    bot.status === 'CRASHED' ||
    bot.status === 'ERROR';

  const canStop =
    bot.status === 'RUNNING' ||
    bot.status === 'STARTING' ||
    bot.status === 'INSTALLING' ||
    bot.status === 'PREPARING';

  const canRerun =
    bot.status === 'RUNNING' ||
    bot.status === 'CRASHED' ||
    bot.status === 'ERROR';

  const canRestart =
    bot.status === 'RUNNING' ||
    bot.status === 'CRASHED' ||
    bot.status === 'ERROR';

  // Actions
  const handleStart = async () => {
    if (!canStart || isActionLoading) return;
    setIsActionLoading(true);
    await startBot(bot.id);
    setIsActionLoading(false);
    onShowToast(`Starting ${bot.name}...`);
  };

  const handleStop = async () => {
    if (!canStop || isActionLoading) return;
    setIsActionLoading(true);
    await stopBot(bot.id);
    setIsActionLoading(false);
    onShowToast(`Stopped ${bot.name}`);
  };

  const handleRerun = async () => {
    if (!canRerun || isActionLoading) return;
    setIsActionLoading(true);
    await rerunBot(bot.id);
    setIsActionLoading(false);
    onShowToast(`Rerunning ${bot.name} (packages preserved)`);
  };

  const handleRestart = async () => {
    if (!canRestart || isActionLoading) return;
    setIsActionLoading(true);
    await restartBot(bot.id);
    setIsActionLoading(false);
    onShowToast(`Restarted ${bot.name}`);
  };

  const handleConfirmReset = async () => {
    setIsActionLoading(true);
    await resetBot(bot.id);
    setIsActionLoading(false);
    setIsResetDialogOpen(false);
    onShowToast(`Bot ${bot.name} runtime reset. Source files preserved.`);
  };

  const handleConfirmDelete = async () => {
    setIsActionLoading(true);
    await deleteBot(bot.id);
    setIsActionLoading(false);
    setIsDeleteDialogOpen(false);
    onShowToast(`Deleted ${bot.name} project`);
    onBotDeleted();
  };

  // Toggle 24/7 Background Running Mode (PRD Section 8 & 9)
  const handleToggle24x7 = () => {
    if (!bot.is24x7Enabled) {
      // Show explanation dialog first
      setIs24x7ExplanationOpen(true);
    } else {
      toggle24x7Mode(bot.id, false);
      onShowToast('24/7 background mode disabled');
    }
  };

  const handleConfirmEnable24x7 = () => {
    toggle24x7Mode(bot.id, true);
    setIs24x7ExplanationOpen(false);
    onShowToast('24/7 background mode enabled with persistent notification');
  };

  // File replacement flow
  const handlePromptReplaceFile = async (fileKey: 'main' | 'requirements' | 'env') => {
    let accept = '*/*';
    let expectedType: 'bot' | 'requirements' | 'env' = 'bot';

    if (fileKey === 'main') {
      accept = '.py,text/x-python';
      expectedType = 'bot';
    } else if (fileKey === 'requirements') {
      accept = '.txt,text/plain';
      expectedType = 'requirements';
    } else if (fileKey === 'env') {
      accept = '.env,text/plain';
      expectedType = 'env';
    }

    try {
      const selected = await BotBridge.selectFile({ accept, expectedType });
      if (!selected) return;

      const fileEntry: BotFileEntry = {
        name: selected.fileName,
        size: selected.fileSize,
        lastModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
        content: selected.content,
        lineCount: selected.content ? selected.content.split('\n').length : 1,
        isMasked: fileKey === 'env',
      };

      setReplaceTarget(fileKey);
      setStagedReplacementFile(fileEntry);
    } catch {
      onShowToast('Unable to read selected replacement file');
    }
  };

  const handleConfirmFileReplacement = async () => {
    if (!replaceTarget || !stagedReplacementFile) return;

    await replaceBotFile(bot.id, replaceTarget, stagedReplacementFile);
    onShowToast(`Updated ${stagedReplacementFile.name}`);
    setReplaceTarget(null);
    setStagedReplacementFile(null);
  };

  const handleConfirmRemoveEnv = async () => {
    await removeEnvFile(bot.id);
    setIsRemoveEnvDialogOpen(false);
    onShowToast('Removed .env file');
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBotMetadata(bot.id, {
      name: editName,
      username: editHandle,
      description: editDesc,
    });
    onShowToast('Bot metadata saved');
  };

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim()) return;
    const cmd = customCommand.trim();
    setCustomCommand('');
    await sendStdin(bot.id, cmd);
  };

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    }
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getLogLevelStyle = (level: BotLogLine['level']) => {
    switch (level) {
      case 'error':
      case 'stderr':
        return 'text-rose-400 bg-rose-500/10 font-medium';
      case 'success':
        return 'text-emerald-400 font-medium';
      case 'warn':
        return 'text-amber-400';
      case 'install':
        return 'text-cyan-300';
      case 'stdout':
        return 'text-slate-200';
      case 'info':
      default:
        return 'text-slate-300 dark:text-slate-300';
    }
  };

  const installedList = Object.values(bot.environment?.installedPackages || {});

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--color-surface)]">
      {/* Top Header Bar (PRD Section 2: "Console" on left, Copy, Rerun, Refresh on right) */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]">
        <div className="flex items-center justify-between">
          {/* Left Zone: Back and Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-on-surface)]/8 active:bg-[var(--color-on-surface)]/12 transition-colors cursor-pointer shrink-0"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-[var(--color-on-surface)] truncate">
                  Console
                </h1>
                <M3StatusBadge status={bot.status} size="sm" />
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] truncate font-mono">
                {bot.name} ({bot.username})
              </p>
            </div>
          </div>

          {/* Right Zone: Top Bar Actions (Copy, Rerun, Refresh, 24/7 Mode Toggle) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 24/7 Mode Badge Button */}
            <button
              type="button"
              onClick={handleToggle24x7}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                bot.is24x7Enabled
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
              }`}
              title="Toggle 24/7 Foreground Service running"
            >
              <Zap className={`w-3 h-3 ${bot.is24x7Enabled ? 'fill-current' : ''}`} />
              <span>24/7</span>
            </button>

            {/* Copy Logs */}
            <button
              type="button"
              onClick={handleCopyLogs}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-on-surface)]/8 active:scale-95 transition-all cursor-pointer"
              title="Copy all logs"
              aria-label="Copy logs"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4 stroke-[2]" />
              )}
            </button>

            {/* Rerun */}
            <button
              type="button"
              onClick={handleRerun}
              disabled={!canRerun || isActionLoading}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-on-surface)]/8 disabled:opacity-30 disabled:hover:bg-transparent active:scale-95 transition-all cursor-pointer"
              title="Rerun bot execution"
              aria-label="Rerun bot"
            >
              <RotateCw className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-on-surface)]/8 active:scale-95 transition-all cursor-pointer"
              title="Refresh status and logs"
              aria-label="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 stroke-[2] ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Process Metrics Strip (when process running or active) */}
        {bot.status === 'RUNNING' && (
          <div className="mt-2.5 pt-2 border-t border-[var(--color-outline-variant)]/20 flex items-center justify-between text-[11px] text-[var(--color-on-surface-variant)] font-mono">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span className="text-[var(--color-on-surface)] font-semibold">
                PID {bot.metrics.pid}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>Up: {formatUptime(bot.metrics.uptimeSeconds)}</span>
              <span>CPU: {bot.metrics.cpuPercent}%</span>
              <span>RAM: {bot.metrics.memoryMb} MB</span>
            </div>
          </div>
        )}

        {/* Tab Segment Selector: Console | Files | Packages | Info */}
        <div className="flex items-center gap-1 mt-3 p-1 rounded-xl bg-[var(--color-surface-container-high)] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('console')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'console'
                ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-xs font-semibold'
                : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-xs font-semibold'
                : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
            }`}
          >
            <FolderCode className="w-3.5 h-3.5" />
            <span>Files</span>
            {bot.hasEnv && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-xs font-semibold'
                : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Packages</span>
            <span className="text-[10px] opacity-75">({installedList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-xs font-semibold'
                : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Info</span>
          </button>
        </div>

        {/* State-Driven Bot Action Toolbar (PRD Section 2) */}
        {activeTab === 'console' && (
          <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-[var(--color-outline-variant)]/15 overflow-x-auto no-scrollbar">
            {/* Start Button */}
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart || isActionLoading}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                canStart
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:brightness-105 active:scale-95 shadow-xs'
                  : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] opacity-40 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </button>

            {/* Stop Button */}
            <button
              type="button"
              onClick={handleStop}
              disabled={!canStop || isActionLoading}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                canStop
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 active:scale-95'
                  : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] opacity-40 cursor-not-allowed'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>

            {/* Rerun Button */}
            <button
              type="button"
              onClick={handleRerun}
              disabled={!canRerun || isActionLoading}
              title="Rerun bot keeping existing environment"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                canRerun
                  ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] active:scale-95'
                  : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] opacity-40 cursor-not-allowed'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rerun</span>
            </button>

            {/* Restart Button */}
            <button
              type="button"
              onClick={handleRestart}
              disabled={!canRestart || isActionLoading}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                canRestart
                  ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] active:scale-95'
                  : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] opacity-40 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => setIsResetDialogOpen(true)}
              disabled={isActionLoading}
              title="Reset runtime environment and packages"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] text-xs font-medium hover:bg-[var(--color-surface-container-highest)] active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isActionLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-error)]/15 text-[var(--color-error)] text-xs font-medium hover:bg-[var(--color-error)]/25 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tab View Switcher */}
      {activeTab === 'console' ? (
        /* CONSOLE PANEL */
        <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117] text-slate-200 relative">
          {/* Crash Warning Banner if Crashed (PRD Section 13) */}
          {bot.status === 'CRASHED' && (
            <div className="shrink-0 p-3 bg-rose-950/80 border-b border-rose-500/30 flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Bot Crashed:</strong> Process exited with code {bot.metrics.lastExitCode || 1}.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRerun}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-[11px] cursor-pointer"
              >
                Rerun
              </button>
            </div>
          )}

          {/* Console Header Bar */}
          <div className="shrink-0 flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-[#30363d] text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300 font-mono tracking-tight">
                Live stdout / stderr
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                {bot.logs.length} lines
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  isUserScrolledUp
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-300'
                }`}
              >
                {isUserScrolledUp ? 'Auto-scroll: PAUSED' : 'Auto-scroll: ACTIVE'}
              </span>
            </div>
          </div>

          {/* Console Log Stream (Bounded, word-wrapped, high-performance) */}
          <div
            ref={logContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3.5 font-mono text-[12px] leading-relaxed break-words space-y-1 select-text"
          >
            {bot.logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                <p className="text-xs">No console output recorded yet.</p>
                <p className="text-[11px] mt-1 text-slate-600">
                  Tap 'Start' or 'Rerun' above to execute the bot runtime.
                </p>
              </div>
            ) : (
              <>
                {hiddenOlderLogsCount > 0 && (
                  <div className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setMaxVisibleLogs((prev) => prev + 250)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 bg-slate-800/80 hover:bg-slate-800 px-3 py-1 rounded-full cursor-pointer transition-colors"
                    >
                      Load earlier logs ({hiddenOlderLogsCount} older lines)
                    </button>
                  </div>
                )}
                {visibleLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`py-0.5 px-1 rounded flex items-start gap-2 ${getLogLevelStyle(
                      log.level
                    )}`}
                  >
                    <span className="text-[10px] text-slate-500 shrink-0 select-none">
                      [{log.timestamp}]
                    </span>
                    <span className="whitespace-pre-wrap break-all flex-1">
                      {log.message}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Floating Pill: Resume Auto-Scroll when user scrolled up (PRD Section 3) */}
          {isUserScrolledUp && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-14 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white shadow-lg text-xs font-semibold animate-in fade-in zoom-in-95 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Scroll to Bottom {unreadNewLogsCount > 0 ? `(${unreadNewLogsCount})` : ''}</span>
            </button>
          )}

          {/* Live Stdin Input Bar */}
          <form
            onSubmit={handleSendCommand}
            className="shrink-0 flex items-center gap-2 p-2.5 bg-[#161b22] border-t border-[#30363d]"
          >
            <span className="text-cyan-400 font-mono text-xs pl-1 select-none">&gt;</span>
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="Send command to stdin (/ping, /status, /packages, /crash)..."
              className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-500 text-xs font-mono focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!customCommand.trim()}
              className="w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Send command"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      ) : activeTab === 'packages' ? (
        /* PACKAGES & DEPENDENCY MANAGER TAB */
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-on-surface)]">
                Isolated Environment Packages
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Python v{bot.environment?.pythonVersion || '3.11.8'} · Goose/Bots/{bot.id}/packages/
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              {installedList.length} Installed
            </span>
          </div>

          {installedList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[var(--color-surface-container-low)] border border-dashed border-[var(--color-outline-variant)] text-xs text-[var(--color-on-surface-variant)]">
              <Package className="w-8 h-8 mx-auto mb-2 text-[var(--color-on-surface-variant)]/60" />
              <p className="font-semibold text-sm text-[var(--color-on-surface)] mb-1">
                No packages installed yet
              </p>
              <p className="mb-3">
                Tap 'Start' or 'Rerun' in Console to automatically parse requirements.txt and install missing dependencies.
              </p>
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="px-3.5 py-1.5 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium text-xs cursor-pointer"
              >
                Install & Run
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {installedList.map((pkg) => (
                <div
                  key={pkg.name}
                  className="p-3.5 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/25 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-[var(--color-on-surface)] font-mono">
                          {pkg.name}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
                          v{pkg.version}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">
                        Installed {pkg.installedAt} {pkg.fromCache && '· Cached Wheel'}
                      </p>
                    </div>
                  </div>

                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'files' ? (
        /* FILES MANAGEMENT PANEL */
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-on-surface)]">
                Project Source Files
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Goose/Bots/{bot.id}/
              </p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
              {bot.hasEnv ? '3 Files' : '2 Files'}
            </span>
          </div>

          {/* 1. Main Python File */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 flex items-center justify-center shrink-0">
                  <FileCode className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--color-on-surface)] font-mono">
                      {bot.files.main.name}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded">
                      MAIN
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">
                    {Math.round((bot.files.main.size / 1024) * 10) / 10} KB ·{' '}
                    {bot.files.main.lineCount || 0} lines
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePromptReplaceFile('main')}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-xs font-medium text-[var(--color-primary)] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--color-outline-variant)]/20 text-[11px] text-[var(--color-on-surface-variant)] flex items-center justify-between">
              <span>Last modified: {bot.files.main.lastModified}</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Validated</span>
              </span>
            </div>
          </div>

          {/* 2. Requirements File */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--color-on-surface)] font-mono">
                      {bot.files.requirements.name}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">
                    {bot.files.requirements.size} bytes ·{' '}
                    {bot.files.requirements.lineCount || 0} lines
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePromptReplaceFile('requirements')}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-xs font-medium text-[var(--color-primary)] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--color-outline-variant)]/20 text-[11px] text-[var(--color-on-surface-variant)] flex items-center justify-between">
              <span>Last modified: {bot.files.requirements.lastModified}</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Validated</span>
              </span>
            </div>
          </div>

          {/* 3. .env File (Security Masked) */}
          {bot.files.env ? (
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface-container-low)] border border-emerald-500/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[var(--color-on-surface)] font-mono">
                        .env
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>PROTECTED</span>
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      {bot.files.env.size} bytes · Secrets loaded into process env
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePromptReplaceFile('env')}
                    className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-xs font-medium text-[var(--color-primary)] transition-colors cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRemoveEnvDialogOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--color-error)]/10 hover:bg-[var(--color-error)]/20 text-xs font-medium text-[var(--color-error)] transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Security Protected Mask Box */}
              <div className="p-2.5 rounded-xl bg-[#0d1117] text-slate-300 font-mono text-[11px] border border-[#30363d]">
                <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Masked Environment Variables</span>
                </div>
                <div className="space-y-0.5 text-slate-400">
                  <div>TELEGRAM_BOT_TOKEN="••••••••••••••••••••••••"</div>
                  <div>WEBHOOK_SECRET="••••••••••••••••"</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-[var(--color-outline-variant)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-on-surface)]">
                    No .env file uploaded
                  </h4>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                    Store bot tokens and secret variables securely
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePromptReplaceFile('env')}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs font-medium hover:brightness-105 transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add .env</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* INFORMATION / DETAILS PANEL */
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                Bot Metadata
              </h3>

              <div>
                <label
                  htmlFor="bot-edit-name"
                  className="block text-xs font-medium text-[var(--color-on-surface)] mb-1"
                >
                  Bot Name
                </label>
                <input
                  id="bot-edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] text-xs border border-[var(--color-outline-variant)]/40 focus:border-[var(--color-primary)] focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="bot-edit-handle"
                  className="block text-xs font-medium text-[var(--color-on-surface)] mb-1"
                >
                  Telegram Handle
                </label>
                <input
                  id="bot-edit-handle"
                  type="text"
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] text-xs font-mono border border-[var(--color-outline-variant)]/40 focus:border-[var(--color-primary)] focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="bot-edit-desc"
                  className="block text-xs font-medium text-[var(--color-on-surface)] mb-1"
                >
                  Description
                </label>
                <textarea
                  id="bot-edit-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] text-xs border border-[var(--color-outline-variant)]/40 focus:border-[var(--color-primary)] focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs font-medium hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>

            {/* Architecture / Path Details */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 flex flex-col gap-2.5 text-xs">
              <h3 className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">
                Local Project Repository
              </h3>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-on-surface-variant)]">Project ID</span>
                <span className="font-mono text-[var(--color-on-surface)]">{bot.id}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-on-surface-variant)]">Directory</span>
                <span className="font-mono text-[11px] text-[var(--color-on-surface)] truncate max-w-[200px]">
                  Goose/Bots/{bot.id}/
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-on-surface-variant)]">Python Version</span>
                <span className="font-mono text-[var(--color-on-surface)]">
                  v{bot.environment?.pythonVersion || '3.11.8'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-on-surface-variant)]">24/7 Background Service</span>
                <span className="font-mono text-[var(--color-on-surface)]">
                  {bot.is24x7Enabled ? 'Enabled (Foreground Service)' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-on-surface-variant)]">Created At</span>
                <span className="text-[var(--color-on-surface)]">{bot.createdAt}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-on-surface-variant)]">Last Updated</span>
                <span className="text-[var(--color-on-surface)]">{bot.updatedAt}</span>
              </div>

              {bot.metrics?.pid && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-on-surface-variant)]">Runtime PID</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {bot.metrics.pid}
                  </span>
                </div>
              )}
            </div>

            {/* Destructive actions in info panel */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-error)]/25 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-[var(--color-error)] uppercase tracking-wider">
                Danger Zone
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-[var(--color-on-surface)]">
                    Reset Runtime Environment
                  </h4>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                    Wipes installed package index and caches. Keeps source files safe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetDialogOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-outline-variant)] text-xs font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="pt-2 border-t border-[var(--color-error)]/15 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-[var(--color-error)]">
                    Delete Bot Project
                  </h4>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                    Irreversibly removes all local project files and metadata.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-error)] text-[var(--color-on-error)] text-xs font-medium hover:brightness-105 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 24/7 Mode Explanation Dialog (PRD Section 9) */}
      <M3Dialog
        isOpen={is24x7ExplanationOpen}
        onClose={() => setIs24x7ExplanationOpen(false)}
        onConfirm={handleConfirmEnable24x7}
        title="Keep Bot Running 24/7?"
        description="24/7 mode keeps your bot running continuously via an Android Foreground Service while Goose is minimized or closed. A persistent status notification will remain visible in the Android notification drawer while active."
        confirmText="Enable 24/7"
        cancelText="Not now"
        isDestructive={false}
        icon={<Zap className="w-6 h-6 text-emerald-500" />}
      />

      {/* Confirmation Dialog: Replace File */}
      <M3Dialog
        isOpen={Boolean(replaceTarget && stagedReplacementFile)}
        onClose={() => {
          setReplaceTarget(null);
          setStagedReplacementFile(null);
        }}
        onConfirm={handleConfirmFileReplacement}
        title="Replace File?"
        description={`Do you want to replace "${
          replaceTarget === 'main'
            ? bot.files.main.name
            : replaceTarget === 'requirements'
            ? bot.files.requirements.name
            : '.env'
        }" with "${stagedReplacementFile?.name}" (${stagedReplacementFile?.size} bytes)?`}
        confirmText="Replace"
        isDestructive={false}
        icon={<Upload className="w-6 h-6" />}
      />

      {/* Confirmation Dialog: Remove .env */}
      <M3Dialog
        isOpen={isRemoveEnvDialogOpen}
        onClose={() => setIsRemoveEnvDialogOpen(false)}
        onConfirm={handleConfirmRemoveEnv}
        title="Remove .env File?"
        description="Are you sure you want to remove the .env configuration file from this bot project?"
        confirmText="Remove"
        isDestructive={true}
        icon={<KeyRound className="w-6 h-6" />}
      />

      {/* Destructive Action Dialog: Reset Bot */}
      <M3Dialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Bot Runtime?"
        description={`This will clear installed packages and runtime state for "${bot.name}". Your source files (bot.py, requirements.txt, .env) will remain completely safe.`}
        confirmText="Reset"
        isDestructive={true}
        loading={isActionLoading}
        icon={<AlertTriangle className="w-6 h-6" />}
      />

      {/* Destructive Action Dialog: Delete Bot */}
      <M3Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Bot?"
        description={`This will terminate any running daemon and completely delete "${bot.name}" (${bot.username}) from Goose/Bots/${bot.id}/. This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        loading={isActionLoading}
        icon={<Trash2 className="w-6 h-6" />}
      />
    </div>
  );
};
