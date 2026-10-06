import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { BotProvider, useBots } from './state/BotContext';
import { AndroidFrame } from './components/common/AndroidFrame';
import { BottomNavBar, ScreenTab } from './components/navigation/BottomNavBar';
import { HomeScreen } from './screens/HomeScreen';
import { NewBotScreen } from './screens/NewBotScreen';
import { ConsoleScreen } from './screens/ConsoleScreen';
import { AllBotsScreen } from './screens/AllBotsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { M3Snackbar } from './components/common/M3Snackbar';
import { PersistentNotificationBar } from './components/notification/PersistentNotificationBar';
import { UpdateDialog } from './components/update/UpdateDialog';
import { UpdateDownloadSheet } from './components/update/UpdateDownloadSheet';
import { updateService } from './services/update/UpdateService';
import { downloadManager } from './services/update/DownloadManager';
import { ReleaseInfo, DownloadState } from './services/update/UpdateTypes';
import { Bot } from './models/bot';

type ActiveView = 'home' | 'new-bot' | 'console' | 'all-bots' | 'settings';

function MainAppContent() {
  const {
    bots,
    activeBot,
    setActiveBotId,
    openBot,
    foregroundServiceActive,
    running24x7BotNames,
    stopBot,
  } = useBots();

  const [currentTab, setCurrentTab] = useState<ScreenTab>('home');
  const [navStack, setNavStack] = useState<ActiveView[]>(['home']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastBackPress, setLastBackPress] = useState<number>(0);

  // In-App Update States (PRD Phase 5)
  const [availableRelease, setAvailableRelease] = useState<ReleaseInfo | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState<boolean>(false);
  const [isDownloadSheetOpen, setIsDownloadSheetOpen] = useState<boolean>(false);
  const [downloadState, setDownloadState] = useState<DownloadState>(
    downloadManager.getState()
  );

  // Subscribe to download manager
  useEffect(() => {
    return downloadManager.subscribe((st) => {
      setDownloadState(st);
    });
  }, []);

  // Background auto-check on startup if enabled and not snoozed
  useEffect(() => {
    let mounted = true;
    async function checkStartup() {
      if (!updateService.isAutoCheckEnabled()) return;
      const res = await updateService.checkForUpdates(false);
      if (mounted && res.hasUpdate && res.latestRelease) {
        if (!updateService.isUpdateSnoozed(res.latestRelease.version)) {
          setAvailableRelease(res.latestRelease);
          setIsUpdateDialogOpen(true);
        }
      }
    }
    const timer = setTimeout(checkStartup, 1500);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const activeView = navStack[navStack.length - 1] || 'home';

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Dismiss toast after 2.5s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Navigate to view (push stack)
  const pushView = useCallback((view: ActiveView) => {
    setNavStack((prev) => [...prev, view]);
    try {
      window.history.pushState({ view }, '');
    } catch {
      // ignore history errors
    }
  }, []);

  // Pop view (back navigation)
  const popView = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length <= 1) {
        // At root screen
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          showToast('Exiting application...');
        } else {
          setLastBackPress(now);
          showToast('Press back again to exit');
        }
        return prev;
      }
      return prev.slice(0, prev.length - 1);
    });
  }, [lastBackPress, showToast]);

  // Sync with browser hardware back button
  useEffect(() => {
    const handlePopState = () => {
      setNavStack((prev) => {
        if (prev.length > 1) {
          return prev.slice(0, prev.length - 1);
        }
        return prev;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Tab switching from bottom navigation
  const handleSelectTab = (tab: ScreenTab) => {
    setCurrentTab(tab);
    if (tab === 'home') {
      setNavStack(['home']);
    } else if (tab === 'bots') {
      setNavStack(['home', 'all-bots']);
    } else if (tab === 'settings') {
      setNavStack(['home', 'settings']);
    }
  };

  // Open console for specific bot
  const handleOpenConsole = (bot: Bot) => {
    openBot(bot.id);
    pushView('console');
  };

  // Navigation callbacks
  const handleNavigateNewBot = () => {
    pushView('new-bot');
  };

  const handleDeploySuccess = (newBot: Bot) => {
    openBot(newBot.id);
    // Replace new-bot with console
    setNavStack((prev) => {
      const filtered = prev.filter((v) => v !== 'new-bot');
      return [...filtered, 'console'];
    });
    showToast(`Created & staged ${newBot.name}`);
  };

  // Render current screen
  const renderScreen = () => {
    switch (activeView) {
      case 'new-bot':
        return (
          <NewBotScreen
            onBack={popView}
            onDeploySuccess={handleDeploySuccess}
          />
        );

      case 'console':
        if (!activeBot) {
          const fallbackBot = bots[0];
          if (fallbackBot) {
            return (
              <ConsoleScreen
                bot={fallbackBot}
                onBack={popView}
                onBotDeleted={popView}
                onShowToast={showToast}
              />
            );
          }
          return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs">
              <p>No bot selected for console.</p>
              <button
                type="button"
                onClick={popView}
                className="mt-3 text-[var(--color-primary)] font-medium"
              >
                Go back
              </button>
            </div>
          );
        }
        return (
          <ConsoleScreen
            bot={activeBot}
            onBack={popView}
            onBotDeleted={popView}
            onShowToast={showToast}
          />
        );

      case 'all-bots':
        return (
          <AllBotsScreen
            onOpenConsole={handleOpenConsole}
            onNavigateNewBot={handleNavigateNewBot}
            onBack={popView}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            onShowToast={showToast}
            onPromptUpdate={(rel) => {
              setAvailableRelease(rel);
              setIsUpdateDialogOpen(true);
            }}
          />
        );

      case 'home':
      default:
        return (
          <HomeScreen
            onNavigateNewBot={handleNavigateNewBot}
            onOpenConsole={handleOpenConsole}
            onViewAllBots={() => {
              setCurrentTab('bots');
              pushView('all-bots');
            }}
          />
        );
    }
  };

  // Determine whether to show bottom bar (show on home, all-bots, and settings)
  const showBottomBar =
    activeView === 'home' || activeView === 'all-bots' || activeView === 'settings';

  return (
    <AndroidFrame>
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Persistent Android Foreground Notification Bar */}
        {foregroundServiceActive && (
          <PersistentNotificationBar
            runningBotNames={running24x7BotNames}
            active24x7Bot={activeBot}
            onStopBot={() => {
              if (activeBot) {
                stopBot(activeBot.id);
                showToast(`Stopped ${activeBot.name}`);
              }
            }}
            onOpenConsole={() => {
              if (activeBot) {
                handleOpenConsole(activeBot);
              }
            }}
          />
        )}

        {renderScreen()}

        {/* Floating Mini-Progress Pill when download is running in background */}
        {!isDownloadSheetOpen &&
          (downloadState.status === 'DOWNLOADING' ||
            downloadState.status === 'PAUSED' ||
            downloadState.status === 'READY_TO_INSTALL') && (
            <button
              type="button"
              onClick={() => setIsDownloadSheetOpen(true)}
              className="absolute top-12 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-700/90 text-white text-xs font-medium shadow-lg backdrop-blur-xs cursor-pointer hover:bg-cyan-600 active:scale-95 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {downloadState.status === 'READY_TO_INSTALL'
                  ? 'Update Ready'
                  : `Downloading ${downloadState.percentage}%`}
              </span>
            </button>
          )}

        {/* Material 3 Bottom Navigation Bar */}
        {showBottomBar && (
          <BottomNavBar
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
          />
        )}

        {/* In-App Update Dialog (PRD Section 11) */}
        <UpdateDialog
          isOpen={isUpdateDialogOpen}
          release={availableRelease}
          onLater={() => {
            if (availableRelease) {
              updateService.snoozeUpdate(availableRelease.version);
              showToast('Update snoozed for 24 hours');
            }
            setIsUpdateDialogOpen(false);
          }}
          onDownload={(rel) => {
            setIsUpdateDialogOpen(false);
            setIsDownloadSheetOpen(true);
            downloadManager.startDownload(rel);
          }}
        />

        {/* In-App Update Download Sheet (PRD Section 12-18) */}
        <UpdateDownloadSheet
          isOpen={isDownloadSheetOpen}
          onClose={() => setIsDownloadSheetOpen(false)}
          onShowToast={showToast}
        />

        {/* Android Material 3 Snackbar */}
        <M3Snackbar
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      </div>
    </AndroidFrame>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BotProvider>
        <MainAppContent />
      </BotProvider>
    </ThemeProvider>
  );
}
