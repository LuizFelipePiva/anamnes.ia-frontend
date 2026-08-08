/**
 * Sistema de logging estruturado para desenvolvimento e produção
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Em produção, só loga warn e error
    if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
      return;
    }

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(prefix, message, data ?? '');
        }
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        // Em produção, pode enviar para serviço de monitoramento (Sentry, etc)
        if (!this.isDevelopment) {
          // TODO: Integrar com serviço de erro (Sentry, LogRocket, etc)
        }
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }
}

// Exporta instância singleton
export const logger = new Logger();
