// src/hooks/useToast.ts
// Hook para exibir notificações toast

import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UseToastReturn {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

export function useToast(duration = 3000): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newToast: Toast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    // Auto-remove após duration
    setTimeout(() => {
      hideToast(id);
    }, duration);
  }, [duration, hideToast]);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return { toasts, showToast, hideToast, clearToasts };
}

// Helpers para uso rápido
export const toastHelpers = {
  success: (showToast: (msg: string, type?: ToastType) => void, message: string) => 
    showToast(message, 'success'),
  error: (showToast: (msg: string, type?: ToastType) => void, message: string) => 
    showToast(message, 'error'),
  warning: (showToast: (msg: string, type?: ToastType) => void, message: string) => 
    showToast(message, 'warning'),
  info: (showToast: (msg: string, type?: ToastType) => void, message: string) => 
    showToast(message, 'info'),
};
