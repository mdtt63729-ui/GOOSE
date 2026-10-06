import React from 'react';

interface M3SnackbarProps {
  message: string | null;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export const M3Snackbar: React.FC<M3SnackbarProps> = ({
  message,
  actionText,
  onAction,
}) => {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] shadow-lg border border-[var(--color-outline-variant)]/40 animate-in slide-in-from-bottom-4 duration-200"
      role="alert"
    >
      <span className="text-xs font-medium leading-snug line-clamp-2">
        {message}
      </span>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold text-[var(--color-primary)] hover:underline shrink-0 p-1 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
