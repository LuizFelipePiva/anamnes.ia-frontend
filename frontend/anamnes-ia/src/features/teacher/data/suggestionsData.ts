export interface ExameFisicoSistema {
  item: string;
  achado: string;
  normal?: boolean;
}

export interface Suggestions {
  patologia?: string[];
  queixa_principal?: string[];
  sintomas?: string[];
  exames?: string[];
  especificidades?: string[];
  historico_familiar?: string[];
  habitos?: string[];
  persona_nome?: string[];
  persona_emocional?: string[];
  persona_contexto?: string[];
  exame_fisico?: Record<string, ExameFisicoSistema[]>;
  [key: string]: string[] | undefined | Record<string, ExameFisicoSistema[]>;
}

export const SUGGESTIONS_DATA: {
  pathologySpecific: Record<string, Suggestions>;
  categories: Record<string, Suggestions>;
} = {
  pathologySpecific: {
    // ── CARDIOLOGIA ──
    'Infarto Agudo do Miocárdio': {
      queixa_principal: ['Sinto uma dor no peito muito forte em aperto', 'Meu peito está apertado e a dor vai para o braço esquerdo', 'Estou com uma sensação de que vou morrer e um aperto no peito'],
      sintomas: ['Sudorese fria', 'Náusea e palidez', 'Falta de ar que piora ao deitar', 'Dor que não melhora com repouso', 'Tontura e mal-estar'],
      exames: ['ECG de 12 derivações urgente', 'Troponina I e CK-MB', 'Ecocardiograma transtorácico', 'BNP/NT-proBNP', 'Cineangiocoronariografia'],
      especificidades: ['Tabagista pesado', 'Hipertenso mal controlado', 'Diabético de longa data', 'IAM prévio há 5 anos', 'Angina de início recente (Crescendo)'],
      exame_fisico: {
        cardiovascular: [
          { item: 'PA', achado: '150/95 mmHg' },
          { item: 'FC', achado: '105 bpm, taquicárdica' },
          { item: 'Ritmo cardíaco', achado: 'Regular, sem sopros' },
          { item: 'Pulsos periféricos', achado: 'Presentes e simétricos, porém débeis' },
          { item: 'JVP', achado: 'Não elevada' },
        ],
        respiratorio: [
          { item: 'FR', achado: '22 irpm' },
          { item: 'SpO2', achado: '93% em ar ambiente' },
          { item: 'Ausculta pulmonar', achado: 'Estertores crepitantes em bases pulmonares bilateralmente' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Paciente ansioso, sudorético, em dor' },
          { item: 'Coloração cutânea', achado: 'Palidez cutânea e sudorese fria profusa' },
          { item: 'Consciência', achado: 'Lúcido e orientado' },
        ],
      },
    },
    'Insuficiência Cardíaca Congestiva': {
      queixa_principal: ['Falta de ar que piora ao deitar', 'Pernas muito inchadas', 'Cansaço extremo aos mínimos esforços'],
      sintomas: ['Ortopneia (acorda à noite sem ar)', 'Tosse seca noturna', 'Edema de membros inferiores', 'Ganho de peso rápido (retenção hídrica)', 'Distensão abdominal'],
      exames: ['Ecocardiograma com Doppler', 'BNP/NT-proBNP', 'Raio-X de tórax', 'Hemograma e função renal', 'ECG'],
      especificidades: ['IAM prévio', 'Doença de Chagas', 'Valvopatia reumática', 'Etilismo crônico', 'Classe funcional III (NYHA)', 'Fração de ejeção reduzida (ICFEr)'],
      exame_fisico: {
        cardiovascular: [
          { item: 'PA', achado: '140/90 mmHg' },
          { item: 'FC', achado: '98 bpm' },
          { item: 'Ritmo cardíaco', achado: 'Taquicárdico, B3 galope presente' },
          { item: 'Sopros', achado: 'Sopro sistólico em foco mitral' },
          { item: 'JVP', achado: 'Distendida, refluxo hepatojugular positivo' },
          { item: 'Edema de MMII', achado: 'Edema 3+/4+ até coxa, com cacifo' },
        ],
        respiratorio: [
          { item: 'FR', achado: '24 irpm' },
          { item: 'SpO2', achado: '91% em ar ambiente' },
          { item: 'Ausculta pulmonar', achado: 'Estertores crepitantes em 2/3 inferiores bilateralmente' },
        ],
        abdome: [
          { item: 'Inspeção', achado: 'Abdome distendido com ascite' },
          { item: 'Fígado', achado: 'Hepatomegalia dolorosa, borda lisa, 4 cm do rebordo' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Paciente dispneico, ortopneico, usando travesseiros extras' },
          { item: 'Coloração', achado: 'Cianose leve em extremidades' },
        ],
      },
    },
    'Fibrilação Atrial': {
      queixa_principal: ['Coração disparado e irregular', 'Palpitações frequentes', 'Tontura e sensação de desmaio'],
      sintomas: ['Palpitações irregulares', 'Cansaço fácil', 'Falta de ar aos esforços', 'Dor no peito leve'],
      exames: ['ECG', 'Holter 24h', 'Ecocardiograma', 'TSH (descartar hipertireoidismo)', 'Coagulograma'],
      especificidades: ['HAS de longa data', 'Uso de anticoagulantes', 'Valvopatia mitral', 'Pós-cirurgia cardíaca', 'Escore CHA2DS2-VASc elevado'],
      exame_fisico: {
        cardiovascular: [
          { item: 'Ritmo cardíaco', achado: 'Totalmente irregular (Arritmia completa)' },
          { item: 'Bulhas', achado: 'B1 com intensidade variável, ausência de B4' },
          { item: 'Déficit de pulso', achado: 'Diferença entre FC apical e pulso radial' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Paciente pode estar ansioso ou referir palpitações' },
        ],
        inspecao: [
          { item: 'Tórax - Ictus cordis', achado: 'Invisível e impalpável na maioria dos casos' },
        ],
      },
    },
    'Angina Estável': {
      queixa_principal: ['Dor no peito quando faço esforço', 'Aperto no peito que melhora ao repousar', 'Dor que aparece ao subir escadas'],
      sintomas: ['Dor no peito ao esforço', 'Alívio com repouso em 5-10 min', 'Irradiação para braço ou mandíbula'],
      exames: ['Teste ergométrico', 'Cintilografia miocárdica', 'ECG de repouso', 'Perfil lipídico', 'Ecocardiograma'],
      especificidades: ['Tabagista', 'Dislipidemia', 'Histórico familiar de DAC', 'Diabetes mellitus', 'Angina classe II (CCS)'],
      exame_fisico: {
        cardiovascular: [
          { item: 'Exame de repouso', achado: 'Frequentemente normal' },
          { item: 'Sopros', achado: 'Ausentes (geralmente)' },
          { item: 'PA', achado: '135/85 mmHg' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Bom estado geral, sem dor no momento' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Pode apresentar xantelasmas ou arco senil (hiperlipidemia)' },
        ],
      },
    },
    // ── NEUROLOGIA ──
    'AVC Isquêmico': {
      queixa_principal: ['Perdi a força do nada no meu braço direito', 'Minha boca ficou torta e não consigo falar direito', 'Minha visão ficou nublada de um lado só de repente'],
      sintomas: ['Dificuldade de equilíbrio', 'Dor de cabeça súbita e intensa', 'Confusão mental', 'Perda de sensibilidade em um lado do corpo'],
      exames: ['Tomografia de crânio sem contraste', 'Ressonância magnética (encéfalo)', 'Angiotomografia de carótidas', 'ECG (descartar FA)', 'Perfil lipídico e glicemia'],
      especificidades: ['Fibrilação atrial conhecida', 'Uso irregular de anticoagulantes', 'Janela de 3h desde o início', 'HAS não controlada', 'NIHSS inicial elevado'],
      exame_fisico: {
        neurologico: [
          { item: 'Escala de Glasgow', achado: '15 (A4 V5 M6)' },
          { item: 'Pares cranianos', achado: 'Paralisia facial central à direita, desvio de rima' },
          { item: 'Força muscular', achado: 'Hemiparesia proporcionada à direita, grau III (vence a gravidade, não vence resistência)' },
          { item: 'Sensibilidade', achado: 'Hemi-hipoestesia tátil e dolorosa à direita' },
          { item: 'Falla', achado: 'Afasia de expressão (Broca) ou disartria leve' },
        ],
        cardiovascular: [
          { item: 'Ritmo cardíaco', achado: 'Irregular (Fibrilação Atrial detectada ao pulso)' },
        ],
        inspecao: [
          { item: 'Cabeça', achado: 'Assimetria facial à direita e desvio ocular' },
        ],
        geral: [
          { item: 'Consciência', achado: 'Lúcido, mas frustrado pela dificuldade de fala' },
        ],
      },
    },
    'Meningite': {
      queixa_principal: ['Dor de cabeça fortíssima com febre alta', 'Pescoço travado e duro', 'Febre e confusão mental'],
      sintomas: ['Rigidez de nuca', 'Fotofobia (intolerância à luz)', 'Náuseas e vômitos', 'Petéquias pelo corpo', 'Convulsões'],
      exames: ['Punção lombar (análise do líquor)', 'Hemograma com leucograma', 'Hemocultura', 'Tomografia de crânio', 'PCR e procalcitonina'],
      especificidades: ['Não vacinado', 'Imunossuprimido', 'Contactante de caso confirmado', 'Início dos sintomas há 24h'],
      exame_fisico: {
        neurologico: [
          { item: 'Rigidez de nuca', achado: 'Presente (resistência severa à flexão passiva)' },
          { item: 'Sinal de Brudzinski', achado: 'Positivo (flexão dos joelhos ao flexionar o pescoço)' },
          { item: 'Sinal de Kernig', achado: 'Positivo (dor ao estender o joelho com a coxa flexionada)' },
          { item: 'Nível de consciência', achado: 'Sonolência, confusão mental ou irritabilidade importante' },
        ],
        geral: [
          { item: 'Febre', achado: '39.2°C' },
          { item: 'Pele', achado: 'Pode haver petéquias ou sufusões hemorrágicas (se meningococcemia)' },
        ],
        inspecao: [
          { item: 'Cabeça/Pescoço', achado: 'Posição de opistótono ou pescoço rígido' },
        ],
      },
    },
    'Epilepsia': {
      queixa_principal: ['Desmaiei e acordei confuso', 'Tive convulsão com tremores', 'Perco a consciência de repente'],
      sintomas: ['Crises convulsivas tônico-clônicas', 'Perda de consciência', 'Confusão pós-ictal', 'Mordedura de língua', 'Liberação esfincteriana'],
      exames: ['Eletroencefalograma (EEG)', 'Ressonância magnética de crânio', 'Dosagem sérica de anticonvulsivantes', 'Hemograma e eletrólitos'],
      especificidades: ['Uso de anticonvulsivantes', 'Trauma craniano prévio', 'Histórico de crises febris na infância', 'Início das crises na adolescência', 'Crises desencadeadas por privação de sono'],
      exame_fisico: {
        neurologico: [
          { item: 'Pós-ictal', achado: 'Confusão mental, desorientação, sonolência' },
          { item: 'Exame inter-crise', achado: 'Geralmente normal' },
        ],
        geral: [
          { item: 'Boca', achado: 'Pode haver lesão em borda lateral de língua (mordedura)' },
          { item: 'Estado geral', achado: 'Sonolento, recuperando a consciência devagar' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Instabilidade na marcha se o exame for feito logo após a crise' },
        ],
      },
    },
    // ── PNEUMOLOGIA ──
    'Pneumonia Comunitária': {
      queixa_principal: ['Estou tossindo muito, com catarro amarelado e febre', 'Sinto uma dor no peito quando respiro fundo', 'Estou me sentindo muito fraco e com febre'],
      sintomas: ['Calafrios intensos', 'Falta de ar aos esforços', 'Chiado no peito', 'Febre alta (>38.5°C)', 'Expectoração purulenta'],
      exames: ['Raio-X de tórax (PA e Perfil)', 'Hemograma completo', 'Proteína C Reactiva (PCR)', 'Gasometria arterial', 'Cultura de escarro'],
      especificidades: ['Paciente idoso e acamado', 'Histórico de DPOC', 'Vacinação incompleta', 'Imunossupressão', 'Escore CURB-65 = 2'],
      exame_fisico: {
        respiratorio: [
          { item: 'Frequência respiratória', achado: '26 irpm (taquipneia)' },
          { item: 'Ausculta pulmonar', achado: 'Estertores crepitantes finos localizados e aumento do frêmito toracovocal' },
          { item: 'Percussão', achado: 'Macicez ou submacicez na área afetada' },
        ],
        geral: [
          { item: 'Febre', achado: '38.8°C' },
          { item: 'Saturação', achado: '92% em ar ambiente' },
          { item: 'Estado geral', achado: 'Paciente prostrado, tossindo muito' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Expansibilidade diminuída no lado acometido' },
        ],
      },
    },
    'Asma': {
      queixa_principal: ['Chiado no peito e falta de ar', 'Crises de tosse à noite', 'Peito apertado ao fazer exercício'],
      sintomas: ['Sibilância (chiado)', 'Dispneia episódica', 'Tosse seca noturna', 'Opressão torácica', 'Piora com frio ou exercício'],
      exames: ['Espirometria com broncodilatador', 'Peak flow', 'Raio-X de tórax', 'IgE total', 'Teste alérgico (prick test)'],
      especificidades: ['Atópico (rinite/dermatite)', 'Exposição a alérgenos', 'Não usa bombinha corretamente', 'Fumante passivo', 'Início dos sintomas aos 5 anos', 'Crises frequentes no inverno'],
      exame_fisico: {
        respiratorio: [
          { item: 'Ausculta pulmonar', achado: 'Sibilos expiratórios disseminados e tempo expiratório prolongado' },
          { item: 'Frequência respiratória', achado: '24 irpm' },
        ],
        geral: [
          { item: 'Tiragem', achado: 'Pode haver uso de musculatura acessória (tiragem intercostal) em crises graves' },
          { item: 'Fala', achado: 'Pode estar entrecortada pela dispneia' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Pode haver hiperinsuflação (tórax em tonel se asma de longa data)' },
        ],
      },
    },
    'DPOC': {
      queixa_principal: ['Tosse com catarro todo dia há anos', 'Falta de ar que só piora', 'Não consigo mais caminhar sem parar'],
      sintomas: ['Dispneia progressiva', 'Tosse produtiva crônica', 'Cianose', 'Perda de peso', 'Uso de musculatura acessória'],
      exames: ['Espirometria', 'Raio-X de tórax', 'Gasometria arterial', 'Tomografia de tórax', 'Alfa-1 antitripsina'],
      especificidades: ['Tabagista há 30 anos', 'Exposição ocupacional a poeira', 'Exacerbações frequentes', 'Uso de O2 domiciliar', 'Carga tabágica de 50 maços/ano', 'Classificação GOLD D'],
      exame_fisico: {
        respiratorio: [
          { item: 'Ausculta pulmonar', achado: 'Murmúrio vesicular globalmente diminuído, roncos e sibilos esparsos' },
          { item: 'Percussão', achado: 'Hipersonoridade pulmonar global' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Tórax em tonel (aumento do diâmetro AP), uso de musculatura acessória' },
          { item: 'Lábios', achado: 'Respiração com lábios franzidos (pursed-lip breathing)' },
        ],
        geral: [
          { item: 'Coloração', achado: 'Cianose central leve ou pletora facial (policitemia)' },
          { item: 'Baqueteamento', achado: 'Pode estar presente (dedos em baqueta de tambor)' },
        ],
      },
    },
    'Tromboembolismo Pulmonar': {
      queixa_principal: ['Fiquei sem ar de repente e muito forte', 'Sinto uma dor no peito quando tento respirar', 'Desmaiei e agora estou com muita falta de ar'],
      sintomas: ['Dispneia súbita', 'Dor pleurítica', 'Taquicardia', 'Hemoptise (tossir sangue)', 'Edema unilateral de perna'],
      exames: ['Angiotomografia de tórax', 'D-dímero', 'ECG', 'Ecocardiograma', 'Doppler venoso de MMII'],
      especificidades: ['Imobilização prolongada', 'Pós-operatório recente', 'Uso de anticoncepcional', 'Trombofilia conhecida', 'Câncer ativo em tratamento'],
      exame_fisico: {
        respiratorio: [
          { item: 'Frequência respiratória', achado: '28 irpm (taquipneia súbita)' },
          { item: 'Ausculta pulmonar', achado: 'Frequentemente normal ou com mínimos estertores/sibilos' },
        ],
        cardiovascular: [
          { item: 'Frequência cardíaca', achado: '115 bpm (taquicardia)' },
          { item: 'Bulhas', achado: 'Hiperfonese de P2 (componente pulmonar da 2ª bulha)' },
        ],
        inspecao: [
          { item: 'Perna', achado: 'Pode haver sinais de TVP (edema unilateral, bota de bota, empastamento)' },
        ],
        geral: [
          { item: 'Saturação', achado: '89% em ar ambiente, com queda súbita' },
        ],
      },
    },
    // ── UROLOGIA / NEFROLOGIA ──
    'Infecção Urinária (ITU)': {
      queixa_principal: ['Sinto uma ardência muito forte quando vou urinar', 'Sinto vontade de urinar toda hora, mas sai só um pouquinho', 'Estou com muita dor bem no "pé da barriga"'],
      sintomas: ['Urina com cheiro forte ou sangue', 'Febre baixa e calafrios', 'Sensação de não esvaziar a bexiga', 'Urgência urinária'],
      exames: ['EAS (Sumário de urina)', 'Urocultura com antibiograma', 'Ultrassom de rins e vias urinárias', 'Hemograma'],
      especificidades: ['Histórico de ITUs de repetição', 'Uso recente de antibióticos', 'Gestante', 'Diabética', 'Menopausa sem reposição hormonal'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Dor à palpação profunda em região suprapúbica (hipogástrio)' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Bom estado geral, afebril (se for cistite não complicada)' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Sinais de desconforto ao urinar' },
        ],
      },
    },
    'Cálculo Renal': {
      queixa_principal: ['Sinto uma dor nas costas insuportável que vai e vem', 'Sinto uma dor que corre das costas para a virilha', 'Percebi que minha urina está saindo com sangue'],
      sintomas: ['Cólica renal intensa', 'Hematúria', 'Náuseas e vômitos', 'Disúria', 'Inquietação (não encontra posição)'],
      exames: ['Tomografia de abdome sem contraste', 'Ultrassom de rins', 'EAS', 'Creatinina e ureia', 'Dosagem de cálcio e ácido úrico'],
      especificidades: ['Baixa ingesta hídrica', 'Histórico familiar de litíase', 'Dieta rica em proteínas e sal', 'Cálculos recorrentes', 'Hiperuricemia conhecida'],
      exame_fisico: {
        abdome: [
          { item: 'Sinal de Giordano', achado: 'Punho-percussão lombar positiva bilateral ou unilateral (dor aguda)' },
          { item: 'Palpação', achado: 'Pode haver dor em flanco correspondente' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Paciente extremamente inquieto, não encontra posição de alívio' },
          { item: 'Sudorese', achado: 'Sudorese fria associada à dor intensa' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Vômitos decorrentes da intensidade da dor' },
        ],
      },
    },
    'Cálculo Ureteral': {
      queixa_principal: ['Uma dor insuportável que vai para a bexiga', 'Dor que começou nas costas e agora dói muito lá embaixo', 'Sinto que quero urinar mas não sai nada e dói muito'],
      sintomas: ['Cólica ureteral intensa', 'Dor irradiada para genitais/bexiga', 'Náuseas e vômitos', 'Hematúria', 'Urgência miccional'],
      exames: ['Tomografia de abdome sem contraste', 'Ultrassom de rins e vias urinárias', 'EAS', 'Creatinina e Ureia'],
      especificidades: ['Hidronefrose associada', 'Cálculo de 6mm em ureter distal', 'Baixa ingesta hídrica', 'Uso prévio de tiazídicos'],
      exame_fisico: {
        abdome: [
          { item: 'Sinal de Giordano', achado: 'Geralmente positivo no lado afetado (dor intensa)' },
          { item: 'Palpação', achado: 'Pode haver dor em trajetos ureterais (pontos renoureterais)' },
        ],
        geral: [
          { item: 'Inquietude', achado: 'Paciente em "cólica", não consegue ficar parado' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Sinais de dor intensa, náuseas e vômitos reflexos' },
        ],
      },
    },
    // ── GASTROENTEROLOGIA ──
    'Doença do Refluxo (DRGE)': {
      queixa_principal: ['Sinto uma queimação que sobe do estômago para a garganta', 'Sinto um gosto amargo na boca, principalmente quando deito', 'Estou com uma tosse seca que não passa e sinto azia'],
      sintomas: ['Pirose (queimação retroesternal)', 'Regurgitação ácida', 'Tosse seca crônica', 'Rouquidão matinal', 'Dor epigástrica'],
      exames: ['Endoscopia digestiva alta', 'pHmetria esofágica 24h', 'Manometria esofágica', 'Teste terapêutico com IBP'],
      especificidades: ['Obesidade', 'Tabagista', 'Hérnia hiatal', 'Uso crônico de anti-inflamatórios', 'Piora ao deitar após refeição', 'Sintomas crônicos há > 6 meses'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Pode haver dor leve em epigástrio à palpação profunda' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Bom estado geral' },
        ],
        inspecao: [
          { item: 'Dentes', achado: 'Pode haver erosão dentária por refluxo ácido crônico' },
        ],
      },
    },
    'Cirrose Hepática': {
      queixa_principal: ['Barriga muito inchada (ascite)', 'Olhos e pele amarelos (icterícia)', 'Muito cansado e confuso'],
      sintomas: ['Ascite', 'Icterícia', 'Edema de MMII', 'Encefalopatia hepática', 'Aranhas vasculares', 'Hematêmese (vômitos com sangue)'],
      exames: ['Ultrassom de abdome', 'Endoscopia digestiva alta', 'Hemograma e coagulograma', 'Albumina e bilirrubinas', 'TGO, TGP, GGT, FA'],
      especificidades: ['Etilismo crônico (1L destilado/dia)', 'Hepatite C não tratada', 'Hepatite B crônica', 'Esteatose hepática prévia', 'Histórico de varizes esofágicas'],
      exame_fisico: {
        abdome: [
          { item: 'Inspeção', achado: 'Abdome globoso, ascite presente, circulação colateral (cabeça de medusa)' },
          { item: 'Fígado', achado: 'Hepatomegalia nodular ou fígado atrófico (shrunken liver)' },
          { item: 'Baço', achado: 'Esplenomegalia' },
        ],
        geral: [
          { item: 'Pele', achado: 'Icterícia, aranhas vasculares (telangiectasias), eritema palmar' },
          { item: 'Consciência', achado: 'Pode haver flapping (asterixe) se encefalopatia' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Distensão abdominal por ascite' },
          { item: 'Pernas', achado: 'Edema de membros inferiores bilateral' },
        ],
      },
    },
    'Pancreatite Aguda': {
      queixa_principal: ['Dor abdominal forte em barra', 'Dor que melhora quando me inclino para frente', 'Dor forte depois de comer gordura'],
      sintomas: ['Dor em faixa no abdome superior', 'Náuseas e vômitos intensos', 'Distensão abdominal', 'Febre', 'Taquicardia'],
      exames: ['Amilase e lipase séricas', 'Tomografia de abdome com contraste', 'Ultrassom abdominal', 'Hemograma e PCR', 'Cálcio sérico'],
      especificidades: ['Colelitíase conhecida', 'Etilismo pesado recente', 'Hipertrigliceridemia (>1000 mg/dL)', 'Pós-CPRE recente', 'Episódio prévio de pancreatite'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Dor intensa em andar superior do abdome, defesa abdominal' },
          { item: 'Ruídos hidroaéreos', achado: 'Diminuídos (íleo paralítico reflexo)' },
        ],
        geral: [
          { item: 'Pele', achado: 'Pode haver sinais de Grey-Turner ou Cullen (equimoses) em casos graves' },
          { item: 'Vitais', achado: 'Taquicardia e febre baixa common' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Distensão abdominal e fácies de dor' },
        ],
      },
    },
    // ── ENDOCRINOLOGIA ──
    'Diabetes tipo 2': {
      queixa_principal: ['Estou sentindo muita sede e urinando demais', 'Minha visão está ficando embaçada e sinto muita fome', 'Sinto um formigamento nos meus pés e muito cansaço'],
      sintomas: ['Fome excessiva (polifagia)', 'Perda de peso inexplicada', 'Formigamento nas mãos e pés', 'Infecções recorrentes', 'Cansaço'],
      exames: ['Glicemia de jejum', 'Hemoglobina Glicada (HbA1c)', 'TOTG 75g', 'Perfil lipídico', 'Creatinina e microalbuminúria'],
      especificidades: ['Histórico familiar de DM2', 'Obesidade abdominal', 'Uso de corticoides crônico', 'SOP', 'Diagnosticado há 10 anos', 'HbA1c recente 8.5%'],
      exame_fisico: {
        geral: [
          { item: 'IMC', achado: '32 kg/m² (Obesidade grau I)' },
          { item: 'Pele', achado: 'Acantose nigricans em região cervical e axilar' },
        ],
        neurologico: [
          { item: 'Sensibilidade', achado: 'Sensibilidade vibratória diminuída em pés (monofilamento)' },
        ],
        inspecao: [
          { item: 'Pés', achado: 'Pode apresentar calosidades ou úlceras se neuropatia instalada' },
        ],
      },
    },
    'Dislipidemia': {
      queixa_principal: ['Vim mostrar meus exames de sangue, deu tudo alto', 'Sinto que meu sangue está "gordo", o colesterol deu muito alto', 'Tenho essas manchinhas amarelas perto dos olhos'],
      sintomas: ['Xantelasmas (manchas amarelas nas pálpebras)', 'Arco senil (anel branco na córnea)', 'Xantomas nos tendões', 'Frequentemente assintomática'],
      exames: ['Perfil lipídico completo (Colesterol total, LDL, HDL, TG)', 'Glicemia de jejum', 'TSH (descartar causa secundária)', 'Creatinina'],
      especificidades: ['Sedentarismo', 'Dieta rica em gordura saturada', 'Histórico familiar de IAM precoce', 'Obesidade abdominal', 'Tabagismo'],
      exame_fisico: {
        inspecao: [
          { item: 'Cabeça/Olhos', achado: 'Xantelasmas (placas amareladas nas pálpebras), arco senil' },
          { item: 'Braços/Tendões', achado: 'Xantomas tendinosos (nódulos em tendão de Aquiles ou extensores)' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Normal na maioria dos casos' },
        ],
      },
    },
    'Hipotireoidismo': {
      queixa_principal: ['Engordei sem motivo e estou muito cansada', 'Muita sonolência e preguiça', 'Cabelo caindo demais'],
      sintomas: ['Ganho de peso', 'Constipação intestinal', 'Intolerância ao frio', 'Pele seca', 'Edema facial', 'Bradicardia'],
      exames: ['TSH', 'T4 livre', 'Anti-TPO (anticorpos)', 'Perfil lipídico', 'Ultrassom de tireoide'],
      especificidades: ['Tireoidite de Hashimoto', 'Pós-tireoidectomia total', 'Uso de lítio', 'Gestante', 'Uso de Levotiroxina 100mcg', 'Cansaço progressivo há 1 ano'],
      exame_fisico: {
        geral: [
          { item: 'Pele', achado: 'Seca, fria e áspera' },
          { item: 'Cabelo', achado: 'Cabelos quebradiços, queda da cauda das sobrancelhas (madarose)' },
          { item: 'Vitais', achado: 'Bradicardia (FC 55 bpm)' },
        ],
        neurologico: [
          { item: 'Reflexos', achado: 'Hiporreflexia com fase de relaxamento prolongada' },
        ],
        inspecao: [
          { item: 'Cabeça/Face', achado: 'Mixedema (edema facial não depressível), macroglossia' },
        ],
      },
    },
    'Hipertireoidismo': {
      queixa_principal: ['Estou muito agitado e perdendo peso', 'Tremores nas mãos e coração acelerado', 'Olhos saltados e inchados'],
      sintomas: ['Perda de peso com apetite aumentado', 'Tremor fino', 'Taquicardia', 'Intolerância ao calor', 'Exoftalmia (olhos saltados)', 'Diarreia'],
      exames: ['TSH', 'T4 livre e T3', 'TRAb (anticorpo)', 'Ultrassom com Doppler de tireoide', 'Cintilografia de tireoide'],
      especificidades: ['Doença de Graves', 'Nódulo tireoidiano tóxico', 'Uso de amiodarona', 'Pós-parto recente', 'Início súbito de palpitações e perda de peso'],
      exame_fisico: {
        geral: [
          { item: 'Pele', achado: 'Quente e úmida, sudorese excessiva' },
          { item: 'Vitais', achado: 'Taquicardia (FC 110 bpm) e fibrilação atrial eventual' },
        ],
        neurologico: [
          { item: 'Tremor', achado: 'Tremor fino de extremidades em mãos estendidas' },
          { item: 'Reflexos', achado: 'Hiperreflexia' },
        ],
        inspecao: [
          { item: 'Cabeça/Olhos', achado: 'Exoftalmia (olhos saltados), retração palpebral' },
          { item: 'Pescoço', achado: 'Bócio difuso ou nodular, pode haver sopro à ausculta da tireoide' },
        ],
      },
    },
    // ── CLÍNICA GERAL ──
    'Hipertensão': {
      queixa_principal: ['Dor na nuca e peso na cabeça', 'Visão com "pontinhos brilhantes"', 'Zumbido no ouvido'],
      sintomas: ['Nervosismo e palpitação', 'Cansaço fácil', 'Cefaleia occipital', 'Muitas vezes é assintomático'],
      exames: ['MAPA 24h ou MRPA', 'Fundo de olho', 'Creatinina e Potássio', 'Perfil lipídico', 'ECG e Ecocardiograma'],
      especificidades: ['Ingestão alta de sal', 'Sedentarismo', 'Estresse ocupacional alto', 'Histórico familiar de HAS', 'Diagnosticado há 5 anos', 'Uso de Enalapril e Hidroclorotiazida'],
      exame_fisico: {
        cardiovascular: [
          { item: 'PA', achado: '165/100 mmHg (Aferida após repouso)' },
          { item: 'Bulhas', achado: 'Hiperfonese de B2 em foco aórtico' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Normal ou com cefaleia leve' },
        ],
        inspecao: [
          { item: 'Cabeça - Olhos', achado: 'Fundo de olho: Estreitamento arteriolar ou cruzamentos patológicos (se crônico)' },
        ],
      },
    },
    'Anemia': {
      queixa_principal: ['Muito cansaço e falta de ar aos esforços', 'Tontura ao levantar', 'Palidez e desânimo constante'],
      sintomas: ['Palidez nas mucosas', 'Unhas fracas e queda de cabelo', 'Taquicardia', 'Glossite (língua lisa e dolorosa)', 'Pica (vontade de comer gelo/terra)'],
      exames: ['Hemograma completo', 'Ferritina e Ferro sérico', 'Transferrina e TIBC', 'Reticulócitos', 'Vitamina B12 e ácido fólico'],
      especificidades: ['Dieta vegetariana estrita', 'Fluxo menstrual intenso (menorragia)', 'Cirurgia bariátrica prévia há 2 anos', 'Doença celíaca', 'Uso crônico de IBP', 'Pica (vontade de comer gelo)'],
      exame_fisico: {
        geral: [
          { item: 'Pele e mucosas', achado: 'Palidez cutaneomucosa (2+/4+)' },
          { item: 'Frequência cardíaca', achado: 'Pode haver taquicardia compensatória' },
        ],
        inspecao: [
          { item: 'Cabeça - Boca', achado: 'Queilite angular (rachadura no canto da boca), glossite (língua lisa)' },
          { item: 'Mãos - Unhas', achado: 'Coiloníquia (unha em colher - se ferropriva grave)' },
        ],
        cardiovascular: [
          { item: 'Sopros', achado: 'Sopro sistólico funcional (ejetivo)' },
        ],
      },
    },
    // ── INFECTOLOGIA ──
    'Dengue': {
      queixa_principal: ['Febre alta com dor no corpo todo', 'Dor atrás dos olhos', 'Muita fraqueza e erupção na pele'],
      sintomas: ['Febre alta (>39°C)', 'Mialgia intensa', 'Cefaleia retroorbitária', 'Rash cutâneo', 'Prova do laço positiva', 'Plaquetopenia'],
      exames: ['Hemograma (hematócrito e plaquetas)', 'NS1 antígeno', 'Sorologia IgM/IgG', 'TGO/TGP', 'Albumina sérica'],
      especificidades: ['Mora em área endêmica', 'Dengue prévia há 3 anos', 'Gestante no 2º trimestre', 'Uso de AAS prévio à febre', 'Surto de dengue na vizinhança'],
      exame_fisico: {
        geral: [
          { item: 'Vitais', achado: 'Febre 39°C, pulso rápido' },
          { item: 'Prova do laço', achado: 'Positiva (presença de petéquias após compressão)' },
        ],
        inspecao: [
          { item: 'Geral - Pele', achado: 'Exantema maculopapular (rash periférico), petéquias' },
          { item: 'Cabeça - Olhos', achado: 'Congestão conjuntival' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Hepatomegalia dolorosa (se denge com sinais de alarme)' },
        ],
      },
    },
    'Tuberculose': {
      queixa_principal: ['Tosse há mais de 3 semanas', 'Sudorese noturna e perda de peso', 'Tossindo sangue (hemoptise)'],
      sintomas: ['Tosse crônica produtiva', 'Febre vespertina', 'Sudorese noturna', 'Emagrecimento', 'Hemoptise'],
      exames: ['Baciloscopia de escarro (BAAR)', 'Teste rápido molecular (TRM-TB)', 'Raio-X de tórax', 'Cultura para micobactéria', 'PPD (Mantoux)'],
      especificidades: ['Contactante de TB domiciliar', 'HIV positivo (CD4 200)', 'Morador de rua', 'Presidiário', 'Imunossupressão', 'Tosse produtiva há 30 dias'],
      exame_fisico: {
        respiratorio: [
          { item: 'Ausculta pulmonar', achado: 'Estertores localizados (frequentemente em ápices pulmonares)' },
        ],
        geral: [
          { item: 'Estado nutricional', achado: 'Emagrecimento visível, hipocorado' },
          { item: 'Febre', achado: 'Febre vespertina common' },
        ],
        inspecao: [
          { item: 'Pescoço', achado: 'Pode haver linfadenopatia cervical (escrofulose)' },
        ],
      },
    },
    // ── REUMATOLOGIA ──
    'Artrite Reumatoide': {
      queixa_principal: ['Mãos inchadas e doendo, pior de manhã', 'Rigidez nas articulações ao acordar', 'Dor nas juntas que dura o dia todo'],
      sintomas: ['Rigidez matinal > 1 hora', 'Artrite simétrica de mãos e punhos', 'Nódulos reumatoides', 'Fadiga crônica', 'Deformidades articulares'],
      exames: ['Fator Reumatoide (FR)', 'Anti-CCP', 'VHS e PCR', 'Raio-X de mãos e punhos', 'Hemograma'],
      especificidades: ['Mulher jovem', 'Histórico familiar de AR', 'Tabagismo atual', 'Uso de metotrexato 15mg/semana', 'Rigidez matinal de 2 horas', 'Diagnosticada há 3 anos'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Inspeção de mãos', achado: 'Aumento de volume (sinovite) de MCF e IFP, poupando IFD. Desvio ulnar e deformidade em pescoço de cisne (se crônico)' },
          { item: 'Palpação', achado: 'Articulações "em esponja", dor à compressão lateral de MCFs' },
          { item: 'Amplitude', achado: 'Redução na força de preensão e limitação funcional' },
        ],
        inspecao: [
          { item: 'Mãos', achado: 'Edema e sinovite simétrica de pequenas articulações' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Paciente pode referir fadiga crônica associada' },
        ],
      },
    },
    'Lúpus Eritematoso Sistêmico': {
      queixa_principal: ['Manchas vermelhas no rosto em forma de borboleta', 'Dor nas juntas e muito cansaço', 'Febre baixa persistente'],
      sintomas: ['Rash malar (asa de borboleta)', 'Artralgia/artrite', 'Fotossensibilidade', 'Úlceras orais', 'Queda de cabelo difusa', 'Fadiga'],
      exames: ['FAN (fator antinuclear)', 'Anti-DNA dupla fita', 'Complemento (C3 e C4)', 'Hemograma', 'Urina tipo I e proteinúria 24h'],
      especificidades: ['Mulher em idade fértil', 'Nefrite lúpica classe IV', 'Uso de hidroxicloroquina', 'Fotossensível', 'Diagnosticada há 8 anos', 'Flares cutâneos frequentes'],
      exame_fisico: {
        inspecao: [
          { item: 'Cabeça - Face', achado: 'Eritema malar em asa de borboleta (poupando sulco nasolabial), alopecia' },
          { item: 'Mãos', achado: 'Artrite não erosiva (Artropatia de Jaccoud) ou lesões vasculíticas em polpas digitais' },
        ],
        musculoesqueletico: [
          { item: 'Articulações', achado: 'Poliartrite simétrica de pequenas e grandes articulações' },
        ],
        geral: [
          { item: 'Pele', achado: 'Lesões discoides, fotossensibilidade marcada' },
          { item: 'Mucosas', achado: 'Pode haver úlceras orais indolores em palato duro' },
        ],
      },
    },
    'Gota': {
      queixa_principal: ['Dedo do pé ficou muito inchado e vermelho do nada', 'Dor terrível no pé que não consigo pisar', 'Articulação quente e vermelha'],
      sintomas: ['Monoartrite aguda (1º pododáctilo)', 'Dor intensa de início súbito', 'Edema e eritema articular', 'Febre baixa', 'Tofos gotosos'],
      exames: ['Ácido úrico sérico', 'Líquido sinovial (cristais de urato)', 'Função renal', 'Hemograma e PCR', 'Raio-X articular'],
      especificidades: ['Dieta rica em purinas (carne/cerveja)', 'Uso de diuréticos tiazídicos', 'Insuficiência renal estágio 3', 'Obesidade', 'Crises recorrentes (2x ao ano)', 'Uso de alopurinol irregular'],
      exame_fisico: {
        musculoesqueletico: [
          { item: '1ª Pododáctilo', achado: 'Articulação do hálux (dedão do pé) extremamente vermelha, quente, edemaciada e dolorosa (podagra)' },
          { item: 'Tofos', achado: 'Pode haver depósitos de cristais (tofos) em orelhas ou articulações se gota tofácea crônica' },
        ],
        inspecao: [
          { item: 'Pé', achado: 'Sinais flogísticos intensos em articulação metatarsofalângica' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Pode apresentar febre baixa durante a crise' },
        ],
      },
    },
    // ── GINECOLOGIA ──
    'Endometriose': {
      queixa_principal: ['Cólica menstrual que não passa com remédio', 'Dor durante a relação sexual', 'Não consigo engravidar'],
      sintomas: ['Dismenorreia severa', 'Dispareunia (dor na relação)', 'Sangramento menstrual intenso', 'Dor pélvica crônica', 'Dificuldade para engravidar'],
      exames: ['Ultrassom transvaginal', 'Ressonância magnética de pelve', 'CA-125', 'Laparoscopia diagnóstica'],
      especificidades: ['Infertilidade há 2 anos', 'Uso de anticoncepcional contínuo', 'Histórico familiar (mãe e irmã)', 'Endometrioma ovariano à direita', 'Dismenorreia grave desde a menarca'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação pélvica', achado: 'Dor à palpação profunda de fossas ilíacas ou hipogástrio' },
        ],
        geral: [
          { item: 'Toque Vaginal', achado: 'Dor à mobilização do colo uterino e nodularidade em fundo de saco posterior' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Geralmente normal à inspeção estática' },
        ],
      },
    },
    // ── PSIQUIATRIA ──
    'Depressão Maior': {
      queixa_principal: ['Não tenho vontade de fazer nada', 'Não consigo dormir e choro sem motivo', 'Penso que seria melhor não existir'],
      sintomas: ['Humor deprimido persistente', 'Anedonia (perda de prazer)', 'Insônia ou hipersonia', 'Fadiga constante', 'Dificuldade de concentração', 'Ideação suicida'],
      exames: ['TSH (descartar hipotireoidismo)', 'Hemograma', 'Vitamina B12', 'Glicemia', 'Avaliação clínica (PHQ-9)'],
      especificidades: ['Luto recente (6 meses)', 'Histórico familiar de depressão', 'Uso de substâncias', 'Pós-parto recente', 'Episódio prévio há 2 anos', 'Tentativa de suicídio prévia'],
      exame_fisico: {
        geral: [
          { item: 'Aparência', achado: 'Descuidado com a higiene/aparência (se grave), hipomimia facial' },
          { item: 'Psicomotricidade', achado: 'Lentificação psicomotora ou agitação' },
        ],
        neurologico: [
          { item: 'Estado mental', achado: 'Humor deprimido, afeto hipomodulado, pensamento de conteúdo negativo' },
        ],
        inspecao: [
          { item: 'Cabeça - Face', achado: 'Olhar vago, fácies desanimada, choro fácil' },
        ],
      },
    },
    // ── ORTOPEDIA ──
    'Lombalgia': {
      queixa_principal: ['Dor na coluna que não passa', 'Travei a coluna ao pegar peso', 'Dor nas costas que desce para a perna'],
      sintomas: ['Dor lombar', 'Irradiação para MMII (ciática)', 'Rigidez', 'Parestesias em pé/perna', 'Limitação funcional'],
      exames: ['Raio-X de coluna lombar', 'Ressonância magnética', 'Hemograma e VHS (descartar infecção)', 'Eletroneuromiografia'],
      especificidades: ['Hérnia discal L5-S1', 'Espondilolistese', 'Trabalho braçal pesado (pedreiro)', 'Sedentarismo', 'Dor crônica há 3 meses', 'Uso de AINEs frequente'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Inspeção estática', achado: 'Desvio escoliótico antálgico, retificação da lordose lombar' },
          { item: 'Palpação', achado: 'Dor à palpação profunda da musculatura paravertebral lombar bilateral' },
          { item: 'Mobilidade', achado: 'Limitação importante para flexão do tronco e inclinação lateral' },
        ],
        neurologico: [
          { item: 'Manobra de Lasègue', achado: 'Positiva à direita a 45 graus' },
          { item: 'Reflexos', achado: 'Aquileu e patelar preservados e simétricos' },
          { item: 'Força muscular', achado: 'Grau V em todos os miótomos de MMII' },
          { item: 'Sensibilidade', achado: 'Parestesia em dermátomo de L5 à direita' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Paciente em bom estado geral, porém com fácies de dor ao se movimentar' },
        ],
      },
    },
    // ── PEDIATRIA ──
    'Bronquiolite': {
      queixa_principal: ['Meu bebê está piando e com falta de ar', 'Bebê gripado que piorou muito', 'Chiado no peito do bebê e não come'],
      sintomas: ['Sibilância', 'Taquipneia', 'Tiragem intercostal', 'Coriza', 'Febre baixa', 'Recusa alimentar'],
      exames: ['Oximetria de pulso', 'Raio-X de tórax', 'Pesquisa de VSR (vírus sincicial)', 'Hemograma'],
      especificidades: ['Prematuro (34 semanas)', 'Menor de 6 meses', 'Cardiopatia congênita', 'Época de inverno', 'Frequenta creche há 1 mês', 'Irmão mais velho com gripe'],
      exame_fisico: {
        respiratorio: [
          { item: 'Frequência respiratória', achado: '60 irpm (taquipneia franca)' },
          { item: 'Ausculta', achado: 'Sibilos expiratórios e inspiratórios, estertores finos' },
        ],
        geral: [
          { item: 'Sinais de esforço', achado: 'Tiragem subcostal, batimento de asa de nariz' },
          { item: 'Hidratação', achado: 'Mucosas secas (pela taquipneia)' },
          { item: 'Saturação', achado: '91% (necessidade de O2)' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Cargas aumentadas, uso de musculatura acessória' },
          { item: 'Cabeça - Nariz', achado: 'Obstrução nasal importante (coriza hialina)' },
        ],
      },
    },
    // ── MAIS GINECOLOGIA ──
    'Mioma Uterino': {
      queixa_principal: ['Sangramento menstrual muito intenso', 'Barriga crescendo e sinto peso no abdome', 'Cólicas fortes e anemia'],
      sintomas: ['Menorragia (fluxo menstrual excessivo)', 'Dor pélvica', 'Aumento do volume abdominal', 'Anemia ferropriva', 'Compressão vesical (urina frequente)'],
      exames: ['Ultrassom transvaginal', 'Hemograma (avaliar anemia)', 'Histeroscopia', 'Ressonância magnética de pelve'],
      especificidades: ['Mulher acima de 35 anos', 'Nuligesta', 'Histórico familiar de mioma', 'Uso de terapia hormonal'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Massa pélvica firme, lobulada, móvel, indolor' },
        ],
        geral: [
          { item: 'Mucosas', achado: 'Hipotireoidismo (pela anemia secundária ao sangramento)' },
          { item: 'Toque bimanual', achado: 'Útero aumentado de tamanho, irregular' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Pode haver abaulamento suprapúbico se mioma volumoso' },
        ],
      },
    },
    'Síndrome dos Ovários Policísticos (SOP)': {
      queixa_principal: ['Menstruação irregular e acne', 'Muitos pelos no rosto e não engravido', 'Engordei e menstruação sumiu'],
      sintomas: ['Oligomenorreia/amenorreia', 'Hirsutismo', 'Acne persistente', 'Ganho de peso', 'Queda de cabelo (alopecia androgênica)'],
      exames: ['Ultrassom transvaginal', 'Testosterona total e livre', 'LH e FSH', 'DHEA-S', 'Insulina e glicemia de jejum'],
      especificidades: ['Resistência insulínica', 'Obesidade', 'Infertilidade', 'Acantose nigricans'],
      exame_fisico: {
        geral: [
          { item: 'Pele', achado: 'Hirsutismo (Ferriman-Gallwey alto), acne vulgar' },
          { item: 'Resistência insulinica', achado: 'Acantose nigricans em dobras (pescoço/axilas)' },
          { item: 'Peso/Estatura', achado: 'Obesidade central (aumento da circunferência abdominal)' },
        ],
        inspecao: [
          { item: 'Cabeça - Face', achado: 'Alopécia androgênica nas têmporas, acne em mandíbula' },
        ],
      },
    },
    'Pré-eclâmpsia': {
      queixa_principal: ['Estou grávida e minha pressão subiu muito', 'Inchaço no rosto e nas mãos', 'Dor de cabeça forte e visão borrada'],
      sintomas: ['Hipertensão na gestação (>140x90)', 'Edema facial e de mãos', 'Cefaleia intensa', 'Escotomas visuais', 'Dor em barra no abdome', 'Proteinúria'],
      exames: ['Proteinúria 24h ou relação P/C', 'Hemograma com plaquetas', 'TGO/TGP', 'LDH', 'Creatinina', 'Ácido úrico'],
      especificidades: ['Primigesta', 'Gestação gemelar', 'HAS crônica prévia', 'Diabetes gestacional', 'Histórico familiar'],
      exame_fisico: {
        geral: [
          { item: 'Vitais', achado: 'PA 160x105 mmHg, aferida após repouso' },
          { item: 'Edema', achado: 'Edema de MMII (2+/4+), edema facial e de mãos' },
        ],
        neurologico: [
          { item: 'Reflexos', achado: 'Exaltação de reflexos osteotendinosos (hiperreflexia)' },
          { item: 'Escotomas', achado: 'Queixa de pontos brilhantes à visão' },
        ],
        inspecao: [
          { item: 'Pernas', achado: 'Edema importante em membros inferiores' },
        ],
      },
    },
    // ── MAIS PSIQUIATRIA ──
    'Transtorno de Ansiedade Generalizada': {
      queixa_principal: ['Vivo preocupado com tudo o tempo todo', 'Não consigo relaxar, estou sempre tenso', 'Meu coração dispara sem motivo'],
      sintomas: ['Preocupação excessiva e persistente', 'Tensão muscular', 'Inquietação', 'Dificuldade de concentração', 'Insônia', 'Irritabilidade'],
      exames: ['TSH', 'Hemograma', 'ECG (descartar arritmia)', 'Escala de ansiedade (GAD-7)'],
      especificidades: ['Estresse crônico no trabalho', 'Histórico familiar de ansiedade', 'Uso de cafeína em excesso', 'Trauma na infância', 'Sintomas persistentes há > 1 ano'],
      exame_fisico: {
        geral: [
          { item: 'Atitude', achado: 'Paciente vigilante, inquieto, roendo unhas' },
          { item: 'Vitais', achado: 'Pode haver taquicardia leve (FC 95 bpm) e sudorese' },
        ],
        neurologico: [
          { item: 'Avaliação', achado: 'Tensão muscular em região cervical e trapézio' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Inquietação motora (balançar pernas)' },
        ],
      },
    },
    'Síndrome do Pânico': {
      queixa_principal: ['Achei que estava tendo um infarto', 'Fiquei sem ar do nada e achei que ia morrer', 'Crises súbitas de medo intenso'],
      sintomas: ['Taquicardia súbita', 'Dispneia', 'Tremores', 'Sudorese', 'Sensação de morte iminente', 'Parestesias', 'Despersonalização'],
      exames: ['ECG (descartar causa cardíaca)', 'TSH', 'Hemograma', 'Glicemia'],
      especificidades: ['Agorafobia associada', 'Evita locais públicos e fechados', 'Histórico de trauma súbito', 'Uso de substâncias (maconha)', 'Crises recorrentes (3x por semana)'],
      exame_fisico: {
        geral: [
          { item: 'Durante a crise', achado: 'Taquicardia severa, sudorese, palidez, taquipneia' },
          { item: 'Fora da crise', achado: 'Exame físico pode ser totalmente normal' },
        ],
        cardiovascular: [
          { item: 'Ritmo', achado: 'Taquicardia sinusal em momentos de ansiedade aguda' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Tremores de extremidades' },
        ],
      },
    },
    'Esquizofrenia': {
      queixa_principal: ['Doutor, estou ouvindo vozes que ninguém mais ouve', 'Estão me perseguindo, eu sei que estão', 'Não consigo mais confiar em ninguém, estão todos contra mim'],
      sintomas: ['Alucinações auditivas', 'Delírios persecutórios', 'Discurso desorganizado', 'Embotamento afetivo', 'Isolamento social', 'Déficit de autocuidado'],
      exames: ['Hemograma', 'Função hepática e renal', 'Glicemia e perfil lipídico', 'Ressonância de crânio (descartar causa orgânica)', 'ECG'],
      especificidades: ['Início na juventude (19 anos)', 'Uso pesado de cannabis', 'Histórico familiar (tio com esquizofrenia)', 'Internação psiquiátrica prévia hé 6 meses', 'Má adesão ao tratamento'],
      exame_fisico: {
        geral: [
          { item: 'Higiene', achado: 'Déficit de autocuidado, veste roupas inadequadas' },
          { item: 'Atitude', achado: 'Solilóquios (fala sozinho), risadas imotivadas' },
        ],
        neurologico: [
          { item: 'Mental', achado: 'Delírios, alucinações, pensamento desorganizado, embotamento afetivo' },
        ],
        inspecao: [
          { item: 'Cabeça - Olhos', achado: 'Hipervigilância ou olhar perdido' },
        ],
      },
    },
    'Transtorno Bipolar': {
      queixa_principal: ['Fico muito eufórico e depois caio em depressão', 'Não dormi por dias e gastei todo meu dinheiro', 'Às vezes me sinto invencível, depois quero sumir do mundo'],
      sintomas: ['Episódios de mania (euforia, grandiosidade)', 'Redução da necessidade de sono', 'Fala acelerada', 'Impulsividade', 'Episódios depressivos alternados', 'Irritabilidade'],
      exames: ['TSH', 'Hemograma', 'Lítio sérico (se em uso)', 'Função renal e hepática', 'ECG'],
      especificidades: ['Histórico familiar de bipolaridade', 'Uso de antidepressivo sem estabilizador', 'Uso de substâncias', 'Tentativa de suicídio prévia'],
      exame_fisico: {
        geral: [
          { item: 'Fase de Mania', achado: 'Agitação, fala muito rápida (logorreia), veste cores extravagantes' },
          { item: 'Fase Depressiva', achado: 'Lentificação, prostração, tristeza profunda' },
        ],
        neurologico: [
          { item: 'Estado Mental', achado: 'Juízo crítico prejudicado em fases agudas' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Inquietação intensa ou imobilidade profunda' },
        ],
      },
    },
    // ── MAIS ORTOPEDIA ──
    'Fratura de Fêmur': {
      queixa_principal: ['Caí e não consigo levantar', 'Dor fortíssima no quadril depois da queda', 'Perna encurtada e virada para fora'],
      sintomas: ['Dor no quadril', 'Impotência funcional (não consegue andar)', 'Membro encurtado e em rotação externa', 'Edema local'],
      exames: ['Raio-X de quadril e fêmur', 'Tomografia (se fratura oculta)', 'Hemograma e coagulograma', 'Risco cirúrgico', 'Densitometria óssea'],
      especificidades: ['Idosa com osteoporose severa', 'Queda da própria altura no banheiro', 'Uso crônico de corticoides', 'Fratura prévia de punho', 'Mora sozinha'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Atitude', achado: 'Membro inferior direito encurtado e em rotação externa' },
          { item: 'Palpação', achado: 'Dor severa à palpação do trocanter maior e à mobilização passiva' },
        ],
        inspecao: [
          { item: 'Perna D', achado: 'Encurtamento visível e deformidade no quadril' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Paciente em dor intensa, taquicárdica reativa' },
        ],
      },
    },
    'Artrose (Osteoartrite)': {
      queixa_principal: ['Joelho dói e estala ao subir escada', 'Dor no quadril que piora ao caminhar', 'Mãos com nódulos e dor'],
      sintomas: ['Dor articular que piora com atividade', 'Rigidez matinal curta (<30 min)', 'Crepitação articular', 'Limitação de amplitude de movimento', 'Nódulos de Heberden/Bouchard'],
      exames: ['Raio-X da articulação afetada', 'Ressonância magnética', 'Hemograma e VHS (descartar AR)', 'Líquido sinovial (se derrame)'],
      especificidades: ['Idoso (72 anos)', 'Obesidade grau II', 'Ex-atleta de futebol', 'Trabalho de digitação por 30 anos', 'Crepitação importante em joelhos'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Joelho', achado: 'Aumento de volume ósseo, crepitação ao movimento ativo/passivo' },
          { item: 'Mãos', achado: 'Nódulos de Heberden (IFD) e Bouchard (IFP), espessamento articular' },
          { item: 'Marcha', achado: 'Marcha claudicante compensatória' },
        ],
        inspecao: [
          { item: 'Pernas - Joelhos', achado: 'Genu varo ou genu valgo (deformidade em arco)' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Bom estado geral, dor crônica estável' },
        ],
      },
    },
    // ── MAIS PEDIATRIA ──
    'Otite Média Aguda': {
      queixa_principal: ['Doutor, meu filho não para de puxar a orelha e chorar', 'Ele está com febre e diz que o ouvido dói muito', 'Saiu uma secreção do ouvido dele'],
      sintomas: ['Otalgia intensa', 'Febre', 'Irritabilidade', 'Otorreia (secreção)', 'Choro ao mamar', 'Recusa alimentar'],
      exames: ['Otoscopia', 'Hemograma', 'Timpanometria (se recorrente)', 'Cultura de secreção (se otorreia)'],
      especificidades: ['Lactente em creche', 'Uso prolongado de chupeta', 'Aleitamento com mamadeira deitado', '4º episódio este ano', 'Hipertrofia de adenoides'],
      exame_fisico: {
        inspecao: [
          { item: 'Cabeça - Orelha', achado: 'Membrana timpânica abaulada, hiperemiada, opaca, com perda do triângulo luminoso' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Febre 38.5°C' },
          { item: 'Comportamento', achado: 'Choro persistente, melhora quando em pé, piora deitado' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Geralmente normal (pode haver distensão se choro prolongado)' },
        ],
      },
    },
    'Doenças Exantemáticas (Sarampo)': {
      queixa_principal: ['Doutor, apareceram manchas vermelhas no corpo do meu filho', 'Ele está com febre alta, tosse e manchas pelo corpo', 'Meu filho está com os olhos vermelhos e cheio de manchas'],
      sintomas: ['Febre alta', 'Exantema maculopapular (craniocaudal)', 'Tosse', 'Coriza', 'Conjuntivite', 'Manchas de Koplik'],
      exames: ['Sorologia IgM para sarampo', 'Hemograma', 'PCR molecular', 'Notificação compulsória'],
      especificidades: ['Não vacinado por opção dos pais', 'Contactante de caso na escola', 'Viagem recente para área de surto', 'Imunossupressão (quimioterapia)', 'Início das manchas há 2 dias'],
      exame_fisico: {
        inspecao: [
          { item: 'Geral - Pele', achado: 'Exantema maculopapular morbiliforme disseminado' },
          { item: 'Cabeça - Olhos', achado: 'Conjuntivite com fotofobia' },
          { item: 'Cabeça - Boca', achado: 'Manchas de Koplik (pequenos pontos brancos) em mucosa jugal' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Febre alta (39.5°C)' },
          { item: 'Sintomas catatrais', achado: 'Coriza intensa, tosse seca' },
        ],
        respiratorio: [
          { item: 'Ausculta', achado: 'Pode haver roncos e transmissão de via aérea superior' },
        ],
      },
    },
    'Desidratação Infantil': {
      queixa_principal: ['Doutor, meu filho está com diarreia e vômito há 2 dias', 'Meu bebê não está fazendo xixi', 'Ele está molinho e nem chora com lágrimas mais'],
      sintomas: ['Boca e lábios secos', 'Olhos fundos', 'Sinal da prega positivo', 'Redução do débito urinário', 'Letargia', 'Fontanela deprimida'],
      exames: ['Hemograma', 'Eletrólitos (Na, K)', 'Gasometria', 'Função renal', 'EAS e coprocultura'],
      especificidades: ['Lactente', 'Gastroenterite viral', 'Rotavírus', 'Recusa de líquidos por via oral'],
      exame_fisico: {
        geral: [
          { item: 'Estado geral', achado: 'Lentificado, irritável ou letárgico (em casos graves)' },
          { item: 'Hidratação', achado: 'Mucosas secas, saliva filante, sinal da prega positivo, fontanela deprimida' },
          { item: 'Oligúria', achado: 'Fralda seca há > 6 horas' },
        ],
        inspecao: [
          { item: 'Cabeça - Olhos', achado: 'Olhos fundos (enoftalmia), ausência de lágrimas ao chorar' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Geralmente flácido, com aumento de ruídos hidroaéreos' },
        ],
      },
    },
    // ── DERMATOLOGIA ──
    'Psoríase': {
      queixa_principal: ['Placas vermelhas com escamas nos cotovelos e joelhos', 'Couro cabeludo descamando muito', 'Manchas que não somem e coçam'],
      sintomas: ['Placas eritematosas com escamas prateadas', 'Fenômeno de Koebner', 'Prurido', 'Acometimento de couro cabeludo', 'Alterações ungueais (pittings)'],
      exames: ['Biópsia de pele', 'Dermatoscopia', 'Hemograma e VHS', 'Ácido úrico', 'Raio-X articular (se artrite psoriásica)'],
      especificidades: ['Histórico familiar (pai com psoríase)', 'Estresse como gatilho principal', 'Artrite psoriásica em mãos', 'Tabagismo pesado', 'Resistente a hidratantes comuns'],
      exame_fisico: {
        inspecao: [
          { item: 'Geral - Pele', achado: 'Placas eritemato-escamosas com escamas prateadas bem delimitadas' },
          { item: 'Mãos - Unhas', achado: 'Pitting ungueal (pequenas depressões), onicólise' },
        ],
        geral: [
          { item: 'Sinais', achado: 'Sinal do Orvalho Sangrento (Auspitz) positivo ao remover escamas' },
        ],
        musculoesqueletico: [
          { item: 'Articulações', achado: 'Pode haver dactilite ("dedo em salsicha") se artrite associada' },
        ],
      },
    },
    'Dermatite Atópica': {
      queixa_principal: ['Doutor, meu filho tem um eczema que coça demais', 'A pele dele fica muito seca e vermelha nas dobras', 'A coceira dele piora muito à noite'],
      sintomas: ['Prurido intenso', 'Eczema em áreas flexurais', 'Pele seca (xerose)', 'Liquenificação (pele espessada)', 'Escoriações por coçar'],
      exames: ['IgE total', 'Teste alérgico (prick test)', 'Hemograma (eosinofilia)', 'Raspado cutâneo (descartar infecção)'],
      especificidades: ['Histórico de atopia (asma desde os 5 anos)', 'Lactente (8 meses)', 'Exposição a ácaros e mofo', 'Alergia à proteína do leite de vaca', 'Piora no outono'],
      exame_fisico: {
        inspecao: [
          { item: 'Geral - Pele', achado: 'Xerose (pele seca), pápulas eritematosas, vesículas e escoriações' },
          { item: 'Braços/Pernas', achado: 'Eczema em dobras flexurais (cubital, poplítea)' },
          { item: 'Cabeça - Face', achado: 'No lactente: acometimento de bochechas, poupando triângulo nasolabial' },
        ],
        geral: [
          { item: 'Pele', achado: 'Liquenificação em áreas de coceira crônica' },
        ],
      },
    },
    'Melanoma': {
      queixa_principal: ['Pinta que mudou de cor e cresceu', 'Tenho uma mancha escura irregular', 'Lesão que sangra e não cicatriza'],
      sintomas: ['Assimetria da lesão', 'Bordas irregulares', 'Cores variadas na mesma lesão', 'Diâmetro > 6mm', 'Evolução/mudança recente (critérios ABCDE)'],
      exames: ['Dermatoscopia', 'Biópsia excisional', 'Linfonodo sentinela', 'Tomografia (estadiamento)', 'LDH sérico'],
      especificidades: ['Pele clara', 'Exposição solar intensa', 'Histórico familiar de melanoma', 'Múltiplos nevos atípicos'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele - Lesão', achado: 'Mácula ou pápula hiperpigmentada com assimetria, bordas irregulares e policromia' },
        ],
        geral: [
          { item: 'Linfonodos', achado: 'Pesquisa de linfadenomegalia regional' },
        ],
      },
    },
    'HIV/AIDS': {
      queixa_principal: ['Febre que não passa e perdi muito peso', 'Apareceram ínguas no corpo todo', 'Manchas na boca e infecções frequentes'],
      sintomas: ['Febre prolongada', 'Emagrecimento', 'Linfadenopatia generalizada', 'Diarreia crônica', 'Candidíase oral persistente', 'Sudorese noturna'],
      exames: ['Teste rápido HIV', 'Western Blot/ELISA confirmatório', 'Carga viral (CV)', 'Contagem de CD4', 'Hemograma', 'Sorologias para coinfecções'],
      especificidades: ['Relação sexual desprotegida recente', 'Uso de drogas injetáveis', 'Parceiro HIV positivo', 'Diagnosticado há 5 anos', 'Carga viral indetectável', 'CD4 atual 450'],
      exame_fisico: {
        geral: [
          { item: 'Estado geral', achado: 'Emagrecimento importante, fácies de doença crônica' },
          { item: 'Pele', achado: 'Pode apresentar dermatite seborreica, molusco contagioso ou sarcoma de Kaposi' },
        ],
        inspecao: [
          { item: 'Cabeça - Boca', achado: 'Candidíase oral (placas brancas removíveis), leucoplasia pilosa oral' },
          { item: 'Pescoço', achado: 'Linfadenopatia cervical bilateral' },
          { item: 'Geral - Pele', achado: 'Exantema, lesões de sarcoma de Kaposi (nódulos violáceos)' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Hepatomegalia e/ou esplenomegalia' },
        ],
      },
    },
    'Sífilis': {
      queixa_principal: ['Apareceu uma ferida no genital que não dói', 'Manchas pelo corpo e queda de cabelo', 'Ferida genital indolor'],
      sintomas: ['Cancro duro (úlcera indolor)', 'Rash palmoplantar', 'Linfadenopatia', 'Alopecia em clareira', 'Condiloma plano'],
      exames: ['VDRL (triagem)', 'FTA-Abs (confirmatório)', 'Teste rápido', 'Punção lombar (se neurossífilis)', 'Hemograma'],
      especificidades: ['IST associada (Clamídia)', 'Gestante (20 semanas)', 'Múltiplos parceiros', 'Alergia a penicilina', 'Cancro genital indolor há 1 semana'],
      exame_fisico: {
        inspecao: [
          { item: 'Genitália', achado: 'Úlcera única, indolor, bordas endurecidas, fundo limpo (Cancro duro)' },
          { item: 'Geral - Pele', achado: 'Se secundária: exantema palmoplantar (roséola sifilítica)' },
        ],
        geral: [
          { item: 'Linfonodos', achado: 'Linfadenopatia inguinal indolor, consistência firme' },
        ],
      },
    },
    'Hepatite B': {
      queixa_principal: ['Olhos e pele amarelos com cansaço', 'Dor do lado direito da barriga e urina escura', 'Muito cansado e sem apetite'],
      sintomas: ['Icterícia', 'Colúria (urina escura)', 'Acolia fecal', 'Fadiga', 'Hepatomegalia', 'Dor em hipocôndrio direito'],
      exames: ['HBsAg', 'Anti-HBs', 'Anti-HBc IgM e IgG', 'HBeAg', 'Carga viral HBV-DNA', 'TGO/TGP', 'Ultrassom hepático'],
      especificidades: ['Não vacinado', 'Profissional de saúde', 'Parceiro com hepatite B', 'Uso de drogas injetáveis'],
      exame_fisico: {
        geral: [
          { item: 'Mucosas', achado: 'Escleras ictéricas (amarelas)' },
          { item: 'Estado geral', achado: 'Astenia, adinamia' },
        ],
        abdome: [
          { item: 'Fígado', achado: 'Hepatomegalia dolorosa, borda lisa' },
        ],
        inspecao: [
          { item: 'Cabeça - Olhos', achado: 'Icterícia visível sob luz natural' },
        ],
      },
    },
    // ── MAIS ENDOCRINOLOGIA ──
    'Síndrome de Cushing': {
      queixa_principal: ['Engordei muito no rosto e na barriga', 'Estrias roxas apareceram na barriga', 'Rosto arredondado e muita fraqueza muscular'],
      sintomas: ['Face em lua cheia', 'Obesidade central', 'Estrias violáceas largas', 'Giba (corcova de búfalo)', 'Fraqueza muscular proximal', 'Hirsutismo'],
      exames: ['Cortisol livre urinário 24h', 'Teste de supressão com dexametasona', 'ACTH sérico', 'Cortisol salivar noturno', 'Ressonância de hipófise/TC de adrenais'],
      especificidades: ['Uso crônico de dexametasona (6 meses)', 'Adenoma hipofisário', 'Tumor adrenal à esquerda', 'HAS e DM2 de difícil controle', 'Ganho de peso de 15kg em 1 ano'],
      exame_fisico: {
        inspecao: [
          { item: 'Cabeça - Face', achado: 'Fácies em lua cheia, pletora malar, hirsutismo' },
          { item: 'Tórax/Costas', achado: 'Giba (acúmulo de gordura em região cervical/dorsal)' },
          { item: 'Abdômen', achado: 'Gordura central e estrias violáceas largas (> 1cm)' },
        ],
        geral: [
          { item: 'Pele', achado: 'Atrofia cutânea, equimoses fáceis, má cicatrização' },
          { item: 'Pressão', achado: 'Hipertensão arterial comum' },
        ],
        musculoesqueletico: [
          { item: 'Membros', achado: 'Membros delgados por atrofia muscular proximal' },
        ],
      },
    },
    'Obesidade': {
      queixa_principal: ['Não consigo emagrecer de jeito nenhum', 'Engordei muito e tenho dor nos joelhos', 'Ronco muito e tenho apneia do sono'],
      sintomas: ['IMC ≥ 30', 'Dor articular', 'Dispneia aos esforços', 'Apneia do sono', 'Acantose nigricans', 'Estrias'],
      exames: ['Glicemia e HbA1c', 'Perfil lipídico', 'TSH', 'Insulina e HOMA-IR', 'TGO/TGP', 'Ácido úrico'],
      especificidades: ['Sedentarismo total', 'Compulsão alimentar noturna', 'Hipotireoidismo não tratado', 'Uso de Olanzapina', 'Tativa de dietas prévias sem sucesso', 'IMC 38'],
      exame_fisico: {
        geral: [
          { item: 'IMC', achado: '38.2 kg/m² (Obesidade Grau II)' },
          { item: 'Circunferência Abdominal', achado: '112 cm (Risco aumentado)' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Avental gorduroso, estrias nacradas' },
          { item: 'Pescoço', achado: 'Pescoço curto, pode haver acantose nigricans' },
        ],
        respiratorio: [
          { item: 'Ausculta', achado: 'Transmissão diminuída pelo tecido adiposo' },
        ],
      },
    },
    // ── CIRURGIA GERAL ──
    'Apendicite Aguda': {
      queixa_principal: ['Dor na barriga que começou no umbigo e desceu', 'Dor forte do lado direito da barriga', 'Febre, enjoo e não consigo comer'],
      sintomas: ['Dor em fossa ilíaca direita', 'Sinal de Blumberg positivo', 'Náuseas e vômitos', 'Febre baixa', 'Anorexia', 'Defesa abdominal'],
      exames: ['Hemograma com leucocitose', 'PCR', 'Ultrassom de abdome', 'Tomografia de abdome', 'EAS (descartar ITU)'],
      especificidades: ['Jovem (18 anos)', 'Migração da dor (umbigo para FID)', 'Início dos sintomas há 12 horas', 'Gestante no 1º trimestre', 'Anorexia total'],
      exame_fisico: {
        abdome: [
          { item: 'Ponto de McBurney', achado: 'Dor intensa à palpação profunda em FID' },
          { item: 'Sinal de Blumberg', achado: 'Positivo (descompressão dolorosa na FID)' },
          { item: 'Sinal de Rovsing', achado: 'Positivo (dor na FID ao comprimir a FIE)' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Febre baixa (37.8°C), taquicardia leve' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Pode haver timpanismo ou defesa involuntária' },
        ],
      },
    },
    'Colelitíase / Colecistite': {
      queixa_principal: ['Dor muito forte depois de comer gordura', 'Dor no lado direito que vai até as costas', 'Enjoo e vômito após refeição pesada'],
      sintomas: ['Cólica biliar', 'Dor em hipocôndrio direito', 'Sinal de Murphy positivo', 'Náuseas e vômitos', 'Febre (se colecistite)', 'Icterícia (se obstrução)'],
      exames: ['Ultrassom de abdome', 'Hemograma', 'Bilirrubinas', 'TGO/TGP/GGT/FA', 'Amilase e lipase', 'Colangioressonância'],
      especificidades: ['Mulher, multípara, 45 anos, obesa', 'Uso de anticoncepcional oral', 'Perda de peso rápida (bariátrica)', 'Histórico familiar de colecistectomia'],
      exame_fisico: {
        abdome: [
          { item: 'Sinal de Murphy', achado: 'Positivo (interrupção brusca da inspiração ao palpar o rebordo costal D)' },
          { item: 'Palpação', achado: 'Dor em hipocôndrio direito e epigástrio' },
        ],
        geral: [
          { item: 'Escleras', achado: 'Pode haver icterícia leve se obstrução associada' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Respiração superficial para evitar dor abdominal' },
        ],
      },
    },
    'Hérnia Inguinal': {
      queixa_principal: ['Apareceu um caroço na virilha', 'Inchaço na virilha que piora ao fazer esforço', 'Dor na virilha ao tossir ou carregar peso'],
      sintomas: ['Abaulamento inguinal', 'Dor ao esforço físico', 'Irredutibilidade (se encarcerada)', 'Náusea e vômitos (se estrangulada)'],
      exames: ['Exame físico (manobra de Valsalva)', 'Ultrassom de parede abdominal', 'Tomografia (casos complexos)'],
      especificidades: ['Trabalho com levantamento de peso', 'Constipação crônica (esforço)', 'Tosse crônica (tabagista)', 'Aparecimento súbito após esforço', 'Hérnia redutível'],
      exame_fisico: {
        inspecao: [
          { item: 'Região Inguinal', achado: 'Abaulamento em canal inguinal que aumenta à manobra de Valsalva' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Massa redutível (se não encarcerada), impulsão palpável ao tossir' },
        ],
        geral: [
          { item: 'Geral', achado: 'Bom estado geral (se for hérnia redutível)' },
        ],
      },
    },
    // ── MAIS CARDIOLOGIA ──
    'Pericardite Aguda': {
      queixa_principal: ['Dor no peito que piora ao deitar e melhora sentado', 'Dor que piora ao respirar fundo', 'Febre com dor no peito'],
      sintomas: ['Dor torácica pleurítica', 'Melhora ao inclinar para frente', 'Febre', 'Atrito pericárdico', 'Dispneia'],
      exames: ['ECG (supradesnível difuso de ST)', 'Ecocardiograma', 'Troponina', 'PCR e VHS', 'Raio-X de tórax'],
      especificidades: ['Pós-infecção viral recente (gripe)', 'Lúpus (LES)', 'Pós-IAM (Síndrome de Dressler)', 'Uremia (IRC estágio 5)', 'Dor que melhora ao sentar'],
      exame_fisico: {
        cardiovascular: [
          { item: 'Ausculta', achado: 'Atrito pericárdico audível (som de couro rangendo)' },
        ],
        geral: [
          { item: 'Atitude', achado: 'Posição mahometana (inclinação para frente) para alívio da dor' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Pode haver taquipneia por dor ao respirar' },
        ],
      },
    },
    'Endocardite Infecciosa': {
      queixa_principal: ['Febre que não passa há semanas', 'Febre com sopro cardíaco novo', 'Muita fraqueza e suor noturno'],
      sintomas: ['Febre prolongada', 'Sopro cardíaco novo ou alterado', 'Petéquias', 'Nódulos de Osler', 'Manchas de Janeway', 'Esplenomegalia'],
      exames: ['Hemoculturas seriadas (3 amostras)', 'Ecocardiograma transesofágico', 'Hemograma', 'PCR e VHS', 'EAS (hematúria)'],
      especificidades: ['Usuário de drogas injetáveis', 'Prótese valvar mitral há 2 anos', 'Procedimento dentário sem profilaxia', 'Cardiopatia reumática prévia', 'Febre há 15 dias'],
      exame_fisico: {
        cardiovascular: [
          { item: 'Sopro', achado: 'Sopro regurgitativo novo ou mudança de padrão em sopro prévio' },
        ],
        geral: [
          { item: 'Febre', achado: 'Febre persistente sem foco pulmonar/urinário' },
          { item: 'Fenômenos periféricos', achado: 'Petéquias subconjuntivais, manchas de Janeway (palmas/plantas)' },
        ],
        inspecao: [
          { item: 'Mãos/Braços', achado: 'Hemorragias em estilhas (unhas), nódulos de Osler (dolorosos)' },
          { item: 'Olhos', achado: 'Manchas de Roth (fundo de olho)' },
        ],
      },
    },
    'Estenose Aórtica': {
      queixa_principal: ['Desmaio ao fazer esforço', 'Falta de ar que vem piorando', 'Dor no peito ao subir ladeira'],
      sintomas: ['Síncope ao esforço', 'Dispneia progressiva', 'Angina de esforço', 'Sopro sistólico ejetivo'],
      exames: ['Ecocardiograma com Doppler', 'ECG', 'Raio-X de tórax', 'Cateterismo cardíaco', 'BNP'],
      especificidades: ['Idoso (degenerativa)', 'Válvula bicúspide congênita', 'Febre reumática prévia'],
      exame_fisico: {
        cardiovascular: [
          { item: 'Sopro', achado: 'Sopro sistólico ejetivo em foco aórtico, rugoso, em diamante, irradiação para carótidas' },
          { item: 'Bulhas', achado: 'Desdobramento paradoxal de B2' },
          { item: 'Pulso', achado: 'Pulsus parvus et tardus (pulso de pequena amplitude e subida lenta)' },
        ],
        inspecao: [
          { item: 'Ictus cordis', achado: 'Desviado para a esquerda e para baixo (se hipertrofia)' },
        ],
        geral: [
          { item: 'Sinais', achado: 'Hipotensão em fases avançadas ou síncope' },
        ],
      },
    },
    // ── MAIS NEUROLOGIA ──
    'AVC Hemorrágico': {
      queixa_principal: ['Dor de cabeça a pior da minha vida', 'Vômito em jato e perda de consciência', 'Desmaiou com dor fortíssima na cabeça'],
      sintomas: ['Cefaleia súbita e intensa', 'Vômitos em jato', 'Rebaixamento de consciência', 'Rigidez de nuca', 'Déficit neurológico focal'],
      exames: ['Tomografia de crânio sem contraste (urgente)', 'Angiotomografia cerebral', 'Punção lombar (se TC normal)', 'Coagulograma', 'Hemograma'],
      especificidades: ['HAS descontrolada', 'Uso de anticoagulantes', 'MAV (malformação arteriovenosa)', 'Aneurisma cerebral'],
      exame_fisico: {
        neurologico: [
          { item: 'Glasgow', achado: '12 (A3 V4 M5) - Rápido rebaixamento da consciência' },
          { item: 'Rigidez de nuca', achado: 'Presente (se hemorragia subaracnóidea)' },
          { item: 'Reflexos', achado: 'Pode haver vômitos precoces em jato' },
        ],
        geral: [
          { item: 'Vitais', achado: 'PA severamente elevada (200x120 mmHg)' },
          { item: 'Respiração', achado: 'Ritmo irregular (Cheyne-Stokes) em herniações' },
        ],
        inspecao: [
          { item: 'Cabeça - Olhos', achado: 'Midríase unilateral ou desvio ocular fixo' },
        ],
      },
    },
    'Esclerose Múltipla': {
      queixa_principal: ['Visão ficou borrada de um olho só', 'Formigamento nas pernas que vai e volta', 'Perdi força nas pernas sem motivo'],
      sintomas: ['Neurite óptica', 'Parestesias', 'Fraqueza em membros', 'Fadiga intensa', 'Sinal de Lhermitte', 'Ataxia'],
      exames: ['Ressonância de crânio e medula', 'Líquor (bandas oligoclonais)', 'Potenciais evocados visuais', 'Hemograma e VHS'],
      especificidades: ['Mulher jovem (20-40 anos)', 'Surtos e remissões', 'Uso de interferon', 'Déficit vitamina D'],
      exame_fisico: {
        neurologico: [
          { item: 'Visão', achado: 'Escotoma central, dor à movimentação ocular (neurite óptica)' },
          { item: 'Sensibilidade', achado: 'Sinal de Lhermitte (sensação de choque pela coluna à flexão do pescoço)' },
          { item: 'Força', achado: 'Paraparesia ou fraqueza focal' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Déficit de equilíbrio ou ataxia de marcha em surtos agudos' },
        ],
      },
    },
    'Doença de Parkinson': {
      queixa_principal: ['Minha mão treme quando estou parado', 'Estou ficando lento e travado', 'Minha letra está ficando muito pequena'],
      sintomas: ['Tremor de repouso', 'Bradicinesia', 'Rigidez em roda dentada', 'Instabilidade postural', 'Micrografia', 'Face em máscara'],
      exames: ['Avaliação clínica (diagnóstico clínico)', 'Ressonância de encéfalo (descartar)', 'DAT-scan (SPECT)', 'Teste terapêutico com Levodopa'],
      especificidades: ['Idoso (>60 anos)', 'Exposição a pesticidas', 'Histórico familiar', 'Depressão associada'],
      exame_fisico: {
        neurologico: [
          { item: 'Tremor', achado: 'Tremor de repouso (contar moedas), desaparece ao movimento' },
          { item: 'Rigidez', achado: 'Rigidez plástica em "roda dentada" à mobilização passiva' },
          { item: 'Marcha', achado: 'Passos curtos, arrastados, sem balanço dos braços (festinação)' },
        ],
        inspecao: [
          { item: 'Cabeça - Face', achado: 'Hipomimia (face em máscara), redução da frequência de piscar' },
          { item: 'Tronco', achado: 'Atitude em flexão anterior do corpo (camptocormia)' },
        ],
        geral: [
          { item: 'Fala', achado: 'Voz baixa, monótona (hipofonia)' },
        ],
      },
    },
    'Enxaqueca': {
      queixa_principal: ['Dor de cabeça latejante de um lado só', 'Dor que vem com enjoo e não suporto luz', 'Crises de dor de cabeça que duram horas'],
      sintomas: ['Cefaleia unilateral pulsátil', 'Fotofobia', 'Fonofobia', 'Náuseas e vômitos', 'Aura visual (luzes/zigzag)', 'Piora com atividade física'],
      exames: ['Diagnóstico clínico (critérios ICHD)', 'Tomografia de crânio (descartar causas secundárias)', 'Ressonância (se atípica)', 'Hemograma'],
      especificidades: ['Mulher em idade fértil', 'Uso excessivo de analgésicos', 'Ciclo menstrual como gatilho', 'Histórico familiar'],
      exame_fisico: {
        geral: [
          { item: 'Crise', achado: 'Paciente prefere ambiente escuro e silencioso' },
        ],
        neurologico: [
          { item: 'Focalidade', achado: 'Exame inter-crise totalmente normal' },
        ],
        inspecao: [
          { item: 'Cabeça/Face', achado: 'Facies de dor, pode haver lacrimejamento reativo' },
        ],
      },
    },
    'Doença de Alzheimer': {
      queixa_principal: ['Está esquecendo tudo, até o nome dos netos', 'Se perde dentro de casa', 'Repete as mesmas perguntas várias vezes'],
      sintomas: ['Perda de memória recente progressiva', 'Desorientação temporal e espacial', 'Dificuldade com tarefas habituais', 'Alterações de linguagem', 'Alterações comportamentais'],
      exames: ['Mini Exame do Estado Mental (MEEM)', 'Ressonância de encéfalo (atrofia hipocampal)', 'TSH e B12 (descartar causas reversíveis)', 'VDRL e HIV'],
      especificidades: ['Idoso (>65 anos)', 'Histórico familiar', 'Baixa escolaridade', 'Depressão prévia', 'Início dos lapsos há 2 anos', 'Piora progressiva'],
      exame_fisico: {
        neurologico: [
          { item: 'Orientação', achado: 'Desorientação têmporo-espacial franca' },
          { item: 'Memória', achado: 'Incapacidade de reter informações recentes (evocação)' },
          { item: 'Funções executivas', achado: 'Dificuldade no desenho do relógio ou abstração' },
        ],
        geral: [
          { item: 'Aparência', achado: 'Pode estar descuidado com o vestuário conforme a gravidade' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Atitude de hesitação ou perplexidade perante perguntas' },
        ],
      },
    },
    // ── MAIS NEFROLOGIA ──
    'Glomerulonefrite': {
      queixa_principal: ['Urina cor de coca-cola', 'Inchaço no rosto ao acordar', 'Pressão alta de repente e urina escura'],
      sintomas: ['Hematúria macroscópica', 'Edema facial (periorbitário)', 'Hipertensão', 'Oligúria', 'Proteinúria'],
      exames: ['EAS (hemácias dismórficas)', 'Proteinúria 24h', 'Complemento C3/C4', 'ASLO', 'Creatinina e ureia', 'Biópsia renal'],
      especificidades: ['Pós-faringoamigdalite estreptocócica', 'Lúpus', 'Hepatite B/C', 'Criança'],
      exame_fisico: {
        geral: [
          { item: 'Edema', achado: 'Edema periorbitário e de face ao acordar' },
          { item: 'Pressão', achado: 'Hipertensão arterial sistêmica súbita' },
        ],
        inspecao: [
          { item: 'Cabeça/Face', achado: 'Edema bipalpebral' },
          { item: 'Urina', achado: 'Hematúria macroscópica se presente' },
        ],
        cardiovascular: [
          { item: 'Congestão', achado: 'Pode haver sinais de sobrecarga volêmica' },
        ],
      },
    },
    'Insuficiência Renal Crônica': {
      queixa_principal: ['Inchaço no corpo todo e cansaço', 'Não estou urinando quase nada', 'Enjoo constante e coceira pelo corpo'],
      sintomas: ['Edema generalizado', 'Oligúria/anúria', 'Náuseas e vômitos', 'Prurido urêmico', 'Hálito urêmico', 'Anemia', 'HAS'],
      exames: ['Creatinina e ureia', 'TFG estimada', 'EAS e proteinúria', 'Ultrassom renal', 'Eletrólitos (K, Ca, P)', 'PTH'],
      especificidades: ['Diabético', 'Hipertenso', 'Em diálise', 'Candidato a transplante'],
      exame_fisico: {
        geral: [
          { item: 'Pele', achado: 'Pálida (anemia), amarelada (urocromos), xerose, marcas de coçadura' },
          { item: 'Edema', achado: 'Edema generalizado (anasarca em casos graves)' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Fístula arteriovenosa em braço (se em hemodiálise), hálito urêmico' },
          { item: 'Cabeça', achado: 'Palidez de mucosas' },
        ],
        cardiovascular: [
          { item: 'Sopros', achado: 'Sopro de ejeção sistólica funcional (anemia)' },
          { item: 'Ritmo', achado: 'Frequentemente hipertenso' },
        ],
      },
    },
    'Pielonefrite': {
      queixa_principal: ['Febre alta com dor nas costas', 'Ardência para urinar e calafrios', 'Dor lombar de um lado e febre'],
      sintomas: ['Febre alta (>38.5°C)', 'Dor lombar unilateral', 'Sinal de Giordano positivo', 'Disúria', 'Calafrios', 'Náuseas'],
      exames: ['EAS', 'Urocultura com antibiograma', 'Hemograma e PCR', 'Hemocultura', 'Ultrassom renal', 'Creatinina'],
      especificidades: ['ITU prévia não tratada', 'Gestante', 'Diabético', 'Obstrução urinária (cálculo)'],
      exame_fisico: {
        abdome: [
          { item: 'Sinal de Giordano', achado: 'Positivo unilateral (dor aguda à percussão lombar)' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Febre alta (38.5 - 39°C), calafrios, taquicardia' },
          { item: 'Estado geral', achado: 'Paciente prostrado, toxêmico' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Pode haver desidratação associada e vômitos' },
        ],
      },
    },
    // ── MAIS GASTRO ──
    'Úlcera Péptica': {
      queixa_principal: ['Queimação no estômago que piora em jejum', 'Dor que melhora quando como', 'Acordei de madrugada com dor no estômago'],
      sintomas: ['Dor epigástrica em queimação', 'Clocking (piora em jejum, melhora com alimentação)', 'Náuseas', 'Saciedade precoce', 'Melena (se sangramento)'],
      exames: ['Endoscopia digestiva alta com biópsia', 'Pesquisa de H. pylori', 'Hemograma (anemia)', 'Teste da urease'],
      especificidades: ['Uso crônico de AINEs', 'Infecção por H. pylori', 'Tabagista', 'Estresse intenso'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Dor à palpação profunda em epigástrio e mesogástrio' },
        ],
        geral: [
          { item: 'Mucosas', achado: 'Palidez cutaneomucosa (se sangramento crônico)' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Geralmente normal (pode haver distensão leve)' },
        ],
      },
    },
    'Doença de Crohn': {
      queixa_principal: ['Diarreia que não para há meses', 'Dor abdominal com perda de peso', 'Feridas ao redor do ânus que não cicatrizam'],
      sintomas: ['Diarreia crônica (pode ser sanguinolenta)', 'Dor abdominal tipo cólica', 'Perda de peso', 'Fístulas perianais', 'Febre baixa', 'Massa palpável em FID'],
      exames: ['Colonoscopia com biópsia', 'PCR e VHS', 'Calprotectina fecal', 'TC de abdome (fístulas/abscessos)', 'Hemograma (anemia)'],
      especificidades: ['Jovem (15-30 anos)', 'Tabagista', 'Manifestações extraintestinais (artrite, uveíte)', 'Uso de imunossupressores', 'Diagnosticado há 5 anos', 'Cirurgia prévia (enterectomia)'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Massa palpável em fossa ilíaca direita (plastrão), dor à palpação profunda' },
        ],
        geral: [
          { item: 'Estado nutricional', achado: 'Emagrecimento, desnutrição proteico-calórica (se grave)' },
          { item: 'Pele', achado: 'Pode haver eritema nodoso (nódulos dolorosos em pernas)' },
        ],
        inspecao: [
          { item: 'Região Anal', achado: 'Fístulas, fissuras ou plicomas anais ("tags")' },
        ],
      },
    },
    'Retocolite Ulcerativa': {
      queixa_principal: ['Diarreia com sangue e muco', 'Cólicas abdominais com urgência para evacuar', 'Evacuei mais de 10 vezes hoje com sangue'],
      sintomas: ['Diarreia sanguinolenta mucosa', 'Tenesmo (vontade constante)', 'Cólicas abdominais', 'Urgência fecal', 'Febre (em crises graves)'],
      exames: ['Colonoscopia com biópsia', 'Hemograma', 'PCR e VHS', 'Calprotectina fecal', 'Albumina sérica'],
      especificidades: ['Jovem adulto', 'Risco de megacólon tóxico', 'Risco de câncer colorretal', 'Uso de mesalazina'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Dor difusa à palpação de trajetos colônicos, sem massas palpáveis' },
        ],
        geral: [
          { item: 'Mucosas', achado: 'Palidez (anemia por sangramento crônico)' },
          { item: 'Toque Retal', achado: 'Sangue e muco em luva, reto sensível/doloroso' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Pode haver sinais de desidratação em crises graves' },
        ],
      },
    },
    // ── MAIS PSIQUIATRIA ──
    'TOC': {
      queixa_principal: ['Preciso lavar as mãos o tempo todo, não consigo parar', 'Tenho pensamentos horríveis que não saem da cabeça', 'Confiro a porta e o fogão dezenas de vezes'],
      sintomas: ['Obsessões (pensamentos intrusivos recorrentes)', 'Compulsões (rituais repetitivos)', 'Lavagem excessiva de mãos', 'Verificação repetida (portas, gás)', 'Necessidade de simetria e ordem', 'Angústia intensa ao tentar resistir'],
      exames: ['Escala Y-BOCS', 'TSH', 'Hemograma', 'Avaliação clínica psiquiátrica'],
      especificidades: ['Início na adolescência', 'Histórico familiar de TOC', 'Depressão comórbida', 'Tiques associados (Tourette)', 'Sintomas crônicos > 1 ano', 'Gatilhos por estresse ou incerteza'],
      exame_fisico: {
        geral: [
          { item: 'Higiene', achado: 'Pode apresentar mãos com dermatite de contato/ressecamento (lavagem excessiva)' },
          { item: 'Comportamento', achado: 'Ansiedade visível, rituais de verificação durante a consulta' },
        ],
        inspecao: [
          { item: 'Mãos', achado: 'Pele íntegra mas com sinais de lavagem compulsiva' },
        ],
      },
    },
    'TEPT': {
      queixa_principal: ['Revivo o acidente nos meus sonhos toda noite', 'Não consigo voltar ao local do trauma', 'Qualquer barulho alto me faz tremer e chorar'],
      sintomas: ['Flashbacks (revivências do trauma)', 'Pesadelos recorrentes', 'Hipervigilância', 'Evitação de estímulos associados ao trauma', 'Insônia', 'Irritabilidade e explosões de raiva', 'Embotamento emocional'],
      exames: ['Avaliação clínica (critérios DSM-5)', 'Escala PCL-5', 'TSH', 'Hemograma'],
      especificidades: ['Vítima de assalto à mão armada', 'Acidente automobilístico grave', 'Abuso na infância relatado', 'Ex-militar em combate', 'Sintomas há 6 meses', 'Evitação de gatilhos'],
      exame_fisico: {
        geral: [
          { item: 'Estado de Alerta', achado: 'Hipervigilância, sobressalto fácil a ruídos' },
          { item: 'Vitais', achado: 'Taquicardia ou sudorese ao falar sobre o evento' },
        ],
        inspecao: [
          { item: 'Face', achado: 'Expressão de tensão, choro fácil ao relato' },
        ],
      },
    },
    // ── MAIS REUMATOLOGIA ──
    'Fibromialgia': {
      queixa_principal: ['Dor no corpo inteiro que nunca passa', 'Durmo e acordo mais cansada do que quando deitei', 'Doendo em tudo, nenhum exame dá nada'],
      sintomas: ['Dor difusa crônica (>3 meses)', 'Fadiga intensa', 'Sono não reparador', 'Dificuldade de concentração (fibro fog)', 'Pontos dolorosos à palpação', 'Cefaleia tensional'],
      exames: ['Hemograma', 'VHS e PCR (normais)', 'TSH', 'Vitamina D', 'FAN e FR (normais, para exclusão)'],
      especificidades: ['Mulher (42 anos)', 'Depressão e TAG associados', 'Síndrome do intestino irritável', 'Sono não reparador há 1 ano', 'Múltiplos pontos dolorosos'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Tender Points', achado: 'Dor à palpação digital (aprox. 4kgf) em 11 ou mais dos 18 pontos anatômicos' },
          { item: 'Articulações', achado: 'Ausência de sinovite ou sinais inflamatórios objetivos' },
        ],
        geral: [
          { item: 'Sensibilidade', achado: 'Hiperalgesia e alodinia generalizada' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Aparência de fadiga crônica, sem anormalidades visíveis estruturais' },
        ],
      },
    },
    'Espondilite Anquilosante': {
      queixa_principal: ['Dor nas costas que piora de madrugada', 'Rigidez na coluna que melhora ao se movimentar', 'Minhas costas estão ficando cada vez mais duras'],
      sintomas: ['Lombalgia inflamatória (piora com repouso)', 'Rigidez matinal >30 min', 'Entesite (dor na inserção dos tendões)', 'Uveíte anterior', 'Limitação da expansão torácica'],
      exames: ['HLA-B27', 'Raio-X de sacroilíacas', 'Ressonância de sacroilíacas', 'VHS e PCR', 'Hemograma'],
      especificidades: ['Homem jovem (28 anos)', 'Histórico familiar (pai com EA)', 'HLA-B27 positivo', 'Psoríase cutânea associada', 'Melhora importante com exercício'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Coluna Verterbal', achado: 'Teste de Schober positivo (redução da mobilidade lombar)' },
          { item: 'Tórax', achado: 'Expansibilidade torácica reduzida (< 2.5 cm)' },
          { item: 'Sacroilíacas', achado: 'Manobra de Patrick-Fabere positiva (dor em articulação sacroilíaca)' },
        ],
        inspecao: [
          { item: 'Atitude', achado: 'Postura "do esquiador" (perda da lordose lombar e cifose dorsal)' },
        ],
      },
    },
    // ── MAIS DERMATOLOGIA ──
    'Acne Vulgar': {
      queixa_principal: ['Rosto cheio de espinhas que não melhoram', 'Espinhas dolorosas e inflamadas', 'Cravos e espinhas nas costas também'],
      sintomas: ['Comedões (cravos abertos e fechados)', 'Pápulas e pústulas', 'Nódulos e cistos (acne grave)', 'Cicatrizes'],
      exames: ['Diagnóstico clínico', 'Dosagens hormonais (se SOP)', 'Hepatograma (se isotretinoína)', 'Beta-hCG (se isotretinoína em mulher)'],
      especificidades: ['Adolescente (15 anos)', 'Síndrome dos Ovários Policísticos (SOP)', 'Uso de anabolizantes', 'Resistente a tratamento tópico prévio', 'Piora no período pré-menstrual', 'Histórico familiar de acne grave', 'Uso de cosméticos oleosos'],
      exame_fisico: {
        inspecao: [
          { item: 'Face', achado: 'Comedões, pápulas eritematosas, pústulas e eventuais cistos em bochechas e testa' },
          { item: 'Costas/Tórax', achado: 'Pode haver lesões inflamatórias em região dorsal' },
        ],
        geral: [
          { item: 'Pele', achado: 'Pele oleosa, presença de cicatrizes atróficas ou hipertróficas' },
        ],
      },
    },
    'Herpes Zóster': {
      queixa_principal: ['Bolhas dolorosas que seguem uma faixa no corpo', 'Dor ardente em um lado do tronco', 'Queimação intensa antes de aparecer as bolhas'],
      sintomas: ['Vesículas agrupadas em dermátomo', 'Dor neuropática intensa', 'Parestesias', 'Febre leve', 'Neuralgia pós-herpética (dor persistente)'],
      exames: ['Diagnóstico clínico', 'PCR para VZV (casos atípicos)', 'Teste de Tzanck', 'Hemograma'],
      especificidades: ['Idoso (75 anos)', 'Imunossuprimido (pós-transplante)', 'HIV positivo', 'Não vacinado para herpes zóster', 'Dor neuropática intensa pré-exantema', 'Neuralgia pós-herpética prévia'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele', achado: 'Vesículas e crostas agrupadas sobre base eritematosa, seguindo um dermátomo (unilateral)' },
        ],
        geral: [
          { item: 'Sensibilidade', achado: 'Dores intensas, queimação, alodinia na área afetada' },
          { item: 'Linfonodos', achado: 'Pode haver linfadenopatia regional' },
        ],
      },
    },
    'Escabiose': {
      queixa_principal: ['Coceira insuportável que piora à noite', 'Bolinhas vermelhas entre os dedos', 'Toda família está coçando'],
      sintomas: ['Prurido intenso noturno', 'Lesões papulovesiculares', 'Sulcos (túneis do ácaro)', 'Acometimento de espaços interdigitais, punhos, axilas'],
      exames: ['Diagnóstico clínico', 'Raspado cutâneo com microscopia', 'Dermatoscopia (sinal do delta-jet)'],
      especificidades: ['Mora em casa de repouso', 'Filho em creche com surto', 'Toda a família com prurido', 'Imunossuprimido (Escabiose crostosa)', 'Uso de permetrina prévio sem sucesso'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele', achado: 'Pápulas eritematosas, crostas e sulcos lineares (túneis) em espaços interdigitais, punhos, axilas e genitais' },
        ],
        geral: [
          { item: 'Pele', achado: 'Escoriações por coçadura, infecção secundária (impetiginização) frequente' },
        ],
      },
    },
    // ── MAIS ORTOPEDIA ──
    'Hérnia de Disco': {
      queixa_principal: ['Dor nas costas que desce pela perna', 'Travei a coluna e a perna formiga', 'Dor ciática insuportável'],
      sintomas: ['Lombociatalgia', 'Irradiação para dermátomo (L4/L5/S1)', 'Sinal de Lasègue positivo', 'Parestesias', 'Fraqueza muscular no pé'],
      exames: ['Ressonância magnética de coluna lombar', 'Raio-X de coluna', 'Eletroneuromiografia', 'Hemograma e VHS'],
      especificidades: ['Esforço físico intenso (carregamento de peso)', 'Sedentarismo', 'Obesidade grao I', 'Idade 30-50 anos', 'Tabagismo associado', 'Episódio prévio de travamento lombar'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Manobra de Lasègue', achado: 'Positiva (dor irradiada no trajeto do ciático entre 30° e 70° de flexão da perna)' },
          { item: 'Força/Reflexos', achado: 'Déficit de dorsiflexão (L4/L5) ou reflexo aquileu diminuído (S1)' },
        ],
        inspecao: [
          { item: 'Coluna', achado: 'Escoliose antálgica, contratura muscular paravertebral' },
        ],
      },
    },
    'Síndrome do Túnel do Carpo': {
      queixa_principal: ['Formigamento nas mãos que acorda de noite', 'Perco força na mão e deixo coisas caírem', 'Dormência nos dedos, parece choque'],
      sintomas: ['Parestesias em polegar, indicador e médio', 'Dor e dormência noturna', 'Fraqueza na preensão', 'Sinal de Tinel positivo', 'Sinal de Phalen positivo'],
      exames: ['Eletroneuromiografia', 'Raio-X de punho', 'Ultrassom de punho', 'Exame clínico (testes provocativos)'],
      especificidades: ['Trabalho repetitivo (digitação/caixa)', 'Gestante (3º trimestre)', 'Hipotireoidismo descompensado', 'Diabetes mellitus tipo 2', 'Piora dos sintomas à noite'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Teste de Phalen', achado: 'Positivo (dormência após 60s de flexão máxima dos punhos)' },
          { item: 'Sinal de Tinel', achado: 'Positivo (choque ao percutir o nervo mediano no punho)' },
        ],
        inspecao: [
          { item: 'Mão', achado: 'Pode haver atrofia da eminência tenar em casos crônicos' },
        ],
      },
    },
    'Tendinite': {
      queixa_principal: ['Dor no ombro que piora ao levantar o braço', 'Dor no cotovelo ao pegar peso', 'Dor no punho ao torcer'],
      sintomas: ['Dor localizada no tendão', 'Piora com movimento repetitivo', 'Edema local', 'Crepitação', 'Limitação funcional'],
      exames: ['Ultrassom musculoesquelético', 'Ressonância magnética', 'Raio-X (descartar calcificação)', 'Exame físico (testes específicos)'],
      especificidades: ['Trabalho repetitivo (L.E.R)', 'Atleta amador (overuse)', 'Idade > 40 anos', 'Diabetes mellitus', 'Início após trauma leve direto'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Palpação', achado: 'Dor pontual sobre o tendão afetado e entese' },
          { item: 'Testes resistidos', achado: 'Dor à contração muscular resistida do grupo tendinoso' },
        ],
        inspecao: [
          { item: 'Articulação', achado: 'Pode haver discreto edema e hiperemia local' },
        ],
      },
    },
    // ── MAIS PEDIATRIA ──
    'Asma Infantil': {
      queixa_principal: ['Doutor, meu filho chia o peito toda vez que pega resfriado', 'Ele tem falta de ar e tosse muito à noite', 'Quando ele brinca muito, o peito começa a chiar'],
      sintomas: ['Sibilância recorrente', 'Tosse noturna ou ao exercício', 'Dispneia', 'Tiragem intercostal', 'Melhora com broncodilatador'],
      exames: ['Espirometria (>6 anos)', 'Oximetria', 'Raio-X de tórax', 'IgE total', 'Teste alérgico'],
      especificidades: ['Atópico (dermatite, rinite alérgica)', 'Prematuro (32 semanas)', 'Exposição a tabagismo passivo domiciliar', 'Histórico familiar de asma (mãe)', 'Crises recorrentes em mudanças de tempo'],
      exame_fisico: {
        respiratorio: [
          { item: 'Ausculta', achado: 'Sibilos expiratórios difusos, tempo expiratório prolongado' },
          { item: 'Frequência', achado: 'Pode haver taquipneia em crises agudas' },
        ],
        geral: [
          { item: 'Esforço', achado: 'Pode haver tiragem intercostal e fúrcula em crises' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Tórax discretamente insuflado se asma crônica mal controlada' },
        ],
      },
    },
    'Icterícia Neonatal': {
      queixa_principal: ['Doutor, meu bebê está amarelinho', 'Os olhos e a pele do meu bebê estão amarelos', 'Meu bebê nasceu e ficou amarelo em menos de 24 horas'],
      sintomas: ['Icterícia craniocaudal', 'Letargia', 'Recusa de sucção', 'Urina escura (se patológica)', 'Fezes acólicas (se obstrutiva)'],
      exames: ['Bilirrubina total e frações', 'Tipagem sanguínea (mãe e RN)', 'Coombs direto', 'Hemograma com reticulócitos', 'G6PD'],
      especificidades: ['Incompatibilidade Rh ou ABO', 'Prematuro (35 semanas)', 'Icterícia nas primeiras 24h de vida', 'Aleitamento materno exclusivo com baixa pega', 'Histórico de fototerapia em irmão anterior'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele/Escleras', achado: 'Coloração amarelada generalizada (Zonas de Kramer III ou IV)' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Pode haver letargia ou dificuldade de sucção' },
          { item: 'Fígado/Baço', achado: 'Hepatoesplenomegalia se causa hemolítica' },
        ],
      },
    },
    // ── MAIS HEMATOLOGIA ──
    'Anemia Ferropriva': {
      queixa_principal: ['Cansaço e falta de ar ao subir escadas', 'Muito pálida e com vontade de comer gelo', 'Unhas quebradiças e queda de cabelo'],
      sintomas: ['Palidez cutaneomucosa', 'Fadiga', 'Dispneia aos esforços', 'Pica (pagofagia)', 'Glossite', 'Coiloníquia (unhas em colher)'],
      exames: ['Hemograma (VCM baixo)', 'Ferritina sérica (baixa)', 'Ferro sérico e TIBC', 'Reticulócitos', 'Sangue oculto nas fezes'],
      especificidades: ['Fluxo menstrual intenso (menorragia)', 'Dieta pobre em ferro/carne vermelha', 'Verminose (Escaridíase)', 'Sangramento gastrointestinal oculto', 'Cirurgia bariátrica prévia'],
      exame_fisico: {
        geral: [
          { item: 'Palidez', achado: 'Palidez cutaneomucosa evidente (conjuntiva hipocora)' },
          { item: 'Unhas', achado: 'Unhas quebradiças, coiloníquia (unhas em colher - raro)' },
        ],
        inspecao: [
          { item: 'Boca', achado: 'Queilite angular, glossite (língua lisa e despapilada)' },
        ],
        cardiovascular: [
          { item: 'Sopro', achado: 'Sopro sistólico funcional de ejeção por hiperdinamia' },
        ],
      },
    },
    'Anemia Falciforme': {
      queixa_principal: ['Dor terrível nos ossos que não passa', 'Doutor, meu filho tem crises de dor e fica amarelo', 'Estou com dor no peito e falta de ar súbita'],
      sintomas: ['Crises vaso-oclusivas (dor óssea intensa)', 'Icterícia', 'Esplenomegalia (infância)', 'Síndrome torácica aguda', 'Priapismo', 'Úlceras em MMII'],
      exames: ['Eletroforese de hemoglobina', 'Hemograma (anemia + reticulocitose)', 'Teste de falcização', 'Bilirrubinas', 'LDH e haptoglobina'],
      especificidades: ['Triagem neonatal positiva (HB SS)', 'Múltiplas internações por dor', 'Histórico de sequestro esplênico', 'Uso regular de hidroxiureia', 'Vacinado para pneumococo'],
      exame_fisico: {
        geral: [
          { item: 'Coloração', achado: 'Palidez e icterícia (amarelo-limão)' },
          { item: 'Desenvolvimento', achado: 'Déficit pôndero-estatural frequente' },
        ],
        abdome: [
          { item: 'Baço', achado: 'Baço não palpável em adultos (auto-esplenectomia)' },
        ],
        inspecao: [
          { item: 'Pernas', achado: 'Pode haver úlceras crônicas maleolares' },
        ],
      },
    },
    'Leucemia Linfoide Aguda': {
      queixa_principal: ['Doutor, meu filho parou de brincar e apareceram manchas roxas', 'Ele está com febre que não cede e ínguas pelo corpo', 'Ele reclama de dor nos ossos e está muito pálido'],
      sintomas: ['Palidez', 'Febre prolongada', 'Petéquias e equimoses', 'Dor óssea', 'Linfadenopatia', 'Hepatoesplenomegalia', 'Sangramento gengival'],
      exames: ['Hemograma (blastos em sangue periférico)', 'Mielograma', 'Imunofenotipagem', 'LDH', 'Ácido úrico', 'Raio-X de tórax (massa mediastinal)'],
      especificidades: ['Criança (4 anos)', 'Síndrome de Down', 'Pancitopenia importante', 'Sangramento gengival há 3 dias', 'Linfadenopatia cervical e axilar'],
      exame_fisico: {
        geral: [
          { item: 'Estado geral', achado: 'Prostração, palidez intensa, febre' },
          { item: 'Linfonodos', achado: 'Linfadenopatia cervical, axilar e inguinal generalizada' },
        ],
        inspecao: [
          { item: 'Pele', achado: 'Petéquias, equimoses e púrpuras' },
          { item: 'Boca', achado: 'Hemorragia gengival, hipertrofia gengival' },
        ],
        abdome: [
          { item: 'Vísceras', achado: 'Hepatoesplenomegalia importante' },
        ],
      },
    },
    'Linfoma de Hodgkin': {
      queixa_principal: ['Íngua no pescoço que não dói e não some', 'Perdi peso, tenho suor noturno e coceira', 'Febre que vai e volta sem infecção'],
      sintomas: ['Linfadenopatia cervical indolor', 'Febre (Pel-Ebstein)', 'Sudorese noturna', 'Perda de peso >10%', 'Prurido generalizado'],
      exames: ['Biópsia de linfonodo (células de Reed-Sternberg)', 'PET-CT', 'Tomografia de tórax e abdome', 'Hemograma', 'LDH e VHS'],
      especificidades: ['Jovem adulto (15-35 anos)', 'EBV associado', 'Prognóstico favorável', 'Quimio + radioterapia'],
      exame_fisico: {
        geral: [
          { item: 'Linfonodos', achado: 'Linfadenopatia cervical de consistência elástica, indolor ("borrachosa")' },
        ],
        abdome: [
          { item: 'Baço', achado: 'Esplenomegalia em casos avançados' },
        ],
        inspecao: [
          { item: 'Pescoço', achado: 'Conglomerado ganglionar visível' },
        ],
      },
    },
    // ── MAIS URGÊNCIA ──
    'Cetoacidose Diabética': {
      queixa_principal: ['Doutor, meu filho diabético está vomitando e muito confuso', 'Estou respirando muito rápido e com um gosto estranho na boca', 'Muita sede, vômitos e dor na barriga'],
      sintomas: ['Respiração de Kussmaul', 'Hálito cetônico (frutado)', 'Náuseas e vômitos', 'Dor abdominal', 'Desidratação', 'Rebaixamento de consciência'],
      exames: ['Glicemia capilar (>250)', 'Gasometria arterial (acidose)', 'Cetonúria/cetonemia', 'Eletrólitos (K)', 'Hemograma', 'Função renal'],
      especificidades: ['Diabetes Tipo 1 (DM1)', 'Omissão de doses de insulina', 'Infecção urinária como gatilho', 'Primeira manifestação do diabetes', 'Início dos vômitos há 6 horas'],
      exame_fisico: {
        respiratorio: [
          { item: 'Respiração', achado: 'Ritmo de Kussmaul (respiração profunda e rápida)' },
        ],
        geral: [
          { item: 'Hálito', achado: 'Hálito cetônico (odor de maçã podre)' },
          { item: 'Hidratação', achado: 'Sinais de desidratação grave (mucosas secas, turgor diminuído)' },
        ],
        neurologico: [
          { item: 'Consciência', achado: 'Sonolência, obnubilação ou coma' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Dor abdominal difusa (pode simular abdome agudo)' },
        ],
      },
    },
    'Anafilaxia': {
      queixa_principal: ['Comeu algo e inchou tudo, não consegue respirar', 'Reação alérgica grave com falta de ar', 'Picada de inseto e ficou todo inchado e passando mal'],
      sintomas: ['Urticária generalizada', 'Angioedema (lábios, língua)', 'Broncoespasmo', 'Hipotensão/choque', 'Estridor laríngeo', 'Náuseas e diarreia'],
      exames: ['Diagnóstico clínico (emergência)', 'Triptase sérica (após estabilização)', 'IgE específica (após resolução)', 'Monitorização (ECG, SpO2, PA)'],
      especificidades: ['Alergia alimentar conhecida', 'Alergia a medicamentos', 'Alergia a insetos (himenópteros)', 'Portador de epinefrina'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele', achado: 'Urticária disseminada, eritema, angioedema (lábios, pálpebras)' },
        ],
        respiratorio: [
          { item: 'Ausculta', achado: 'Sibilos, estridor laríngeo, sinais de obstrução de via aérea superior' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Hipotensão severa, taquicardia extrema, choque' },
        ],
      },
    },
    'Sepse': {
      queixa_principal: ['Febre alta e confusão mental', 'Pressão caiu muito e coração acelerado', 'Infecção que piorou rápido demais'],
      sintomas: ['Febre ou hipotermia', 'Taquicardia', 'Hipotensão', 'Taquipneia', 'Alteração de consciência', 'Oligúria', 'Pele mosqueada'],
      exames: ['Hemograma', 'Lactato sérico', 'Hemocultura (2 amostras)', 'PCR e procalcitonina', 'Gasometria', 'Função renal e hepática', 'Coagulograma'],
      especificidades: ['FOCO: Pneumonia ou ITU', 'Idoso (85 anos) institucionalizado', 'Imunossuprimido (quimioterapia)', 'Cirurgia abdominal há 1 semana', 'Lactato inicial 4.0'],
      exame_fisico: {
        geral: [
          { item: 'Vitais', achado: 'Hipotensão (necessidade de vasopressor), febre ou hipotermia, taquicardia' },
          { item: 'Pele', achado: 'Tempo de enchimento capilar lento (> 3s), cianose, lividez (livedo)' },
        ],
        neurologico: [
          { item: 'Estado mental', achado: 'Confusão mental, agitação ou letargia' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Sinais de má perfusão periférica' },
        ],
      },
    },
    // ── MAIS CIRURGIA ──
    'Diverticulite Aguda': {
      queixa_principal: ['Dor forte do lado esquerdo da barriga', 'Dor na barriga com febre e calafrios', 'Dor que parece apendicite mas do lado esquerdo'],
      sintomas: ['Dor em fossa ilíaca esquerda', 'Febre', 'Alteração do hábito intestinal', 'Defesa abdominal localizada', 'Náuseas'],
      exames: ['Tomografia de abdome com contraste', 'Hemograma com leucocitose', 'PCR', 'Colonoscopia (após resolução, 4-6 semanas)'],
      especificidades: ['Idoso (68 anos)', 'Dieta pobre em fibras e hidratação', 'Constipação crônica severa', 'Risco de perfuração/abscesso diverticular', 'Episódio prévio de diverticulite há 2 anos'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Dor intensa e defesa em Fossa Ilíaca Esquerda (FIE)' },
          { item: 'Percussão', achado: 'Dor à percussão abdominal ou descompressão brusca' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Febre baixa a moderada, taquicardia' },
        ],
        inspecao: [
          { item: 'Abdômen', achado: 'Distensão abdominal leve, retração da parede por dor' },
        ],
      },
    },
    'Obstrução Intestinal': {
      queixa_principal: ['Barriga inchando e não consigo soltar gases', 'Vômitos esverdeados e dor na barriga', 'Parei de evacuar há 3 dias e a barriga está enorme'],
      sintomas: ['Distensão abdominal', 'Parada de eliminação de gases e fezes', 'Vômitos (fecalóides se baixa)', 'Cólicas abdominais', 'Ruídos hidroaéreos metálicos'],
      exames: ['Raio-X de abdome (níveis hidroaéreos)', 'Tomografia de abdome', 'Hemograma e eletrólitos', 'Gasometria', 'Lactato sérico'],
      especificidades: ['Cirurgia prévia (Apendicectomia)', 'Hérnia inguinal encarcerada', 'Neoplasia de cólon sigmóide', 'Vômitos fecaloides', 'Parada de flatos há 48h'],
      exame_fisico: {
        abdome: [
          { item: 'Inspeção', achado: 'Distensão abdominal visível, ondas peristálticas visíveis (luta)' },
          { item: 'Ausculta', achado: 'Ruídos hidroaéreos metálicos ou abolidos (fase tardia)' },
          { item: 'Percussão', achado: 'Timpanismo difuso' },
        ],
        geral: [
          { item: 'Desidratação', achado: 'Enftalmia, mucosas secas (pelo sequestro de líquidos)' },
        ],
        inspecao: [
          { item: 'Hérnias', achado: 'Sempre inspecionar anéis inguinais em busca de hérnias' },
        ],
      },
    },
    'Doença de Chagas': {
      queixa_principal: ['Sinto meu coração falhar e cansaço', 'Dificuldade para engolir e muita azia', 'Sinto palpitações e falta de ar ao caminhar'],
      sintomas: ['Insuficiência cardíaca', 'Aritmias complexas', 'Megaesôfago (disfagia)', 'Megacólon (constipação severa)', 'B1 hipofonética'],
      exames: ['Sorologia para Chagas (ELISA/Machado-Guerreiro)', 'ECG (Bloqueio de Ramo Direito + BDAS)', 'Ecocardiograma', 'Raio-X de tórax e contrastado de esôfago'],
      especificidades: ['Mora em casa de pau-a-pique', 'Contato com barbeiro na infância', 'Histórico de transplante ou transfusão em área endêmica', 'Natural de área rural'],
      exame_fisico: {
        cardiovascular: [
          { item: 'Ritmo', achado: 'Bradicardia ou extrassístoles frequentes, B1 hipofonética' },
          { item: 'Estase Jugular', achado: 'Presente se insuficiência cardíaca direita' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Hepatomegalia (se IC), fecalomas palpáveis (se megacólon)' },
        ],
        inspecao: [
          { item: 'Ictus', achado: 'Ictus cordis desviado para baixo e esquerda, globoso' },
        ],
      },
    },
    'Síndrome de Guillain-Barré': {
      queixa_principal: ['Perdi a força nos pés e está subindo', 'Sinto minhas pernas pesadas e formigando', 'Não consigo mais subir escadas e sinto fraqueza'],
      sintomas: ['Paralisia flácida ascendente simétrica', 'Arreflexia/Hiporreflexia', 'Parestesias em extremidades', 'Dificuldade respiratória (casos graves)', 'Instabilidade autonômica'],
      exames: ['Líquor (dissociação albuminocitológica)', 'Eletroneuromiografia', 'Hemograma', 'Sorologias virais'],
      especificidades: ['Infecção gastrointestinal prévia (Campylobacter)', 'Infecção viral recente (Zika/Gripe)', 'Pós-vacinação recente (raro)', 'Início súbito há 3 dias'],
      exame_fisico: {
        neurologico: [
          { item: 'Reflexos', achado: 'Arreflexia ou hiporreflexia global precoce' },
          { item: 'Força', achado: 'Fraqueza muscular simétrica ascendente (membros inferiores -> tronco)' },
          { item: 'Nervos Cranianos', achado: 'Pode haver diplegia facial (nervo VII)' },
        ],
        respiratorio: [
          { item: 'Esforço', achado: 'Pode haver uso de musculatura acessória (insuficiência ventilatória)' },
        ],
      },
    },
    'Hiperplasia Prostática Benigna': {
      queixa_principal: ['Jato do xixi está muito fraco', 'Acordo muitas vezes à noite para urinar', 'Sinto que a bexiga não esvazia toda'],
      sintomas: ['Jato urinário fraco e hesitante', 'Nictúria (urinar à noite)', 'Polaciúria (aumento da frequência)', 'Gotejamento terminal', 'Sensação de esvaziamento incompleto'],
      exames: ['PSA total e livre', 'Ultrassom de próstata e vias urinárias', 'Toque retal', 'Urofluxometria'],
      especificidades: ['Homem idoso (> 60 anos)', 'Uso de medicações para próstata', 'Histórico de retenção urinária aguda'],
      exame_fisico: {
        geral: [
          { item: 'Toque Retal', achado: 'Próstata aumentada, fibroelástica, indolor, limites precisos, sulco mediano apagado' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Bexigoma (massa suprapúbica tensa e dolorosa) se retenção aguda' },
        ],
        inspecao: [
          { item: 'Suprapúbico', achado: 'Pode haver abaulamento se bexiga muito cheia' },
        ],
      },
    },
    'Derrame Pleural': {
      queixa_principal: ['Sinto um peso no peito e falta de ar', 'Dor fina no peito quando respiro fundo', 'Falta de ar que piora quando deito'],
      sintomas: ['Dispneia', 'Dor pleurítica', 'Macicez à percussão', 'Abolição do murmúrio vesicular', 'Tosse seca'],
      exames: ['Raio-X de tórax (Incidência de Laurell)', 'Ultrassom de tórax', 'Toracocentese diagnóstica', 'Bioquímica do líquido (Critérios de Light)'],
      especificidades: ['Histórico de insuficiência cardíaca', 'Pneumonia recente', 'Câncer de pulmão ou mama prévio', 'Tuberculose associada'],
      exame_fisico: {
        respiratorio: [
          { item: 'Percussão', achado: 'Macicez ou submacicez em bases pulmonares' },
          { item: 'Ausculta', achado: 'Abolição do murmúrio vesicular e do frêmito toracovocal no local' },
          { item: 'Expansibilidade', achado: 'Reduzida no lado afetado' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Abaulamento de espaços intercostais (se volumoso)' },
        ],
        geral: [
          { item: 'Atitude', achado: 'Ortopneia ou inclinação para o lado do derrame' },
        ],
      },
    },
    'Câncer de Pulmão': {
      queixa_principal: ['Estou tossindo sangue e perdi peso', 'Tosse que não passa há meses e rouquidão', 'Dor no peito e muito cansaço'],
      sintomas: ['Hemoptise', 'Emagrecimento inexplicado', 'Tosse crônica persistente', 'Rouquidão (invasão de laríngeo recorrente)', 'Dedos em baqueta de tambor'],
      exames: ['Tomografia de tórax com contraste', 'Biopsia por broncoscopia', 'Citologia de escarro', 'PET-CT (estadiamento)'],
      especificidades: ['Tabagista pesado (50 maços/ano)', 'Exposição a amianto ou radônio', 'DPOC associado', 'Massa espiculada em Raio-X'],
      exame_fisico: {
        geral: [
          { item: 'Estado geral', achado: 'Emagrecimento, caquexia neoplásica' },
          { item: 'Linfonodos', achado: 'Linfonodo de Virchow (supraclavicular E) ou escaleno palpável' },
        ],
        respiratorio: [
          { item: 'Ausculta', achado: 'Sibilância localizada (obstrução brônquica), redução do murmúrio' },
        ],
        inspecao: [
          { item: 'Mãos', achado: 'Baqueteamento digital (dedos em baqueta de tambor)' },
          { item: 'Face', achado: 'Síndrome de Horner (ptose, miose) se tumor de Pancoast' },
        ],
      },
    },
    'Hepatite': {
      queixa_principal: ['Estou com o corpo todo amarelo e coçando', 'Minha urina está cor de coca-cola', 'Sinto muita dor do lado direito e enjoo'],
      sintomas: ['Icterícia', 'Colúria (urina escura)', 'Acolia fecal (fezes claras)', 'Hepatomegalia dolorosa', 'Prurido generalizado'],
      exames: ['Sorologias (HAV, HBV, HCV)', 'TGO/TGP muito elevadas', 'Bilirrubinas total e frações', 'GGT e Fosfatase alcalina', 'INR/Coagulograma'],
      especificidades: ['Exposição a água/alimentos contaminados', 'Uso de drogas injetáveis', 'Viagem recente', 'Parceiro com hepatite'],
      exame_fisico: {
        geral: [
          { item: 'Icterícia', achado: 'Pele e escleras amareladas (ictéricas)' },
        ],
        abdome: [
          { item: 'Fígado', achado: 'Hepatomegalia lisa e dolorosa' },
          { item: 'Baço', achado: 'Pode haver esplenomegalia leve' },
        ],
        inspecao: [
          { item: 'Pele', achado: 'Pode haver marcas de coçadura por prurido colestático' },
        ],
      },
    },
    'Câncer Colorretal': {
      queixa_principal: ['Meu intestino mudou e estou vendo sangue nas fezes', 'Sinto que nunca esvazio o intestino todo', 'Emagreci muito e minhas fezes estão fininhas'],
      sintomas: ['Sangue nas fezes (hematofezes)', 'Alteração do hábito intestinal', 'Tenesmo (vontade constante)', 'Massa abdominal palpável', 'Anemia ferropriva inexplicada'],
      exames: ['Colonoscopia com biopsia', 'Pesquisa de sangue oculto', 'CEA (marcador tumoral)', 'Tomografia de abdome e pelve'],
      especificidades: ['Idoso (> 50 anos)', 'Histórico familiar de CCR', 'Presença de pólipos prévios', 'Doença inflamatória intestinal crônica'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Eventual massa palpável (mais comum em cólon direito)' },
        ],
        geral: [
          { item: 'Palidez', achado: 'Anemia ferropriva crônica (hipocorado)' },
          { item: 'Toque Retal', achado: 'Pode palpar lesão se retal, sangue na luva' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Estado nutricional preservado ou emagrecimento precoce' },
        ],
      },
    },
    'Diabetes tipo 1': {
      queixa_principal: ['Meu filho está tomando muita água e urinando demais', 'Ele está emagrecendo muito rápido mesmo comendo bem', 'Sinto um hálito muito doce e ele está desanimado'],
      sintomas: ['Polidipsia (muita sede)', 'Poliúria (muito xixi)', 'Perda de peso abrupta', 'Hálito cetônico', 'Visão turva'],
      exames: ['Glicemia de jejum e aleatória', 'Hemoglobina glicada (HbA1c)', 'Cetonúria', 'Autoanticorpos (Anti-GAD, Anti-ilhota)', 'Peptídeo C'],
      especificidades: ['Criança ou adolescente', 'Início agudo dos sintomas', 'Risco de Cetoacidose Diabética (CAD)'],
      exame_fisico: {
        geral: [
          { item: 'Peso/Estatura', achado: 'Emagrecimento visível recente, pode estar abaixo do percentil' },
          { item: 'Hidratação', achado: 'Mucosas secas, turgor cutâneo diminuído (desidratação por poliúria)' },
          { item: 'Hálito', achado: 'Odor cetônico (hálito frutado) se cetoacidose' },
        ],
        inspecao: [
          { item: 'Geral - Pele', achado: 'Pode apresentar lipodistrofia em locais de aplicação de insulina' },
          { item: 'Cabeça - Boca', achado: 'Candidíase oral de repetição, gengivite' },
          { item: 'Pés', achado: 'Inspeção de pés: calosidades, fissuras, onicomicose (se neuropatia incipiente)' },
        ],
        neurologico: [
          { item: 'Sensibilidade', achado: 'Pode haver diminuição de sensibilidade vibratória e protetora em pés (neuropatia)' },
          { item: 'Reflexos', achado: 'Reflexos aquileus diminuídos ou abolidos (neuropatia periférica)' },
        ],
        cardiovascular: [
          { item: 'PA', achado: 'Pode haver hipotensão ortostática (neuropatia autonômica)' },
        ],
      },
    },
    'Osteoporose': {
      queixa_principal: ['Sinto que estou diminuindo de altura', 'Tive uma fratura no braço ao tropeçar e cair', 'Minhas costas estão ficando curvadas e doem'],
      sintomas: ['Cifose dorsal (corcunda)', 'Diminuição da estatura', 'Fraturas por baixo impacto (fragilidade)', 'Frequentemente assintomática até a fratura'],
      exames: ['Densitometria óssea (DEXA)', 'Cálcio sérico e Vitamina D', 'Marcadores de reabsorção óssea', 'Raio-X de coluna'],
      especificidades: ['Mulher pós-menopausa', 'Uso crônico de corticoides', 'Histórico familiar de fratura de fêmur', 'Tabagismo e sedentarismo'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Coluna', achado: 'Cifose dorsal aumentada (corcunda da viúva)' },
          { item: 'Estatura', achado: 'Perda de altura documentada (> 2-3 cm)' },
        ],
        inspecao: [
          { item: 'Postura', achado: 'Aumento da distância occipício-parede' },
        ],
      },
    },
    'Hepatite C': {
      queixa_principal: ['Descobri em um exame de rotina', 'Doutor, recebi uma carta do banco de sangue', 'Sinto muito cansaço e às vezes dor na barriga'],
      sintomas: [' Frequentemente assintomática', 'Fadiga crônica', 'Artralgia', 'Crioglobulinemia (raro)', 'Sinais de cirrose (casos avançados)'],
      exames: ['Anti-HCV (triagem)', 'HCV-RNA por PCR (confirmatório)', 'Genotipagem do vírus', 'Elastografia hepática (Fibroscan)'],
      especificidades: ['Transfusão de sangue antes de 1993', 'Uso de drogas injetáveis', 'Tatuagem em local sem higiene', 'Hemodiálise'],
      exame_fisico: {
        geral: [
          { item: 'Estado geral', achado: 'Geralmente normal na fase crônica' },
        ],
        abdome: [
          { item: 'Sinais de Cirrose', achado: 'Pode haver ascite, circulação colateral, esplenomegalia (se avançado)' },
        ],
        inspecao: [
          { item: 'Pele', achado: 'Estigmas de hepatopatia crônica (aranhas vasculares, eritema palmar)' },
        ],
      },
    },
    'COVID-19': {
      queixa_principal: ['Perdi o olfato e o paladar do nada', 'Febre, tosse e muita falta de ar', 'Dor no corpo e um cansaço absurdo'],
      sintomas: ['Anosmia (perda do olfato)', 'Ageusia (perda do paladar)', 'Febre', 'Tosse seca', 'Dispneia (falta de ar)', 'Saturação de O2 baixa'],
      exames: ['RT-PCR de nasofaringe', 'Teste rápido de antígeno', 'Tomografia de tórax (vidro fosco)', 'D-dímero e PCR'],
      especificidades: ['Mora com pessoa positiva', 'Sintomas graves há 7 dias', 'Comorbidades associadas', 'Não vacinado ou esquema incompleto'],
      exame_fisico: {
        respiratorio: [
          { item: 'Ausculta', achado: 'Ausculta pobre perto da gravidade da dispneia (estertores crepitantes)' },
          { item: 'Frequência', achado: 'Taquipneia frequente' },
        ],
        geral: [
          { item: 'Saturação', achado: 'Hipóxia silenciosa comum (SpO2 < 94%)' },
          { item: 'Febre', achado: 'Febre persistente ou recorrente' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Uso de musculatura acessória em casos graves' },
        ],
      },
    },
    'Malária': {
      queixa_principal: ['Febre que vem e volta a cada 2 dias', 'Calafrios intensos e muito suor frio', 'Estive na região amazônica recentemente'],
      sintomas: ['Febre paroxística (terçã ou quartã)', 'Calafrios e tremores', 'Sudorese profusa', 'Hepatomegalia e Esplenomegalia', 'Icterícia'],
      exames: ['Gota espessa (padrão-ouro)', 'Teste rápido imunocromatográfico', 'Hemograma with anemia', 'Bilirrubinas'],
      especificidades: ['Viagem recente para área endêmica', 'Uso de repelente e mosquiteiro', 'Recidiva de sintomas'],
      exame_fisico: {
        geral: [
          { item: 'Coloração', achado: 'Icterícia leve e palidez' },
          { item: 'Febre', achado: 'Picos febris altos durante a consulta' },
        ],
        abdome: [
          { item: 'Vísceras', achado: 'Hepatoesplenomegalia dolorosa' },
        ],
        inspecao: [
          { item: 'Olhos', achado: 'Subicterícia conjuntival' },
        ],
      },
    },
    'Leptospirose': {
      queixa_principal: ['Dor insuportável nas panturrilhas e febre', 'Olhos ficaram muito amarelos e vermelhos', 'Tive contato com água de enchente'],
      sintomas: ['Mialgia intensa (principalmente panturrilhas)', 'Sufusão conjuntival (olhos vermelhos)', 'Icterícia rubínica', 'Hipotensão e oligúria (Síndrome de Weil)'],
      exames: ['Sorologia (MAT - Microaglutinação)', 'Hemograma com plaquetopenia', 'Ureia e Creatinina elevadas', 'Bilirrubina direta elevada'],
      especificidades: ['Contato com enchentes ou esgoto', 'Presença de roedores em casa/trabalho', 'Trabalho em limpeza de bueiros/valas'],
      exame_fisico: {
        geral: [
          { item: 'Panturrilhas', achado: 'Dor extrema à compressão das panturrilhas (Mialgia)' },
          { item: 'Vitais', achado: 'Hipotensão, febre, taquicardia' },
        ],
        inspecao: [
          { item: 'Olhos', achado: 'Sufusão conjuntival (Olhos "vermelhos" mas sem secreção)' },
          { item: 'Icterícia', achado: 'Icterícia rubínica (alaranjada)' },
        ],
        respiratorio: [
          { item: 'Ausculta', achado: 'Pode haver estertores se hemorragia alveolar' },
        ],
      },
    },
    'Esclerose Sistêmica': {
      queixa_principal: ['Meus dedos ficam brancos e depois roxos no frio', 'Sinto minha pele do rosto e das mãos esticada', 'Sinto dificuldade para engolir e muita azia'],
      sintomas: ['Fenômeno de Raynaud', 'Esclerodactilia (pele espessa)', 'Fácies esclerodérmica (microstomia)', 'Telangiectasias', 'Calcinose', 'Fibrose pulmonar'],
      exames: ['FAN (padrão nucleolar)', 'Anti-Scl-70 ou Anti-centrômero', 'Capilaroscopia periungueal', 'TC de tórax e Ecocardiograma'],
      especificidades: ['Disfagia esofágica', 'Crise renal esclerodérmica', 'Hipertensão pulmonar associada'],
      exame_fisico: {
        inspecao: [
          { item: 'Mãos', achado: 'Esclerodactilia (pele espessada, sem rugas), úlceras de polpas digitais' },
          { item: 'Face', achado: 'Microstomia (abertura bucal reduzida), afinamento do nariz' },
          { item: 'Tórax', achado: 'Telangiectasias' },
        ],
        geral: [
          { item: 'Raynaud', achado: 'Dedos pálidos ou cianóticos no momento do exame' },
        ],
      },
    },
    'Vulvovaginites': {
      queixa_principal: ['Sinto muita coceira e um corrimento branco', 'O cheiro lá embaixo está muito forte e ruim', 'Arde muito quando vou urinar ou ter relação'],
      sintomas: ['Prurido vulvar', 'Leucorreia (corrimento)', 'Dispareunia de introito', 'Eritema vulvovaginal', 'Odor fétido (teste do KOH positivo)'],
      exames: ['Exame a fresco do conteúdo vaginal', 'pH vaginal', 'Citologia oncótica', 'Cultura para fungos/bactérias'],
      especificidades: ['Uso recente de antibióticos', 'Diabetes descompensada', 'Relação sexual sem proteção', 'Higiene íntima excessiva'],
      exame_fisico: {
        inspecao: [
          { item: 'Genitália Ext', achado: 'Eritema, edema vulvar, placas brancas (se cândida)' },
        ],
        geral: [
          { item: 'Especular', achado: 'Corrimento leitoso (vaginose), grumoso (cândida) ou bolhoso (tricomoníase)' },
        ],
      },
    },
    'DIP (Doença Inflamatória Pélvica)': {
      queixa_principal: ['Dor no pé da barriga que não passa', 'Dor muito forte durante a relação sexual', 'Febre com dor abdominal e corrimento'],
      sintomas: ['Dor à mobilização do colo uterino', 'Dor à palpação de anexos', 'Febre > 38°C', 'Corrimento endocervical purulento', 'Dispneia (Síndrome de Fitz-Hugh-Curtis)'],
      exames: ['Ultrassom transvaginal', 'Beta-hCG (excluir ectópica)', 'Hemograma e PCR elevados', 'Cultura de secreção cervical'],
      especificidades: ['Troca recente de parceiro', 'Histórico de IST (Clamídia/Gonococo)', 'Inserção recente de DIU'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Dor intensa à palpação do hipogástrio' },
        ],
        geral: [
          { item: 'Bimanual', achado: 'Dor extrema à mobilização do colo uterino (Grito de Douglas) e anexos' },
          { item: 'Vitais', achado: 'Febre (>38°C)' },
        ],
        inspecao: [
          { item: 'Especular', achado: 'Secreção purulenta saindo pelo orifício externo do colo' },
        ],
      },
    },
    'Câncer de Colo do Útero': {
      queixa_principal: ['Sangramento depois da relação sexual', 'Corrimento com cheiro muito ruim e sangue', 'Dor na pelve que irradia para as pernas'],
      sintomas: ['Sangramento pós-coital (Sinusiorragia)', 'Corrimento fétido', 'Dor pélvica', 'Massa visível no colo (se avançado)', 'Anemia'],
      exames: ['Preventivo (Papanicolau)', 'Colposcopia e Biopsia', 'Captura híbrida para HPV', 'Ressonância de pelve'],
      especificidades: ['Tabagismo', 'Múltiplos parceiros sexuais', 'Início precoce da vida sexual', 'Histórico de preventivo alterado'],
      exame_fisico: {
        inspecao: [
          { item: 'Especular', achado: 'Lesão exofítica ou ulcerada no colo do útero, sangrante ao toque' },
        ],
        geral: [
          { item: 'Toque Vaginal', achado: 'Colo endurecido, friável, invasão de paramétrios (se avançado)' },
          { item: 'Linfonodos', achado: 'Pesquisa de linfadenopatia inguinal' },
        ],
      },
    },
    'Diabetes Gestacional': {
      queixa_principal: ['Meu exame de açúcar deu alto na gravidez', 'Estou ganhando muito peso e meu bebê está grande', 'Sinto muita sede e cansaço nesta gestação'],
      sintomas: ['Geralmente assintomática', 'Ganho de peso excessivo', 'Polidipsia/Poliúria', 'Macrossomia fetal (identificada no US)'],
      exames: ['Glicemia de jejum no 1º trimestre', 'TOTG 75g (entre 24-28 semanas)', 'Ultrassom obstétrico (acompanhamento)'],
      especificidades: ['Idade materna > 35 anos', 'IMC pré-gestacional > 25', 'Histórico familiar de DM2', 'Diabetes gestacional em gravidez anterior'],
      exame_fisico: {
        abdome: [
          { item: 'Altura Uterina', achado: 'Frequentemente superior à idade gestacional (macrossomia/polidrâmnio)' },
        ],
        geral: [
          { item: 'Ganho Ponderal', achado: 'Ganho de peso materno excessivo' },
        ],
      },
    },
    'Micose (Tínea/Candidíase)': {
      queixa_principal: ['Mancha vermelha que coça e está crescendo', 'Minha unha está amarela, grossa e quebradiça', 'Branco entre os dedos que arde e coça'],
      sintomas: ['Lesões anulares com bordas ativas', 'Prurido local', 'Descamação', 'Onicólise (descolamento da unha)', 'Intertrigo'],
      exames: ['Exame micológico direto (KOH)', 'Cultura para fungos', 'Lâmpada de Wood', 'Biópsia (raro)'],
      especificidades: ['Uso de calçados fechados por muito tempo', 'Uso frequente de piscinas/saunas', 'Contato com animais infectados', 'Imunossupressão (Diabetes)'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele', achado: 'Lesões anulares eritematosas com bordas descamativas, placas esbranquiçadas (pé de atleta)' },
          { item: 'Unhas', achado: 'Alteração de cor, espessamento, onicólise' },
        ],
      },
    },
    'Carcinoma Basocelular': {
      queixa_principal: ['Feridinha no rosto que não cicatriza', 'Uma espinha que sangra e volta sempre', 'Percebi uma mancha brilhante no nariz'],
      sintomas: ['Pápula perolada com telangiectasias', 'Ulceração central (Ulcera rodens)', 'Borda em rolo', 'Crescimento lento', 'Localização em áreas fotoexpostas'],
      exames: ['Dermatoscopia', 'Biópsia incisional ou excisional', 'Exame clínico dermatológico'],
      especificidades: ['Pele clara (fototipos I e II)', 'Exposição solar crônica sem proteção', 'Histórico de queimaduras solares na infância', 'Idade avançada'],
      exame_fisico: {
        inspecao: [
          { item: 'Lesão', achado: 'Pápula perolada, translúcida, com telangiectasias superficiais e borda em rolo' },
        ],
      },
    },
    'Lesão de Menisco': {
      queixa_principal: ['Meu joelho travou e não consigo esticar', 'Sinto um estalo e dor no joelho ao girar', 'Joelho inchado e sinto ele "falsear"'],
      sintomas: ['Dor na interlinha articular', 'Bloqueio articular', 'Derrame articular (inchaço)', 'Teste de McMurray positivo', 'Teste de Appley positivo'],
      exames: ['Ressonância magnética de joelho', 'Raio-X (descartar fraturas)', 'Ultrassom (menos preciso)'],
      especificidades: ['Entorse de joelho em atividade esportiva', 'Degeneração em pacientes idosos', 'Sentir o joelho "solto"'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Teste de McMurray', achado: 'Positivo (estalo ou dor à rotação do joelho flexionado)' },
          { item: 'Palpação', achado: 'Dor na interlinha articular medial ou lateral' },
        ],
        inspecao: [
          { item: 'Joelho', achado: 'Derrame articular leve a moderado' },
        ],
      },
    },
    'Leucemia Mieloide Crônica': {
      queixa_principal: ['Sinto um peso enorme do lado esquerdo da barriga', 'Estou me sentindo muito cheio rápido quando como', 'Cansaço e suor excessivo à noite'],
      sintomas: ['Esplenomegalia volumosa', 'Saciedade precoce', 'Fadiga', 'Perda de peso', 'Sudorese noturna'],
      exames: ['Hemograma (Leucocitose acentuada com desvio à esquerda)', 'Mielograma', 'Citogenética (Cromossomo Philadelphia - t(9;22))', 'BCR-ABL por PCR'],
      especificidades: ['Adulto (40-60 anos)', 'Fase crônica, acelerada ou blástica', 'Uso de inibidores de tirosina quinase (Imatinibe)'],
      exame_fisico: {
        abdome: [
          { item: 'Baço', achado: 'Esplenomegalia volumosa, podendo cruzar a linha média e atingir FID' },
          { item: 'Fígado', achado: 'Hepatomegalia moderada' },
        ],
        geral: [
          { item: 'Palidez', achado: 'Mucosas hipocoradas' },
        ],
      },
    },
    'Linfoma Não-Hodgkin': {
      queixa_principal: ['Apareceram várias ínguas que estão crescendo rápido', 'Sinto dor na barriga e estou emagrecendo', 'Febre toda tarde e suor que molha o lençol'],
      sintomas: ['Linfadenopatia generalizada indolor', 'Sintomas B (febre, suor noturno, perda de peso)', 'Esplenomegalia', 'Comprometimento extranodal (TGI, pele)'],
      exames: ['Biópsia de linfonodo', 'Imunohistoquímica', 'Tomografias de estadiamento', 'Hemograma e LDH elevado'],
      especificidades: ['Idoso (> 60 anos)', 'Imunodeficiência (HIV/Transplante)', 'Infecção por EBV ou H. pylori (MALT)'],
      exame_fisico: {
        geral: [
          { item: 'Linfonodos', achado: 'Polia ddenopatia assimétrica, firme, indolor' },
        ],
        abdome: [
          { item: 'Vísceras', achado: 'Hepatoesplenomegalia' },
        ],
        inspecao: [
          { item: 'Amígdalas', achado: 'Pode haver aumento amigdaliano (Anel de Waldeyer)' },
        ],
      },
    },
    'Púrpura Trombocitopênica': {
      queixa_principal: ['Meu corpo está cheio de manchinhas roxas do nada', 'Minha gengiva sangra muito quando escovo os dentes', 'Apareceram pontos vermelhos nas minhas pernas'],
      sintomas: ['Petéquias', 'Equimoses (manchas roxas)', 'Gengivorragia', 'Epistaxe (sangramento nasal)', 'Menorragia'],
      exames: ['Hemograma (Plaquetopenia isolada)', 'Mielograma (Megacariócitos normais ou aumentados)', 'Sorologias (excluir causas secundárias)'],
      especificidades: ['Criança pós-infecção viral (PTI aguda)', 'Adulto jovem (PTI crônica)', 'Ausência de adenomegalias ou febre'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele', achado: 'Petéquias e equimoses disseminadas, sem padrão de trauma' },
          { item: 'Mucosa', achado: 'Bulas hemorrágicas em mucosa oral (indica gravidade)' },
        ],
        geral: [
          { item: 'Baço', achado: 'Normal (ausência de esplenomegalia sugere PTI)' },
        ],
      },
    },
    'Hemofilia': {
      queixa_principal: ['Meu filho caiu e o joelho inchou demais e não para', 'Qualquer batida vira um hematoma enorme', 'Cortei o dedo e não para de sair sangue'],
      sintomas: ['Hemartroses (sangramento articular)', 'Hematomas musculares profundos', 'Sangramento prolongado pós-trauma/cirurgia'],
      exames: ['Coagulograma (TTPA prolongado)', 'Dosagem de Fator VIII (Hemofilia A) ou Fator IX (Hemofilia B)', 'Tempo de Sangramento (normal)'],
      especificidades: ['Sexo masculino (herança ligada ao X)', 'Histórico familiar materno', 'Uso de concentrados de fator'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Articulações', achado: 'Aumento de volume, calor e limitação funcional de grandes articulações (Hemartrose)' },
          { item: 'Amplitudes', achado: 'Sequelas crônicas com deformidade se hemartroses de repetição' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Hematomas musculares profundos visíveis' },
        ],
      },
    },
    'Trombocitopenia': {
      queixa_principal: ['Meus exames deram plaquetas muito baixas', 'Estou com sangramento no nariz que demora a passar', 'Apareceram manchas roxas sem eu ter batido em nada'],
      sintomas: ['Petéquias e equimoses', 'Sangramentos de mucosas', 'Pode ser assintomática (achado laboratorial)'],
      exames: ['Hemograma completo', 'Esfregaço de sangue periférico', 'Mielograma', 'Provas de coagulação'],
      especificidades: ['Uso de medicamentos (Heparina, Diuréticos)', 'Doença hepática crônica', 'Quimioterapia recente', 'Infecções (Dengue, HIV)'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele/Mucosa', achado: 'Petéquias, púrpuras, equimoses, epistaxe ou gengivorragia' },
        ],
        geral: [
          { item: 'Sangramentos', achado: 'Sinais de sangramento ativo em locais de punção' },
        ],
      },
    },
    'Crise Hipertensiva': {
      queixa_principal: ['Minha pressão subiu muito e sinto muita dor de cabeça', 'Visão embaçada e dor forte na nuca', 'Sinto meu peito apertado e pressão 20 por 12'],
      sintomas: ['Cefaleia intensa', 'Escotomas (visão borrada)', 'Náuseas e vômitos', 'Dor torácica', 'Dispneia', 'Alteração do nível de consciência'],
      exames: ['ECG', 'Fundoscopia (exame de fundo de olho)', 'Creatinina e Ureia', 'EAS', 'Radiografia de tórax'],
      especificidades: ['Urgência vs Emergência Hipertensiva', 'Lesão de órgão-alvo', 'Não adesão ao tratamento crônico'],
      exame_fisico: {
        geral: [
          { item: 'Vitais', achado: 'PA muito elevada (ex: 220/120 mmHg), taquicardia ou bradicardia' },
          { item: 'Fundo de Olho', achado: 'Pode haver exsudatos, hemorragias ou papiledema (emergência)' },
        ],
        cardiovascular: [
          { item: 'Bulas', achado: 'B4 presente, sopros se dissecação de aorta associada' },
        ],
        neurologico: [
          { item: 'Déficits', achado: 'Pesquisar sinais focais (AVC), confusão mental (encefalopatia)' },
        ],
      },
    },
    'Pneumotórax': {
      queixa_principal: ['Senti uma pontada no peito e agora estou sem ar', 'Dor súbita de um lado do peito após tossir', 'Falta de ar que apareceu do nada'],
      sintomas: ['Dor torácica súbita pleurítica', 'Dispneia', 'Diminuição do murmúrio vesicular unilateral', 'Timpanismo à percussão', 'Desvio de traqueia (se hipertensivo)'],
      exames: ['Raio-X de tórax em inspiração e expiração', 'Tomografia de tórax', 'Gasometria arterial'],
      especificidades: ['Espontâneo primário (jovem, alto, magro)', 'Traumático (acidente/perfuração)', 'Tabagismo', 'DPOC associado'],
      exame_fisico: {
        respiratorio: [
          { item: 'Ausculta', achado: 'Murmúrio vesicular diminuído ou abolido no lado afetado' },
          { item: 'Percussão', achado: 'Hipersonoridade ou timpanismo unilateral' },
          { item: 'Frêmito', achado: 'Frêmito toracovocal diminuído ou abolido' },
        ],
        inspecao: [
          { item: 'Tórax', achado: 'Expansibilidade reduzida unilateralmente, traqueia desviada (se hipertensivo)' },
        ],
      },
    },
    'Trauma Cranioencefálico (TCE)': {
      queixa_principal: ['Bati a cabeça e desmaiei por uns minutos', 'Depois da batida na cabeça sinto muito enjoo e sono', 'Não lembro o que aconteceu logo após o acidente'],
      sintomas: ['Perda de consciência', 'Amnésia peritraumática', 'Cefaleia e vômitos', 'Otorreia/Rinorreia', 'Sinal de Guaxinim/Battle', 'Alteração na escala de Glasgow'],
      exames: ['Tomografia de crânio sem contraste', 'Raio-X de coluna cervical', 'Aferição da Escala de Coma de Glasgow'],
      especificidades: ['Acidente automobilístico', 'Queda de altura', 'Uso de álcool associado', 'Lidando com anticoagulantes'],
      exame_fisico: {
        neurologico: [
          { item: 'Glasgow', achado: 'Pontuação reduzida (Leve 13-15, Mod 9-12, Grave <9)' },
          { item: 'Pupilas', achado: 'Anisocoria (sugerindo herniação), midríase ou miose extrema' },
        ],
        inspecao: [
          { item: 'Cabeça', achado: 'Sinal de Battle (equimose mastóidea) ou Guaxinim (periorbitária)' },
          { item: 'Ouvido/Nariz', achado: 'Otorreia ou rinorreia (líquor)' },
        ],
      },
    },
    'Politrauma': {
      queixa_principal: ['Vítima de acidente de carro grave', 'Atropelamento com múltiplas fraturas e dor', 'Queda de moto com várias lesões pelo corpo'],
      sintomas: ['Múltiplas fraturas expostas ou fechadas', 'Instabilidade hemodinâmica (choque)', 'Dificuldade respiratória', 'Escore de trauma baixo'],
      exames: ['FAST (Ultrassom focado no trauma)', 'Raio-X de tórax, pelve e cervical', 'Tomografia de corpo inteiro (Pan-TC)', 'Hemoglobina/Lactato'],
      especificidades: ['Atendimento seguindo ATLS (ABCDE)', 'Mecanismo de alta energia', 'Risco de choque hipovolêmico'],
      exame_fisico: {
        geral: [
          { item: 'ABCDE', achado: 'Avaliar Vias Aéreas, Respiração, Circulação, Incapacidade e Exposição' },
          { item: 'Pele', achado: 'Palidez, sudorese fria, enchimento capilar lento (choque)' },
        ],
        inspecao: [
          { item: 'Membros', achado: 'Deformidades evidentes, fraturas expostas, hematomas volumosos' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Dor à palpação, sinais de irritação peritoneal ou pelve instável' },
        ],
      },
    },
    'Edema Agudo de Pulmão': {
      queixa_principal: ['Sinto que estou me afogando e no consigo respirar', 'Acordei desesperado sem ar e com tosse com espuma', 'Muita falta de ar e pernas muito inchadas'],
      sintomas: ['Dispneia extrema e súbita', 'Estertores crepitantes disseminados', 'Expectoração rósea espumosa', 'Ortopneia severa', 'Cianose e sudorese fria'],
      exames: ['Raio-X de tórax (Infiltração em asa de borboleta)', 'ECG e Ecocardiograma', 'BNP elevado', 'Gasometria arterial'],
      especificidades: ['Crise hipertensiva gatilho', 'IAM recente', 'Insuficiência renal associada', 'Má adesão à dieta/medicação de IC'],
      exame_fisico: {
        respiratorio: [
          { item: 'Ausculta', achado: 'Estertores crepitantes finos até ápices pulmonares, sibilância (asma cardíaca)' },
          { item: 'Frequência', achado: 'Taquipneia importante, uso de musculatura acessória' },
        ],
        cardiovascular: [
          { item: 'Bulas', achado: 'B3 (galope ventricular), taquicardia' },
        ],
        geral: [
          { item: 'Estado geral', achado: 'Ansiedade extrema, sensação de morte iminente, sudorese fria, cianose de extremidades' },
        ],
      },
    },
    'Hérnia Umbilical': {
      queixa_principal: ['Tenho uma "bola" no umbigo que dói ao tossir', 'Meu umbigo está estufado e incomoda quando faço força', 'Apareceu um inchaço no umbigo depois da gravidez'],
      sintomas: ['Abaulamento umbilical', 'Dor ao esforço ou tosse', 'Redutível ou encarcerada', 'Frequentemente indolor'],
      exames: ['Exame físico', 'Ultrassom de parede abdominal'],
      especificidades: ['Multiparidade', 'Obesidade', 'Cirrose com ascite', 'Histórico de cirurgia abdominal prévia'],
      exame_fisico: {
        abdome: [
          { item: 'Inspeção', achado: 'Abaulamento umbilical, redutível ou não, aumenta com manobra de Valsalva' },
          { item: 'Palpação', achado: 'Palpação do anel herniário, dor se encarcerada ou estrangulada' },
        ],
      },
    },
    'Hemorroidas': {
      queixa_principal: ['Saiu sangue vivo após eu evacuar', 'Sinto uma "carninha" saindo pelo ânus', 'Muita coceira e dor na região anal'],
      sintomas: ['Hematocézia (sangue rutilante)', 'Prolapso anal', 'Prurido e dor anal', 'Plícoma perianal'],
      exames: ['Inspeção anal e toque retal', 'Anoscopia', 'Proctossigmoidoscopia'],
      especificidades: ['Constipação crônica e esforço evacuatório', 'Gravidez', 'Sedentarismo', 'Dieta pobre em fibras'],
      exame_fisico: {
        inspecao: [
          { item: 'Região Anal', achado: 'Mamilos hemorroidários visíveis (externos ou internos prolapsados), plicomas' },
        ],
        geral: [
          { item: 'Toque Retal', achado: 'Geralmente indolor, pode identificar massas ou tônus do esfíncter' },
        ],
      },
    },
    'Abdome Agudo': {
      queixa_principal: ['Minha barriga está muito dura e dói demais', 'Dor abdominal insuportável que começou de repente', 'Barriga inchada e não consigo soltar gases nem evacuar'],
      sintomas: ['Dor abdominal intensa', 'Defesa abdominal (barriga em tábua)', 'Ausência de ruídos hidroaéreos', 'Náuseas e vômitos'],
      exames: ['Raio-X de abdome agudo (3 posições)', 'Tomografia de abdome', 'Rotina de laboratório (Amilase, PCR, Leucograma)'],
      especificidades: ['Inflamatório, Perfurativo, Obstrutivo, Vascular ou Hemorrágico'],
      exame_fisico: {
        abdome: [
          { item: 'Inspeção', achado: 'Distensão total ou localizada, cicatrizes cirúrgicas' },
          { item: 'Ausculta', achado: 'RHA aumentados (obstrutivo inicial) ou ausentes (peritonite)' },
          { item: 'Palpação', achado: 'Defesa muscular, descompressão brusca dolorosa (Sinal de Blumberg)' },
        ],
        geral: [
          { item: 'Atitude', achado: 'Facies de dor, posição antálgica (geralmente imóvel na peritonite)' },
        ],
      },
    },
    'Úlcera Perfurada': {
      queixa_principal: ['Senti uma dor como uma facada no estômago', 'Dor na barriga que se espalhou para o ombro', 'Barriga ficou dura como pedra de repente'],
      sintomas: ['Dor súbita e excruciante (abdome catastrófico)', 'Sinal de Jobert (perda da macicez hepática)', 'Defesa abdominal generalizada', 'Sinais de choque'],
      exames: ['Raio-X de tórax em pé (Pneumoperitônio)', 'Tomografia de abdome'],
      especificidades: ['Histórico de úlcera péptica', 'Uso excessivo de AINEs', 'Cirurgia de urgência necessária'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Abdome em tábua (rigidez generalizada), dor intensa à descompressão' },
          { item: 'Percussão', achado: 'Sinal de Jobert (perda da macicez hepática por pneumoperitônio)' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Taquicardia, hipotensão, febre (se tardio)' },
        ],
        inspecao: [
          { item: 'Respiratório', achado: 'Respiração superficial predominantemente torácica (evita movimento abdominal)' },
        ],
      },
    },
    'Trauma Abdominal': {
      queixa_principal: ['Bati a barriga forte no volante no acidente', 'Fui agredido com chutes na barriga e dói muito', 'Dor na barriga após uma queda forte'],
      sintomas: ['Dor abdominal', 'Equimoses em parede abdominal', 'Instabilidade hemodinâmica', 'Sinais de irritação peritoneal'],
      exames: ['FAST (Ultrassom)', 'Tomografia de abdome com duplo contraste', 'Lavatagem peritoneal diagnóstica (LPD)'],
      especificidades: ['Trauma fechado (baço/fígado) vs Penetrante', 'Mecanismo de trauma', 'Risco de hemorragia interna'],
      exame_fisico: {
        abdome: [
          { item: 'Inspeção', achado: 'Marcas de cinto de segurança, equimoses (Sinal de Cullen ou Grey-Turner), ferimentos penetrantes' },
          { item: 'Palpação', achado: 'Dor, defesa ou massas. Sinal de Kehr (dor no ombro por irritação do diafragma)' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Instabilidade (choque hemorrágico) exige laparotomia imediata' },
        ],
      },
    },
    'Conjuntivite': {
      queixa_principal: ['Meu olho está muito vermelho, coçando e com secreção', 'Acordei com o olho "colado" de tanta remela', 'Sinto como se tivesse areia no meu olho'],
      sintomas: ['Hiperemia conjuntival', 'Secreção ocular (purulenta ou serosa)', 'Prurido e lacrimejamento', 'Quemose (edema da conjuntiva)', 'Adenopatia pré-auricular'],
      exames: ['Exame em lâmpada de fenda', 'Cultura de secreção (se crônica)', 'Teste de fluoresceína'],
      especificidades: ['Uso de lentes de contato', 'Contactante com sintomas semelhantes', 'Histórico de alergia (rinite)', 'Uso de piscinas públicas'],
      exame_fisico: {
        inspecao: [
          { item: 'Olhos', achado: 'Injeção conjuntival periférica, secreção (purulenta, mucoide ou serosa)' },
          { item: 'Pálpebras', achado: 'Edema e hiperemia palpebral' },
        ],
        geral: [
          { item: 'Linfonodos', achado: 'Linfonodo pré-auricular palpável e doloroso (viral)' },
        ],
      },
    },
    'Hordéolo (Terçol)': {
      queixa_principal: ['Apareceu um "caroço" na minha pálpebra que dói e está vermelho', 'Sinto que tem algo incomodando no meu olho e está inchado', 'Dói muito quando eu pisco e está com um pontinho amarelo'],
      sintomas: ['Nódulo eritematoso e doloroso na pálpebra', 'Edema palpebral', 'Pode haver drenagem de secreção purulenta', 'Sensação de corpo estranho'],
      exames: ['Exame em lâmpada de fenda', 'Eversão palpebral'],
      especificidades: ['Blefarite associada', 'Uso de maquiagem vencida', 'Dermatite seborreica', 'Episódios recorrentes'],
      exame_fisico: {
        inspecao: [
          { item: 'Pálpebra', achado: 'Nódulo pequeno, eritematoso, doloroso, com ponto de supuração amarelado na base de um cílio' },
        ],
      },
    },
    'Olho Seco': {
      queixa_principal: ['Sinto meu olho seco e parece que tem areia o tempo todo', 'Meus olhos ardem muito no final do dia olhando o computador', 'Minha visão fica embaçada e melhora quando eu pisco muito'],
      sintomas: ['Ardor ocular', 'Sensação de corpo estranho/areia', 'Hiperemia ocular leve', 'Lacrimejamento reflexo', 'Visão turva intermitente'],
      exames: ['Teste de Schirmer', 'Tempo de ruptura do filme lacrimal (BUT)', 'Coloração com rosa bengala'],
      especificidades: ['Uso de excessivo de telas', 'Mudança climática (tempo seco)', 'Uso de lentes de contato', 'Menopausa', 'Síndrome de Sjögren'],
      exame_fisico: {
        inspecao: [
          { item: 'Olhos', achado: 'Leve hiperemia conjuntival, filme lacrimal escasso ou ausente à biomicroscopia' },
        ],
        geral: [
          { item: 'Testes', achado: 'Teste de Schirmer positivo (redução da produção lacrimal)' },
        ],
      },
    },
    'Glaucoma Agudo': {
      queixa_principal: ['Sinto uma dor insuportável no olho que irradia para a cabeça', 'Minha visão ficou borrada de repente e vejo halos coloridos', 'Estou com muita náusea e dor no olho'],
      sintomas: ['Dor ocular intensa', 'Midríase média paralítica', 'Edema de córnea', 'Injeção ciliar', 'Olho pétreo à palpação', 'Náuseas e vômitos'],
      exames: ['Tonometria (PIH elevada > 40mmHg)', 'Gonioscopia', 'Exame de fundo de olho'],
      especificidades: ['Uso de colírios midriáticos', 'Estresse emocional como gatilho', 'Hipermetropia alta', 'Crise em ambiente escuro'],
      exame_fisico: {
        inspecao: [
          { item: 'Pupila', achado: 'Midríase média paralítica (fixa e ovalada)' },
          { item: 'Córnea', achado: 'Edema de córnea (aspecto fosco/vidro moído)' },
          { item: 'Olho', achado: 'Injeção ciliar e conjuntival intensa' },
        ],
        geral: [
          { item: 'Palpação', achado: 'Olho pétreo (consistência endurecida à palpação digital)' },
        ],
      },
    },
    'Catarata': {
      queixa_principal: ['Minha visão está ficando "nublada" parece que tem uma névoa', 'Tenho muita dificuldade para dirigir à noite por causa do brilho', 'As cores parecem desbotadas e sem vida'],
      sintomas: ['Diminuição progressiva da acuidade visual', 'Leococoria (pupila branca em casos avançados)', 'Diplopia monocular', 'Melhora temporária da visão de perto'],
      exames: ['Mapeamento de retina', 'Biomicroscopia', 'Teste de acuidade visual'],
      especificidades: ['Idade avançada (> 65 anos)', 'Uso crônico de corticoides', 'Diabetes Mellitus', 'Exposição solar excessiva sem proteção'],
      exame_fisico: {
        inspecao: [
          { item: 'Pupila', achado: 'Leucocoria (pupila branca) em casos maduros, reflexo vermelho diminuído' },
        ],
        geral: [
          { item: 'Visão', achado: 'Redução da acuidade visual não corrigível por lentes' },
        ],
      },
    },
    'Descolamento de Retina': {
      queixa_principal: ['Estou vendo flashes de luz de repente', 'Parece que tem uma cortina caindo sobre a minha visão', 'Estou vendo muitos "pontinhos pretos" voando'],
      sintomas: ['Fotopsias (flashes)', 'Moscas volantes (pontos pretos)', 'Defeito no campo visual (cortina)', 'Redução súbita da visão'],
      exames: ['Mapeamento de retina com indentação escleral', 'Ultrassonografia ocular', 'Fundo de olho'],
      especificidades: ['Miopia alta', 'Trauma ocular recente', 'Cirurgia de catarata prévia', 'Histórico familiar'],
      exame_fisico: {
        geral: [
          { item: 'Fundo de Olho', achado: 'Retina pálida, elevada, com dobras (aspecto de "lençol ondulado")' },
          { item: 'Visão', achado: 'Defeito de campo visual (escotoma ou "cortina")' },
        ],
      },
    },
    'Sinusite Aguda': {
      queixa_principal: ['Sinto um peso horrível no rosto quando abaixo a cabeça', 'Meu nariz está muito entupido e com catarro amarelo', 'Perdi o olfato e sinto um gosto ruim na boca'],
      sintomas: ['Dor ou pressão facial', 'Rinorreia purulenta', 'Obstrução nasal', 'Hiposmia/Anosmia', 'Febre e tosse'],
      exames: ['Nasofibroscopia', 'Tomografia de seios da face (se complicado)', 'Raio-X de seios da face'],
      especificidades: ['Quadro após gripe que não melhora (10 dias)', 'Piora após melhora inicial (curva bimodal)', 'Histórico de rinite alérgica'],
      exame_fisico: {
        inspecao: [
          { item: 'Face', achado: 'Dor à pressão sobre seios maxilares ou frontais' },
          { item: 'Nariz', achado: 'Rinoscopia com cornetos edemaciados, secreção purulenta em meato médio' },
        ],
        geral: [
          { item: 'Boca', achado: 'Drenagem pós-nasal de secreção purulenta visível na orofaringe' },
        ],
      },
    },
    'Rinite Alérgica': {
      queixa_principal: ['Espirro toda hora quando acordo ou chego perto de poeira', 'Meu nariz vive coçando e escorrendo água', 'Não consigo respirar direito, meu nariz vive entupido'],
      sintomas: ['Espirros em salva', 'Rinorreia hialina (água)', 'Prurido nasal/ocular/faríngeo', 'Obstrução nasal bilateral', 'Olheiras alérgicas'],
      exames: ['Teste alérgico cutâneo (Prick test)', 'Dosagem de IgE específica', 'Nasofibroscopia (hipertrofia de cornetos)'],
      especificidades: ['Atopia (asma/dermatite)', 'Exposição a ácaros/mofo/pelos', 'Piora na primavera/outono', 'Uso crônico de corticoide nasal'],
      exame_fisico: {
        inspecao: [
          { item: 'Nariz', achado: 'Mucosa nasal pálida ou violácea, cornetos hipertrofiados, secreção hialina' },
          { item: 'Face', achado: 'Olheiras alérgicas, sulco nasal transverso (saudação alérgica)' },
        ],
        geral: [
          { item: 'Faringe', achado: 'Faringe com aspecto em "paralelepípedo" (hiperplasia linfoide)' },
        ],
      },
    },
    'Surdez Súbita': {
      queixa_principal: ['Parei de ouvir de um lado de repente, hoje de manhã', 'Sinto um zumbido muito forte e não ouço mais nada nesse ouvido', 'Sinto meu ouvido "tapado" de um jeito estranho, como se estivesse debaixo d\'água'],
      sintomas: ['Perda auditiva súbita (< 72h)', 'Zumbido (Tinnitus) unilateral', 'Plenitude auricular', 'Pode haver vertigem leve'],
      exames: ['Audiometria tonal e vocal (urgente)', 'Ressonância magnética (descartar neuroma)', 'Pesquisa de vírus'],
      especificidades: ['Emergência otológica', 'Uso de corticoides sistêmicos (janela de ouro)', 'Recuperação variável', 'Sem causa óbvia (idiopática)'],
      exame_fisico: {
        geral: [
          { item: 'Audição', achado: 'Teste de Weber lateralizado para o lado são. Teste de Rinne positivo (neurosensorial)' },
        ],
        inspecao: [
          { item: 'Orelha', achado: 'Otoscopia normal (ausência de cerume ou perfuração)' },
        ],
      },
    },
    'Faringite/Amigdalite': {
      queixa_principal: ['Minha garganta dói muito, não consigo nem engolir saliva', 'Sinto umas ínguas no pescoço e febre alta', 'Minha garganta está cheia de pontos brancos'],
      sintomas: ['Odinofagia intensa', 'Febre alta', 'Exsudato purulento nas amígdalas', 'Linfadenopatia cervical dolorosa', 'Ausência de tosse (sugere bacteriana)'],
      exames: ['Teste rápido para Estreptococo (STREP-test)', 'Cultura de orofaringe', 'Hemograma'],
      especificidades: ['Histórico de amigdalites de repetição', 'Idade escolar (5-15 anos)', 'Petéquias no palato'],
      exame_fisico: {
        inspecao: [
          { item: 'Garganta', achado: 'Amígdalas hiperemiadas, edemaciadas com placas de exsudato purulento' },
          { item: 'Boca', achado: 'Petéquias em palato mole, língua em framboesa (se escarlatina)' },
        ],
        geral: [
          { item: 'Linfonodos', achado: 'Linfadenopatia cervical anterior submandibular dolorosa' },
        ],
      },
    },
    'Labirintite (VPPB)': {
      queixa_principal: ['Tudo gira quando eu viro na cama', 'Sinto uma tontura forte que dura poucos segundos', 'Sinto que vou cair, parece que o chão foge'],
      sintomas: ['Vertigem rotatória desencadeada por movimento', 'Nistagmo de posicionamento', 'Náuseas', 'Equilíbrio preservado entre as crises'],
      exames: ['Manobra de Dix-Hallpike (positiva)', 'Audiometria (geralmente normal)', 'Vectoeletronistagmografia'],
      especificidades: ['Idoso', 'Trauma craniano leve prévio', 'Crises curtas (< 1 minuto)', 'Sem perda auditiva associada'],
      exame_fisico: {
        neurologico: [
          { item: 'Dix-Hallpike', achado: 'Positiva (nistagmo rotatório e vertigem ao deitar e virar a cabeça)' },
        ],
        geral: [
          { item: 'Equilíbrio', achado: 'Marcha estável, sem dismetria, coordenação preservada' },
        ],
      },
    },
    'Epistaxe': {
      queixa_principal: ['Meu nariz começou a sangrar do nada e não para', 'Estou deitando e sentindo sangue descendo pela garganta', 'Sempre que assoo o nariz sai muito sangue'],
      sintomas: ['Sangramento nasal ativo', 'Hipotensão (se volumoso)', 'Náuseas (pela ingestão de sangue)'],
      exames: ['Rinoscopia anterior', 'Coagulograma (se recorrente)', 'Aferição de PA'],
      especificidades: ['Uso de descongestionante nasal tópico', 'Hipertensão arterial descompensada', 'Uso de anticoagulantes/AAS', 'Clima muito seco'],
      exame_fisico: {
        inspecao: [
          { item: 'Nariz', achado: 'Sangramento ativo, geralmente proveniente do plexo de Kiesselbach na área anterior' },
        ],
        geral: [
          { item: 'Faringe', achado: 'Sangue fluindo na parede posterior (se sangramento posterior)' },
          { item: 'Vitais', achado: 'Avaliar pressão arterial (pode ser a causa)' },
        ],
      },
    },
    'Hanseníase': {
      queixa_principal: ['Tenho uma mancha clara que não sinto quando encosto', 'Perdi a força na mão e ela está ficando "torta"', 'Minha pele está cheia de caroços e não sinto dor neles'],
      sintomas: ['Manchas hipocrômicas ou eritematosas com perda de sensibilidade', 'Espessamento de nervos periféricos', 'Déficit motor (mão em garra, pé caído)', 'Nódulos cutâneos (forma virchowiana)', 'Madarose (perda de sobrancelhas)'],
      exames: ['Bacoscopia (raspado dérmico)', 'Teste de sensibilidade térmica/dolorosa/tátil', 'Biopsia de pele', 'Pesquisa de força muscular'],
      especificidades: ['Contactante domiciliar de caso de hanseníase', 'Vacinado com BCG (parcialmente protetor)', 'Tratamento prévio incompleto'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele', achado: 'Manchas hipocrômicas ou eritematosas, placas, infiltrações ou nódulos' },
          { item: 'Face', achado: 'Madarose (perda parcial de sobrancelha), infiltração facial' },
        ],
        neurologico: [
          { item: 'Sensibilidade', achado: 'Anestesia ou hipoestesia térmica/dolorosa/tátil nas lesões' },
          { item: 'Nervos', achado: 'Espessamento de nervos periféricos (ulnar, tibial posterior, fibular)' },
        ],
      },
    },
    'Leishmaniose Visceral (Calazar)': {
      queixa_principal: ['Minha barriga está crescendo muito e sinto muita febre', 'Estou muito pálido e perdendo peso há semanas', 'Sinto muita fraqueza e ínguas pelo corpo'],
      sintomas: ['Febre irregular de longa duração', 'Esplenomegalia volumosa', 'Hepatomegalia', 'Pancitopenia (palidez e sangramentos)', 'Emagrecimento'],
      exames: ['Pesquisa de amastigotas em medula óssea (mielograma)', 'Teste rápido (rk39)', 'Sorologia (IFI/ELISA)', 'Hemograma e função hepática'],
      especificidades: ['Residência ou viagem para área endêmica', 'Presença de cão doente no domicílio', 'Pobreza/Saneamento precário'],
      exame_fisico: {
        abdome: [
          { item: 'Vísceras', achado: 'Esplenomegalia volumosa e hepatomegalia' },
        ],
        geral: [
          { item: 'Palidez', achado: 'Mucosas hipocoradas (pancitopenia)' },
          { item: 'Nutrição', achado: 'Caquexia, emagrecimento importante' },
        ],
        inspecao: [
          { item: 'Pele', achado: 'Hiperpigmentação cutânea (o "calazar" ou febre negra)' },
        ],
      },
    },
    'Varicela (Catapora)': {
      queixa_principal: ['Meu filho está cheio de bolinhas que coçam muito no corpo todo', 'As bolinhas começaram no rosto e agora estão em tudo', 'Ele teve febre e depois apareceram as manchas'],
      sintomas: ['Exantema polimorfo (pápulas, vesículas, crostas)', 'Prurido intenso', 'Febre e mal-estar', 'Distribuição centrípeta'],
      exames: ['Diagnóstico clínico', 'PCR (casos graves/atípicos)', 'Teste de Tzanck'],
      especificidades: ['Contactante de caso na escola', 'Não vacinado', 'Imunossuprimido (risco de complicações)'],
      exame_fisico: {
        inspecao: [
          { item: 'Pele', achado: 'Lesões em diversos estágios: pápula, vesícula (gota de orvalho), pústula e crosta coexistindo' },
          { item: 'Distribuição', achado: 'Acometimento de tronco, face e couro cabeludo predominantemente' },
        ],
      },
    },
    'Cefaleia Tensional': {
      queixa_principal: ['Sinto uma pressão na minha cabeça, como se tivesse um capacete apertado', 'Dor de cabeça que piora no final do dia quando estou estressada', 'Dor na nuca e nos ombros que sobe para a cabeça'],
      sintomas: ['Dor em aperto/pressão bilateral', 'Intensidade leve a moderada', 'Ausência de náuseas ou vômitos', 'Pode haver fotofobia OU fonofobia (pode ter um, não os dois)'],
      exames: ['Diagnóstico clínico', 'Avaliação de pontos-gatilho musculares', 'Exame neurológico (normal)'],
      especificidades: ['Estresse ocupacional elevado', 'Transtorno de ansiedade/Depressão', 'Sedentarismo e má postura'],
      exame_fisico: {
        musculoesqueletico: [
          { item: 'Palpação', achado: 'Tensão e dor em musculatura pericraniana, trapézio e região occipital' },
        ],
        neurologico: [
          { item: 'Geral', achado: 'Exame neurológico completamente normal' },
        ],
        inspecao: [
          { item: 'Postura', achado: 'Ombros elevados e tensão muscular visível' },
        ],
      },
    },
    'Câncer de Próstata': {
      queixa_principal: ['Meu exame de sangue da próstata deu alto', 'Estou urinando com sangue e sinto dor nos ossos', 'Meu jato urinário está muito fraco e acordo muito à noite'],
      sintomas: ['Freqüentemente assintomático no início', 'Nódulo endurecido ao toque retal', 'Hematúria', 'Dor óssea (metástases)', 'Sintomas obstrutivos urinários'],
      exames: ['PSA (Antígeno Prostático Específico)', 'Toque retal', 'Biópsia de próstata transretal', 'Ressonância magnética multiparamétrica'],
      especificidades: ['Idade > 50 anos', 'Histórico familiar (pai/irmão)', 'Raça negra (maior incidência)', 'Escore de Gleason na biópsia'],
      exame_fisico: {
        geral: [
          { item: 'Toque Retal', achado: 'Nódulo pétreo, irregular, fixo ou próstata endurecida e assimétrica' },
        ],
        musculoesqueletico: [
          { item: 'Coluna', achado: 'Dor à percussão de espinhosas se metástase óssea' },
        ],
      },
    },
    'Orquite/Epididimite': {
      queixa_principal: ['Meu testículo está muito inchado, vermelho e dói demais', 'Sinto uma dor no saco que sobe para a barriga', 'Estou com febre e meu testículo dobrou de tamanho'],
      sintomas: ['Dor escrotal de início gradual', 'Edema e eritema escrotal', 'Sinal de Prehn positivo (alívio da dor à elevação)', 'Febre e sintomas urinários (disúria)'],
      exames: ['Ultrassom de bolsa escrotal com Doppler', 'EAS e Urocultura', 'Pesquisa de Clamídia e Gonococo'],
      especificidades: ['Atividade sexual recente sem proteção', 'Instrumentação urinária prévia (sondas)', 'Caxumba recente (Orquite viral)'],
      exame_fisico: {
        inspecao: [
          { item: 'Bolsa Escrotal', achado: 'Aumento de volume, eritema, edema liso local' },
        ],
        geral: [
          { item: 'Sinal de Prehn', achado: 'Positivo (dor alivia com a elevação manual do testículo)' },
          { item: 'Reflexo Cremastérico', achado: 'Presente' },
        ],
      },
    },
    'Torção Testicular': {
      queixa_principal: ['Acordei com uma dor insuportável no testículo de repente', 'Senti uma dor súbita no saco após jogar bola', 'Estou vomitando de tanta dor no testículo'],
      sintomas: ['Dor escrotal súbita e excruciante', 'Testículo elevado e horizontalizado', 'Reflexo cremastérico ausente', 'Náuseas e vômitos', 'Sinal de Prehn negativo'],
      exames: ['Ultrassom de bolsa escrotal com Doppler (urgente)', 'Cintilografia (raramente usada)'],
      especificidades: ['Adolescente (12-18 anos)', 'Início súbito durante o sono ou atividade', 'Emergência cirúrgica (janela de 6h)'],
      exame_fisico: {
        inspecao: [
          { item: 'Bolsa Escrotal', achado: 'Testículo elevado e em posição horizontalizada' },
        ],
        geral: [
          { item: 'Reflexo Cremastérico', achado: 'Ausente no lado afetado' },
          { item: 'Sinal de Prehn', achado: 'Negativo (elevação piora ou não altera a dor)' },
        ],
      },
    },
    'Incontinência Urinária': {
      queixa_principal: ['Sempre que espirro ou dou risada, escapa xixi', 'Não dá tempo de chegar no banheiro, molho a roupa', 'Sinto uma vontade urgente de urinar e não seguro'],
      sintomas: ['Perda involuntária de urina ao esforço', 'Urgência miccional', 'Polaciúria', 'Enurese noturna'],
      exames: ['Estudo urodinâmico', 'Diário miccional', 'Ultrassom de vias urinárias', 'Teste do absorvente (Pad test)'],
      especificidades: ['Multiparidade (parto normal)', 'Menopausa', 'Histórico de cirurgia pélvica', 'Idoso com alterações cognitivas'],
      exame_fisico: {
        geral: [
          { item: 'Manobra de Valsalva', achado: 'Perda urinária observada ao tossir ou fazer força' },
        ],
        inspecao: [
          { item: 'Genital', achado: 'Sinais de distopia pélvica (cistocele, retocele) ou atrofia genital' },
        ],
      },
    },
    'Câncer de Mama': {
      queixa_principal: ['Senti um nódulo duro na minha mama', 'Minha pele do peito está parecendo uma casca de laranja', 'Está saindo um líquido com sangue pelo meu mamilo'],
      sintomas: ['Nódulo palpável e fixo', 'Retração de pele ou mamilo', 'Pele em "casca de laranja" (Peau d\'orange)', 'Linfonodo axilar palpável', 'Descarga papilar sanguinolenta'],
      exames: ['Mamografia', 'Ultrassonografia mamária', 'Biópsia (Core-biopsy ou PAAF)', 'Imunohistoquímica (RE, RP, HER2, Ki-67)'],
      especificidades: ['Menarca precoce ou menopausa tardia', 'Nuliparidade', 'Mutações BRCA1/2', 'Histórico familiar importante'],
      exame_fisico: {
        inspecao: [
          { item: 'Mamas', achado: 'Retração de mamilo ou pele, abaulamento localizado, pele em casca de laranja' },
          { item: 'Papila', achado: 'Presença de descarga papilar sanguinolenta' },
        ],
        geral: [
          { item: 'Palpação', achado: 'Nódulo fixo, pétreo, irregular. Linfonodos axilares aumentados' },
        ],
      },
    },
    'Placenta Prévia': {
      queixa_principal: ['Tive um sangramento vivo de repente, mas não sinto dor', 'Acordei e vi que estava sangrando bastante, estou grávida de 7 meses'],
      sintomas: ['Sangramento vaginal vermelho vivo', 'Ausência de dor abdominal', 'Útero indolor e relaxado', 'Apresentação fetal anômala'],
      exames: ['Ultrassom obstétrico transabdominal', 'Esprectoscopia (com cautela)', 'Hemograma e tipagem sanguínea'],
      especificidades: ['Cicatriz de cesárea prévia', 'Multiparidade', 'Idade materna > 35 anos', 'Tabagismo'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Útero normotônico, indolor à palpação' },
        ],
        geral: [
          { item: 'Especular', achado: 'Visualização de sangue vermelho vivo proveniente do orifício cervical' },
          { item: 'Toque Vaginal', achado: 'CONTRAINDICADO até afastar placenta prévia' },
        ],
      },
    },
    'Descolamento de Placenta (DPP)': {
      queixa_principal: ['Sinto uma dor insuportável na barriga e ela está dura', 'Tive um sangramento escuro e muita dor de repente'],
      sintomas: ['Dor abdominal súbita e intensa', 'Hipertonia uterina (útero em tábua)', 'Sangramento vaginal escuro (pode ser oculto)', 'Sofrimento fetal agudo'],
      exames: ['Diagnóstico clínico (urgência)', 'Ultrassom (baixa sensibilidade para DPP)', 'Cardiotocografia'],
      especificidades: ['Hipertensão arterial/pré-eclâmpsia', 'Trauma abdominal recente', 'Uso de cocaína/tabaco', 'Ruptura prematura de membranas'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Hipertonia uterina (útero em tábua), extrema dor à palpação' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Taquicardia, hipotensão (se choque), sangramento vaginal escuro' },
        ],
      },
    },
    'Ameaça de Parto Prematuro': {
      queixa_principal: ['Sinto que minha barriga está ficando dura com frequência', 'Estou com uma pressão forte "lá embaixo" e dor nas costas', 'Sinto cólicas que parecem de parto antes do tempo'],
      sintomas: ['Contrações uterinas regulares', 'Alteração cervical (apagamento/dilatação)', 'Pressão pélvica', 'Aumento do corrimento vaginal'],
      exames: ['Ultrassom transvaginal (medida do colo)', 'Pesquisa de fibronectina fetal', 'Cardiotocografia'],
      especificidades: ['Infecção urinária associada', 'Gestação gemelar', 'Parto prematuro anterior', 'Estresse físico intenso'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Contrações uterinas perceptíveis ao toque (frequentes e rítmicas)' },
        ],
        geral: [
          { item: 'Toque Vaginal', achado: 'Colo amolecido, apagado e com dilatação progressiva' },
        ],
      },
    },
    'Hiperêmese Gravídica': {
      queixa_principal: ['Não consigo parar de vomitar, nem água para no estômago', 'Me sinto muito fraca e perdi peso na gravidez', 'Tudo que eu como eu ponho para fora'],
      sintomas: ['Vômitos persistentes e graves', 'Desidratação', 'Perda de peso (> 5%)', 'Cetonúria', 'Distúrbios eletrolíticos'],
      exames: ['Eletrotrólitos (Na, K, Cl)', 'Urina tipo I (cetonas)', 'Ultrassom obstétrico (excluir mola)', 'Função hepática e TSH'],
      especificidades: ['Primeira gestação', 'Gestação múltipla ou molar', 'Histórico de enxaqueca', 'Início entre 4-9 semanas'],
      exame_fisico: {
        geral: [
          { item: 'Hidratação', achado: 'Sinais de desidratação grave (mucosas secas, turgor diminuído, enoftalmia)' },
          { item: 'Vitais', achado: 'Taquicardia, hipotensão ortostática, perda ponderal visível' },
        ],
      },
    },
    'Hemorragia Digestiva Alta (HDA)': {
      queixa_principal: ['Vomitei sangue vivo', 'Minhas fezes estão pretas e com um cheiro horrível', 'Sinto muita tontura e meu vômito parece borra de café'],
      sintomas: ['Hematêmese (vômito de sangue)', 'Melena (fezes negras fétidas)', 'Hipotensão e taquicardia', 'Palidez cutânea'],
      exames: ['Endoscopia Digestiva Alta (urgente)', 'Hemograma e Coagulograma', 'Ureia e Creatinina', 'Tipagem sanguínea'],
      especificidades: ['Uso crônico de AINEs/AAS', 'Cirrose hepática (varizes)', 'Histórico de úlcera péptica', 'Etilismo'],
      exame_fisico: {
        geral: [
          { item: 'Vitais', achado: 'Taquicardia, hipotensão (choque hipovolêmico), palidez importante' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Pode haver dor epigástrica ou estigmas de cirrose (ascite, baço)' },
        ],
        inspecao: [
          { item: 'Toque Retal', achado: 'Melena (fezes negras e fétidas) presente no dedo de luva' },
        ],
      },
    },
    'Doença Celíaca': {
      queixa_principal: ['Sinto muito estufamento e diarreia quando como massa', 'Minhas fezes são volumosas e brilhosas', 'Não consigo ganhar peso e me sinto fraco'],
      sintomas: ['Diarreia crônica (esteatorreia)', 'Distensão abdominal e flatulência', 'Anemia ferropriva refratária', 'Dermatite herpetiforme', 'Baixa estatura (em crianças)'],
      exames: ['Anticorpo anti-transglutaminase IgA', 'Endoscopia com biópsia de duodeno', 'Dosagem de IgA total', 'HLA-DQ2/DQ8'],
      especificidades: ['Histórico familiar', 'Diabetes tipo 1 associada', 'Síndrome de Down', 'Início após introdução de glúten'],
      exame_fisico: {
        abdome: [
          { item: 'Inspeção', achado: 'Abdome distendido, globoso e timpanizado' },
        ],
        geral: [
          { item: 'Nutrição', achado: 'Sinais de má absorção (emagrecimento, atrofia glútea, hipotrofia muscular)' },
          { item: 'Palidez', achado: 'Palidez cutaneomucosa (anemia por má absorção)' },
        ],
      },
    },
    'Miocardite': {
      queixa_principal: ['Tive uma gripe forte e agora sinto cansaço e dor no peito', 'Meu coração parece estar batendo fora do ritmo', 'Sinto falta de ar mesmo parado'],
      sintomas: ['Dor torácica tipo pleurítica', 'Sinais de insuficiência cardíaca súbita', 'Arritmias', 'Febre e fadiga'],
      exames: ['Troponinas elevadas', 'ECG (alterações inespecíficas)', 'Ressonância Magnética Cardíaca', 'Ecocardiograma', 'Biópsia endomiocárdica (raro)'],
      especificidades: ['Quadro viral recente (1-2 semanas)', 'Uso de certas medicações/drogas', 'Doenças autoimunes'],
      exame_fisico: {
        cardiovascular: [
          { item: 'Bulas', achado: 'B3 presente, bulas hipofonéticas, taquicardia desproporcional à febre' },
        ],
        respiratorio: [
          { item: 'Ausculta', achado: 'Pode haver estertores se falência cardíaca' },
        ],
        geral: [
          { item: 'Vitais', achado: 'Arritmias, sinais de congestão (edema)' },
        ],
      },
    },
    'Aneurisma de Aorta': {
      queixa_principal: ['Sinto uma pulsação na minha barriga', 'Dor forte nas costas que parece que está rasgando', 'Descobri um sopro na barriga num exame'],
      sintomas: ['Massa abdominal pulsátil indolor', 'Dor abdominal ou lombar súbita (se expansão)', 'Sinais de choque (se ruptura)', 'Sopro abdominal'],
      exames: ['Ultrassom de abdome', 'Angiotomografia de aorta', 'Ressonância magnética'],
      especificidades: ['Tabagismo', 'Idoso (> 65 anos)', 'Hipertensão arterial', 'Sexo masculino'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Massa pulsátil expansível na região supraumbilical' },
          { item: 'Ausculta', achado: 'Sopro sistólico na linha média abdominal' },
        ],
      },
    },
    'Adenomiose': {
      queixa_principal: ['Minha cólica é insuportável e meu fluxo está vindo com muitos coágulos', 'Sinto que meu útero está inchado e dói muito quando fico menstruada', 'Minha barriga cresce muito durante a menstruação e sinto muita dor'],
      sintomas: ['Dismenorreia severa', 'Menorragia (fluxo aumentado)', 'Útero aumentado e globoso', 'Dor pélvica crônica', 'Dispareunia de profundidade'],
      exames: ['Ultrassonografia transvaginal (sinais de zona junctional espessada)', 'Ressonância Magnética de pelve', 'Biópsia (geralmente pós-histerectomia)'],
      especificidades: ['Multípara', 'Histórico de cirurgia uterina (cesárea/miomectomia)', 'Idade entre 35-50 anos', 'Falha no tratamento clínico inicial'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Útero aumentado (volume global), amolecido e doloroso na fase pré-menstrual' },
        ],
      },
    },
    'Climatério': {
      queixa_principal: ['Sinto calorões que sobem para o rosto do nada', 'Não consigo dormir, acordo toda suada à noite', 'Minha menstruação está vindo cada vez mais longe e sinto muita secura vaginal'],
      sintomas: ['Fogachos (ondas de calor)', 'Sudorese noturna', 'Atrofia vaginal', 'Alterações de humor (irritabilidade/depressão)', 'Insônia', 'Diminuição da libido'],
      exames: ['Dosagem de FSH e Estradiol', 'Citologia oncótica vaginal (avaliar trofismo)', 'Densitometria óssea', 'Perfil lipídico'],
      especificidades: ['Idade > 45 anos', 'Ausência de menstruação há > 12 meses (Menopausa)', 'Tabagismo (piora fogachos)', 'Histórico de câncer de mama (contraindica TH)'],
      exame_fisico: {
        geral: [
          { item: 'Vitais', achado: 'Fogachos observados (rubor facial súbito e sudorese)' },
        ],
        inspecao: [
          { item: 'Genital', achado: 'Atrofia de mucosa vaginal (pálida, seca e lisa), perda de gordura nos grandes lábios' },
        ],
      },
    },
    'Câncer de Endométrio': {
      queixa_principal: ['Voltei a sangrar depois de 5 anos na menopausa', 'Estou com um sangramento rosa estranho e já não menstruo há muito tempo', 'Sinto uma dor chata no pé da barriga e estou sangrando'],
      sintomas: ['Sangramento uterino pós-menopausa', 'Corrimento aquoso/sanguinolento', 'Dor pélvica (estágios avançados)', 'Massa pélvica'],
      exames: ['Ultrassonografia transvaginal (espessamento endometrial)', 'Biópsia de endométrio (Pipelle)', 'Histeroscopia com biópsia', 'Tomografia de pelve'],
      especificidades: ['Obesidade', 'Diabetes mellitus', 'Nuliparidade', 'Uso de tamoxifeno', 'Síndrome de Lynch'],
      exame_fisico: {
        geral: [
          { item: 'Estado geral', achado: 'Frequentemente obesa, pode haver hipertensão associada' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Útero pode estar aumentado de volume ou massa pélvica palpável' },
        ],
        inspecao: [
          { item: 'Especular', achado: 'Visualização de sangue proveniente do canal cervical em pós-menopausa' },
        ],
      },
    },
    'Infertilidade': {
      queixa_principal: ['Estou tentando engravidar há mais de um ano e não consigo', 'Parei o anticoncepcional há muito tempo e nada de bebê', 'Queria saber se tenho algum problema, pois minhas amigas engravidam e eu não'],
      sintomas: ['Incapacidade de conceber após 12 meses (ou 6 meses se >35 anos)', 'Ciclos irregulares (sugere anovulação)', 'Dor pélvica (sugere endometriose)'],
      exames: ['Histerossalpingografia', 'Espermograma (fator masculino)', 'Dosagens hormonais (FSH, LH, Progesterona)', 'Ultrassonografia transvaginal seriada'],
      especificidades: ['Idade materna > 35 anos', 'Histórico de DIP prévia', 'Cirurgias pélvicas anteriores', 'Endometriose ou SOP conhecida'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Geralmente normal, pode haver dor se houver causa ginecológica subjacente' },
        ],
        inspecao: [
          { item: 'Geral', achado: 'Pode haver sinais de virilização (hirsutismo) se causa for SOP' },
        ],
      },
    },
    'Gravidez Ectópica': {
      queixa_principal: ['Sinto uma dor muito forte em um lado da barriga e estou grávida', 'Estou com um sangramento escuro e dor que sobe para o ombro', 'Minha pressão caiu e estou com dor insuportável no abdome'],
      sintomas: ['Tríade: Dor abdominal, atraso menstrual e sangramento vaginal', 'Sinal de Proust (dor à mobilização do colo)', 'Massa anexial dolorosa', 'Sinais de choque (se rota)'],
      exames: ['Beta-hCG quantitativo (platô ou aumento subótimo)', 'Ultrassonografia transvaginal (útero vazio)', 'Hemograma e tipagem sanguínea'],
      especificidades: ['Histórico de ectópica anterior', 'Uso de DIU', 'Cirurgia tubária prévia', 'Tabagismo', 'Fecundação in vitro'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Dor intensa à palpação profunda, sinais de peritonismo (se rota)' },
        ],
        geral: [
          { item: 'Bimanual', achado: 'Massa anexial dolorosa, dor intensa à mobilização do colo (Sinal de Proust)' },
          { item: 'Vitais', achado: 'Taquicardia e hipotensão (se choque hemorrágico por ruptura)' },
        ],
      },
    },
    'Ruptura Prematura de Membranas (RPM)': {
      queixa_principal: ['Senti um líquido escorrendo pelas pernas de repente, parece xixi mas não para', 'Minha calcinha está sempre molhada e o líquido tem cheiro de água sanitária', 'Acordei com a cama toda molhada'],
      sintomas: ['Perda de líquido amniótico claro/clorado', 'Diminuição do volume uterino', 'Pode haver sinais de infecção (corioamnionite)'],
      exames: ['Teste de cristalização do líquido', 'Teste de Nitrazina (pH)', 'Especuloscopia (visualização direta)', 'Ultrassonografia (ILA reduzido)'],
      especificidades: ['Idade gestacional (termo vs pré-termo)', 'Presença de febre ou dor uterina (Corioamnionite)', 'Apresentação fetal'],
      exame_fisico: {
        geral: [
          { item: 'Especular', achado: 'Visualização de saída de líquido amniótico pelo colo (Manobra de Valsalva positiva)' },
        ],
        abdome: [
          { item: 'Palpação', achado: 'Altura uterina menor que a esperada, partes fetais facilmente palpáveis' },
        ],
      },
    },
    'Trabalho de Parto': {
      queixa_principal: ['Sinto contrações que vêm de 5 em 5 minutos e estão ficando fortes', 'Minha barriga fica dura toda hora e dói muito', 'Soltei um tampão com sangue e as dores começaram'],
      sintomas: ['Contrações uterinas rítmicas e frequentes', 'Eliminação do tampão mucoso', 'Dilatação e apagamento cervical', 'Dor em região lombar e baixo ventre'],
      exames: ['Toque vaginal seriado', 'Cardiotocografia (avaliar contrações e feto)', 'Partograma'],
      especificidades: ['Idade gestacional', 'Integridade das membranas', 'Dinâmica uterina (ex: 3 contrações em 10 min)', 'Desejo de analgesia'],
      exame_fisico: {
        abdome: [
          { item: 'Palpação', achado: 'Contrações rítmicas e dolorosas, útero endurecido periodicamente' },
        ],
        geral: [
          { item: 'Toque Vaginal', achado: 'Dilatação e apagamento progressivo do colo uterino, bolsa íntegra ou rota' },
        ],
      },
    },
    'Sofrimento Fetal Agudo': {
      queixa_principal: ['Não estou sentindo o meu bebê mexer hoje', 'Meu bebê está muito quietinho na barriga', 'Senti que o bebê deu um chute forte e parou'],
      sintomas: ['Diminuição ou ausência de movimentos fetais', 'Alterações na frequência cardíaca fetal', 'Líquido amniótico meconial (se RPM)'],
      exames: ['Cardiotocografia (padrão não tranquilizador)', 'Perfil Biofísico Fetal (PBF)', 'Doppler de artéria umbilical e cerebral média'],
      especificidades: ['Hipertensão gestacional', 'Pos-datismo (> 41 semanas)', 'Restrição de crescimento fetal (RCF)', 'Oligodramnio'],
      exame_fisico: {
        abdome: [
          { item: 'BCF', achado: 'Bradicardia fetal persistente ou desacelerações tardias e variáveis (DIP II)' },
        ],
        geral: [
          { item: 'Movimentação', achado: 'Ausência de movimentos fetais observados' },
        ],
      },
    },
  },
  categories: {
    'Cardiologia': {
      patologia: ['Infarto Agudo do Miocárdio', 'Insuficiência Cardíaca Congestiva', 'Fibrilação Atrial', 'Angina Estável', 'Pericardite Aguda', 'Endocardite Infecciosa', 'Doença de Chagas', 'Estenose Aórtica'],
      queixa_principal: ['Dor no peito opressiva', 'Falta de ar aos esforços', 'Palpitações e tontura', 'Desmaio súbito', 'Inchaço nas pernas', 'Cansaço extremo'],
      sintomas: ['Sudorese fria', 'Tosse seca noturna', 'Cansaço fácil', 'Tontura', 'Edema de MMII', 'Ortopneia', 'Dor pleurítica'],
      exames: ['ECG', 'Troponina', 'Ecocardiograma', 'Holter 24h', 'Teste ergométrico', 'BNP', 'Cateterismo cardíaco', 'MAPA'],
      especificidades: ['Hipertenso', 'Diabético', 'Histórico de IAM', 'Fumante', 'Dislipidemia', 'Doença de Chagas'],
      historico_familiar: ['Pai faleceu de IAM aos 52 anos', 'Mãe com insuficiência cardíaca', 'Irmão com AVC jovem', 'Morte súbita na família'],
      habitos: ['Sedentário', 'Uso excessivo de sal', 'Estresse elevado', 'Tabagismo', 'Etilismo'],
      persona_nome: ['Carlos Alberto', 'Maria das Graças', 'Seu José', 'Dona Francisca'],
      persona_emocional: ['Muito assustado', 'Ansiosa', 'Conformado', 'Negação da doença'],
      persona_contexto: ['Motorista de caminhão', 'Aposentada', 'Empresário', 'Trabalhador rural'],
    },
    'Neurologia': {
      patologia: ['AVC Isquêmico', 'AVC Hemorrágico', 'Epilepsia', 'Esclerose Múltipla', 'Doença de Parkinson', 'Meningite', 'Enxaqueca', 'Doença de Alzheimer', 'Síndrome de Guillain-Barré'],
      queixa_principal: ['Perda de força súbita', 'Dor de cabeça intensa', 'Esquecimento progressivo', 'Tremor nas mãos', 'Convulsão', 'Dormência em um lado do corpo'],
      sintomas: ['Dificuldade na fala', 'Náuseas e vômitos', 'Visão dupla', 'Rigidez muscular', 'Confusão mental', 'Perda de equilíbrio', 'Fotofobia'],
      exames: ['Tomografia de crânio', 'Ressonância de encéfalo', 'Líquor', 'EEG', 'Eletroneuromiografia', 'Doppler de carótidas'],
      especificidades: ['Pós-trauma craniano', 'Uso de anticonvulsivantes irregular', 'Fibrilação atrial', 'HIV positivo', 'Imunossuprimido', 'Janela de trombólise expirada', 'Histórico de AIT prévio'],
      historico_familiar: ['Alzheimer na família', 'Aneurisma cerebral', 'Epilepsia', 'Parkinson', 'Morte súbita jovem'],
      habitos: ['Etilismo', 'Sono irregular', 'Tabagismo'],
      persona_nome: ['Antônio Silva', 'Helena Rodrigues', 'Dona Aparecida'],
      persona_emocional: ['Confuso', 'Deprimida', 'Assustado', 'Irritável'],
      persona_contexto: ['Professor aposentado', 'Cuidadora de idosos', 'Pedreiro'],
    },
    'Nefrologia': {
      patologia: ['Infecção Urinária (ITU)', 'Cálculo Renal', 'Glomerulonefrite', 'Insuficiência Renal Crônica', 'Pielonefrite', 'Hiperplasia Prostática Benigna'],
      queixa_principal: ['Ardência urinária', 'Dor lombar intensa em cólica', 'Urina escura (cor de coca-cola)', 'Inchaço generalizado', 'Sangue na urina', 'Dificuldade para urinar'],
      sintomas: ['Febre e calafrios', 'Náuseas e vômitos', 'Sangue na urina', 'Urgência e frequência urinária', 'Edema', 'Oligúria'],
      exames: ['EAS', 'Urocultura', 'Creatinina e ureia', 'Ultrassom renal', 'Tomografia de abdome', 'PSA'],
      especificidades: ['ITUs de repetição', 'Diabético mal controlado', 'Idoso com prostatismo', 'Uso de sonda vesical de demora', 'Rim único', 'Gestante'],
      historico_familiar: ['Doença renal policística', 'Cálculos renais na família'],
      habitos: ['Baixa ingesta hídrica', 'Dieta hipersódica', 'Uso crônico de anti-inflamatórios'],
    },
    'Pneumologia': {
      patologia: ['Pneumonia Comunitária', 'Asma', 'DPOC', 'Tromboembolismo Pulmonar', 'Tuberculose', 'Derrame Pleural', 'Câncer de Pulmão'],
      queixa_principal: ['Tosse persistente', 'Chiado no peito', 'Dificuldade extrema para respirar', 'Tossindo sangue', 'Dor no peito ao respirar'],
      sintomas: ['Expectoração purulenta', 'Cianose', 'Uso de musculatura acessória', 'Febre', 'Sudorese noturna', 'Emagrecimento'],
      exames: ['Raio-X de tórax', 'Espirometria', 'Gasometria arterial', 'Tomografia de tórax', 'Broncoscopia', 'BAAR de escarro'],
      especificidades: ['Tabagista (40 anos-maço)', 'DPOC prévio (GOLD C)', 'Imunossupressão', 'Contactante de TB', 'Trabalho em mina/pedreira', 'Uso de oxigênio domiciliar'],
      historico_familiar: ['Asma na família', 'Câncer de pulmão', 'Tuberculose'],
      habitos: ['Tabagismo pesado', 'Exposição a poeiras', 'Uso de fogão a lenha'],
    },
    'Gastroenterologia': {
      patologia: ['Doença do Refluxo (DRGE)', 'Úlcera Péptica', 'Cirrose Hepática', 'Pancreatite Aguda', 'Hepatite', 'Doença de Crohn', 'Retocolite Ulcerativa', 'Câncer Colorretal', 'Colelitíase', 'Hemorragia Digestiva Alta (HDA)', 'Doença Celíaca'],
      queixa_principal: ['Queimação no estômago', 'Dor abdominal forte', 'Barriga inchada (ascite)', 'Diarreia com sangue', 'Enjoo e vômito', 'Olhos amarelos', 'Vomitei sangue'],
      sintomas: ['Pirose', 'Náuseas', 'Diarreia crônica', 'Icterícia', 'Hematêmese', 'Melena', 'Perda de peso'],
      exames: ['Endoscopia digestiva alta', 'Colonoscopia', 'Ultrassom de abdome', 'TGO/TGP/GGT/FA', 'Amilase e lipase', 'Bilirrubinas'],
      especificidades: ['Etilista crônico', 'Hepatite B/C crônica', 'Uso de AINEs frequente', 'Obesidade grau III', 'Cirurgia bariátrica prévia', 'Esteatose hepática'],
      historico_familiar: ['Câncer colorretal', 'Doença de Crohn', 'Hepatite'],
      habitos: ['Etilismo crônico', 'Dieta rica em gorduras', 'Sedentarismo'],
    },
    'Endocrinologia': {
      patologia: ['Diabetes tipo 2', 'Diabetes tipo 1', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome de Cushing', 'Obesidade', 'Osteoporose', 'SOP'],
      queixa_principal: ['Muita sede e urinando demais', 'Engordei sem motivo', 'Tremores e coração acelerado', 'Muito cansaço e sonolência', 'Ciclo menstrual irregular'],
      sintomas: ['Polidipsia', 'Poliúria', 'Ganho ou perda de peso', 'Intolerância ao frio/calor', 'Queda de cabelo', 'Acne e hirsutismo'],
      exames: ['Glicemia de jejum', 'HbA1c', 'TSH e T4 livre', 'Perfil lipídico', 'Cortisol', 'Densitometria óssea', 'Insulina e HOMA-IR'],
      especificidades: ['Obesidade sarcopênica', 'SOP', 'Uso de corticoide crônico', 'Histórico familiar de DM1/DM2', 'Gestação atual', 'Sedentarismo'],
      historico_familiar: ['Diabetes na família', 'Tireoide na família', 'Osteoporose'],
      habitos: ['Sedentarismo', 'Dieta hipercalórica', 'Estresse crônico'],
    },
    'Infectologia': {
      patologia: ['Dengue', 'HIV/AIDS', 'Tuberculose', 'Hepatite B', 'Hepatite C', 'Sífilis', 'Meningite', 'COVID-19', 'Malária', 'Leptospirose', 'Hanseníase', 'Leishmaniose Visceral (Calazar)'],
      queixa_principal: ['Febre alta com dor no corpo', 'Febre que não passa há semanas', 'Erupção na pele com febre', 'Tosse há mais de 3 semanas'],
      sintomas: ['Febre', 'Mialgia', 'Cefaleia', 'Linfadenopatia', 'Rash cutâneo', 'Sudorese noturna', 'Emagrecimento'],
      exames: ['Hemograma', 'Sorologias', 'Hemocultura', 'PCR molecular', 'BAAR', 'Teste rápido HIV', 'VDRL'],
      especificidades: ['Imunossuprimido (HIV/SIDA)', 'Não vacinado', 'Mora em área endêmica de malária', 'Profissional de saúde (exposição)', 'Uso de drogas IV'],
    },
    'Reumatologia': {
      patologia: ['Artrite Reumatoide', 'Lúpus Eritematoso Sistêmico', 'Gota', 'Fibromialgia', 'Espondilite Anquilosante', 'Artrose (Osteoartrite)', 'Esclerose Sistêmica'],
      queixa_principal: ['Dor nas juntas', 'Rigidez ao acordar', 'Inchaço articular', 'Dor generalizada no corpo', 'Manchas na pele'],
      sintomas: ['Rigidez matinal', 'Artralgia', 'Edema articular', 'Fadiga crônica', 'Fotossensibilidade', 'Nódulos subcutâneos'],
      exames: ['FAN', 'Fator Reumatoide', 'Anti-CCP', 'VHS e PCR', 'Ácido úrico', 'Raio-X articular', 'Complemento C3/C4'],
      especificidades: ['Mulher jovem em idade fértil', 'Uso de imunossuprimidores', 'Tabagismo', 'Histórico de abortos de repetição', 'Fenômeno de Raynaud'],
    },
    'Ginecologia': {
      patologia: ['Endometriose', 'Mioma Uterino', 'SOP', 'Vulvovaginites', 'DIP', 'Câncer de Colo do Útero', 'Adenomiose', 'Climatério', 'Câncer de Endométrio', 'Infertilidade'],
      queixa_principal: ['Cólica menstrual intensa', 'Sangramento fora do período', 'Corrimento vaginal', 'Fogachos e calorões', 'Dor pélvica crônica', 'Dificuldade para engravidar'],
      sintomas: ['Dismenorreia', 'Dispareunia', 'Leucorreia', 'Sangramento irregular', 'Ondas de calor', 'Infertilidade'],
      exames: ['Papanicolau', 'Ultrassom transvaginal', 'Dosagens hormonais (FSH, LH, Estradiol)', 'Colposcopia', 'Histeroscopia', 'Histerossalpingografia'],
      especificidades: ['Nuligesta', 'Menopausa confirmada', 'Uso de DIU', 'Histórico de ISTs', 'Desejo de gestação', 'Infertilidade primária'],
    },
    'Obstetrícia': {
      patologia: ['Pré-eclâmpsia', 'Diabetes Gestacional', 'Placenta Prévia', 'Descolamento de Placenta (DPP)', 'Ameaça de Parto Prematuro', 'Hiperêmese Gravídica', 'Gravidez Ectópica', 'Ruptura Prematura de Membranas (RPM)', 'Trabalho de Parto', 'Sofrimento Fetal Agudo'],
      queixa_principal: ['Minha pressão subiu e estou com muita dor de cabeça', 'Sinto o bebê mexer menos', 'Tive um sangramento vivo de repente', 'Não consigo parar de vomitar', 'Estou com uma dor muito forte em um lado da barriga', 'Senti um líquido escorrendo pelas pernas de repente'],
      sintomas: ['Hipertensão gestacional', 'Sangramento vaginal', 'Contrações uterinas', 'Cefaleia e escotomas', 'Edema generalizado', 'Perda de líquido amniótico', 'Dor anexial súbita'],
      exames: ['Ultrassom obstétrico com Doppler', 'Cardiotocografia', 'Proteinúria 24h', 'Beta-hCG quantitativo', 'TOTG 75g', 'Teste de cristalização do líquido'],
      especificidades: ['Primigesta', 'Gestação gemelar', 'Idade materna avançada', 'Histórico de pré-eclâmpsia anterior', 'Gestante sem pré-natal', 'Atonia uterina prévia'],
    },
    'Psiquiatria': {
      patologia: ['Depressão Maior', 'Transtorno de Ansiedade Generalizada', 'Síndrome do Pânico', 'Transtorno Bipolar', 'Esquizofrenia', 'TOC', 'TEPT'],
      queixa_principal: ['Estou com uma tristeza constante', 'Tenho crises de ansiedade', 'Não consigo dormir', 'Estou ouvindo vozes', 'Tenho pensamentos de me machucar'],
      sintomas: ['Humor deprimido', 'Anedonia', 'Insônia/hipersonia', 'Agitação', 'Alucinações', 'Ideação suicida', 'Compulsões'],
      exames: ['TSH', 'Hemograma', 'Vitamina B12', 'Glicemia', 'Hepatograma (para medicação)', 'Lítio sérico'],
      especificidades: ['Luto recente', 'Tentativa de suicídio prévia', 'Uso de substâncias (álcool/drogas)', 'Internação psiquiátrica prévia', 'Histórico de trauma na infância', 'Pós-parto (baby blues/depressão)'],
      historico_familiar: ['Depressão na família', 'Esquizofrenia em parentes', 'Transtorno Bipolar', 'Suicídio na família'],
      habitos: ['Sono irregular', 'Etilismo social', 'Tabagismo', 'Sedentarismo'],
    },
    'Dermatologia': {
      patologia: ['Psoríase', 'Dermatite Atópica', 'Acne Vulgar', 'Micose (Tínea/Candidíase)', 'Escabiose', 'Herpes Zóster', 'Melanoma', 'Carcinoma Basocelular'],
      queixa_principal: ['Coceira intensa', 'Manchas na pele', 'Ferida que não cicatriza', 'Pinta que mudou de cor'],
      sintomas: ['Prurido', 'Descamação', 'Eritema', 'Vesículas', 'Placas pruriginosas', 'Alteração de nevos'],
      exames: ['Dermatoscopia', 'Biópsia de pele', 'Exame micológico direto', 'Teste alérgico (prick test)', 'Raspado cutâneo'],
      especificidades: ['Exposição solar intensa sem proteção', 'Histórico de atopia (asma/rinite)', 'Uso de cosméticos oleosos', 'Histórico familiar de melanoma', 'Mora em área rural', 'Contato com animais'],
      historico_familiar: ['Câncer de pele na família', 'Doenças autoimunes', 'Psoríase familiar'],
      habitos: ['Banho quente prolongado', 'Nega uso de protetor solar', 'Tabagismo'],
    },
    'Ortopedia': {
      patologia: ['Lombalgia', 'Hérnia de Disco', 'Fratura de Fêmur', 'Artrose (Osteoartrite)', 'Tendinite', 'Síndrome do Túnel do Carpo', 'Lesão de Menisco'],
      queixa_principal: ['Dor na coluna', 'Joelho estalando', 'Ombro travado', 'Dor ao caminhar', 'Formigamento na mão'],
      sintomas: ['Dor articular', 'Limitação de movimento', 'Rigidez', 'Crepitação', 'Parestesias', 'Edema articular'],
      exames: ['Raio-X', 'Ressonância magnética', 'Tomografia', 'Eletroneuromiografia', 'Densitometria óssea'],
      especificidades: ['Trabalho com esforço físico repetitivo', 'Sedentarismo crônico', 'Idade avançada (> 65 anos)', 'Obesidade', 'Trauma esportivo prévio', 'Osteoporose conhecida'],
      historico_familiar: ['Osteoporose familiar', 'Artrite', 'Hérnia de disco em parentes'],
      habitos: ['Trabalho em pé', 'Sedentário', 'Prática de esportes de impacto'],
    },
    'Pediatria': {
      patologia: ['Bronquiolite', 'Otite Média Aguda', 'Pneumonia', 'Asma Infantil', 'Doenças Exantemáticas', 'Icterícia Neonatal', 'Desidratação'],
      queixa_principal: ['Doutor, meu bebê está com febre e chiado', 'Meu filho está com dor de ouvido', 'Apareceram manchas vermelhas no corpo dele', 'Meu filho não quer comer nada'],
      sintomas: ['Febre', 'Tosse', 'Irritabilidade', 'Recusa alimentar', 'Diarreia', 'Rash cutâneo', 'Choro persistente'],
      exames: ['Hemograma', 'Raio-X de tórax', 'Oximetria', 'EAS', 'Pesquisa viral', 'Triagem neonatal'],
      especificidades: ['Prematuro', 'Frequenta creche', 'Não amamentado exclusivamente', 'Vacinação incompleta', 'Irmãos com sintomas respiratórios', 'Nascimento por cesárea'],
      historico_familiar: ['Asma/Atopia na família', 'Alergia alimentar familiar', 'Doença genética conhecida'],
      habitos: ['Fumantes no domicílio', 'Uso de bico/chupeta', 'Alimentação rica em açúcar'],
    },
    'Clínica Geral': {
      patologia: ['Diabetes tipo 2', 'Hipertensão', 'Anemia', 'Hipotireoidismo', 'Dislipidemia', 'Obesidade', 'Osteoporose'],
      queixa_principal: ['Cansaço e desânimo', 'Muita sede', 'Tontura', 'Ganho de peso inexplicado', 'Dor no corpo todo'],
      sintomas: ['Palidez', 'Queda de cabelo', 'Unhas fracas', 'Fadiga', 'Poliúria', 'Constipação'],
      exames: ['Hemograma', 'Glicemia', 'TSH', 'Perfil lipídico', 'Creatinina', 'TGO/TGP', 'EAS', 'VHS'],
      especificidades: ['Obesidade', 'Sedentarismo', 'Tabagismo', 'Histórico familiar'],
      historico_familiar: ['Diabetes', 'Hipertensão', 'Câncer', 'Doença cardiovascular'],
      habitos: ['Sedentarismo', 'Tabagismo', 'Etilismo', 'Dieta rica em ultraprocessados'],
      persona_nome: ['João da Silva', 'Ana Maria', 'Dona Rosa', 'Seu Pedro', 'Francisca Oliveira'],
      persona_emocional: ['Preocupado', 'Ansiosa', 'Tranquilo', 'Irritado', 'Conformada'],
      persona_contexto: ['Dona de casa', 'Agricultor', 'Professora', 'Comerciante', 'Estudante universitário'],
    },
    'Hematologia': {
      patologia: ['Anemia Ferropriva', 'Anemia Falciforme', 'Leucemia Linfoide Aguda', 'Leucemia Mieloide Crônica', 'Linfoma de Hodgkin', 'Linfoma Não-Hodgkin', 'Púrpura Trombocitopênica', 'Hemofilia', 'Trombocitopenia'],
      queixa_principal: ['Cansaço extremo e palidez', 'Sangramentos frequentes', 'Ínguas pelo corpo', 'Manchas roxas sem bater', 'Febre persistente e perda de peso'],
      sintomas: ['Palidez cutaneomucosa', 'Fadiga', 'Petéquias e equimoses', 'Linfadenopatia', 'Hepatoesplenomegalia', 'Sangramento gengival', 'Febre prolongada'],
      exames: ['Hemograma completo with diferencial', 'Reticulócitos', 'Ferritina e ferro sérico', 'Eletroforese de hemoglobina', 'Mielograma', 'Biópsia de medula óssea', 'LDH e haptoglobina', 'Coagulograma', 'Imunofenotipagem'],
      especificidades: ['Pancitopenia', 'Esplenomegalia', 'Uso de quimioterapia', 'Transfusões frequentes'],
      historico_familiar: ['Anemia falciforme na família', 'Hemofilia', 'Neoplasias hematológicas'],
      habitos: ['Dieta pobre em ferro', 'Exposição a agentes químicos'],
    },
    'Urgência e Emergência': {
      patologia: ['Infarto Agudo do Miocárdio', 'AVC Isquêmico', 'Cetoacidose Diabética', 'Crise Hipertensiva', 'Anafilaxia', 'Pneumotórax', 'Sepse', 'Trauma Cranioencefálico', 'Politrauma', 'Apendicite Aguda', 'Tromboembolismo Pulmonar', 'Edema Agudo de Pulmão'],
      queixa_principal: ['Dor no peito súbita', 'Falta de ar aguda', 'Perda de consciência', 'Febre alta com confusão mental', 'Sangramento intenso', 'Trauma grave', 'Convulsão', 'Reação alérgica grave'],
      sintomas: ['Hipotensão', 'Taquicardia', 'Rebaixamento do nível de consciência', 'Cianose', 'Dispneia aguda', 'Choque', 'Dor torácica', 'Hemiparesia súbita', 'Urticária e edema de glote'],
      exames: ['Hemograma urgente', 'Gasometria arterial', 'ECG', 'Troponina', 'Raio-X de tórax', 'Tomografia de crânio', 'Lactato sérico', 'Hemocultura', 'D-dímero', 'Tipagem sanguínea e prova cruzada', 'Glicemia capilar'],
      especificidades: ['Politraumatizado', 'Rebaixamento de consciência', 'Glasgow < 8', 'Choque séptico', 'PCR (parada cardiorrespiratória)', 'Via aérea difícil'],
      historico_familiar: ['IAM em parentes jovens', 'Morte súbita na família'],
      habitos: ['Uso de drogas ilícitas', 'Etilismo agudo', 'Motociclista sem capacete'],
    },
    'Cirurgia Geral': {
      patologia: ['Apendicite Aguda', 'Colelitíase / Colecistite', 'Hérnia Inguinal', 'Hérnia Umbilical', 'Diverticulite Aguda', 'Obstrução Intestinal', 'Hemorroidas', 'Abdome Agudo', 'Úlcera Perfurada', 'Pancreatite Aguda', 'Trauma Abdominal'],
      queixa_principal: ['Dor abdominal forte', 'Caroço na virilha', 'Dor depois de comer gordura', 'Barriga dura e distendida', 'Sangramento ao evacuar', 'Não consigo evacuar nem soltar gases'],
      sintomas: ['Dor abdominal localizada', 'Náuseas e vômitos', 'Febre', 'Distensão abdominal', 'Parada de eliminação de gases e fezes', 'Defesa abdominal (rigidez)', 'Sinal de Blumberg positivo', 'Sinal de Murphy positivo', 'Sangramento retal'],
      exames: ['Hemograma com leucograma', 'PCR', 'Ultrassom de abdome', 'Tomografia de abdome', 'Raio-X de abdome (em pé e deitado)', 'Amilase e lipase', 'Bilirrubinas', 'TGO/TGP/GGT/FA', 'Coagulograma', 'Risco cirúrgico (ECG + exames pré-op)'],
      especificidades: ['Abdome agudo cirúrgico', 'Sinais de peritonite', 'Cirurgia prévia (aderências)', 'Uso de anticoagulantes', 'Idoso frágil'],
      historico_familiar: ['Colelitíase na família', 'Câncer colorretal', 'Hérnias familiares'],
      habitos: ['Dieta pobre em fibras', 'Constipação crônica', 'Sedentarismo', 'Tabagismo', 'Etilismo'],
      persona_nome: ['Seu Manoel', 'Dona Tereza', 'Marcos Vinícius', 'Joana Souza'],
      persona_emocional: ['Muito assustado', 'Apavorada com cirurgia', 'Impaciente', 'Preocupado com o trabalho'],
      persona_contexto: ['Pedreiro', 'Dona de casa', 'Caminhoneiro', 'Vendedor ambulante'],
    },
    'Oftalmologia': {
      patologia: ['Conjuntivite', 'Glaucoma Agudo', 'Catarata', 'Descolamento de Retina', 'Hordéolo (Terçol)', 'Olho Seco'],
      queixa_principal: ['Meu olho está muito vermelho e coçando', 'Sinto uma dor insuportável no olho e visão embaçada', 'Estou vendo "flashes" de luz e uma mancha escura', 'Parece que tem areia no meu olho'],
      sintomas: ['Hiperemia ocular', 'Prurido', 'Epífora (lacrimejamento)', 'Fotofobia', 'Diminuição da acuidade visual', 'Escotomas'],
      exames: ['Teste de acuidade visual (Snellen)', 'Tonometria de aplanação', 'Mapeamento de retina', 'Biomicroscopia (lâmpada de fenda)'],
      especificidades: ['Uso de lentes de contato', 'Trauma ocular prévio', 'Diabetes/HAS controlado', 'Miopia alta', 'Uso de colírios sem receita'],
    },
    'Otorrinolaringologia': {
      patologia: ['Sinusite Aguda', 'Faringite/Amigdalite', 'Labirintite (VPPB)', 'Epistaxe', 'Rinite Alérgica', 'Surdez Súbita'],
      queixa_principal: ['Sinto um peso no rosto e o nariz entupido', 'Minha garganta dói muito para engolir', 'Tudo gira quando eu deito ou levanto', 'Meu nariz não para de sangrar'],
      sintomas: ['Rinorreia purulenta', 'Febre', 'Vertigem rotatória', 'Zumbido (Tinnitus)', 'Odinofagia', 'Obstrução nasal'],
      exames: ['Nasofibroscopia', 'Audiometria', 'Raio-X de seios da face', 'Manobra de Dix-Hallpike', 'Rinoscopia'],
      especificidades: ['Natação frequente', 'Uso crônico de descongestionante nasal', 'Alergias conhecidas', 'Exposição a ruído ocupacional'],
    },
    'Urologia': {
      patologia: ['Hiperplasia Prostática Benigna', 'Câncer de Próstata', 'Cálculo Ureteral', 'Orquite/Epididimite', 'Torção Testicular', 'Incontinência Urinária'],
      queixa_principal: ['Dificuldade para começar a urinar', 'Sangue na urina', 'Dor insuportável no testículo', 'Não consigo segurar o xixi'],
      sintomas: ['Jato urinário fraco', 'Nictúria', 'Hematúria', 'Edema escrotal', 'Dor lombar súbita'],
      exames: ['PSA', 'Toque retal', 'Ultrassom de próstata', 'Urotomografia', 'EAS e Urocultura'],
      especificidades: ['Idoso (>65 anos)', 'Histórico familiar de câncer de próstata', 'Sedentarismo', 'Uso de testosterona'],
    },
    'Oncologia': {
      patologia: ['Câncer de Mama', 'Câncer de Próstata', 'Câncer de Pulmão', 'Câncer Colorretal', 'Linfoma de Hodgkin', 'Linfoma Não-Hodgkin', 'Leucemia Linfoide Aguda', 'Leucemia Mieloide Crônica'],
      queixa_principal: ['Senti um caroço no peito', 'Emagreci muito sem fazer dieta', 'Sinto muito cansaço e ínguas no pescoço', 'Tosse com sangue'],
      sintomas: ['Massa palpável', 'Perda de peso ponderal (>10%)', 'Sudorese noturna', 'Astenia severa', 'Linfadenopatia indolor'],
      exames: ['Biópsia/Anátomo-patológico', 'Imunohistoquímica', 'Tomografia/PET-CT', 'Marcadores tumorais (CEA, CA-125, PSA)'],
      especificidades: ['Histórico familiar de primeiro grau', 'Tabagismo pesado', 'Exposição ocupacional a carcinógenos', 'Mutações genéticas conhecidas (BRCA1/2)'],
    },
  }
};

export default SUGGESTIONS_DATA;
