// Core components
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as ProtectedRoute, RoleRoute, GuestRoute } from './ProtectedRoute';
export { default as SessionNotice } from './SessionNotice';
export { default as ThemeProvider } from './ThemeProvider';
export { usePreferences, useTheme } from './themePreferences';
export type { Accent, Density, Lang, Theme } from './themePreferences';
