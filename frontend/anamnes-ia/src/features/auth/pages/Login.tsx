import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { LoginForm } from '@/features/auth';
import RegisterForm from '@/features/auth/components/RegisterForm';
import logoImg from '@/assets/anamnesia_logo.png';
import medSymbol from '@/assets/NicePng_rod-of-asclepius-png_9294486.png';

interface LoginPageProps {
  initialView?: 'login' | 'register';
}

const LoginPage: React.FC<LoginPageProps> = ({ initialView = 'login' }) => {
  const { t } = useTranslation('auth');
  const [view, setView] = useState<'login' | 'register'>(initialView);
  return (
    <div className="min-h-screen w-full flex relative">

      {/* ── Painel esquerdo — marca ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0d0820 0%, #1a0f3c 50%, #0f1a3a 100%)' }}>

        {/* Mesh blobs */}
        <div className="absolute top-0 left-0 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6b35ff33 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a855f722 0%, transparent 70%)', transform: 'translate(25%, 25%)' }} />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3b82f615 0%, transparent 70%)', transform: 'translate(-50%, -50%)' }} />

        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img src={logoImg} alt="Anamnes.IA" className="h-9 w-auto object-contain" />
          <span className="text-[20px] font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Anamnes<span style={{ color: '#a78bfa' }}>.IA</span>
          </span>
        </div>

        {/* Tagline central */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <p className="text-[11px] font-semibold tracking-[.2em] uppercase text-[#a78bfa] mb-4">{t('page.brand_tagline')}</p>
          <h2 className="text-[38px] font-bold text-white leading-[1.15] mb-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {t('page.hero_line1')}<br />
            <Trans t={t} i18nKey="page.hero_line2" components={[<span key="0" />, <span key="1" style={{ color: '#a78bfa' }} />]} />
          </h2>
          <p className="text-[15px] text-[#8b87b0] leading-relaxed max-w-[360px]">
            {t('page.hero_subtitle')}
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-col gap-3">
            {[
              { icon: '🩺', text: t('page.feature_patients') },
              { icon: '📊', text: t('page.feature_feedback') },
              { icon: '🏫', text: t('page.feature_class') },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-base">{f.icon}</span>
                <span className="text-[13px] text-[#9590c0] font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé painel */}
        <div className="relative z-10">
          <p className="text-[11px] text-[#4a4670]">{t('page.copyright')}</p>
        </div>
      </div>

      {/* ── Símbolo médico partido na divisória ── */}
      <div className="hidden lg:flex absolute z-20 pointer-events-none items-center justify-center"
           style={{ left: '52%', top: '50%', transform: 'translate(-48.5%, -50%)', width: 420, height: 420 }}>
        {/* Halo */}
        <div className="absolute rounded-full"
             style={{ inset: '-60px', background: 'radial-gradient(circle, rgba(107,53,255,0.10) 0%, transparent 65%)' }} />
        {/* Metade esquerda — branca (invade o lado escuro) */}
        <div className="absolute inset-0" style={{ clipPath: 'inset(0 52% 0 0)' }}>
          <div style={{
            width: 420, height: 420,
            WebkitMaskImage: `url(${medSymbol})`, maskImage: `url(${medSymbol})`,
            maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center center',
            backgroundColor: 'rgba(255,255,255,0.90)'
          }} />
        </div>
        {/* Metade direita — cor do painel escuro (invade o lado branco) */}
        <div className="absolute inset-0" style={{ clipPath: 'inset(0 0 0 48%)' }}>
          <div style={{
            width: 420, height: 420,
            WebkitMaskImage: `url(${medSymbol})`, maskImage: `url(${medSymbol})`,
            maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center center',
            backgroundColor: '#1a0f3c'
          }} />
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white relative overflow-hidden">

        {/* Glow roxo sangrando da esquerda */}
        <div className="absolute -left-16 top-1/2 w-[220px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at left center, #6b35ff12 0%, transparent 70%)', transform: 'translateY(-50%)' }} />

        {/* Logo mobile (só aparece em telas pequenas) */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <img src={logoImg} alt="Anamnes.IA" className="h-11 mb-2 object-contain" />
          <h1 className="text-[22px] font-semibold" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <span style={{ color: '#0f0a1e' }}>Anamnes</span><span style={{ color: '#6b35ff' }}>.IA</span>
          </h1>
        </div>

        <div className="w-full max-w-[380px]">
          {view === 'login' ? (
            <>
              <h2 className="text-[22px] font-bold text-[#0f0a1e] mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>{t('page.login_title')}</h2>
              <p className="text-sm text-[#6a6a78] mb-7">{t('page.login_subtitle')}</p>
              <LoginForm />
              <p className="mt-6 text-center text-sm text-[#6a6a78]">
                {t('page.no_account')}{' '}
                <button type="button" onClick={() => setView('register')} className="text-[#6b35ff] font-semibold hover:text-[#5a2ad9] transition">
                  {t('page.register_cta')}
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-[22px] font-bold text-[#0f0a1e] mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>{t('page.register_title')}</h2>
              <p className="text-sm text-[#6a6a78] mb-7">{t('page.register_subtitle')}</p>
              <RegisterForm />
              <p className="mt-6 text-center text-sm text-[#6a6a78]">
                {t('page.has_account')}{' '}
                <button type="button" onClick={() => setView('login')} className="text-[#6b35ff] font-semibold hover:text-[#5a2ad9] transition">
                  {t('page.login_cta')}
                </button>
              </p>
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default LoginPage;