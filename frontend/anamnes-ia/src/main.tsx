import { createRoot } from 'react-dom/client'
import './index.css'
import '@/core/i18n'   // inicializa o i18next antes de renderizar a app (SPEC-007)
import App from './app/App.tsx'
import { validateEnvironment } from '@/config/env'
import { logger } from '@/core/utils'

// Valida variáveis de ambiente antes de iniciar
try {
  validateEnvironment();
  logger.info('Aplicação iniciada');
} catch (error) {
  logger.error('Erro ao validar ambiente', error);
  // Mostra erro visual para o usuário
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f3f4f6; padding: 20px;">
      <div style="max-width: 500px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #dc2626; margin-bottom: 16px;">⚠️ Erro de Configuração</h1>
        <p style="color: #4b5563; margin-bottom: 16px;">${error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        <p style="color: #6b7280; font-size: 14px;">Configure as variáveis de ambiente no arquivo .env e recarregue a página.</p>
      </div>
    </div>
  `;
  throw error;
}

createRoot(document.getElementById('root')!).render(
    <App />
)
