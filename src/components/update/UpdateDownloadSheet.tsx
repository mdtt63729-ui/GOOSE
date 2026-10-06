import React, { useEffect, useState } from 'react';
import { DownloadState } from '../../services/update/UpdateTypes';
import { downloadManager } from '../../services/update/DownloadManager';
import { M3Button } from '../common/M3Button';
import {
  Download,
  Pause,
  Play,
  X,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  Minimize2,
} from 'lucide-react';

interface UpdateDownloadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const UpdateDownloadSheet: React.FC<UpdateDownloadSheetProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [downloadState, setDownloadState] = useState<DownloadState>(
    downloadManager.getState()
  );

  useEffect(() => {
    const unsub = downloadManager.subscribe((st) => {
      setDownloadState(st);
    });
    return unsub;
  }, []);

  if (!isOpen && downloadState.status === 'IDLE') return null;

  const {
    status,
    release,
    bytesDownloaded,
    totalBytes,
    percentage,
    speedBytesPerSec,
    etaSeconds,
    error,
    verifiedSha256,
  } = downloadState;

  const downloadedMb = (bytesDownloaded / (1024 * 1024)).toFixed(1);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const speedMb = (speedBytesPerSec / (1024 * 1024)).toFixed(1);

  const handlePauseResume = () => {
    if (status === 'DOWNLOADING') {
      downloadManager.pauseDownload();
      onShowToast('Download paused');
    } else if (status === 'PAUSED') {
      downloadManager.resumeDownload();
      onShowToast('Download resumed');
    }
  };

  const handleCancel = () => {
    downloadManager.cancelDownload();
    onShowToast('Download cancelled');
  };

  const handleRetry = () => {
    downloadManager.retryDownload();
    onShowToast('Retrying download...');
  };

  const handleInstall = async () => {
    onShowToast('Launching Android package installer...');
    const ok = await downloadManager.installApk();
    if (ok) {
      onShowToast('Installation package dispatched');
    } else {
      onShowToast('Installation failed to start. Tap to try again.');
    }
  };

  // Status message rendering
  const getStatusText = () => {
    switch (status) {
      case 'PREPARING':
        return 'Connecting to release server...';
      case 'DOWNLOADING':
        return `Downloading APK (${speedMb} MB/s · ${etaSeconds}s remaining)`;
      case 'PAUSED':
        return 'Download paused';
      case 'VERIFYING':
        return 'Calculating SHA-256 and verifying APK signature...';
      case 'READY_TO_INSTALL':
        return 'Verified & ready for installation';
      case 'INSTALLING':
        return 'Invoking Android package installer...';
      case 'FAILED':
        return error || 'Download encountered an error';
      case 'CANCELLED':
        return 'Download cancelled by user';
      case 'IDLE':
      default:
        return 'Idle';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-sheet-title"
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/30 p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-[var(--color-on-surface)] max-h-[90vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2
                id="download-sheet-title"
                className="text-base font-bold tracking-tight text-[var(--color-on-surface)]"
              >
                Downloading Goose
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)] font-mono">
                {release?.apkAsset.name || 'Goose-release.apk'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:bg-[var(--color-on-surface)]/8 active:scale-95 transition-all cursor-pointer"
            title="Minimize to background (download continues safely)"
            aria-label="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Display (PRD Section 12 & 13) */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]/20 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight text-[var(--color-on-surface)] font-mono">
                {percentage}%
              </span>
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                ({downloadedMb} / {totalMb} MB)
              </span>
            </div>

            {/* Status Indicator */}
            {status === 'READY_TO_INSTALL' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready</span>
              </span>
            ) : status === 'FAILED' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Failed</span>
              </span>
            ) : (
              <span className="text-xs font-medium text-[var(--color-primary)]">
                {status}
              </span>
            )}
          </div>

          {/* Smooth animated Material 3 Progress Bar */}
          <div className="w-full h-3 rounded-full bg-[var(--color-surface-container-highest)] overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                status === 'READY_TO_INSTALL'
                  ? 'bg-emerald-500'
                  : status === 'FAILED'
                  ? 'bg-rose-500'
                  : 'bg-[var(--color-primary)]'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="text-xs text-[var(--color-on-surface-variant)] flex items-center justify-between">
            <span className="truncate">{getStatusText()}</span>
            {status === 'DOWNLOADING' && speedBytesPerSec > 0 && (
              <span className="font-mono text-[11px] shrink-0">{speedMb} MB/s</span>
            )}
          </div>
        </div>

        {/* Checksum & Security Card */}
        {verifiedSha256 && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>SHA-256 Integrity Verified</span>
            </div>
            <p className="font-mono text-[10px] text-emerald-800 dark:text-emerald-200 break-all select-all">
              {verifiedSha256}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-outline-variant)]/20">
          <div className="flex items-center gap-2">
            {(status === 'DOWNLOADING' || status === 'PAUSED') && (
              <button
                type="button"
                onClick={handlePauseResume}
                className="px-3 py-1.5 rounded-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-highest)] text-xs font-medium text-[var(--color-on-surface)] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                {status === 'DOWNLOADING' ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </>
                )}
              </button>
            )}

            {(status === 'DOWNLOADING' || status === 'PAUSED') && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-highest)] text-xs font-medium text-[var(--color-error)] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}

            {status === 'FAILED' && (
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-highest)] text-xs font-medium text-[var(--color-primary)] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Download Again</span>
              </button>
            )}
          </div>

          {/* Right Action: Install or Dismiss */}
          {status === 'READY_TO_INSTALL' ? (
            <M3Button
              variant="filled"
              size="md"
              onClick={handleInstall}
              className="flex items-center gap-2 shadow-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Smartphone className="w-4 h-4 stroke-[2.2]" />
              <span>Install Update</span>
            </M3Button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-on-surface)]/8 cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
