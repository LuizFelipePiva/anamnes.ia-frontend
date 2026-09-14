import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Baby, CalendarDays, ClipboardPlus, HeartPulse, Save, UserRound } from 'lucide-react';
import { FaPersonPregnant } from 'react-icons/fa6';
import { MainMenu } from '@/shared/components';

export type ClinicalModule = 'puericultura' | 'preNatal';

interface ClinicalModulePageProps {
  module: ClinicalModule;
}

const ClinicalModulePage: React.FC<ClinicalModulePageProps> = ({ module }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const isPuericultura = module === 'puericultura';
  const Icon = isPuericultura ? Baby : FaPersonPregnant;
  const accent = isPuericultura ? '#1ba995' : '#d8668d';

  // Converte os valores digitados e calcula o IMC usando altura em metros.
  const weightInKg = Number(weight.replace(',', '.'));
  const heightInMeters = Number(height.replace(',', '.')) / 100;
  const bmi = weightInKg > 0 && heightInMeters > 0
    ? (weightInKg / (heightInMeters * heightInMeters)).toFixed(2).replace('.', ',')
    : '';

  const handleSave = () => {
    // O salvamento será integrado à API posteriormente.
  };

  return (
    <div className="min-h-screen w-full bg-[#f7f6fa] text-[#20202a]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle, rgba(122,85,255,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="lg:grid lg:grid-cols-[80px_1fr] min-h-screen relative">
        <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen z-30"><MainMenu /></aside>
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 shadow-md"><MainMenu mobile /></header>
        <div className="hidden lg:block w-20" />

        <main className="w-full relative">
          <div className="lg:hidden h-16" />
          <header className="bg-[#1a1730] text-white">
            <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-10 py-6 flex items-center gap-4">
              <button aria-label={t('clinical.back')} title={t('clinical.back')} onClick={() => navigate('/mainpage')} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}30`, color: accent }}>
                <Icon size={26} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{t(`clinical.${module}.title`)}</h1>
                <p className="text-xs sm:text-sm text-[#aaa5c4] mt-1">{t(`clinical.${module}.subtitle`)}</p>
              </div>
            </div>
          </header>

          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
            <div className="mb-7">
              <p className="text-xs font-bold tracking-[.16em] uppercase" style={{ color: accent }}>{t('clinical.form_label')}</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171521] mt-2">{t(`clinical.${module}.heading`)}</h2>
              <p className="text-sm text-[#77728d] mt-2 max-w-2xl">{t(`clinical.${module}.description`)}</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
              <section className="bg-white border border-[#e8e4f0] rounded-2xl shadow-[0_8px_30px_rgba(45,31,83,.06)] overflow-hidden">
                <div className="px-5 sm:px-7 py-5 border-b border-[#eeeaf4] flex items-center gap-3">
                  <UserRound size={19} style={{ color: accent }} />
                  <h3 className="font-bold text-[#272432]">{t('clinical.patient_data')}</h3>
                </div>
                <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <label className="sm:col-span-2 text-sm font-semibold text-[#4a4658]">
                    {t('clinical.patient_name')}
                    <input className="clinical-input" placeholder={t('clinical.patient_name_placeholder')} />
                  </label>
                  <label className="text-sm font-semibold text-[#4a4658]">
                    {t('clinical.birth_date')}
                    <span className="relative block"><CalendarDays size={17} className="pointer-events-none absolute left-3 top-3 text-[#9690a6]" /><input type="date" className="clinical-input clinical-date-input pl-10" /></span>
                  </label>
                  <label className="text-sm font-semibold text-[#4a4658]">
                    {t('clinical.record_number')}
                    <input className="clinical-input" placeholder={t('clinical.optional')} />
                  </label>
                  {/* Medidas de crescimento fazem parte apenas do acompanhamento infantil. */}
                  {isPuericultura && (
                    <>
                      <label className="text-sm font-semibold text-[#4a4658]">
                        {t('clinical.weight')}
                        <div className="relative"><input type="text" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} className="clinical-input pr-12" placeholder="0,00" /><span className="absolute right-3 top-3 text-xs font-medium text-[#9690a6]">kg</span></div>
                      </label>
                      <label className="text-sm font-semibold text-[#4a4658]">
                        {t('clinical.height')}
                        <div className="relative"><input type="text" inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} className="clinical-input pr-12" placeholder="0" /><span className="absolute right-3 top-3 text-xs font-medium text-[#9690a6]">cm</span></div>
                      </label>
                      <label className="text-sm font-semibold text-[#4a4658]">
                        {t('clinical.bmi')}
                        <div className="relative"><input type="text" value={bmi} readOnly className="clinical-input pr-16 bg-[#f3f1f7]" placeholder="--" /><span className="absolute right-3 top-3 text-xs font-medium text-[#9690a6]">kg/m²</span></div>
                      </label>
                    </>
                  )}
                  <label className="sm:col-span-2 text-sm font-semibold text-[#4a4658]">
                    {t('clinical.notes')}
                    <textarea className="clinical-input min-h-28 resize-y" placeholder={t('clinical.notes_placeholder')} />
                  </label>
                </div>
              </section>

              <aside className="bg-[#1a1730] text-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(26,23,48,.16)]">
                <div className="flex items-center gap-3 mb-5"><HeartPulse size={20} style={{ color: accent }} /><h3 className="font-bold">{t('clinical.next_steps')}</h3></div>
                <div className="space-y-4 text-sm text-[#c4bfd7]">
                  <p className="flex gap-3"><ClipboardPlus size={17} className="shrink-0" style={{ color: accent }} />{t(`clinical.${module}.step_first`)}</p>
                  <p className="flex gap-3"><CalendarDays size={17} className="shrink-0" style={{ color: accent }} />{t(`clinical.${module}.step_second`)}</p>
                </div>
              </aside>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
              <button onClick={() => navigate('/mainpage')} className="px-5 py-3 rounded-xl text-sm font-bold text-[#716b82] hover:bg-white transition-colors">{t('clinical.cancel')}</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-sm hover:brightness-105 transition-all" style={{ backgroundColor: accent }}><Save size={17} />{t('clinical.save')}</button>
            </div>
          </div>
        </main>
      </div>
      <style>{`.clinical-input { display: block; width: 100%; margin-top: 8px; border: 1px solid #ded9e9; border-radius: 10px; padding: 11px 13px; color: #272432; background: #fcfbfe; font-size: 14px; font-weight: 400; outline: none; } .clinical-date-input::-webkit-datetime-edit { padding-left: 24px; } .clinical-input:focus { border-color: ${accent}; box-shadow: 0 0 0 3px ${accent}22; } .clinical-input::placeholder { color: #aaa5b7; }`}</style>
    </div>
  );
};

export default ClinicalModulePage;