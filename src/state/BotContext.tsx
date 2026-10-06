import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Bot, BotFileEntry, BotLogLine, BotStatus, InstalledPackage, ProcessMetrics } from '../models/bot';
import { botRepository } from '../services/storage/BotRepository';
import { pythonRuntimeManager } from '../services/runtime/PythonRuntimeManager';
import { BotBridge } from '../bridge/BotBridge';

interface CreateBotParams {
  name?: string;
  username?: string;
  mainFile: BotFileEntry;
  reqFile: BotFileEntry;
  envFile?: BotFileEntry;
  description?: string;
}

interface BotContextType {
  bots: Bot[];
  recentBots: Bot[];
  activeBot: Bot | null;
  activeBotId: string | null;
  isLoading: boolean;
  foregroundServiceActive: boolean;
  running24x7BotNames: string[];
  setActiveBotId: (id: string | null) => void;
  openBot: (id: string) => Promise<void>;
  createBot: (params: CreateBotParams) => Promise<Bot>;
  updateBotMetadata: (id: string, data: { name?: string; username?: string; description?: string }) => Promise<void>;
  replaceBotFile: (id: string, fileKey: 'main' | 'requirements' | 'env', file: BotFileEntry) => Promise<void>;
  removeEnvFile: (id: string) => Promise<void>;
  toggle24x7Mode: (botId: string, enabled: boolean) => Promise<void>;
  startBot: (botId: string) => Promise<void>;
  stopBot: (botId: string) => Promise<void>;
  rerunBot: (botId: string) => Promise<void>;
  restartBot: (botId: string) => Promise<void>;
  resetBot: (botId: string) => Promise<void>;
  deleteBot: (botId: string) => Promise<void>;
  sendStdin: (botId: string, input: string) => Promise<void>;
  clearBotLogs: (botId: string) => Promise<void>;
  appendBotLog: (botId: string, level: BotLogLine['level'], message: string) => void;
  resetToSampleBots: () => Promise<void>;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export const BotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [foregroundServiceActive, setForegroundServiceActive] = useState<boolean>(false);
  const [running24x7BotNames, setRunning24x7BotNames] = useState<string[]>([]);

