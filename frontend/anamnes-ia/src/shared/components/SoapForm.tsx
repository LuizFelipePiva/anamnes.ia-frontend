import React, { useState, useEffect } from 'react';
//import Tooltip from './Tooltip';
import ExamModal from './ExamModal';
import CID10Modal from './CID10Modal';
import ComplementaryExamModal from './ComplementaryExamModal';
import MedicinesModal from './MedicinesModal';
import type { CID10Item } from '../data/cid10Data';

import { SUGGESTIONS_DATA } from '../../features/teacher/data/suggestionsData';

import { BsFileEarmarkMedical } from "react-icons/bs";
import { GiMedicines } from "react-icons/gi";

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
  patologia?: string;
  onSaveExam?: (findings: string[]) => void;
  customExameFisico?: string;
}

const SoapForm: React.FC<SoapFormProps> = ({
  onSend,
  loading = false,
  initialValues,
  patologia,
  onSaveExam,
  customExameFisico
}) => {
  const [fields, setFields] = useState<SoapFields>(initialValues || { S: '', O: '', A: '', P: '' });
  const [error, setError] = useState<string | null>(null);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showComplementaryExamModal, setShowComplementaryExamModal] = useState(false);
  const [showMedicinesModal, setShowMedicinesModal] = useState(false);
  const [showCIDModal, setShowCIDModal] = useState(false);
  const [selectedCIDs, setSelectedCIDs] = useState<CID10Item[]>([]);

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

  const handleExamConfirm = (findings: string[]) => {
    setShowExamModal(false);

    if (onSaveExam) {
      onSaveExam(findings);
    }

    const text = findings.join('\n');
    setFields(prev => {
      const current = prev.O.trim();
      return { ...prev, O: current ? `${current}\n${text}` : text };
    });
  };

  const handleCIDSelect = (items: CID10Item[]) => {
    setSelectedCIDs(items);
  };

  const removeCID = (code: string) => {
    setSelectedCIDs(prev => prev.filter(item => item.code !== code));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.S.trim() || !fields.O.trim() || !fields.A.trim() || !fields.P.trim()) {
      setError('Preencha todos os campos!');
      return;
    }
    setError(null);

    let assessmentText = fields.A;
    if (selectedCIDs.length > 0) {
      const cidList = selectedCIDs.map(cid => `${cid.code} - ${cid.description}`).join('\n');
      assessmentText = `${assessmentText}\n\nCID-10:\n${cidList}`;
    }

    const prompt = `S: ${fields.S}\nO: ${fields.O}\nA: ${assessmentText}\nP: ${fields.P}`;
    await onSend(prompt);
    setFields({ S: '', O: '', A: '', P: '' });
    setSelectedCIDs([]);

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
        {error && <div className="text-red-500 text-center">{error}</div>}
        {/* S */}
        <div className="flex items-center gap-2 mb-1 w-full">
          <div className="relative group flex-shrink-0">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#8B2E7E]">
              <span className="text-2xl font-bold text-white">S</span>
            </div>

            <div className=" absolute left-full top-1/2 -translate-y-1/2 ml-2 w-max max-w-xs px-3 py-2 rounded-lg bg-[#8B2E7E] text-white
            text-sm z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none">
              Queixa principal, HDA, sintomas relatados...
            </div>
          </div>
          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#8B2E7E]/20 w-full flex items-center justify-between">
            <span className="text-base font-semibold text-white">Subjetivo </span>

          </div>
        </div>
        <textarea
          className="w-full p-2 rounded-lg bg-[#615B6D] text-gray-100 resize-none"
          value={fields.S}
          onChange={(e) => handleChange('S', e.target.value)}
          onInput={handleTextareaInput}
          placeholder="Informações subjetivas..."
          rows={2}
        />
        {/* O */}
        <div className="flex items-center gap-2 mb-1 w-full">
          <div className="relative group flex-shrink-0">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#2D4993]">
              <span className="text-2xl font-bold text-white">O</span>
            </div>

            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-max max-w-xs px-3 py-2 rounded-lg bg-[#2D4993] text-white
            text-sm z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none">
              Sinais vitais, exame físico, exames complementares...
            </div>
          </div>

          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#2D4993]/20 w-full flex items-center justify-between">
            <span className="text-base font-semibold text-white">Objetivo</span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowExamModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: '#2D4993' }}
                title="Realizar exame físico"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setShowComplementaryExamModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: '#2D4993' }}
                title="Realizar exame Complementar"
              >
                <BsFileEarmarkMedical color='white' />
              </button>
            </div>
          </div>
        </div>

        <textarea
          className="w-full p-2 rounded-lg bg-[#615B6D] text-gray-100 resize-none"
          value={fields.O}
          onChange={(e) => handleChange('O', e.target.value)}
          onInput={handleTextareaInput}
          placeholder="Dados objetivos..."
          rows={2}
        />
        {/* A */}
        <div className="flex items-center gap-2 mb-1 w-full">
          <div className="relative group flex-shrink-0">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#918E27]">
              <span className="text-2xl font-bold text-white">A</span>
            </div>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-max max-w-xs px-3 py-2 rounded-lg bg-[#918E27] text-white
            text-sm z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none">
              Hipóteses diagnósticas e raciocínio clínico...
            </div>
          </div>

          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#918E27]/20 w-full flex items-center justify-between">
            <span className="text-base font-semibold text-white">Avaliação</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowCIDModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:scale-110 transition-transform bg-amber-500"
                title="Adicionar CID-10"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>

            </div>
          </div>
        </div>

        {/* CIDs Selecionados */}
        {selectedCIDs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedCIDs.map((cid) => (
              <div
                key={cid.code}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm"
              >
                <span className="font-bold text-amber-400">{cid.code}</span>
                <span className="max-w-[150px] truncate">{cid.description}</span>
                <button
                  type="button"
                  onClick={() => removeCID(cid.code)}
                  className="ml-1 w-4 h-4 rounded-full bg-amber-500/30 hover:bg-red-500/50 flex items-center justify-center transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          className="w-full p-2 rounded-lg bg-[#615B6D] text-gray-100 resize-none"
          value={fields.A}
          onChange={(e) => handleChange('A', e.target.value)}
          onInput={handleTextareaInput}
          placeholder="Avaliação clínica..."
          rows={2}
        />
        {/* P */}
        <div className="flex items-center gap-2 mb-1 w-full">
          <div className="relative group flex-shrink-0">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#2A8921]">
              <span className="text-2xl font-bold text-white">P</span>
            </div>

            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-max max-w-xs px-3 py-2 rounded-lg bg-[#2A8921] text-white
            text-smz-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none">
              Conduta, medicamentos, orientações e seguimento...
            </div>
          </div>

          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#2A8921]/20 w-full flex items-center justify-between">
            <span className="text-base font-semibold text-white">Plano</span>

            <div className="flex items-center gap-1">

              <button
                type="button"
                onClick={() => setShowMedicinesModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: '#3dcc30' }}
                title="Adicionar prescrição de medicamentos"
              >
                <GiMedicines color='white' />
              </button>

              <button
                type="button"
                onClick={() => setShowComplementaryExamModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: '#3dcc30' }}
                title="Realizar exame Complementar"
              >
                <BsFileEarmarkMedical color='white' />
              </button>

            </div>
          </div>
        </div>



        <textarea
          className="w-full p-2 rounded-lg bg-[#615B6D] text-gray-100 resize-none"
          value={fields.P}
          onChange={(e) => handleChange('P', e.target.value)}
          onInput={handleTextareaInput}
          placeholder="Plano terapêutico..."
          rows={2}
        />
        <button
          type="submit"
          className="bg-[#844AF5] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#6F3CBB] transition mt-4 w-1/3 mx-auto flex items-center justify-center mb-2"
          disabled={loading}
        >
          <span className="hidden sm:inline">{loading ? 'Enviando...' : 'Enviar'}</span>
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

      {showExamModal && (
        <ExamModal
          isOpen={showExamModal}
          onClose={() => setShowExamModal(false)}
          pathologyData={patologia ? SUGGESTIONS_DATA.pathologySpecific[patologia] : null}
          customExameFisico={customExameFisico}
          onFindingsSelected={handleExamConfirm}
          selectedItems={[]}
        />
      )}

      {showCIDModal && (
        <CID10Modal
          isOpen={showCIDModal}
          onClose={() => setShowCIDModal(false)}
          onSelect={handleCIDSelect}
          selectedItems={selectedCIDs}
        />
      )}

      {showComplementaryExamModal && (
        <ComplementaryExamModal
          isOpen={showComplementaryExamModal}
          onClose={() => setShowComplementaryExamModal(false)}
        />
      )}

      {showMedicinesModal && (
        <MedicinesModal
          isOpen={showMedicinesModal}
          onClose={() => setShowMedicinesModal(false)}
        />
      )}
    </div>
  );
};

export default SoapForm;