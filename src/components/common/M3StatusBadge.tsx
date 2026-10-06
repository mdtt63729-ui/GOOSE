import React from 'react';
import { BotStatus } from '../../models/bot';

interface M3StatusBadgeProps {
  status: BotStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const M3StatusBadge: React.FC<M3StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'RUNNING':
        return {
          label: 'Running',
          dotColor: 'bg-emerald-500',
          textColor: 'text-emerald-700 dark:text-emerald-300',
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          pulse: true,
        };
      case 'STARTING':
        return {
          label: 'Starting',
          dotColor: 'bg-cyan-500',
          textColor: 'text-cyan-700 dark:text-cyan-300',
          bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
          pulse: true,
        };
      case 'INSTALLING':
        return {
          label: 'Installing Packages',
          dotColor: 'bg-amber-500',
          textColor: 'text-amber-700 dark:text-amber-300',
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          pulse: true,
        };
      case 'PREPARING':
        return {
          label: 'Preparing Env',
          dotColor: 'bg-indigo-500',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
          pulse: true,
        };
      case 'STOPPING':
        return {
          label: 'Stopping',
          dotColor: 'bg-amber-500',
          textColor: 'text-amber-700 dark:text-amber-300',
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          pulse: false,
        };
      case 'STOPPED':
        return {
          label: 'Stopped',
          dotColor: 'bg-slate-400 dark:bg-slate-500',
          textColor: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-500/10 dark:bg-slate-500/15',
          pulse: false,
        };
      case 'CRASHED':
        return {
          label: 'Crashed',
          dotColor: 'bg-rose-500',
          textColor: 'text-rose-700 dark:text-rose-300',
          bg: 'bg-rose-500/15 dark:bg-rose-500/20',
          pulse: true,
        };
      case 'ERROR':
        return {
          label: 'Error',
          dotColor: 'bg-rose-500',
          textColor: 'text-rose-700 dark:text-rose-300',
          bg: 'bg-rose-500/10 dark:bg-rose-500/15',
          pulse: false,
        };
      case 'IDLE':
      default:
        return {
          label: 'Idle',
          dotColor: 'bg-slate-400 dark:bg-slate-500',
          textColor: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-500/10 dark:bg-slate-500/15',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${config.bg} ${config.textColor}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`}
          />
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
};
