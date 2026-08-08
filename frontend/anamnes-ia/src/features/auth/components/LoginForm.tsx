import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { login as loginService, requestPasswordReset } from '@/features/auth/services/authService';

const LoginForm: React.FC = () => {
  const { t } = useTranslation('auth');
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Forgot-password state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = await loginService(email, password);
      login(token);
      navigate('/mainpage');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('login.error_generic'));
    }
    setLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    try {
      await requestPasswordReset(resetEmail);
      setResetSent(true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : t('forgot.error_generic'));
    }
    setResetLoading(false);
  };

  const inputClass =
    'w-full px-4 py-3 border border-[#e9e7f6] rounded-xl text-[#11111a] bg-[#faf9ff] placeholder:text-[#9a9aab] focus:outline-none focus:ring-2 focus:ring-[#7a55ff]/40 focus:border-[#7a55ff] transition-all text-sm';
  const labelClass = 'block mb-1.5 text-sm font-semibold text-[#20202a]';

  // ── Forgot-password view ──────────────────────────────────────────────────
  if (forgotMode) {
    if (resetSent) {
      return (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-[#f0ebff] flex items-center justify-center">
              <Mail size={22} className="text-[#6b35ff]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#11111a]">{t('forgot.sent_title')}</p>
              <p className="text-xs text-[#6a6a78] mt-1 leading-relaxed">
                <Trans
                  t={t}
                  i18nKey="forgot.sent_body"
                  values={{ email: resetEmail }}
                  components={[<span key="0" />, <span key="1" className="font-semibold text-[#6b35ff]" />]}
                />
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(''); }}
            className="w-full flex items-center justify-center gap-2 text-sm text-[#6a6a78] hover:text-[#6b35ff] transition-colors"
          >
            <ArrowLeft size={14} /> {t('forgot.back_to_login')}
          </button>
        </div>
      );
    }
    return (
      <form onSubmit={handleResetRequest} className="space-y-4">
        <div>
          <button
            type="button"
            onClick={() => { setForgotMode(false); setResetError(null); }}
            className="flex items-center gap-1.5 text-xs text-[#6a6a78] hover:text-[#6b35ff] transition-colors mb-3"
          >
            <ArrowLeft size={13} /> {t('forgot.back')}
          </button>
          <p className="text-[13px] font-semibold text-[#11111a] mb-0.5">{t('forgot.title')}</p>
          <p className="text-xs text-[#6a6a78] mb-4">{t('forgot.subtitle')}</p>
          <label className={labelClass}>{t('forgot.email_label')}</label>
          <input
            type="email"
            className={inputClass}
            placeholder={t('forgot.email_placeholder')}
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={resetLoading}
          className="w-full bg-gradient-to-r from-[#7a55ff] to-[#6b35ff] text-white py-3 rounded-xl font-semibold text-sm hover:from-[#6b45ee] hover:to-[#5a2ad9] hover:shadow-[0_6px_20px_rgba(107,53,255,.35)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resetLoading ? t('forgot.submitting') : t('forgot.submit')}
        </button>
        {resetError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
            <span>⚠️</span><span>{resetError}</span>
          </div>
        )}
      </form>
    );
  }

  // ── Normal login view ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>{t('login.email_label')}</label>
        <input
          type="email"
          className={inputClass}
          placeholder={t('login.email_placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-[#20202a]">{t('login.password_label')}</label>
          <button
            type="button"
            onClick={() => setForgotMode(true)}
            className="text-xs text-[#6b35ff] hover:text-[#5a2ad9] font-medium transition-colors"
          >
            {t('login.forgot_password')}
          </button>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className={inputClass + ' pr-11'}
            placeholder={t('login.password_placeholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9aab] hover:text-[#6b35ff] transition-colors text-base leading-none"
            tabIndex={-1}
            aria-label={showPassword ? t('login.hide_password') : t('login.show_password')}
          >
            {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-[#7a55ff] to-[#6b35ff] text-white py-3 rounded-xl font-semibold text-sm hover:from-[#6b45ee] hover:to-[#5a2ad9] hover:shadow-[0_6px_20px_rgba(107,53,255,.35)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
        disabled={loading}
      >
        {loading ? t('login.submitting') : t('login.submit')}
      </button>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </form>
  );
};

export default LoginForm;
