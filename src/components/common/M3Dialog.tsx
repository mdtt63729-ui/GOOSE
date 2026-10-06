import React, { useEffect } from 'react';
import { M3Button } from './M3Button';

interface M3DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const M3Dialog: React.FC<M3DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  icon,
  loading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-[28px] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] p-6 shadow-2xl border border-[var(--color-outline-variant)]/30 animate-in zoom-in-95 duration-200">
        {icon && (
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              isDestructive
                ? 'bg-[var(--color-error)]/15 text-[var(--color-error)]'
                : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
            }`}
          >
            {icon}
          </div>
        )}

        <h3
          id="dialog-title"
          className="text-xl font-medium tracking-tight mb-2 text-[var(--color-on-surface)]"
        >
          {title}
        </h3>

        <p
          id="dialog-description"
          className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-6"
        >
          {description}
        </p>

        <div className="flex items-center justify-end gap-2">
          <M3Button
            variant="text"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </M3Button>
          <M3Button
            variant={isDestructive ? 'danger' : 'filled'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </M3Button>
        </div>
      </div>
    </div>
  );
};
