import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

type Flashcard = {
  question: string;
  answer: string;
};

type Deck = {
  id: string;
  name: string;
  cards: Flashcard[];
};

const DECKS: Deck[] = [
  {
    id: "cardio",
    name: "Cardiologia",
    cards: [
      { question: "Qual o tratamento inicial da Insuficiência Cardíaca Congestiva (ICC)?", answer: "Diuréticos (ex: Furosemida), IECA, Betabloqueadores e educação do paciente." },
      { question: "O que caracteriza a Fibrilação Atrial clássica no ECG?", answer: "Ausência de ondas P e ritmo RR irregular." },
      { question: "Qual a tríade clássica do infarto de Ventrículo Direito?", answer: "Hipotensão, pulmões limpos (sem estertores) e turgência jugular patológica." },
      { question: "Quais os três principais sintomas da Estenose Aórtica grave?", answer: "Síncope, angina e dispneia (principalmente aos esforços)." },
    ]
  },
  {
    id: "pneumo",
    name: "Pneumologia",
    cards: [
      { question: "Qual o principal agente etiológico causador da Pneumonia Adquirida na Comunidade (PAC) típica?", answer: "Streptococcus pneumoniae." },
      { question: "Qual é considerado o exame padrão-ouro (ou de escolha inicial) para diagnóstico de TEP?", answer: "Angiotomografia de tórax." },
      { question: "Quais os sintomas clássicos da Asma brônquica?", answer: "Sibilos, dispneia, opressão torácica e tosse (frequentemente piorando à noite ou de manhã cedo)." },
      { question: "Qual o critério espirométrico essencial para diagnóstico de DPOC?", answer: "Relação VEF1/CVF < 0,7 (ou limite inferior do normal) após o uso de broncodilatador." },
    ]
  },
  {
    id: "neuro",
    name: "Neurologia",
    cards: [
      { question: "Qual o tempo máximo (janela terapêutica) para trombólise no AVC isquêmico?", answer: "Até 4,5 horas do início dos sintomas." },
      { question: "O que caracteriza a Síndrome de Guillain-Barré clinicamente?", answer: "Fraqueza muscular flácida progressiva, geralmente ascendente e arreflexia." },
      { question: "Quais são os sinais motores clássicos da Doença de Parkinson?", answer: "Bradicinesia, tremor de repouso, rigidez (roda denteada) e instabilidade postural." },
      { question: "Qual o exame de imagem inicial recomendado na suspeita de TCE grave?", answer: "Tomografia computadorizada de crânio sem contraste." },
    ]
  }
];

const AnkiFlashcards: React.FC = () => {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const activeDeck = DECKS.find(d => d.id === selectedDeckId);

  const handleSelectDeck = (id: string) => {
    setSelectedDeckId(id);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const handleBackToDecks = () => {
    setSelectedDeckId(null);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const handleNextCard = () => {
    setShowAnswer(false);
    setCurrentCardIndex(prev => prev + 1);
  };

  const currentCard = activeDeck?.cards[currentCardIndex];
  const isFinished = activeDeck && currentCardIndex >= activeDeck.cards.length;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
          SISTEMA DE FLASHCARDS
        </h2>
      </div>

      {!selectedDeckId ? (
        /* Deck List View */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DECKS.map(deck => (
            <div 
              key={deck.id}
              onClick={() => handleSelectDeck(deck.id)}
              className="bg-white p-5 rounded-2xl shadow-[0_4px_18px_rgba(19,12,45,.07)] border border-[#f0eeff] transition-transform hover:-translate-y-1 cursor-pointer"
            >
              <h3 className="font-bold text-[16px] text-[#20202a]">{deck.name}</h3>
              <p className="text-[13px] text-[#9a9aab] mt-1">{deck.cards.length} cards</p>
            </div>
          ))}
        </div>
      ) : (
        /* Review Mode View */
        <div className="bg-white rounded-2xl shadow-[0_4px_18px_rgba(19,12,45,.07)] border border-[#f0eeff] p-6 sm:p-8 max-w-2xl mx-auto w-full mt-2 relative">
          
          <button 
            onClick={handleBackToDecks}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1 text-[#9a9aab] hover:text-[#7a55ff] text-[12px] font-semibold transition-colors"
          >
            <ChevronLeft size={14} /> Decks
          </button>

          {isFinished ? (
            <div className="py-10 flex flex-col items-center justify-center animate-[modalIn_.3s_ease]">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4">
                🎉
              </div>
              <h3 className="text-[20px] font-bold text-[#20202a] mb-2">Deck Concluído!</h3>
              <p className="text-[14px] text-[#9a9aab] text-center mb-8">
                Você revisou todos os cards de {activeDeck?.name}.
              </p>
              <button 
                onClick={handleBackToDecks}
                className="bg-[#f0edff] text-[#7a55ff] hover:bg-[#e6e2ff] transition-colors py-2.5 px-6 rounded-xl font-bold text-[13px]"
              >
                Voltar aos Decks
              </button>
            </div>
          ) : (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[11px] font-bold tracking-[.1em] text-[#9a9aab] uppercase">
                  {activeDeck?.name}
                </span>
                <span className="text-[12px] font-semibold text-[#7a55ff] bg-[#f0edff] px-3 py-1 rounded-full">
                  {currentCardIndex + 1} / {activeDeck?.cards?.length || 0}
                </span>
              </div>

              <p className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase mb-4 text-center">
                Pergunta
              </p>

              <h3 className="text-[20px] sm:text-[24px] font-bold text-center text-[#20202a] mb-8 leading-snug">
                {currentCard?.question}
              </h3>

              {!showAnswer ? (
                <div className="flex justify-center mb-6">
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="bg-gradient-to-r from-[#844AF5] to-[#6b35ff] hover:opacity-90 transition-all text-white px-6 py-2.5 rounded-xl text-[14px] font-bold shadow-[0_4px_14px_rgba(122,85,255,.25)]"
                  >
                    Mostrar Resposta
                  </button>
                </div>
              ) : (
                <div className="animate-[modalIn_.3s_ease]">
                  <div className="w-full bg-[#f9f8ff] rounded-xl p-5 mb-8 border border-[#ebe8f5]">
                    <p className="text-[11px] font-extrabold tracking-[.16em] text-[#20202a] uppercase mb-2 text-center opacity-70">
                      Resposta
                    </p>
                    <h4 className="text-[16px] font-medium text-center text-[#20202a]">
                      {currentCard?.answer}
                    </h4>
                  </div>

                  <p className="text-[12px] font-semibold text-center text-[#9a9aab] mb-3">
                    Como foi o seu desempenho?
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={handleNextCard}
                      className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 font-bold px-4 py-2.5 rounded-xl transition-colors text-[13px] shadow-sm"
                    >
                      Fácil
                    </button>
                    <button
                      onClick={handleNextCard}
                      className="bg-[#f0edff] text-[#7a55ff] border border-[#d6cffa] hover:bg-[#e6e2ff] font-bold px-4 py-2.5 rounded-xl transition-colors text-[13px] shadow-sm"
                    >
                      Médio
                    </button>
                    <button
                      onClick={handleNextCard}
                      className="bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 font-bold px-4 py-2.5 rounded-xl transition-colors text-[13px] shadow-sm"
                    >
                      Difícil
                    </button>
                  </div>

                  <div className="flex justify-center mt-4">
                    <button
                      onClick={handleNextCard}
                      className="text-rose-500 font-bold px-4 py-2 text-[11px] uppercase tracking-wider hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnkiFlashcards;