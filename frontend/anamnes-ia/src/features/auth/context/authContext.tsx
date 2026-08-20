import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { STORAGE_KEYS } from '@/config/constants';
import { logger } from '@/core/utils';
import { normalizeLocale, type Lang } from '@/core/i18n/resolveLocale';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  /** Idioma preferido, vindo do JWT (SPEC-007). Prevalece no login. */
  language: Lang | null;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let logoutFn: (() => void) | null = null;

/** Decode JWT payload (no verification — that's the backend's job) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function extractUser(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.sub) return null;
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null;
  return {
    id: payload.sub as string,
    email: (payload.email as string) || '',
    role: (['student', 'teacher', 'admin'].includes(payload.role as string)
      ? (payload.role as UserRole)
      : 'student'),
    name: (payload.name as string) || 'Usuário',
    language: normalizeLocale(payload.language as string | undefined),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  );
  const [userPatch, setUserPatch] = useState<Partial<AuthUser>>({});

  const user = useMemo(() => {
    const base = extractUser(token);
    return base ? { ...base, ...userPatch } : null;
  }, [token, userPatch]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      logger.debug('Token armazenado');
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      logger.debug('Token removido');
    }
  }, [token]);

  const login = (newToken: string) => {
    logger.info('Usuário autenticado');
    setUserPatch({});
    setToken(newToken);
  };

  const logout = () => {
    logger.info('Usuário deslogado');
    setToken(null);
    setUserPatch({});
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUserPatch(prev => ({ ...prev, ...patch }));
  };

  // Atualiza a referência global
  logoutFn = logout;

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Função global para logout fora de componentes
// eslint-disable-next-line react-refresh/only-export-components
export function globalLogout() {
  if (logoutFn) logoutFn();
}