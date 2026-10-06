import React from 'react';
import { useTheme } from '../../theme/ThemeContext';

interface M3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const M3Button: React.FC<M3ButtonProps> = ({
  variant = 'filled',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  onClick,
  ...rest
}) => {
  const { triggerHaptic } = useTheme();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    triggerHaptic('light');
    if (onClick) onClick(e);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm hover:brightness-105 active:brightness-95 disabled:opacity-38 disabled:bg-slate-400/30 disabled:text-slate-500';
      case 'tonal':
        return 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] hover:brightness-102 active:brightness-98 disabled:opacity-38';
      case 'outlined':
        return 'border border-[var(--color-outline)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8 active:bg-[var(--color-primary)]/12 disabled:opacity-38';
      case 'danger':
        return 'bg-[var(--color-error)] text-[var(--color-on-error)] shadow-sm hover:brightness-105 active:brightness-95 disabled:opacity-38';
      case 'text':
      default:
        return 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8 active:bg-[var(--color-primary)]/12 disabled:opacity-38';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-9 px-3 text-xs gap-1.5 rounded-full';
      case 'lg':
        return 'h-14 px-6 text-base gap-2.5 rounded-full font-medium';
      case 'md':
      default:
        return 'h-12 px-5 text-sm gap-2 rounded-full font-medium';
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={handleClick}
      className={`inline-flex items-center justify-center m3-pressable transition-all relative overflow-hidden cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </span>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
