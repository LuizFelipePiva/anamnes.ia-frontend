import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth';
import {
  Home,
  MessageSquare,
  GraduationCap,
  Shield,
  User,
  Gamepad2,
  Stethoscope,
  Settings,
  LogOut,
  Menu,
  X,
  Layers,
  ClipboardList,
  Route,
} from 'lucide-react';

const getInitials = (name?: string | null, email?: string | null): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

/** Chaves de `menu.*` no namespace `common` — mantém o `t()` tipado */
type MenuLabelKey =
  | 'menu.home' | 'menu.cases' | 'menu.simulation' | 'menu.teacher' | 'menu.admin'
  | 'menu.student_page' | 'menu.flashcards' | 'menu.simulados' | 'menu.minigame'
  | 'menu.settings' | 'menu.trilhas';

interface NavItem {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  /** Chave do namespace `common` (ex.: `menu.home`) — resolvida na renderização */
  labelKey: MenuLabelKey;
  route?: string;
  href?: string;
  color: string;
}

const MainMenu: React.FC<{ mobile?: boolean }> = ({ mobile = false }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const { logout, user } = useAuth();

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const profileRoute = '/profile';

  const menuItems: NavItem[] = useMemo(() => [
    { icon: <Home size={20} />,          activeIcon: <Home size={20} />,          labelKey: 'menu.home',         route: '/mainpage',      color: 'text-sky-400' },
    { icon: <Stethoscope size={20} />,   activeIcon: <Stethoscope size={20} />,   labelKey: 'menu.cases',        route: '/cases',         color: 'text-indigo-400' },
    { icon: <MessageSquare size={20} />, activeIcon: <MessageSquare size={20} />, labelKey: 'menu.simulation',   route: '/student-chat',  color: 'text-violet-400' },
    ...(isTeacherOrAdmin ? [{
      icon: <GraduationCap size={20} />, activeIcon: <GraduationCap size={20} />, labelKey: 'menu.teacher',      route: '/teacherpage',   color: 'text-emerald-400',
    }] as NavItem[] : []),
    ...(user?.role === 'admin' ? [{
      icon: <Shield size={20} />,        activeIcon: <Shield size={20} />,        labelKey: 'menu.admin',        route: '/admin',         color: 'text-rose-400',
    }] as NavItem[] : []),
    ...(user?.role === 'student' || user?.role === 'admin' ? [{
      icon: <User size={20} />,          activeIcon: <User size={20} />,          labelKey: 'menu.student_page', route: '/student',       color: 'text-amber-400',
    }] as NavItem[] : []),
    { icon: <Layers size={20} />,        activeIcon: <Layers size={20} />,        labelKey: 'menu.flashcards',   route: '/flashcards',    color: 'text-pink-400' },
    { icon: <ClipboardList size={20} />, activeIcon: <ClipboardList size={20} />, labelKey: 'menu.simulados',    route: '/simulados',     color: 'text-cyan-400' },
    { icon: <Route size={20} />,         activeIcon: <Route size={20} />,         labelKey: 'menu.trilhas',      route: '/trilhas',       color: 'text-rose-400' },
    { icon: <Gamepad2 size={20} />,      activeIcon: <Gamepad2 size={20} />,      labelKey: 'menu.minigame',     route: '/minigame',      color: 'text-teal-400' },
    { icon: <Settings size={20} />,      activeIcon: <Settings size={20} />,      labelKey: 'menu.settings',     route: '/settings',      color: 'text-slate-400' },
  ], [isTeacherOrAdmin, user?.role]);

  const handleLogoutClick = () => {
    logout();
    navigate('/');
  };

  const isActive = (item: NavItem) => {
    if (!item.route) return false;
    return location.pathname === item.route || location.pathname.startsWith(item.route + '/');
  };

  const handleNav = (item: NavItem) => {
    if (item.href) {
      window.open(item.href, '_blank');
    } else if (item.route) {
      navigate(item.route);
    }
  };

  /* ── Mobile: top bar ── */
  if (mobile) {
    return (
      <>
        <div className="flex items-center justify-between px-4 h-16 bg-[#1a1730] text-white">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate(profileRoute)}
          >
            <div className="w-8 h-8 rounded-full bg-[#844AF5] flex items-center justify-center text-white font-bold text-sm">
              {getInitials(user?.name, user?.email)}
            </div>
            <span className="font-semibold text-sm hidden xs:inline truncate max-w-[120px]">
              {user?.name ?? user?.email ?? t('menu.profile')}
            </span>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all border-none"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-[#1a1730] border-t border-white/[.06] z-50 px-3 py-3 flex flex-col gap-1 shadow-2xl">
            {menuItems.map(item => {
              const active = isActive(item);
              return (
                <button
                  key={item.labelKey}
                  onClick={() => { handleNav(item); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all text-left select-none focus:outline-none focus-visible:outline-none ${
                    active
                      ? 'bg-gradient-to-r from-[#844AF5] to-[#6b35ff] text-white shadow-[0_4px_14px_rgba(132,74,245,.40)] border-[3px] border-white'
                      : 'text-[#a39dc4] hover:bg-white/[.06] hover:text-white border-[3px] border-transparent'
                  }`}
                >
                  <span className={active ? 'text-white' : item.color}>{item.icon}</span>
                  {t(item.labelKey)}
                </button>
              );
            })}
            <button
              onClick={() => { handleLogoutClick(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold text-[#a39dc4] hover:bg-red-500/10 hover:text-red-400 transition-all text-left select-none focus:outline-none focus-visible:outline-none border-[3px] border-transparent"
            >
              <LogOut size={20} /> {t('menu.logout')}
            </button>
          </div>
        )}
      </>
    );
  }

  /* ── Desktop: dark sidebar ── */
  return (
    <div
      className={`flex flex-col bg-[#1a1730] text-white transition-all duration-200 overflow-hidden ${
        menuOpen ? 'w-56' : 'w-20'
      } h-screen border-r border-white/[.06]`}
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
    >
      {/* Logo / Profile */}
      <div className="px-4 py-5 border-b border-white/[.06]">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(profileRoute)}
        >
          <div className="w-9 h-9 rounded-full bg-[#844AF5] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {getInitials(user?.name, user?.email)}
          </div>
          {menuOpen && (
            <div className="min-w-0">
              <p className="text-[#e2dff5] text-sm font-semibold truncate">{user?.name ?? user?.email ?? t('menu.profile')}</p>
              <p className="text-[#7c78a0] text-xs truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map(item => {
          const active = isActive(item);
          return (
            <button
              key={item.labelKey}
              onClick={() => handleNav(item)}
              className={`w-full flex items-center gap-3 rounded-xl text-[15px] font-semibold transition-all text-left select-none whitespace-nowrap focus:outline-none focus-visible:outline-none ${
                menuOpen ? 'px-4 py-3.5' : 'px-0 py-3.5 justify-center'
              } ${
                active
                  ? 'bg-gradient-to-r from-[#844AF5] to-[#6b35ff] text-white shadow-[0_4px_14px_rgba(132,74,245,.40)] border-[3px] border-white'
                  : 'text-[#a39dc4] hover:bg-white/[.06] hover:text-white border-[3px] border-transparent'
              }`}
              title={!menuOpen ? t(item.labelKey) : undefined}
            >
              <span className={`flex-shrink-0 ${active ? 'text-white' : item.color}`}>
                {active ? item.activeIcon : item.icon}
              </span>
              {menuOpen && t(item.labelKey)}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pt-3 pb-4 border-t border-white/[.06] flex flex-col gap-1">
        <button
          onClick={handleLogoutClick}
          className={`w-full flex items-center gap-3 rounded-xl text-[15px] font-semibold text-[#a39dc4] hover:bg-red-500/10 hover:text-red-400 transition-all select-none whitespace-nowrap focus:outline-none focus-visible:outline-none border-[3px] border-transparent ${
            menuOpen ? 'px-4 py-3.5' : 'px-0 py-3.5 justify-center'
          }`}
          title={!menuOpen ? t('menu.logout') : undefined}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {menuOpen && t('menu.logout')}
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
