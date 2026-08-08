import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';

type SoapFields = {
  S: string;
  O: string;
  A: string;
  P: string;
};

interface SoapFormProps {
  onSend: (prompt: string) => Promise<void> | void; 
  loading?: boolean;
  initialValues?: SoapFields;
}

const SoapForm: React.FC<SoapFormProps> = ({ onSend, loading = false, initialValues }) => {
  const { t } = useTranslation('common');
  const [fields, setFields] = useState<SoapFields>(initialValues || { S: '', O: '', A: '', P: '' });
  // Guarda a chave do dicionário, não o texto — assim o erro acompanha a troca de idioma
  const [errorKey, setErrorKey] = useState<'soap.fill_all' | null>(null);

  useEffect(() => {
    if (initialValues) {
      setFields(initialValues);
      setTimeout(() => {
        document.querySelectorAll('textarea').forEach((el) => {
          (el as HTMLTextAreaElement).style.height = 'auto';
          (el as HTMLTextAreaElement).style.height = `${(el as HTMLTextAreaElement).scrollHeight}px`;
        });
      }, 0);
    }
  }, [initialValues]);

  const handleChange = (key: keyof SoapFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.S.trim() || !fields.O.trim() || !fields.A.trim() || !fields.P.trim()) {
      setErrorKey('soap.fill_all');
      return;
    }
    setErrorKey(null);
    const prompt = `S: ${fields.S}\nO: ${fields.O}\nA: ${fields.A}\nP: ${fields.P}`;
    await onSend(prompt);
    setFields({ S: '', O: '', A: '', P: '' });

    setTimeout(() => {
      document.querySelectorAll('textarea').forEach((el) => {
        (el as HTMLTextAreaElement).style.height = 'auto';
      });
    }, 0);
  };

  return (
    <div className="bg-[#393542] rounded-2xl p-3 sm:p-5 w-full max-w-2xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:gap-3 w-full">
        <h2 className="text-xl font-bold text-[#844AF5] mb-1 text-center">SOAP</h2>
        {errorKey && <div className="text-red-500 text-center">{t(errorKey)}</div>}
        {/* S */}
        <div className="flex items-center gap-2 mb-1 w-full">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#8B2E7E] flex-shrink-0">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#8B2E7E]/20 w-full flex items-center justify-between">
            <span className="text-base font-semibold text-white">{t('soap.subjective')}</span>
            <Tooltip
              color="#8B2E7E"
              text={t('soap.subjective_tip')}
            />
          </div>
        </div>
        <textarea
          className="w-full p-2 rounded-lg bg-[#615B6D] text-gray-100 resize-none"
          value={fields.S}
          onChange={(e) => handleChange('S', e.target.value)}
          onInput={handleTextareaInput}
          placeholder={t('soap.subjective_ph')}
          rows={2}
        />
        {/* O */}
        <div className="flex items-center gap-2 mb-1 w-full">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#2D4993] flex-shrink-0">
            <span className="text-2xl font-bold text-white">O</span>
          </div>
          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#2D4993]/20 w-full flex items-center justify-between">
            <span className="text-base font-semibold text-white">{t('soap.objective')}</span>
            <Tooltip
              color="#2D4993"
              text={t('soap.objective_tip')}
            />
          </div>
        </div>
        <textarea
          className="w-full p-2 rounded-lg bg-[#615B6D] text-gray-100 resize-none"
          value={fields.O}
          onChange={(e) => handleChange('O', e.target.value)}
          onInput={handleTextareaInput}
          placeholder={t('soap.objective_ph')}
          rows={2}
        />
        {/* A */}
        <div className="flex items-center gap-2 mb-1 w-full">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#918E27] flex-shrink-0">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#918E27]/20 w-full flex items-center justify-between">
            <span className="text-base font-semibold text-white">{t('soap.assessment')}</span>
            <Tooltip
              color="#918E27"
              text={t('soap.assessment_tip')}
            />
          </div>
        </div>
        <textarea
          className="w-full p-2 rounded-lg bg-[#615B6D] text-gray-100 resize-none"
          value={fields.A}
          onChange={(e) => handleChange('A', e.target.value)}
          onInput={handleTextareaInput}
          placeholder={t('soap.assessment_ph')}
          rows={2}
        />
        {/* P */}
        <div className="flex items-center gap-2 mb-1 w-full">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#2A8921] flex-shrink-0">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#2A8921]/20 w-full flex items-center justify-between">
            <span className="text-base font-semibold text-white">{t('soap.plan')}</span>
            <Tooltip
              color="#2A8921"
              text={t('soap.plan_tip')}
            />
          </div>
        </div>
        <textarea
          className="w-full p-2 rounded-lg bg-[#615B6D] text-gray-100 resize-none"
          value={fields.P}
          onChange={(e) => handleChange('P', e.target.value)}
          onInput={handleTextareaInput}
          placeholder={t('soap.plan_ph')}
          rows={2}
        />
        <button
          type="submit"
          className="bg-[#844AF5] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#6F3CBB] transition mt-4 w-1/3 mx-auto flex items-center justify-center mb-2"
          disabled={loading}
        >
          <span className="hidden sm:inline">{loading ? t('soap.sending') : t('soap.send')}</span>
          <svg
            className="w-5 h-5 sm:ml-2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default SoapForm;