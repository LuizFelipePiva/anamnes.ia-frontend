import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { createClass } from '@/features/teacher/services/teacherService';
import type { ClassInfo, ClassCreate } from '@/features/teacher/types/teacher';

interface Props {
  onClose: () => void;
  onCreated: (c: ClassInfo) => void;
}

const CreateClassModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { t } = useTranslation('teacher');
  const [name, setName] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t('createClass.name_required')); return; }
    setError('');
    setLoading(true);
    try {
      const data: ClassCreate = { name: name.trim(), term: term.trim() || undefined };
      const created = await createClass(data);
      onCreated(created);
    } catch {
      setError(t('createClass.create_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0edf8] bg-gradient-to-r from-[#f3f1ff] to-white">
          <div>
            <p className="text-base font-bold text-[#111018]">{t('createClass.title')}</p>
            <p className="text-xs text-[#6b6880] mt-0.5">{t('createClass.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="cc-name" className="text-xs font-semibold text-[#6b6880] uppercase tracking-wide">
              {t('createClass.name_label')}
            </label>
            <input
              id="cc-name"
              type="text"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('createClass.name_placeholder')}
              className="w-full rounded-xl border border-[#e3dff5] px-4 py-2.5 text-sm text-[#111018] bg-[#f9f8fe] focus:outline-none focus:ring-2 focus:ring-[#844AF5]/40 focus:border-[#844AF5] transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="cc-term" className="text-xs font-semibold text-[#6b6880] uppercase tracking-wide">
              {t('createClass.term_label')}
            </label>
            <input
              id="cc-term"
              type="text"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder={t('createClass.term_placeholder')}
              className="w-full rounded-xl border border-[#e3dff5] px-4 py-2.5 text-sm text-[#111018] bg-[#f9f8fe] focus:outline-none focus:ring-2 focus:ring-[#844AF5]/40 focus:border-[#844AF5] transition"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#6b6880] bg-[#f5f3fb] hover:bg-[#ede8f9] transition-all"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#844AF5] hover:bg-[#6b35cc] disabled:opacity-60 transition-all"
            >
              {loading ? t('createClass.creating') : t('createClass.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClassModal;