  // Load bots on mount with authoritative process state verification
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const loaded = await botRepository.getAllBots();
        if (mounted) {
          // Authoritative state synchronization (PRD Section 12)
          const verified = loaded.map((b) => {
            const isActuallyRunning = pythonRuntimeManager.isProcessRunning(b.id);
            if (b.status === 'RUNNING' && !isActuallyRunning && !b.is24x7Enabled) {
              return {
                ...b,
                status: 'STOPPED' as BotStatus,
                metrics: { ...b.metrics, pid: undefined, cpuPercent: 0, memoryMb: 0, uptimeSeconds: 0 },
              };
            }
            return b;
          });

          setBots(verified);
          if (verified.length > 0) {
            setActiveBotId(verified[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load bots from repository', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Connect PythonRuntimeManager callbacks
  useEffect(() => {
    pythonRuntimeManager.setCallbacks({
      onLog: (botId, log) => {
        setBots((prev) =>
          prev.map((b) => {
            if (b.id === botId) {
              // Bounded log buffer (max 1000 lines)
              const boundedLogs = [...b.logs, log].slice(-1000);
              const updated = {
                ...b,
                logs: boundedLogs,
                updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              };
              botRepository.updateBot(updated).catch(console.error);
              return updated;
            }
            return b;
          })
        );
        BotBridge.notifyLog(botId, log);
      },
      onStatusChange: (botId, status) => {
        setBots((prev) =>
          prev.map((b) => {
            if (b.id === botId) {
              const updated = {
                ...b,
                status,
                updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              };
              botRepository.updateBot(updated).catch(console.error);
              return updated;
            }
            return b;
          })
        );
        BotBridge.notifyStatus(botId, status);
      },
      onMetricsUpdate: (botId, metrics) => {
        setBots((prev) =>
          prev.map((b) => {
            if (b.id === botId) {
              return {
                ...b,
                metrics: {
                  ...b.metrics,
                  ...metrics,
                },
              };
            }
            return b;
          })
        );
      },
      onEnvironmentUpdate: (botId, installedPackages) => {
        setBots((prev) =>
          prev.map((b) => {
            if (b.id === botId) {
              const updated = {
                ...b,
                environment: {
                  ...b.environment,
                  installedPackages,
                },
                updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              };
              botRepository.updateBot(updated).catch(console.error);
              return updated;
            }
            return b;
          })
        );
      },
      onForegroundServiceUpdate: (active, runningNames) => {
        setForegroundServiceActive(active);
        setRunning24x7BotNames(runningNames);
      },
    });
  }, []);

  // Recent 5 bots sorted by lastOpenedAt descending
  const recentBots = useMemo(() => {
    const sorted = [...bots].sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
    return sorted.slice(0, 5);
  }, [bots]);

  const activeBot = useMemo(() => {
    return bots.find((b) => b.id === activeBotId) || null;
  }, [bots, activeBotId]);

  const openBot = useCallback(async (id: string) => {
    setActiveBotId(id);
    const now = Date.now();
    setBots((prev) =>
      prev.map((b) => (b.id === id ? { ...b, lastOpenedAt: now } : b))
    );
    await botRepository.touchBot(id);
  }, []);

  const createBot = useCallback(
    async (params: CreateBotParams): Promise<Bot> => {
      let detectedName = params.name?.trim();
      if (!detectedName) {
        const base = params.mainFile.name.replace(/\.py$/i, '').replace(/[-_]/g, ' ');
        detectedName = base.charAt(0).toUpperCase() + base.slice(1);
        if (detectedName.toLowerCase() === 'bot' || detectedName.toLowerCase() === 'main') {
          detectedName = 'Telegram Bot ' + (bots.length + 1);
        }
      }

      let detectedHandle = params.username?.trim();
      if (!detectedHandle) {
        const clean = detectedName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        detectedHandle = `@${clean}_bot`;
      } else if (!detectedHandle.startsWith('@')) {
        detectedHandle = `@${detectedHandle}`;
      }

      const id = `bot_${Date.now()}`;
      const nowIso = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

      const palette = ['#006874', '#1a60a5', '#386a20', '#9c4327', '#6c4ea2', '#006a6a'];
      const avatarColor = palette[bots.length % palette.length];

      const newBot: Bot = {
        id,
        name: detectedName,
        username: detectedHandle,
        status: 'IDLE',
        createdAt: nowIso,
        updatedAt: nowIso,
        lastOpenedAt: Date.now(),
        hasEnv: Boolean(params.envFile),
        is24x7Enabled: false,
        avatarColor,
        description: params.description || `Python Telegram bot project in Goose/Bots/${id}/`,
        files: {
          main: params.mainFile,
          requirements: params.reqFile,
          env: params.envFile,
        },
        logs: [
          {
            id: `log-${Date.now()}-1`,
            timestamp: nowTime,
            level: 'info',
            message: `[Project] Initialized sandbox in Goose/Bots/${id}/`,
          },
          {
            id: `log-${Date.now()}-2`,
            timestamp: nowTime,
            level: 'stdout',
            message: `[Package] Accepted ${params.mainFile.name} & requirements.txt`,
          },
        ],
        environment: {
          pythonVersion: '3.11.8',
          isPrepared: true,
          installedPackages: {},
          envVarsCount: params.envFile ? 1 : 0,
        },
        metrics: {
          cpuPercent: 0,
          memoryMb: 0,
          uptimeSeconds: 0,
        },
      };

      await botRepository.saveBot(newBot);
      setBots((prev) => [newBot, ...prev]);
      setActiveBotId(id);

      setTimeout(async () => {
        await pythonRuntimeManager.startBot(newBot);
      }, 500);

      return newBot;
    },
    [bots.length]
  );

  const updateBotMetadata = useCallback(
    async (id: string, data: { name?: string; username?: string; description?: string }) => {
      const nowIso = new Date().toISOString().slice(0, 16).replace('T', ' ');
      setBots((prev) =>
        prev.map((b) => {
          if (b.id === id) {
            const formattedUsername = data.username
              ? data.username.startsWith('@')
                ? data.username
                : `@${data.username}`
              : b.username;

            const updated: Bot = {
              ...b,
              name: data.name?.trim() || b.name,
              username: formattedUsername,
              description: data.description !== undefined ? data.description : b.description,
              updatedAt: nowIso,
            };
            botRepository.updateBot(updated).catch(console.error);
            return updated;
          }
          return b;
        })
      );
    },
    []
  );

  const toggle24x7Mode = useCallback(
    async (botId: string, enabled: boolean) => {
      pythonRuntimeManager.set24x7Mode(botId, enabled);
      setBots((prev) =>
        prev.map((b) => {
          if (b.id === botId) {
            const updated = {
              ...b,
              is24x7Enabled: enabled,
            };
            botRepository.updateBot(updated).catch(console.error);
            return updated;
          }
          return b;
        })
      );
    },
    []
  );

  const replaceBotFile = useCallback(
    async (id: string, fileKey: 'main' | 'requirements' | 'env', file: BotFileEntry) => {
      await botRepository.replaceBotFile(id, fileKey, file);
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      setBots((prev) =>
        prev.map((b) => {
          if (b.id === id) {
            const updatedFiles = { ...b.files };
            if (fileKey === 'main') updatedFiles.main = file;
            else if (fileKey === 'requirements') updatedFiles.requirements = file;
            else if (fileKey === 'env') updatedFiles.env = { ...file, isMasked: true };

            const updated: Bot = {
              ...b,
              files: updatedFiles,
              hasEnv: Boolean(updatedFiles.env),
              updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              lastOpenedAt: Date.now(),
              logs: [
                ...b.logs,
                {
                  id: `log-rep-${Date.now()}`,
                  timestamp: nowTime,
                  level: 'info' as const,
                  message: `[File Manager] Replaced ${file.name} (${file.size} bytes)`,
                },
              ].slice(-1000),
            };
            return updated;
          }
          return b;
        })
      );
    },
    []
  );

  const removeEnvFile = useCallback(async (id: string) => {
    await botRepository.removeEnvFile(id);
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    setBots((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const updatedFiles = { ...b.files };
          delete updatedFiles.env;
          const updated: Bot = {
            ...b,
            files: updatedFiles,
            hasEnv: false,
            updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            logs: [
              ...b.logs,
              {
                id: `log-rm-env-${Date.now()}`,
                timestamp: nowTime,
                level: 'warn' as const,
                message: '[File Manager] Removed .env file from project',
              },
            ].slice(-1000),
          };
          return updated;
        }
        return b;
      })
    );
  }, []);

  const startBot = useCallback(
    async (botId: string) => {
      const target = bots.find((b) => b.id === botId);
      if (!target) return;
      await pythonRuntimeManager.startBot(target);
    },
    [bots]
  );

  const stopBot = useCallback(async (botId: string) => {
    await pythonRuntimeManager.stopBot(botId);
  }, []);

  const rerunBot = useCallback(
    async (botId: string) => {
      const target = bots.find((b) => b.id === botId);
      if (!target) return;
      await pythonRuntimeManager.rerunBot(target);
    },
    [bots]
  );

  const restartBot = useCallback(
    async (botId: string) => {
      const target = bots.find((b) => b.id === botId);
      if (!target) return;
      await pythonRuntimeManager.restartBot(target);
    },
    [bots]
  );

  const resetBot = useCallback(
    async (botId: string) => {
      const target = bots.find((b) => b.id === botId);
      if (!target) return;
      await pythonRuntimeManager.resetBot(target);
      setBots((prev) =>
        prev.map((b) => {
          if (b.id === botId) {
            const updated: Bot = {
              ...b,
              status: 'IDLE',
              environment: {
                ...b.environment,
                installedPackages: {},
              },
              metrics: {
                cpuPercent: 0,
                memoryMb: 0,
                uptimeSeconds: 0,
              },
            };
            botRepository.updateBot(updated).catch(console.error);
            return updated;
          }
          return b;
        })
      );
    },
    [bots]
  );

  const deleteBot = useCallback(async (botId: string) => {
    await pythonRuntimeManager.deleteBot(botId);
    await botRepository.deleteBot(botId);
    setBots((prev) => prev.filter((b) => b.id !== botId));
    setActiveBotId((prev) => (prev === botId ? null : prev));
  }, []);

  const sendStdin = useCallback(
    async (botId: string, input: string) => {
      const target = bots.find((b) => b.id === botId);
      if (!target) return;
      await pythonRuntimeManager.handleStdinCommand(target, input);
    },
    [bots]
  );

  const clearBotLogs = useCallback(async (botId: string) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id === botId) {
          const updated = { ...b, logs: [] };
          botRepository.updateBot(updated).catch(console.error);
          return updated;
        }
        return b;
      })
    );
  }, []);

  const appendBotLog = useCallback((botId: string, level: BotLogLine['level'], message: string) => {
    const newLog: BotLogLine = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level,
      message,
    };
    setBots((prev) =>
      prev.map((b) => {
        if (b.id === botId) {
          const boundedLogs = [...b.logs, newLog].slice(-1000);
          const updated = { ...b, logs: boundedLogs };
          botRepository.updateBot(updated).catch(console.error);
          return updated;
        }
        return b;
      })
    );
  }, []);

  const resetToSampleBots = useCallback(async () => {
    const defaults = await botRepository.resetToDefaults();
    setBots(defaults);
    if (defaults.length > 0) {
      setActiveBotId(defaults[0].id);
    }
  }, []);

  return (
    <BotContext.Provider
      value={{
        bots,
        recentBots,
        activeBot,
        activeBotId,
        isLoading,
        foregroundServiceActive,
        running24x7BotNames,
        setActiveBotId,
        openBot,
        createBot,
        updateBotMetadata,
        replaceBotFile,
        removeEnvFile,
        toggle24x7Mode,
        startBot,
        stopBot,
        rerunBot,
        restartBot,
        resetBot,
        deleteBot,
        sendStdin,
        clearBotLogs,
        appendBotLog,
        resetToSampleBots,
      }}
    >
      {children}
    </BotContext.Provider>
  );
};

export const useBots = () => {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error('useBots must be used within a BotProvider');
  }
  return context;
};
