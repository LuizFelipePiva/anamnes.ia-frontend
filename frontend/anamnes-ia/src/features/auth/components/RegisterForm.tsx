import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { register as registerService } from '@/features/auth';

const INPUT_CLASS =
  'w-full px-4 py-3 border border-[#e9e7f6] rounded-xl text-[#11111a] bg-[#faf9ff] placeholder:text-[#9a9aab] focus:outline-none focus:ring-2 focus:ring-[#7a55ff]/40 focus:border-[#7a55ff] transition-all text-sm';
const LABEL_CLASS = 'block mb-1.5 text-sm font-semibold text-[#20202a]';

const RegisterForm: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const role = 'student' as const;
  const [success, setSuccess] = useState('');
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isTermsModalOpen ? 'hidden' : '';
  }, [isTermsModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError(null);
    
    // Validação de senhas
    if (password !== confirmPassword) {
      setError(t('register.error_password_mismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('register.error_password_short'));
      return;
    }

    if (!termsAccepted) {
      setError(t('register.error_terms'));
      setIsTermsModalOpen(true);
      return;
    }
    
    setLoading(true);
    try {
      // SPEC-006: o cadastro NÃO faz login automático. O backend dispara um
      // e-mail de confirmação e responde de forma idêntica exista ou não a conta
      // (anti-enumeração). Mostramos a tela de "confirme seu e-mail".
      const message = await registerService(name, email, password, role);
      setSuccess(message);
      setRegistered(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('register.error_generic');
      setError(errorMessage);
      console.error('Erro no cadastro:', err);
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl">
          ✉️
        </div>
        <h2 className="text-lg font-extrabold text-[#20202a] m-0">{t('register.confirm_email_title')}</h2>
        <p className="text-sm text-[#475467] leading-relaxed max-w-[340px]">
          {success || t('register.confirm_email_body_fallback')}
          {' '}
          <Trans
            t={t}
            i18nKey="register.confirm_email_instructions"
            values={{ email }}
            components={[<span key="0" />, <span key="1" className="font-semibold text-[#20202a]" />]}
          />
        </p>
        <p className="text-[12px] text-[#9a9aab] max-w-[340px]">
          {t('register.confirm_email_spam')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full bg-gradient-to-r from-[#7a55ff] to-[#6b35ff] text-white py-3 rounded-xl font-semibold text-sm hover:from-[#6b45ee] hover:to-[#5a2ad9] transition-all duration-200 mt-1"
        >
          {t('register.back_to_login')}
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label className={LABEL_CLASS}>{t('register.name_label')}</label>
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder={t('register.name_placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className={LABEL_CLASS}>{t('register.email_label')}</label>
          <input
            type="email"
            className={INPUT_CLASS}
            placeholder={t('register.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Senha */}
        <div>
          <label className={LABEL_CLASS}>{t('register.password_label')}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className={INPUT_CLASS + ' pr-11'}
              placeholder={t('register.password_placeholder')}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9aab] hover:text-[#6b35ff] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? t('register.hide_password') : t('register.show_password')}
            >
              {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-[#9a9aab]">{t('register.password_hint')}</p>
        </div>

        {/* Confirmar senha */}
        <div>
          <label className={LABEL_CLASS}>{t('register.confirm_label')}</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className={INPUT_CLASS + ' pr-11'}
              placeholder={t('register.password_placeholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9aab] hover:text-[#6b35ff] transition-colors"
              tabIndex={-1}
              aria-label={showConfirmPassword ? t('register.hide') : t('register.show')}
            >
              {showConfirmPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Termos inline */}
        <div className="flex items-start gap-3 bg-[#7c4dff]/[.04] border border-[#7c4dff]/[.14] rounded-xl px-4 py-3">
          <input
            type="checkbox"
            id="termsAccepted"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#7c4dff] cursor-pointer flex-shrink-0"
          />
          <label htmlFor="termsAccepted" className="text-[13px] text-[#475467] leading-relaxed cursor-pointer">
            {t('register.terms_prefix')}
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(true)}
              className="text-[#7c4dff] font-bold hover:underline"
            >
              {t('register.terms_link')}
            </button>
            {t('register.terms_suffix')}
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-[#7a55ff] to-[#6b35ff] text-white py-3 rounded-xl font-semibold text-sm hover:from-[#6b45ee] hover:to-[#5a2ad9] hover:shadow-[0_6px_20px_rgba(107,53,255,.35)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          disabled={loading}
        >
          {loading ? t('register.submitting') : t('register.submit')}
        </button>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium">
            <span>✅</span><span>{success}</span>
          </div>
        )}
      </form>

      {/* Modal de Termos — Tailwind puro, sem classes globais */}
      {isTermsModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTermsModalOpen(false);
          }}
        >
          <div className="w-full max-w-[700px] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#ececf2]">
              <h2 className="text-xl font-extrabold text-[#6b35ff] m-0">{t('terms.title')}</h2>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                aria-label={t('terms.close')}
                className="w-10 h-10 rounded-xl bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#344054] text-2xl flex items-center justify-center transition-colors leading-none"
              >
                &times;
              </button>
            </div>
            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto text-[#344054] text-[15px] leading-relaxed space-y-4">
              <p>{t('terms.intro')}</p>
              <div>
                <h3 className="font-extrabold text-[#111827] mb-1">{t('terms.s1_title')}</h3>
                <p>{t('terms.s1_body')}</p>
              </div>
              <div>
                <h3 className="font-extrabold text-[#111827] mb-1">{t('terms.s2_title')}</h3>
                <p>{t('terms.s2_body')}</p>
              </div>
              <div>
                <h3 className="font-extrabold text-[#111827] mb-1">{t('terms.s3_title')}</h3>
                <p>{t('terms.s3_body')}</p>
              </div>
              <div>
                <h3 className="font-extrabold text-[#111827] mb-1">{t('terms.s4_title')}</h3>
                <p>{t('terms.s4_body')}</p>
              </div>
              <div>
                <h3 className="font-extrabold text-[#111827] mb-1">{t('terms.s5_title')}</h3>
                <p>{t('terms.s5_body')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RegisterForm;