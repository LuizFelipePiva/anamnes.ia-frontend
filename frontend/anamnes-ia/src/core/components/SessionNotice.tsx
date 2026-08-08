// Exibe, uma vez, o aviso deixado por `authFetch` antes de redirecionar para o
// login (sessão expirada). Fica montado na raiz do app para funcionar em
// qualquer rota de destino, inclusive nas públicas, que não usam o AppLayout.

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/core/hooks/useToast';
import { ToastContainer } from '@/shared/components/ui/Toast';
import { consumeSessionNotice } from '@/core/utils/sessionNotice';

const SessionNotice: React.FC = () => {
  const { t } = useTranslation('common');
  const { toasts, showToast, hideToast } = useToast(6000);
  // StrictMode monta o efeito duas vezes em dev; o aviso é consumido do
  // sessionStorage na primeira, mas o guard evita depender desse detalhe.
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    const notice = consumeSessionNotice();
    if (!notice) return;
    shown.current = true;
    showToast(t(`errors.${notice}`), 'warning');
  }, [showToast, t]);

  return <ToastContainer toasts={toasts} onDismiss={hideToast} />;
};

export default SessionNotice;
