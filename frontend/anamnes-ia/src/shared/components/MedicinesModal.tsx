import React from 'react';
import { X } from 'lucide-react';
import { GiMedicines } from 'react-icons/gi';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">

      {/* Fundo */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#1a1b26] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-[#2A8921]/20 flex items-center justify-center text-[#4dcc43] border border-[#2A8921]/30">
              <GiMedicines size={25} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Prescrição de Medicamentos
              </h3>

              <p className="text-sm text-gray-400">
                Adicionar medicamento à prescrição
              </p>
            </div>

          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>

        </div>

        {/* Conteúdo */}
        <div className="p-5">

          <p className="text-gray-300">
            Conteúdo da prescrição de medicamentos aqui.
          </p>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-white/5">

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#2A8921] hover:bg-[#35a52c] text-white font-semibold transition"
          >
            Confirmar
          </button>

        </div>

      </div>
    </div>
  );
};

export default PrescriptionModal;