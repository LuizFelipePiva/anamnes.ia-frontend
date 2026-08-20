import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Shield,
} from 'lucide-react';
import { MainMenu } from '@/shared/components';
import { useAuth } from '@/features/auth';
import { fetchMyProfile, updateMyProfile, changePassword } from '../services/profileService';
import type { StudentProfile } from '../types/profile';

// ── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function roleLabel(role: string, t: TFunction<'profile'>) {
  if (role === 'student') return t('role.student');
  if (role === 'teacher') return t('role.teacher');
  if (role === 'admin') return t('role.admin');
  return role;
}

function roleBg(role: string) {
  const map: Record<string, string> = {
    student: 'bg-violet-100 text-violet-700',
    teacher: 'bg-emerald-100 text-emerald-700',
    admin: 'bg-rose-100 text-rose-700',
  };
  return map[role] ?? 'bg-slate-100 text-slate-600';
}

// ── feedback pill ─────────────────────────────────────────────────────────────

function Feedback({ msg }: { msg: { type: 'ok' | 'err'; text: string } }) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
        msg.type === 'ok'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {msg.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg.text}
    </div>
  );
}

// ── section card ──────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

// ── input field ───────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text', disabled = false, readOnly = false, hint,
  rightElement,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  hint?: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${
            readOnly
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed select-none'
              : disabled
              ? 'bg-slate-50 border-slate-200 text-slate-400'
              : 'bg-white border-slate-200 text-slate-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
          } ${rightElement ? 'pr-11' : ''}`}
        />
        {rightElement && <div className="absolute right-3">{rightElement}</div>}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── password field wrapper ────────────────────────────────────────────────────

function PasswordField({
  label, value, onChange, disabled, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? '••••••••'}
      type={show ? 'text' : 'password'}
      disabled={disabled}
      rightElement={
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('profile');
  const { user: authUser, updateUser } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // info form
  const [name, setName]               = useState('');
  const [institution, setInstitution] = useState('');
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMsg, setInfoMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // password form
  const [oldPwd, setOldPwd]           = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdMsg, setPwdMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetchMyProfile()
      .then(p => {
        setProfile(p);
        setName(p.user.name);
        setInstitution(p.user.institution ?? '');
      })
      .catch(() => {
        if (authUser) setName(authUser.name ?? '');
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveInfo = async () => {
    if (!name.trim()) return;
    setInfoLoading(true);
    setInfoMsg(null);
    try {
      await updateMyProfile({ name: name.trim(), institution: institution.trim() || undefined });
      setProfile(prev => prev ? { ...prev, user: { ...prev.user, name: name.trim(), institution: institution.trim() || null } } : prev);
      updateUser({ name: name.trim() });
      setInfoMsg({ type: 'ok', text: t('msg.info_saved') });
    } catch (e: unknown) {
      setInfoMsg({ type: 'err', text: e instanceof Error ? e.message : t('msg.info_error') });
    } finally {
      setInfoLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ type: 'err', text: t('msg.fill_all') });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: 'err', text: t('msg.password_short') });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'err', text: t('msg.password_mismatch') });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      await changePassword(oldPwd, newPwd);
      setPwdMsg({ type: 'ok', text: t('msg.password_changed') });
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e: unknown) {
      setPwdMsg({ type: 'err', text: e instanceof Error ? e.message : t('msg.password_error') });
    } finally {
      setPwdLoading(false);
    }
  };

  const displayUser = profile?.user ?? authUser;

  return (
    <div className="h-screen bg-[#f7f6fa]">
      {/* Aurora */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{
        background: [
          'radial-gradient(ellipse 65% 55% at 0% 0%, rgba(138,91,255,0.20) 0%, transparent 70%)',
          'radial-gradient(ellipse 55% 50% at 100% 0%, rgba(99,179,237,0.16) 0%, transparent 70%)',
          'radial-gradient(ellipse 45% 40% at 100% 100%, rgba(122,85,255,0.13) 0%, transparent 70%)',
        ].join(', '),
      }} />
      {/* Dot grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(122,85,255,0.18) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <div className="flex flex-col sm:flex-row h-full overflow-hidden relative z-10">
      {/* Sidebar desktop */}
      <div className="hidden sm:block h-full flex-shrink-0">
        <MainMenu />
      </div>
      {/* Top bar mobile */}
      <div className="sm:hidden w-full fixed top-0 left-0 z-30">
        <MainMenu mobile />
      </div>
      <div className="sm:hidden h-16 w-full flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            {t('back')}
          </button>

          {/* Avatar + header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
            {loading ? (
              <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-2xl font-bold text-white">
                  {displayUser ? initials((displayUser as { name?: string; email?: string }).name ?? (displayUser as { name?: string; email?: string }).email ?? '?') : '?'}
                </span>
              </div>
            )}
            <div className="min-w-0">
              {loading ? (
                <div className="space-y-2">
                  <div className="w-36 h-5 bg-slate-100 rounded animate-pulse" />
                  <div className="w-48 h-4 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-slate-800 truncate">{(displayUser as { name?: string })?.name ?? '—'}</h1>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{(displayUser as { email?: string })?.email ?? '—'}</p>
                  {(displayUser as { role?: string })?.role && (
                    <span className={`mt-2 inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBg((displayUser as { role: string }).role)}`}>
                      {roleLabel((displayUser as { role: string }).role, t)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Secao: Informacoes Pessoais */}
          <Section title={t('section.personal')} icon={<User size={17} />}>
            <Field
              label={t('field.full_name')}
              value={name}
              onChange={setName}
              placeholder={t('placeholder.name')}
              disabled={infoLoading || loading}
            />
            <Field
              label={t('field.institution')}
              value={institution}
              onChange={setInstitution}
              placeholder={t('placeholder.institution')}
              disabled={infoLoading || loading}
              hint={t('hint.optional')}
            />
            {infoMsg && <Feedback msg={infoMsg} />}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveInfo}
                disabled={infoLoading || !name.trim() || loading}
                className="px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {infoLoading ? t('action.saving') : t('action.save')}
              </button>
            </div>
          </Section>

          {/* Secao: Conta */}
          <Section title={t('section.account')} icon={<Mail size={17} />}>
            <Field
              label={t('field.email')}
              value={(displayUser as { email?: string })?.email ?? ''}
              readOnly
              hint={t('hint.email_readonly')}
            />
            <Field
              label={t('field.account_type')}
              value={roleLabel((displayUser as { role?: string })?.role ?? '', t)}
              readOnly
            />
          </Section>

          {/* Secao: Seguranca */}
          <Section title={t('section.security')} icon={<Shield size={17} />}>
            <PasswordField
              label={t('field.current_password')}
              value={oldPwd}
              onChange={setOldPwd}
              disabled={pwdLoading}
            />
            <PasswordField
              label={t('field.new_password')}
              value={newPwd}
              onChange={setNewPwd}
              disabled={pwdLoading}
              placeholder={t('placeholder.new_password')}
            />
            <PasswordField
              label={t('field.confirm_password')}
              value={confirmPwd}
              onChange={setConfirmPwd}
              disabled={pwdLoading}
            />
            {pwdMsg && <Feedback msg={pwdMsg} />}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleChangePassword}
                disabled={pwdLoading || !oldPwd || !newPwd || !confirmPwd}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Lock size={14} />
                {pwdLoading ? t('action.changing') : t('action.change_password')}
              </button>
            </div>
          </Section>

        </div>
      </div>
      </div>
    </div>
  );
}
