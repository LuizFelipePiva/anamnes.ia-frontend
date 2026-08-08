import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { LoginPage, EmailConfirmedPage, ResetPasswordPage } from '@/features/auth';
import { ConversationView, StudentChatPage } from '@/features/chat';
import { TeacherChatPage, TeacherNewCaseChatPage } from '@/features/teacher';
import PaymentsPage from '@/features/payments/pages/Payments';
import SettingsPage from '@/features/settings/pages/Settings';
import MinigamePage from '@/features/minigame/pages/Minigame';
import FlashcardsPage from '@/features/flashcards/pages/FlashcardsPage';
import { ProtectedRoute, RoleRoute, GuestRoute } from '@/core/components';
import { AuthProvider, useAuth } from '@/features/auth';
import { ErrorBoundary, SessionNotice, ThemeProvider } from '@/core/components';
import MainPage from './MainPage';
import CasesPage from '@/features/case/pages/CasesPage';
import AdminPanel from '@/features/admin/pages/AdminPanel';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import StudentDashboard from '@/features/student/pages/StudentDashboard';
import supabase from '@/core/lib/supabaseClient';
import { QuestionsPage } from '@/features/questoes';
import QuestionsAdminPage from '@/features/admin/pages/QuestionsAdminPage';
import { SimuladosListPage, SimuladoRunPage, SimuladoReportPage } from '@/features/simulados';
import { TrilhasPage, TrilhaMapaPage, LicaoPage, RevisaoPage } from '@/features/trilhas';

const router = createBrowserRouter([
  // Rotas públicas (redireciona para /mainpage se já autenticado)
  { path: '/', element: <GuestRoute><LoginPage /></GuestRoute> },
  { path: '/login', element: <Navigate to="/" replace /> },
  { path: '/register', element: <GuestRoute><LoginPage initialView="register" /></GuestRoute> },
  { path: '/confirm', element: <EmailConfirmedPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Rotas protegidas — qualquer role
  { path: '/settings', element: <ProtectedRoute><SettingsPage /></ProtectedRoute> },

  // Rotas comuns (qualquer role autenticado)
  { path: '/mainpage', element: <ProtectedRoute><MainPage /></ProtectedRoute> },
  { path: '/cases', element: <ProtectedRoute><CasesPage /></ProtectedRoute> },
  { path: '/student-chat', element: <ProtectedRoute><StudentChatPage /></ProtectedRoute> },
  { path: '/conversation/:id', element: <RoleRoute roles={['student', 'teacher']}><ConversationView /></RoleRoute> },
  { path: '/minigame', element: <RoleRoute roles={['student', 'teacher']}><MinigamePage /></RoleRoute> },
  { path: '/flashcards', element: <RoleRoute roles={['student', 'teacher']}><FlashcardsPage /></RoleRoute> },
  { path: '/payments', element: <ProtectedRoute><PaymentsPage /></ProtectedRoute> },
  { path: '/questoes', element: <ProtectedRoute><QuestionsPage /></ProtectedRoute> },

  // Rotas de SIMULADOS
  { path: '/simulados', element: <ProtectedRoute><SimuladosListPage /></ProtectedRoute> },
  { path: '/simulados/:simuladoId/run', element: <ProtectedRoute><SimuladoRunPage /></ProtectedRoute> },
  { path: '/simulados/:simuladoId/report/:attemptId', element: <ProtectedRoute><SimuladoReportPage /></ProtectedRoute> },

  // Rotas de TRILHAS
  { path: '/trilhas', element: <ProtectedRoute><TrilhasPage /></ProtectedRoute> },
  { path: '/trilhas/:trilhaId', element: <ProtectedRoute><TrilhaMapaPage /></ProtectedRoute> },
  { path: '/trilhas/:trilhaId/licao/:licaoId', element: <ProtectedRoute><LicaoPage /></ProtectedRoute> },
  { path: '/trilhas/:trilhaId/revisao', element: <ProtectedRoute><RevisaoPage /></ProtectedRoute> },

  // Rotas de PERFIL
  { path: '/profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
  { path: '/profile/:id', element: <RoleRoute roles={['teacher', 'admin']}><ProfilePage /></RoleRoute> },

  // Rota STUDENT DASHBOARD
  { path: '/student', element: <RoleRoute roles={['student', 'teacher', 'admin']}><StudentDashboard /></RoleRoute> },

  // Rota ADMIN
  { path: '/admin', element: <RoleRoute roles={['admin']}><AdminPanel /></RoleRoute> },
  { path: '/admin/questoes', element: <RoleRoute roles={['admin']}><QuestionsAdminPage /></RoleRoute> },

  // Rotas de PROFESSOR
  { path: '/teacherpage', element: <RoleRoute roles={['teacher']}><TeacherChatPage /></RoleRoute> },
  { path: '/teacher/new-case', element: <RoleRoute roles={['teacher']}><TeacherNewCaseChatPage /></RoleRoute> },

  // Evita tela em branco em qualquer rota desconhecida
  { path: '*', element: <Navigate to="/" replace /> },
]);

// Fallback global: se o Supabase redirecionar para a URL raiz (redirect URLs não configurados
// no dashboard), este listener captura o evento e navega para a rota correta.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    // Garante que o usuário chega em /reset-password independentemente da URL de redirect
    if (!window.location.pathname.startsWith('/reset-password')) {
      router.navigate('/reset-password', { replace: true });
    }
  }
});

const AuthedThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return (
    <ThemeProvider userId={user?.id ?? null} profileLang={user?.language ?? null}>
      {children}
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthedThemeProvider>
          <RouterProvider router={router} />
          {/* Aviso de sessão expirada deixado pelo authFetch antes do redirect */}
          <SessionNotice />
        </AuthedThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
