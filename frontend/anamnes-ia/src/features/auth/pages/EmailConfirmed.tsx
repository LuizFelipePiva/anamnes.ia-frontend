import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/shared/components';
import { Card } from '@/shared/components';

const EmailConfirmed: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Card>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto mb-6"
            >
              <circle cx="12" cy="12" r="12" fill="#844AF5" />
              <path
                d="M17 9l-5.2 5.2a1 1 0 01-1.4 0L7 11.8"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-[#844AF5] text-center">
              {t('confirmed.title')}
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 mb-8 text-center">
              {t('confirmed.body_line1')}
              <br />
              {t('confirmed.body_line2')}
            </p>
            <button
              onClick={handleBackToHome}
              className="w-full bg-[#844AF5] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6F3CBB] hover:shadow-lg hover:scale-105 transition"
            >
              {t('confirmed.back_home')}
            </button>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default EmailConfirmed;