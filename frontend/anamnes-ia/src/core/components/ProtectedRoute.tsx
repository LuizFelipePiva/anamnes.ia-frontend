// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import type { UserRole } from '@/features/auth/context/authContext';

/** Rota que exige apenas autenticação */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

/** Rota pública: redireciona para /mainpage se o usuário já estiver autenticado */
export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/mainpage" replace /> : <>{children}</>;
};

/** Rota que exige autenticação + uma das roles permitidas. Admin sempre tem acesso. */
export const RoleRoute: React.FC<{
  children: React.ReactNode;
  roles: UserRole[];
  redirectTo?: string;
}> = ({ children, roles, redirectTo = '/mainpage' }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/" replace />;
  if (user.role === 'admin' || roles.includes(user.role)) return <>{children}</>;
  return <Navigate to={redirectTo} replace />;
};

export default ProtectedRoute;