-- =============================================
-- Seed: Flashcard Decks e Cards
-- Executar no SQL Editor do Supabase
-- (idempotente: ON CONFLICT DO NOTHING)
-- =============================================

INSERT INTO flashcard_decks (id, name, description, specialty, teacher_id, class_id)
VALUES
  ('a1111111-1111-1111-1111-111111111001', 'Cardiologia',        'Fundamentos de cardiologia clínica',            'Cardiologia',  NULL, NULL),
  ('a1111111-1111-1111-1111-111111111002', 'Pneumologia',        'Doenças pulmonares e respiratórias',             'Pneumologia',  NULL, NULL),
  ('a1111111-1111-1111-1111-111111111003', 'Neurologia',         'Neurologia clínica e emergências neurológicas',  'Neurologia',   NULL, NULL),
  ('a1111111-1111-1111-1111-111111111004', 'Infectologia',       'Doenças infecciosas e antimicrobianos',          'Infectologia', NULL, NULL),
  ('a1111111-1111-1111-1111-111111111005', 'Meus erros no SOAP', 'Revisão de erros comuns na escrita do SOAP',     'Geral',        NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Cardiologia ───────────────────────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, front, back, hint, status)
VALUES
  ('b1111111-1111-1111-1111-111111111001', 'a1111111-1111-1111-1111-111111111001',
   'Qual o tratamento inicial da Insuficiência Cardíaca Congestiva?',
   'Diuréticos (Furosemida), IECA, Betabloqueadores e educação do paciente.',
   'Pense nas 3 classes principais', 'active'),

  ('b1111111-1111-1111-1111-111111111002', 'a1111111-1111-1111-1111-111111111001',
   'O que caracteriza a Fibrilação Atrial no ECG?',
   'Ausência de ondas P e ritmo RR irregular.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111003', 'a1111111-1111-1111-1111-111111111001',
   'Tríade clássica do infarto de Ventrículo Direito?',
   'Hipotensão + pulmões limpos (sem estertores) + turgência jugular patológica.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111004', 'a1111111-1111-1111-1111-111111111001',
   'Quais os 3 principais sintomas da Estenose Aórtica grave?',
   'Síncope, angina e dispneia (principalmente aos esforços).',
   'S-A-D', 'active')
ON CONFLICT (id) DO NOTHING;

-- ── Pneumologia ───────────────────────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, front, back, hint, status)
VALUES
  ('b1111111-1111-1111-1111-111111111011', 'a1111111-1111-1111-1111-111111111002',
   'Principal agente causador da Pneumonia Adquirida na Comunidade (PAC) típica?',
   'Streptococcus pneumoniae.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111012', 'a1111111-1111-1111-1111-111111111002',
   'Exame padrão-ouro para diagnóstico de TEP?',
   'Angiotomografia de tórax (Angio-TC pulmonar).',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111013', 'a1111111-1111-1111-1111-111111111002',
   'Sintomas clássicos da Asma brônquica?',
   'Sibilos, dispneia, opressão torácica e tosse (piora noturna/matinal).',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111014', 'a1111111-1111-1111-1111-111111111002',
   'Critério espirométrico para diagnóstico de DPOC?',
   'VEF1/CVF < 0,7 após broncodilatador.',
   'Pós-BD', 'active')
ON CONFLICT (id) DO NOTHING;

-- ── Neurologia ────────────────────────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, front, back, hint, status)
VALUES
  ('b1111111-1111-1111-1111-111111111021', 'a1111111-1111-1111-1111-111111111003',
   'Janela terapêutica para trombólise no AVC isquêmico?',
   'Até 4,5 horas do início dos sintomas.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111022', 'a1111111-1111-1111-1111-111111111003',
   'O que caracteriza a Síndrome de Guillain-Barré?',
   'Fraqueza flácida progressiva ascendente e arreflexia.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111023', 'a1111111-1111-1111-1111-111111111003',
   'Sinais motores clássicos da Doença de Parkinson?',
   'Bradicinesia, tremor de repouso, rigidez em roda denteada e instabilidade postural.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111024', 'a1111111-1111-1111-1111-111111111003',
   'Exame de imagem inicial na suspeita de TCE grave?',
   'TC de crânio sem contraste.',
   NULL, 'active')
ON CONFLICT (id) DO NOTHING;

-- ── Infectologia ─────────────────────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, front, back, hint, status)
VALUES
  ('b1111111-1111-1111-1111-111111111031', 'a1111111-1111-1111-1111-111111111004',
   'Tratamento de primeira linha para sífilis primária?',
   'Penicilina G benzatina 2,4 milhões UI IM dose única.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111032', 'a1111111-1111-1111-1111-111111111004',
   'Critérios de sepse (qSOFA)?',
   'Alteração do estado mental + FR ≥ 22 irpm + PAS ≤ 100 mmHg. ≥ 2 critérios = qSOFA positivo.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111033', 'a1111111-1111-1111-1111-111111111004',
   'Qual antibiótico é contraindicado em crianças < 8 anos e gestantes?',
   'Tetraciclina (e doxiciclina).',
   NULL, 'active')
ON CONFLICT (id) DO NOTHING;

-- ── Meus erros no SOAP ────────────────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, front, back, hint, status)
VALUES
  ('b1111111-1111-1111-1111-111111111041', 'a1111111-1111-1111-1111-111111111005',
   'Como descrever corretamente a hipótese diagnóstica no SOAP?',
   'Usar nomenclatura CID, indicar grau de certeza (provável/possível), e listar diagnósticos diferenciais.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111042', 'a1111111-1111-1111-1111-111111111005',
   'O que deve constar no "O" (Objetivo) do SOAP?',
   'Sinais vitais, exame físico dirigido, dados laboratoriais e exames de imagem relevantes.',
   NULL, 'active'),

  ('b1111111-1111-1111-1111-111111111043', 'a1111111-1111-1111-1111-111111111005',
   'Qual a diferença entre queixa principal e história da doença atual no SOAP?',
   'QP: sintoma em 1 frase (palavras do paciente). HDA: caracterização completa com OLDCART.',
   NULL, 'active')
ON CONFLICT (id) DO NOTHING;
