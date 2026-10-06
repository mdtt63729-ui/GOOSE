import React, { useState } from 'react';
import { ReleaseInfo } from '../../services/update/UpdateTypes';
import { M3Button } from '../common/M3Button';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  ShieldCheck,
  Package,
} from 'lucide-react';

interface UpdateDialogProps {
  isOpen: boolean;
  release: ReleaseInfo | null;
  onLater: () => void;
  onDownload: (release: ReleaseInfo) => void;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  isOpen,
  release,
  onLater,
  onDownload,
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  if (!isOpen || !release) return null;

  const fileSizeMb = (release.apkAsset.size / (1024 * 1024)).toFixed(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-[28px] bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/30 p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-[var(--color-on-surface)]">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-6 h-6 stroke-[2]" />
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              Update Available
            </span>
            <h2
              id="update-dialog-title"
              className="text-base font-bold tracking-tight text-[var(--color-on-surface)] truncate"
            >
              Goose {release.version} is ready
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              <span>{fileSizeMb} MB APK</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Signed Release</span>
              </span>
            </div>
          </div>
        </div>

        {/* Release Overview Banner */}
        <div className="p-3 rounded-2xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]/20 text-xs">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-on-surface-variant)] mb-1">
            <span className="font-medium text-[var(--color-on-surface)]">
              {release.name}
            </span>
            <span>{release.publishedAt}</span>
          </div>
          <p className="text-[11px] text-[var(--color-on-surface-variant)]">
            This release brings stability improvements, Android 14 foreground optimizations, and release signing.
          </p>
        </div>

        {/* Expandable "What's New" Section (PRD Section 23) */}
        <div className="border border-[var(--color-outline-variant)]/25 rounded-2xl overflow-hidden bg-[var(--color-surface-container-low)]">
          <button
            type="button"
            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--color-primary)]" />
              <span>What's new in this release</span>
            </div>
            {isNotesExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
            )}
          </button>

          {isNotesExpanded && (
            <div className="p-3 pt-0 border-t border-[var(--color-outline-variant)]/15 text-xs text-[var(--color-on-surface-variant)] max-h-40 overflow-y-auto leading-relaxed whitespace-pre-line font-sans">
              {release.releaseNotes}
            </div>
          )}
        </div>

        {/* Action Buttons (PRD Section 11: [Later] [Download]) */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-outline-variant)]/20">
          <button
            type="button"
            onClick={onLater}
            className="px-4 py-2.5 rounded-full text-xs font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-on-surface)]/8 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Later</span>
          </button>

          <M3Button
            variant="filled"
            size="md"
            onClick={() => onDownload(release)}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
            <span>Download & Install</span>
          </M3Button>
        </div>
      </div>
    </div>
  );
};
