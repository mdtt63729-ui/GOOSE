import React from 'react';
import { Home, Bot as BotIcon, Settings } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';

export type ScreenTab = 'home' | 'bots' | 'settings';

interface BottomNavBarProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { triggerHaptic } = useTheme();

  const navItems: { tab: ScreenTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { tab: 'home', label: 'Home', icon: Home },
    { tab: 'bots', label: 'My Bots', icon: BotIcon },
    { tab: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      className="shrink-0 bg-[var(--color-surface-container)] border-t border-[var(--color-outline-variant)]/20 px-4 pt-2 pb-3 transition-colors select-none z-30"
      aria-label="Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.tab;
          const Icon = item.icon;

          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onSelectTab(item.tab);
              }}
              className="flex flex-col items-center justify-center min-w-[64px] py-1 cursor-pointer group focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded-xl"
              aria-label={item.label}
              aria-selected={isActive}
            >
              {/* Material 3 active pill indicator */}
              <div
                className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] shadow-xs'
                    : 'text-[var(--color-on-surface-variant)] group-hover:bg-[var(--color-on-surface)]/8'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                  isActive
                    ? 'text-[var(--color-on-surface)] font-semibold'
                    : 'text-[var(--color-on-surface-variant)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
