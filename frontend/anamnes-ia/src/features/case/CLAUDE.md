# features/case — AI context

Listagem de casos clínicos pelo aluno **e** exames complementares (SPEC-014). Importar via `@/features/case`.

## Arquivos
- `pages/CasesPage.tsx` — listagem de casos disponíveis. **Internacionalizada** (SPEC-007, Fase 1): `useTranslation('case')`; strings em `@/locales/*/case.json`. Datas via `toLocaleDateString(i18n.language)`, plural de expiração via `expiry.days_one/_other`, idade via `t('age', { age })`. Rótulos de dificuldade traduzidos só na exibição (`diffLabel`) — as chaves ('Básico'/'Intermediário'/'Avançado'/'Tudo') seguem sendo os identificadores da lógica de filtro. Especialidades vêm de `@/shared/utils/specialties` e são exibidas via `specialtyLabel(key)` (traduzidas na Fase 1.5); a `key` usada no filtro segue sendo o valor pt-BR do banco. Lint `no-literal-string` ativo nesta feature.
- `mocks/freeCases.ts` — casos gratuitos/demo.
- `index.ts` — barrel export.

## Exames complementares (SPEC-014)

- `types/exams.ts` — `MediaType` é `image | video | gif | audio` (`audio` = ausculta, adicionado em 2026-08-14 pela migração `20260814120000_add_audio_media_type.sql`). Quem consome **precisa** ramificar: áudio caindo no ramo `<img>` vira imagem quebrada e o aluno não descobre que era para ouvir. `MedicalAsset` (visão do professor, **com** diagnóstico) e `StudentExam` (visão do aluno, sem — e **sem `id`**: o do acervo é falante, `RX-PNEUMO-001`, e vazava o gabarito; por isso o `ExamViewer` usa a posição como chave de renderização). Os dois **não** compartilham herança de propósito: se um fosse `Omit<>` do outro, campo novo no catálogo entraria na visão do aluno sem ninguém decidir isso.
- `services/examService.ts` — `fetchMedicalAssets` / `fetchCaseExams` / `saveCaseExams` (professor) e `fetchAttemptExams` (aluno). A rota do aluno é ancorada na **tentativa**, não no caso.
- `utils/examLabel.ts` — `examLabel(modality, ordinal, t)` monta o rótulo neutro **só a partir da modalidade**; `filterAssets(assets, query, modality)` filtra em memória, ignorando acento (sem isso "pneumotorax" não acha "Pneumotórax" e metade do acervo fica invisível). Exporta `MAX_EXAMS_PER_CASE = 8`, espelho do backend.
- `components/ExamPicker.tsx` — seletor do professor. **Lê** o catálogo e cuida da seleção; quem persiste é o pai, via `onSave(ids)` — na criação o caso ainda não tem `id`, então o componente não teria a que anexar. A **ordem de seleção** vira `position` no banco (por isso `selected` é array, não `Set`).
  O card **não é mais um único botão**: a miniatura abre um preview ampliado (lightbox) e o resto do card alterna a seleção — botão dentro de botão é HTML inválido, daí a moldura ser um `div`. Ampliar ≠ selecionar: a miniatura continua clicável no limite de 8, e o preview traz seu próprio botão de selecionar/remover. O lightbox é `createPortal` no `<body>` (o picker mora dentro do modal do `CaseForm`) com `z-[70]` e Esc próprio. `media_type` decide a mídia: `audio` → `<audio controls preload="metadata">` (e a miniatura vira ícone, não `<img>` apontando para o `.mp3`; o `aria-label` passa a ser "Ouvir", não "Visualizar"), `video` → `<video controls>`, o resto `<img>`. Regressões em `ExamPicker.test.tsx` T11.6/T11.7/T11.8.
- `components/ExamViewer.tsx` — visualizador do aluno. Some sozinho quando o caso não tem exames. O `alt` da `<img>` — e o `aria-label` do `<audio>` da ausculta — é o rótulo neutro, nunca o nome do asset (T12.5/T12.7).
  ⚠️ **O modal é montado por `createPortal` no `<body>`, e não in loco.** O header do `StudentChat` usa `backdrop-blur`, que cria **bloco de contenção para descendentes `fixed`** — sem o portal, o `fixed inset-0` se ancora na faixa do header e o modal aparece deslocado. O portal também tira o modal da disputa de empilhamento com o SOAP (`z-50`); daí o `z-[60]`. Regressão travada em `ExamViewer.test.tsx` ("montado no body" + "acima do SOAP"). Ao mover este modal para dentro de qualquer container com `transform`, `filter` ou `backdrop-filter`, o defeito volta.
  Paleta: o chat do aluno é **sempre escuro**, independentemente do tema — o modal segue `#393542`/`#4a4556` como os demais modais do `StudentChat`, não as cores claras do picker.

⚠️ **Regra que não pode quebrar** (SPEC-014 §6): `display_name` é literalmente o diagnóstico — e o `id` do asset e o nome do arquivo no bucket também eram (fechados em 2026-08-14: `id` fora do DTO, `storage_path` derivado do sha256). A defesa é testada em quatro níveis — `to_student_dto` (pytest T1), HTTP (T5.3), DOM (`ExamViewer.test.tsx` T12.3) e stack real (`e2e/exams.spec.ts` T13.3). Ao mexer em qualquer serialização de exame, rode os quatro.

Chaves i18n em `case:exams.*`. `exams.modality.<slug>` é montada em runtime, então está em `USAGE_ALLOWLIST` (`scripts/i18nUsage.mjs`) — o scanner de órfãs nunca vê a chave inteira.

## Depende de
backend `routes/cases.py` (casos, janelas de disponibilidade, `PUT/GET /cases/{id}/exams`) e `routes/medical_assets.py` (`GET /medical-assets`, `GET /attempts/{id}/exams`).

## Quem consome
`features/teacher/components/CaseForm.tsx` (`ExamPicker`, no step de preview) e `features/chat/pages/StudentChat.tsx` (`ExamViewer`, no header da tentativa).
