import React, { useEffect } from 'react';
import {
  Navigate,
  Outlet,
  RouterProvider,
  createHashRouter,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import Login from '@/features/auth/pages/Login';
import PageNavigator from '@/features/navigator/pages/PageNavigator';
import EmailConfirmed from '@/features/auth/pages/EmailConfirmed';
import StudentChat from '@/features/chat/pages/StudentChat';
import MainPage from '@/app/MainPage';
import TeacherChat from '@/features/teacher/pages/TeacherChat';
import TeacherNewCaseChat from '@/features/teacher/pages/TeacherNewCaseChat';
import Payments from '@/features/payments/pages/Payments';
import ConversationView from '@/features/chat/pages/ConversationView';
import { PreviewNavigator } from '@/shared/components';
import { AuthProvider } from '@/features/auth';
import { ErrorBoundary, ThemeProvider } from '@/core/components';
import SettingsPage from '@/features/settings/pages/Settings';
import CasesPage from '@/features/case/pages/CasesPage';
import MinigamePage from '@/features/minigame/pages/Minigame';
import FlashcardsPage from '@/features/flashcards/pages/FlashcardsPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import StudentDashboard from '@/features/student/pages/StudentDashboard';
import AdminPanel from '@/features/admin/pages/AdminPanel';
import ResetPasswordPage from '@/features/auth/pages/ResetPassword';

const THEME_VALUES = new Set(['light', 'dark']);
const ACCENT_VALUES = new Set(['purple', 'blue', 'green', 'red']);
const DENSITY_VALUES = new Set(['comfortable', 'compact']);
const LANG_VALUES = new Set(['pt-BR', 'en', 'es', 'fr', 'ru']);

const isDevelopment =
  import.meta.env.DEV ||
  import.meta.env.MODE === 'development' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const MOCK_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJwcmV2aWV3LXVzZXIiLCJlbWFpbCI6InByZXZpZXdAdXNlci5jb20iLCJyb2xlIjoiYWRtaW4iLCJuYW1lIjoiUHJldmlldyBVc2VyIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjQxMDI0NDQ4MDB9' +
  '.preview-signature-not-valid-for-backend';

const applyPreviewPreferences = () => {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');
  const accent = params.get('accent');
  const density = params.get('density');
  const lang = params.get('lang');

  if (theme && THEME_VALUES.has(theme)) {
    localStorage.setItem('anamnesia_theme', theme);
    localStorage.setItem('prefs_global_theme', theme);
  }

  if (accent && ACCENT_VALUES.has(accent)) {
    localStorage.setItem('anamnesia_accent', accent);
    localStorage.setItem('prefs_global_accent', accent);
  }

  if (density && DENSITY_VALUES.has(density)) {
    localStorage.setItem('anamnesia_density', density);
    localStorage.setItem('prefs_global_density', density);
  }

  if (lang && LANG_VALUES.has(lang)) {
    localStorage.setItem('anamnesia_lang', lang);
    localStorage.setItem('prefs_global_lang', lang);
  }
};

localStorage.setItem('authToken', MOCK_TOKEN);
applyPreviewPreferences();

const readPreviewRoute = (): string | null => {
  const previewRoute = new URLSearchParams(window.location.search).get('previewRoute');
  if (!previewRoute || !previewRoute.startsWith('/')) {
    return null;
  }

  return previewRoute;
};

const syncPreviewHash = (): string | null => {
  const previewRoute = readPreviewRoute();
  if (!previewRoute) {
    return null;
  }

  const desiredHash = `#${previewRoute}`;
  if (window.location.hash !== desiredHash) {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${desiredHash}`,
    );
  }

  return previewRoute;
};

const INITIAL_PREVIEW_ROUTE = syncPreviewHash();

const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    if (!isDevelopment) {
      console.error('Modo Preview bloqueado: apenas para desenvolvimento local');
      alert('Modo Preview nao pode ser usado em producao. Este modo e apenas para desenvolvimento local.');
      window.location.href = '/';
      return;
    }

    localStorage.setItem('authToken', MOCK_TOKEN);
  });

  if (!isDevelopment) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Modo Preview Bloqueado</h1>
        <p>Este modo e apenas para desenvolvimento local.</p>
      </div>
    );
  }

  return <AuthProvider>{children}</AuthProvider>;
};

const PreviewRouteBootstrap: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const previewRoute = readPreviewRoute();
    if (!previewRoute || location.pathname === previewRoute) {
      return;
    }

    navigate(previewRoute, { replace: true });
  }, [location.pathname, navigate]);

  return null;
};

const PreviewLayout: React.FC = () => {
  return (
    <>
      <PreviewRouteBootstrap />
      <PreviewNavigator />
      <div style={{ paddingTop: '60px' }}>
        <Outlet />
      </div>
    </>
  );
};

const previewRouter = createHashRouter([
  {
    path: '/',
    element: <PreviewLayout />,
    children: [
      { index: true, element: <Login /> },
      { path: 'register', element: <Login initialView="register" /> },
      { path: 'confirm', element: <EmailConfirmed /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'navigator', element: <PageNavigator /> },
      { path: 'mainpage', element: <MainPage /> },
      { path: 'cases', element: <CasesPage /> },
      { path: 'student-chat', element: <StudentChat /> },
      { path: 'teacherpage', element: <TeacherChat /> },
      { path: 'teacher/new-case', element: <TeacherNewCaseChat /> },
      { path: 'payments', element: <Payments /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'minigame', element: <MinigamePage /> },
      { path: 'flashcards', element: <FlashcardsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'student', element: <StudentDashboard /> },
      { path: 'admin', element: <AdminPanel /> },
      { path: 'conversation/:id', element: <ConversationView /> },
      { path: '*', element: <Navigate to={INITIAL_PREVIEW_ROUTE ?? '/mainpage'} replace /> },
    ],
  },
]);

const AppPreview: React.FC = () => {
  return (
    <MockAuthProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <RouterProvider router={previewRouter} />
        </ErrorBoundary>
      </ThemeProvider>
    </MockAuthProvider>
  );
};

export default AppPreview;
