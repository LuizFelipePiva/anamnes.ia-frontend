import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageNavigatorCard } from '@/features/navigator';
import logo from '@/assets/logo.png';
import { AppLayout } from '@/shared/components';

const PageNavigator: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('navigator');

  return (
    <AppLayout>
      <div className="flex items-center justify-center py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-8">
            {t('title')}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PageNavigatorCard
              title={t('minigame.title')}
              description={t('minigame.description')}
              icon={<img src={logo} alt={t('minigame.logo_alt')} className="w-10 h-10 object-contain" />}
              gradient="bg-gradient-to-br from-purple-400 to-blue-400"
              onClick={() => navigate('/minigame')}
            />
            <PageNavigatorCard
              title={t('anamnesis.title')}
              description={t('anamnesis.description')}
              icon={<span>🩺</span>}
              gradient="bg-gradient-to-br from-pink-400 to-purple-400"
              onClick={() => navigate('/student-chat')}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PageNavigator;
