// src/components/ui/Toast.tsx
// Componente de notificação toast

import React from 'react';
import { useTranslation } from 'react-i18next';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-black',
  info: 'bg-blue-500 text-white',
};

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const { t } = useTranslation('common');
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            ${toastStyles[toast.type]}
            px-4 py-3 rounded-lg shadow-lg
            flex items-center gap-3
            min-w-[280px] max-w-[400px]
            animate-slide-in
            transition-all duration-300
          `}
          role="alert"
        >
          <span className="text-lg font-bold">{toastIcons[toast.type]}</span>
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="opacity-70 hover:opacity-100 transition-opacity text-lg font-bold"
            aria-label={t('actions.close')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

// Toast simples para uso único (estilo antigo)
interface SimpleToastProps {
  message: string;
  visible: boolean;
  type?: ToastType;
}

export const SimpleToast: React.FC<SimpleToastProps> = ({ 
  message, 
  visible, 
  type = 'info' 
}) => {
  if (!visible) return null;

  return (
    <div 
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        ${toastStyles[type]}
        px-6 py-3 rounded-xl shadow-xl
        text-sm font-bold
        animate-fade-in
      `}
    >
      <span className="mr-2">{toastIcons[type]}</span>
      {message}
    </div>
  );
};

export default ToastContainer;
