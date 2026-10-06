import React from 'react';
import { useBots } from '../state/BotContext';
import { BotCard } from '../components/bot/BotCard';
import { M3Button } from '../components/common/M3Button';
import { Plus, ArrowRight, Bot as BotIcon, Layers } from 'lucide-react';
import { Bot } from '../models/bot';

interface HomeScreenProps {
  onNavigateNewBot: () => void;
  onOpenConsole: (bot: Bot) => void;
  onViewAllBots: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateNewBot,
  onOpenConsole,
  onViewAllBots,
}) => {
  const { bots, recentBots, isLoading } = useBots();

  const totalBotsCount = bots.length;
  // According to PRD: 1-5 bots -> no More button. 6+ bots -> show More button.
  const showMoreButton = totalBotsCount >= 6;
  const runningCount = bots.filter((b) => b.status === 'RUNNING').length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4 pb-6 transition-colors">
      {/* Brand Header */}
      <div className="flex items-center justify-between pt-2 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center font-bold text-base shadow-sm">
              G
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-on-surface)]">
              Goose
            </h1>
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
            Android Bot Runtime & Manager
          </p>
        </div>

        {/* Quick status indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-[11px]">
            {runningCount} Active
          </span>
        </div>
      </div>

      {/* Primary CTA: + New Bot */}
      <div className="my-3">
        <M3Button
          variant="filled"
          size="lg"
          icon={<Plus className="w-5 h-5 stroke-[2.5]" />}
          onClick={onNavigateNewBot}
          className="w-full text-base font-semibold shadow-md active:scale-[0.985]"
        >
          New Bot
        </M3Button>
      </div>

      {/* Section: My Bots (Recent 5) */}
      <div className="mt-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-on-surface)]">
              My Bots
            </h2>
            <span className="text-xs text-[var(--color-on-surface-variant)] font-medium px-2 py-0.5 rounded-full bg-[var(--color-surface-container-high)]">
              {totalBotsCount}
            </span>
          </div>

          {totalBotsCount > 0 && (
            <button
              type="button"
              onClick={onViewAllBots}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Bots</span>
            </button>
          )}
        </div>

        {/* Bot Cards List */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-xs text-[var(--color-on-surface-variant)]">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading bot projects...</span>
          </div>
        ) : totalBotsCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-[var(--color-surface-container-low)] border border-dashed border-[var(--color-outline-variant)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] flex items-center justify-center mb-3">
              <BotIcon className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--color-on-surface)] mb-1">
              No bots installed
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] max-w-xs mb-4">
              Tap '+ New Bot' to create your first Python Telegram bot project.
            </p>
            <M3Button variant="tonal" size="sm" onClick={onNavigateNewBot}>
              Create Bot
            </M3Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentBots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                onClick={() => onOpenConsole(bot)}
              />
            ))}

            {/* If Bots >= 6, display 'More' button according to PRD rule */}
            {showMoreButton && (
              <button
                type="button"
                onClick={onViewAllBots}
                className="mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-[var(--color-primary)] font-medium text-xs transition-colors cursor-pointer border border-[var(--color-outline-variant)]/30 active:scale-[0.985]"
              >
                <span>More ({totalBotsCount - 5} remaining)</span>
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
