import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { GiMedicines } from 'react-icons/gi';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (prescription: string) => void;
}

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation('common');
  const [prescription, setPrescription] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">

      {/* Fundo */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-labelledby="prescription-title" className="relative w-full max-w-lg bg-[#1a1b26] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-[#2A8921]/20 flex items-center justify-center text-[#4dcc43] border border-[#2A8921]/30">
              <GiMedicines size={25} />
            </div>

            <div>
              <h3 id="prescription-title" className="text-xl font-bold text-white">
                {t('prescription.title')}
              </h3>

              <p className="text-sm text-gray-400">
                {t('prescription.subtitle')}
              </p>
            </div>

          </div>

          <button
            type="button"
            aria-label={t('prescription.cancel')}
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>

        </div>

        {/* Conteúdo */}
        <div className="p-5">

          <label htmlFor="prescription-content" className="block mb-2 text-sm text-gray-300">{t('prescription.label')}</label>
          <textarea id="prescription-content" rows={6} value={prescription}
            onChange={event => setPrescription(event.target.value)}
            placeholder={t('prescription.placeholder')}
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white" />

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-white/5">

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition"
          >
            {t('prescription.cancel')}
          </button>

          <button
            type="button"
            disabled={!prescription.trim()}
            onClick={() => { onConfirm(prescription.trim()); setPrescription(''); onClose(); }}
            className="px-6 py-2 rounded-xl bg-[#2A8921] hover:bg-[#35a52c] text-white font-semibold transition"
          >
            {t('prescription.confirm')}
          </button>

        </div>

      </div>
    </div>
  );
};

export default PrescriptionModal;
