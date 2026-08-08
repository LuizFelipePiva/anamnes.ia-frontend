import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import supabase from '@/core/lib/supabaseClient';
import { updatePassword } from '@/features/auth/services/authService';
import logoImg from '@/assets/anamnesia_logo.png';

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);         // session detected
  const [invalid, setInvalid] = useState(false);     // no recovery session
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase exchanges the recovery token from the URL hash and fires
    // PASSWORD_RECOVERY when the session is active.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check if a session already exists (page reload after exchange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // After a short timeout, if still not ready, the link is invalid/expired
    const timer = setTimeout(() => {
      setReady((r) => {
        if (!r) setInvalid(true);
        return r;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError(t('reset_page.error_mismatch'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('reset_page.error_short'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updatePassword(newPassword);
      // Encerra a sessão de recovery — não deixar token válido persistido no browser
      await supabase.auth.signOut();
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('reset_page.error_generic'));
    }
    setLoading(false);
  };

  const inputClass =
    'w-full px-4 py-3 border border-[#e9e7f6] rounded-xl text-[#11111a] bg-[#faf9ff] placeholder:text-[#9a9aab] focus:outline-none focus:ring-2 focus:ring-[#7a55ff]/40 focus:border-[#7a55ff] transition-all text-sm';
  const labelClass = 'block mb-1.5 text-sm font-semibold text-[#20202a]';

  return (
    <div className="min-h-screen w-full bg-[#f3f1ff] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#7a55ff]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-[#6b35ff]/8 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <img src={logoImg} alt="Anamnes.IA" className="h-12 mb-2 object-contain" />
        <h1 className="text-2xl font-extrabold text-[#11111a] tracking-tight mb-0.5">Anamnes.IA</h1>
        <p className="text-[13px] text-[#6a6a78] mb-7 font-medium tracking-wide">{t('reset_page.brand_tagline')}</p>

        <div className="w-full bg-white rounded-2xl shadow-[0_8px_32px_rgba(107,53,255,.12)] border border-[#e9e7f6] p-7">

          {/* ── Success state ── */}
          {done && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-[#f0ebff] flex items-center justify-center">
                <CheckCircle2 size={28} className="text-[#6b35ff]" />
              </div>
              <div className="text-center">
                <p className="text-base font-extrabold text-[#11111a] mb-1">{t('reset_page.done_title')}</p>
                <p className="text-xs text-[#6a6a78] leading-relaxed">
                  {t('reset_page.done_body')}
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="mt-2 w-full bg-gradient-to-r from-[#7a55ff] to-[#6b35ff] text-white py-3 rounded-xl font-semibold text-sm hover:from-[#6b45ee] hover:to-[#5a2ad9] transition-all duration-200"
              >
                {t('reset_page.done_cta')}
              </button>
            </div>
          )}

          {/* ── Invalid / expired link ── */}
          {!done && invalid && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-base font-extrabold text-[#11111a]">{t('reset_page.invalid_title')}</p>
              <p className="text-xs text-[#6a6a78] leading-relaxed">
                {t('reset_page.invalid_body')}
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-2 w-full bg-gradient-to-r from-[#7a55ff] to-[#6b35ff] text-white py-3 rounded-xl font-semibold text-sm hover:from-[#6b45ee] hover:to-[#5a2ad9] transition-all duration-200"
              >
                {t('reset_page.invalid_cta')}
              </button>
            </div>
          )}

          {/* ── Loading — waiting for session ── */}
          {!done && !invalid && !ready && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#7a55ff] border-t-transparent animate-spin" />
              <p className="text-sm text-[#6a6a78]">{t('reset_page.verifying')}</p>
            </div>
          )}

          {/* ── Reset form ── */}
          {!done && !invalid && ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-[17px] font-extrabold text-[#11111a] mb-1">{t('reset_page.form_title')}</h2>
                <p className="text-xs text-[#6a6a78] mb-5">{t('reset_page.form_subtitle')}</p>
              </div>

              <div>
                <label className={labelClass}>{t('reset_page.new_password_label')}</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className={inputClass + ' pr-11'}
                    placeholder={t('login.password_placeholder')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9aab] hover:text-[#6b35ff] transition-colors"
                    tabIndex={-1}
                    aria-label={showNew ? t('reset_page.hide_password') : t('reset_page.show_password')}
                  >
                    {showNew ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>{t('reset_page.confirm_label')}</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className={inputClass + ' pr-11'}
                    placeholder={t('login.password_placeholder')}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9aab] hover:text-[#6b35ff] transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? t('reset_page.hide_password') : t('reset_page.show_password')}
                  >
                    {showConfirm ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#7a55ff] to-[#6b35ff] text-white py-3 rounded-xl font-semibold text-sm hover:from-[#6b45ee] hover:to-[#5a2ad9] hover:shadow-[0_6px_20px_rgba(107,53,255,.35)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? t('reset_page.submitting') : t('reset_page.submit')}
              </button>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
