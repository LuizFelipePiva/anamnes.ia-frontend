import React from 'react';
import { MainMenu } from '@/shared/components';
import { SimuladoConfigurator } from '../components/SimuladoConfigurator';

export const SimuladosListPage: React.FC = () => {
  return (
    <div className="lg:grid lg:grid-cols-[80px_1fr] min-h-screen w-full bg-[#f7f6fa]">
      <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto z-30">
        <MainMenu />
      </aside>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 w-full shadow-md">
        <MainMenu mobile />
      </header>

      <div className="hidden lg:block w-20 bg-[#1a1730]" />

      <main className="w-full relative">
        <div className="lg:hidden h-16 w-full" />
        <div className="sl-page">
          <SimuladoConfigurator />
        </div>
      </main>
    </div>
  );
};

export default SimuladosListPage;
