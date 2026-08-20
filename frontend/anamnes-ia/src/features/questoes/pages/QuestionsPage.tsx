import React, { useState, useEffect } from 'react';
import { fetchQuestions, answerQuestion } from '../services/questionsService';
import type { Question, QuestionAnswerResult } from '../types/question';
import { MainMenu } from '@/shared/components';
import './QuestionsPage.css';

const PAGE_SIZE = 50;

export const QuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionAnswerResult | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const page = await fetchQuestions(PAGE_SIZE, 0);
      setQuestions(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setFetchError(err instanceof Error ? err.message : 'Erro ao carregar questões');
    }
    setLoading(false);
  };

  const hasAnswered = result !== null;

  const handleOptionSelect = (key: string) => {
    if (!hasAnswered) setSelectedOption(key);
  };

  const handleAnswer = async () => {
    if (!selectedOption || answering) return;
    setAnswering(true);
    setAnswerError(null);
    try {
      setResult(await answerQuestion(questions[currentIndex].id, selectedOption));
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : 'Erro ao corrigir a resposta');
    }
    setAnswering(false);
  };

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setSelectedOption(null);
    setResult(null);
    setAnswerError(null);
  };

  const nextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      goTo(currentIndex + 1);
      return;
    }
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchQuestions(PAGE_SIZE, questions.length);
      setQuestions(prev => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
      if (page.length > 0) goTo(currentIndex + 1);
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : 'Erro ao carregar mais questões');
    }
    setLoadingMore(false);
  };

  const prevQuestion = () => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  };

  const currentQuestion = questions[currentIndex];
  const isCorrect = result?.correct ?? false;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="qp-loading">
          <div className="qp-spinner"></div>
          <p>Carregando banco de questões...</p>
        </div>
      );
    }

    if (fetchError) {
      return (
        <div className="qp-error">
          <p>⚠️ Não foi possível carregar as questões:</p>
          <p style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>{fetchError}</p>
          <button className="qp-btn-primary" style={{ marginTop: 16 }} onClick={loadQuestions}>
            Tentar novamente
          </button>
        </div>
      );
    }

    if (questions.length === 0) {
      return (
        <div className="qp-error">
          Nenhuma questão encontrada no banco de dados.
          <br />
          Acesse o painel Admin para cadastrar novas questões!
        </div>
      );
    }

    return (
      <div className="qp-container">
        <div className="qp-header">
          <span className="qp-badge">{currentQuestion.specialty}</span>
          <span className="qp-badge secondary">{currentQuestion.subspecialty}</span>
        </div>

        <div className="qp-progress">
          <div
            className="qp-progress-bar"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        <p className="qp-counter">Questão {currentIndex + 1} de {questions.length}</p>

        <div className="qp-card">
          <h2 className="qp-question-text">{currentQuestion.statement}</h2>

          {currentQuestion.image_url && (
            <div className="qp-image-container">
              <img src={currentQuestion.image_url} alt="Referência da questão" className="qp-image" />
            </div>
          )}

          <div className="qp-options">
            {Object.entries(currentQuestion.options).map(([key, text]) => {
              let optionClass = 'qp-option';
              if (hasAnswered && result) {
                if (key === result.correct_answer) optionClass += ' correct';
                else if (key === selectedOption && !isCorrect) optionClass += ' incorrect';
                else optionClass += ' disabled';
              } else if (selectedOption === key) {
                optionClass += ' selected';
              }
              return (
                <button
                  key={key}
                  className={optionClass}
                  onClick={() => handleOptionSelect(key)}
                  disabled={hasAnswered}
                >
                  <span className="qp-option-key">{key}</span>
                  <span className="qp-option-text">{text}</span>
                </button>
              );
            })}
          </div>

          {answerError && (
            <div className="qp-feedback error">
              <p>{answerError}</p>
            </div>
          )}

          {hasAnswered && result && (
            <div className={`qp-feedback ${isCorrect ? 'success' : 'error'}`}>
              {isCorrect ? (
                <p>✨ Parabéns! Você acertou!</p>
              ) : (
                <p>❌ Incorreto. A resposta certa era a letra: <strong>{result.correct_answer}</strong></p>
              )}
              {result.explanation && (
                <div className="qp-explanation">
                  <strong>Explicação:</strong>
                  <p>{result.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="qp-actions">
          <button
            className="qp-btn-secondary"
            onClick={prevQuestion}
            disabled={currentIndex === 0}
          >
            Anterior
          </button>
          {!hasAnswered ? (
            <button
              className="qp-btn-primary"
              onClick={handleAnswer}
              disabled={!selectedOption || answering}
            >
              {answering ? 'Corrigindo...' : 'Responder'}
            </button>
          ) : (
            <button
              className="qp-btn-primary"
              onClick={nextQuestion}
              disabled={(currentIndex === questions.length - 1 && !hasMore) || loadingMore}
            >
              {loadingMore ? 'Carregando...' : 'Próxima Questão'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="lg:grid lg:grid-cols-[80px_1fr] min-h-screen w-full bg-[#f7f6fa]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto z-30">
        <MainMenu />
      </aside>

      {/* Menu topo mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 w-full shadow-md">
        <MainMenu mobile />
      </header>

      {/* Espaçador grid desktop */}
      <div className="hidden lg:block w-20 bg-[#1a1730]" />

      {/* Conteúdo */}
      <main className="w-full relative">
        <div className="lg:hidden h-16 w-full" />
        {renderContent()}
      </main>
    </div>
  );
};

export default QuestionsPage;
