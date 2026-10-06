import React, { useState } from 'react';
import { Bot } from '../../models/bot';
import { Smartphone, Square, ArrowUpRight, Bell, ChevronDown, ChevronUp } from 'lucide-react';

interface PersistentNotificationBarProps {
  runningBotNames: string[];
  active24x7Bot?: Bot | null;
  onStopBot?: () => void;
  onOpenConsole?: () => void;
}

export const PersistentNotificationBar: React.FC<PersistentNotificationBarProps> = ({
  runningBotNames,
  active24x7Bot,
  onStopBot,
  onOpenConsole,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (runningBotNames.length === 0) return null;

  return (
    <aside
      aria-label="Android Persistent Notification"
      className="shrink-0 bg-[#161b22] border-b border-[#30363d] text-slate-200 px-4 py-2 text-xs transition-all animate-in slide-in-from-top-2 duration-200 select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center shrink-0">
            <Bell className="w-3 h-3" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-200 tracking-tight text-[11px]">
                Goose · 24/7 Service
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {runningBotNames.length === 1
                ? `${runningBotNames[0]} running in background`
                : `${runningBotNames.length} bots active in background`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onStopBot && (
            <button
              type="button"
              onClick={onStopBot}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-rose-300 text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
              title="Stop running daemon"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>Stop</span>
            </button>
          )}

          {onOpenConsole && (
            <button
              type="button"
              onClick={onOpenConsole}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>View</span>
              <ArrowUpRight className="w-2.5 h-2.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
            aria-label={isExpanded ? "Collapse notification details" : "Expand notification details"}
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Foreground Service:</span>
            <span className="text-emerald-400 font-mono">ACTIVE (Sticky)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Battery Optimization:</span>
            <span className="text-slate-300">Managed via Foreground Notification</span>
          </div>
          <p className="text-[9px] text-slate-500 italic">
            Process remains alive continuously even when Goose UI is dismissed.
          </p>
        </div>
      )}
    </aside>
  );
};
