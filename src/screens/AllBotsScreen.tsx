import React, { useState, useMemo } from 'react';
import { useBots } from '../state/BotContext';
import { Bot, BotStatus } from '../models/bot';
import { BotCard } from '../components/bot/BotCard';
import { M3Button } from '../components/common/M3Button';
import { Search, Plus, Filter, ArrowLeft, X } from 'lucide-react';

interface AllBotsScreenProps {
  onOpenConsole: (bot: Bot) => void;
  onNavigateNewBot: () => void;
  onBack?: () => void;
}

export const AllBotsScreen: React.FC<AllBotsScreenProps> = ({
  onOpenConsole,
  onNavigateNewBot,
  onBack,
}) => {
  const { bots } = useBots();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BotStatus | 'ALL'>('ALL');

  // Lightweight, memoized filter
  const filteredBots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bots.filter((bot) => {
      const matchesSearch =
        q === '' ||
        bot.name.toLowerCase().includes(q) ||
        bot.username.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ? true : bot.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bots, searchQuery, statusFilter]);

  const filterOptions: { label: string; value: BotStatus | 'ALL' }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Running', value: 'RUNNING' },
    { label: 'Installing', value: 'INSTALLING' },
    { label: 'Idle', value: 'IDLE' },
    { label: 'Stopped', value: 'STOPPED' },
    { label: 'Crashed', value: 'CRASHED' },
    { label: 'Error', value: 'ERROR' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4 pb-6 transition-colors">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-on-surface)]/8 active:bg-[var(--color-on-surface)]/12 transition-colors cursor-pointer shrink-0"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-on-surface)]">
              All Bots
            </h1>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              {bots.length} total project{bots.length === 1 ? '' : 's'} in local storage
            </p>
          </div>
        </div>

        <M3Button
          variant="filled"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={onNavigateNewBot}
        >
          New Bot
        </M3Button>
      </div>

      {/* Search Input */}
      <div className="relative mt-2 mb-3">
        <Search className="w-4 h-4 text-[var(--color-on-surface-variant)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bots by name or @username..."
          className="w-full h-11 pl-10 pr-9 rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/60 border border-[var(--color-outline-variant)]/30 focus:border-[var(--color-primary)] focus:outline-hidden text-xs transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2">
        <Filter className="w-3.5 h-3.5 text-[var(--color-on-surface-variant)] shrink-0 mr-1" />
        {filterOptions.map((opt) => {
          const isActive = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs font-semibold'
                  : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Search Counter if filtered */}
      {(searchQuery.trim() || statusFilter !== 'ALL') && (
        <div className="text-[11px] text-[var(--color-on-surface-variant)] mb-2 px-1">
          Showing {filteredBots.length} of {bots.length} bots
        </div>
      )}

      {/* Bots List */}
      <div className="flex-1 flex flex-col gap-2.5">
        {filteredBots.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-[var(--color-on-surface-variant)]">
            <p className="font-medium text-sm text-[var(--color-on-surface)] mb-1">
              No matching bots found
            </p>
            <p className="max-w-xs">
              Try a different search keyword or status filter, or create a new bot.
            </p>
          </div>
        ) : (
          filteredBots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              onClick={() => onOpenConsole(bot)}
            />
          ))
        )}
      </div>
    </div>
  );
};
