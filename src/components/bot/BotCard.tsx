import React from 'react';
import { Bot } from '../../models/bot';
import { M3StatusBadge } from '../common/M3StatusBadge';
import { ChevronRight, KeyRound } from 'lucide-react';

interface BotCardProps {
  bot: Bot;
  onClick: (bot: Bot) => void;
}

export const BotCard: React.FC<BotCardProps> = ({ bot, onClick }) => {
  // Generate initials for avatar monogram
  const initials = bot.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'B';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(bot)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(bot);
        }
      }}
      className="group relative flex items-center gap-3.5 p-3.5 rounded-2xl bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)] active:scale-[0.985] transition-all duration-150 cursor-pointer border border-[var(--color-outline-variant)]/25 shadow-xs focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
      aria-label={`${bot.name}, handle ${bot.username}, status ${bot.status}`}
    >
      {/* Bot Icon / Material 3 Placeholder Monogram */}
      <div
        className="relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-102"
        style={{
          backgroundColor: bot.avatarColor || 'var(--color-secondary-container)',
          color: '#ffffff',
        }}
      >
        <span>{initials}</span>

        {/* Small .env lock badge indicator if env configured */}
        {bot.hasEnv && (
          <span
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs"
            title="Secured .env configuration present"
          >
            <KeyRound className="w-2.5 h-2.5 stroke-[2.5]" />
          </span>
        )}
      </div>

      {/* Bot Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4 className="text-sm font-semibold tracking-tight text-[var(--color-on-surface)] truncate">
            {bot.name}
          </h4>
          <M3StatusBadge status={bot.status} size="sm" />
        </div>

        <p className="text-xs text-[var(--color-on-surface-variant)] truncate font-mono">
          {bot.username}
        </p>

        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--color-on-surface-variant)]/70">
          <span className="font-mono truncate">
            {bot.files.main.name}
          </span>
          <span>·</span>
          <span>
            {Math.round((bot.files.main.size / 1024) * 10) / 10} KB
          </span>
        </div>
      </div>

      {/* Right chevron */}
      <div className="shrink-0 text-[var(--color-on-surface-variant)]/50 group-hover:text-[var(--color-on-surface)] group-hover:translate-x-0.5 transition-all">
        <ChevronRight className="w-5 h-5 stroke-[2]" />
      </div>
    </div>
  );
};
