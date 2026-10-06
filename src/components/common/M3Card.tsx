import React from 'react';
import { useTheme } from '../../theme/ThemeContext';

interface M3CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'filled' | 'outlined';
  clickable?: boolean;
  children: React.ReactNode;
}

export const M3Card: React.FC<M3CardProps> = ({
  variant = 'filled',
  clickable = false,
  children,
  className = '',
  onClick,
  ...rest
}) => {
  const { triggerHaptic } = useTheme();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickable) return;
    triggerHaptic('light');
    if (onClick) onClick(e);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return 'bg-[var(--color-surface-container-low)] shadow-sm dark:shadow-none border border-transparent dark:border-[var(--color-outline-variant)]/20';
      case 'outlined':
        return 'bg-[var(--color-surface)] border border-[var(--color-outline-variant)]';
      case 'filled':
      default:
        return 'bg-[var(--color-surface-container)]';
    }
  };

  return (
    <div
      onClick={clickable ? handleClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={`rounded-2xl transition-all ${
        clickable
          ? 'cursor-pointer m3-pressable hover:brightness-102 active:brightness-98 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]'
          : ''
      } ${getVariantStyles()} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
