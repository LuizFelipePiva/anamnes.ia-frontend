# SPEC-013 — Home como plano de estudos

- **Contexto**: `frontend/anamnes-ia/src/app/MainPage.tsx` (home atual), `docs/FRONTEND.md`, `docs/I18N.md`.
- **Origem**: wireframe conceitual "Home como Plano de Estudos" (artifact `d37f6158`), validado com o time como direção de produto.
- **Status**: 🟢 **todas as fases implementadas e no ar** (2026-08-12) — layout, hero com tendência, domínio, sequência, meta, pendências, os 4 motores de recomendação, o perfil SOAP e o resumo semanal por IA. O resumo foi **ligado** no mesmo dia (front + env do Render), depois de o prompt `weekly-summary-prompt` ser cadastrado no Langfuse e a tabela `weekly_summaries` ir para produção — nesta ordem, porque sem a tabela o cache falha em silêncio e cada carga da home vira uma geração nova.
- **Spec irmã**: SPEC-014 (retomar caso em aberto) — feature que não existe hoje; o bloco "Retomar" desta home depende dela (D2).
- **Escopo**: frontend (`app/MainPage.tsx` + novos componentes) e, nas fases 2/3, backend (`routes/profile.py`, `routes/flashcards.py`, migration em `case_attempts`).

---

## 1. Contexto / Problema

A home atual (`MainPage.tsx`) é um **catálogo**: faixa de marca → saudação com 4 stats → carrossel de histórico → carrossel "Casos de hoje" → módulos de treino → dicas. Ela responde bem à pergunta *"o que existe para eu fazer?"* e mal à pergunta que o aluno realmente tem: ***"o que eu devo fazer agora, e por quê?"***

Consequências observadas:

| Sintoma | Causa na home atual |
|---|---|
| Aluno abre e fecha sem começar caso | Nenhum item é apontado como o próximo passo; a escolha é dele, em cima de cards equivalentes |
| Tentativa em aberto é abandonada | Não há nada na home que mostre "você parou no meio de X" |
| Aluno repete a especialidade em que já é bom | Não há sinal de ponto fraco — as notas só aparecem no Perfil, em outra rota |
| Dados já calculados no backend não são usados | `by_specialty`, `weekly_scores` e `due_count` de flashcards existem e nunca aparecem na home |

A seleção diária de casos (`seededShuffle` com seed `user.id + data`) é **aleatória**: não olha nota, especialidade nem recência. O produto tem os dados para recomendar e hoje sorteia.

---

## 2. Objetivo

Transformar a home em um **plano de estudos**: um painel que abre com o próximo passo recomendado, mostra o progresso real do aluno e explica *por que* cada recomendação está ali — sem virar um dashboard de métricas frias e sem perder o acesso rápido ao catálogo.

Métricas de sucesso (medir 30 dias após o deploy):
- % de sessões que começam um caso a partir da home (baseline a coletar antes).
- % de tentativas `in_progress` retomadas em até 48h.
- Distribuição de tentativas por especialidade menos concentrada (aluno praticando o que erra).

---

## 3. Princípios de design (o "sem cara de IA")

O wireframe é uma referência de **layout e hierarquia**, não de estilo. Regras obrigatórias na implementação:

1. **Zero emoji como ícone.** O wireframe usa 🩺⚠️⏳🎯🔥✨ — na implementação, todos viram ícones `lucide-react` (já é a lib do projeto), tamanho 14–18, dentro dos containers coloridos existentes.
2. **Gradiente só onde o app já usa.** Botão primário (`from-[#844AF5] to-[#6b35ff]`) e barras de nota. Ícones, cards e fundos são cor sólida ou token. Nada de card com gradiente.
3. **Sem inflação de badge/pill.** Máximo um rótulo por bloco. O eyebrow (`text-[11px] font-extrabold tracking-[.16em] uppercase` com barra lateral `border-l-[3px]`) já é o cabeçalho de seção do app — reusar, não inventar outro.
4. **Copy de pessoa, não de gerador.** Motivos de recomendação são frases curtas e concretas ("Nota média 52 nas últimas 3 tentativas"), não slogans ("Desbloqueie seu potencial!"). Nada de "🚀", "insights poderosos", exclamação em série.
5. **Nada de número inventado.** Todo dado exibido vem de fonte real (§4). Widget sem dado **não renderiza** — não usar placeholder/mock/estado "—" decorativo, exceto o empty state especificado.
6. **Manter a assinatura visual da home atual**: fundo aurora + grid de pontos, faixa `#1a1730` com logo, onda SVG de transição, `MainMenu` lateral/topo, cards `rounded-2xl` com `shadow-[0_4px_18px_rgba(19,12,45,.07)]` e borda `#f0eeff`.
7. **Tipografia**: Poppins só em títulos (`h1`/`h2`), corpo no stack do sistema — como já está.
8. **Paleta** (já existente no código): primário `#844AF5`/`#7a55ff`; navy `#1a1730`; sucesso `#18c39a`; atenção `#f0a04b`; alerta `#f04b87`; texto `#20202a`; secundário `#9a9aab`.
9. **Dark mode**: cores novas entram como CSS custom property no tema, nunca hardcoded fora do padrão já usado (`var(--card-divide)` e afins).

---

## 4. Inventário de dados — o que existe hoje

Levantamento feito no código (não presumir nada além disto):

| Dado necessário | Fonte | Situação |
|---|---|---|
| Tentativas do aluno (todas, sem limite), com `status`, `score`, `started_at`, `conversation_id`, `case_title`, `specialty` | `GET /api/profile/me` → `history` (`routes/profile.py:56-60`) | ✅ existe |
| Nota média por especialidade | idem → `by_specialty` (`SpecialtyStats`) | ✅ existe |
| Série semanal de notas | idem → `weekly_scores` | ✅ existe |
| Cota diária (casos/IA) | `GET` de `fetchDailyQuota` | ✅ existe, já na home |
| Casos da turma / gratuitos | `fetchAvailableCases` / `fetchFreeCases` | ✅ existe, já na home |
| Flashcards vencidos (SM-2) | `GET /api/flashcards/decks` → `due_count` por deck (`flashcard_service.py:286`) | ✅ existe (somar no cliente) |
| Módulos de exame físico não treinados | `features/minigame` | ⚠️ verificar se há estado persistido; se não houver, **fica fora** |
| Tendência da nota média (▲/▼ vs. semana anterior) | derivável de `history` no cliente | ✅ derivável |
| Sequência de estudo (streak) | derivável de `history` (dias distintos com tentativa) | ✅ derivável — "melhor marca" também, já que o histórico vem completo |
| Progresso % da tentativa em aberto | — | ❌ **não existe** (ver D2) |
| Perfil SOAP (S/O/A/P por dimensão) | `case_attempts.breakdown` (jsonb), gravado por `cases.py` e agregado em `profile.py::_soap_profile` → `soap_profile` | ✅ desde a fase 3b (2026-08-12); antes o `breakdown` só ia na resposta HTTP e era descartado |
| Meta semanal de casos | — | ❌ não existe conceito de meta (ver D1) |
| Resumo semanal gerado por IA | `GET /api/profile/me/weekly-summary` → `weekly_summary_service`, cache em `weekly_summaries` | ✅ desde a fase 3a (2026-08-12), **ligado** em produção (ver D4) |

---

## 5. Estrutura proposta da página

Ordem vertical (desktop ≥1024px; larguras do container e menu inalterados):

```
[ faixa de marca #1a1730 + onda SVG ]           ← inalterado
[ HERO: saudação + CTA + 4 stats ]              ← mantido, +tendência na nota
[ RETOMAR: tentativa em aberto ]                ← SPEC-014, não entra aqui (D2)
┌──────────────────────────────┬──────────────┐
│ Recomendado pra você (até 4) │ Resumo da    │
│                              │ semana (off) │
│ Histórico — ChatHistory      │ Domínio por  │
│                              │ especialidade│
│                              │ Perfil SOAP  │
│                              │ (≥3 avaliad.)│
│                              │ Sequência    │
│                              │ Meta semanal │
│                              │ Pendências   │
└──────────────────────────────┴──────────────┘
[ Casos de hoje — carrossel ]                   ← mantido, movido para baixo
```

> **Revisão de 2026-08-12 (pós-implementação).** O histórico (D5) desceu para
> dentro da coluna principal, abaixo de "Recomendado pra você" — cabe porque o
> `ChatHistoryCarousel` é lista vertical, não carrossel. E **Módulos de treino
> (`TrainingModules`) e Dicas (`TipsCarousel`) saíram da home**: os componentes
> continuam no repositório, sem consumidor. Decisão do produto, não da spec.
>
> O **Resumo da semana** foi primeiro para o topo da coluna lateral, e no design
> review de 12/08/2026 virou **faixa de largura cheia entre o hero e o grid**:
> é o único bloco de texto corrido da home e em ~380px virava seis linhas
> curtas. Também deixou de ser card escuro — fundo branco, moldura iridescente
> translúcida (`.ai-ring`) e título em gradiente, que é o que comunica "gerado
> por IA". Filete lateral roxo, selo textual "Gerado por IA" e onda de fundo
> foram testados e recusados; o parágrafo não tem teto de medida de leitura.

Grid: `1.65fr 1fr`, `gap-[18px]`, `items-start`. Abaixo de 820px vira coluna única, com a sidebar **depois** da coluna principal. Stats do hero: 4 colunas → 2 colunas.

O slot do bloco **Retomar** fica reservado logo abaixo do hero: quando a SPEC-014 entregar a retomada de caso em aberto, ele é inserido ali sem mexer no resto do layout.

---

## 6. Especificação por bloco

### 6.1 Hero (evolução do existente)

Mantém saudação por horário, CTA "Continuar treino →" e a faixa de 4 stats. Mudanças:

- **Subtítulo dinâmico**: hoje é `home.week_summary` fixo. Passa a resumir o plano — *"Seu plano desta semana está {{pct}}% concluído"*, com `pct = round(completed / WEEKLY_GOAL * 100)` limitado a 100. Aluno sem nenhuma tentativa na semana mantém a copy atual (`home.ready_prompt`).
- **Tendência na nota média**: ao lado do número, `▲6` (`#18c39a`) ou `▼4` (`#f04b87`), calculado como `média(últimos 7 dias) − média(7 dias anteriores)`, arredondado. Renderiza **apenas** se as duas janelas tiverem ≥1 nota. Ícone `TrendingUp`/`TrendingDown`, não caractere.
- Nada mais muda: mesmas 4 métricas, mesma lógica de cota paga/gratuita.

### 6.2 Retomar — **fora desta spec** (D2)

O wireframe traz um card "Continuar de onde parou" com anel de progresso. Retomar uma tentativa `in_progress` **não é uma funcionalidade que o produto tem hoje** — não existe fluxo de voltar ao chat e concluir o SOAP de uma tentativa em aberto, e o percentual de progresso não tem fonte.

Isso vira **SPEC-014 — Retomar caso em aberto**, que precisa definir, no mínimo: o que "retomar" faz (reabrir a conversa? continuar a mesma tentativa?), como a tentativa é fechada/expirada, o que acontece com a cota, e se existe progresso mensurável para o anel.

Esta spec apenas **reserva o slot** abaixo do hero (§5). Nada de card, nada de anel, nada de percentual estimado enquanto a SPEC-014 não fechar.

### 6.3 Recomendado pra você (novo — coração da mudança)

Card com até **4** linhas clicáveis. Cada linha: ícone colorido (40px, `rounded-xl`), motivo em caps, título, meta, e CTA textual à direita.

Motores de recomendação, nesta ordem de prioridade, **no máximo um card por motor**:

| # | Motor | Regra | Motivo exibido | Cor |
|---|---|---|---|---|
| 1 | Ponto fraco | especialidade de `by_specialty` com `average_score` mais baixo, exigindo `attempts >= 3` | "Ponto fraco detectado" + "Nota média {{n}} em {{k}} tentativas" | `#f04b87` |
| 2 | Sem prática | especialidade já praticada cuja última tentativa tem ≥5 dias | "Sem prática há {{n}} dias" | `#f0a04b` |
| 3 | Da sua turma | caso de `fetchAvailableCases` ainda sem tentativa; se houver prazo, o mais próximo primeiro | "Próximo da sua turma" | `#7a55ff` |
| 4 | Manter o ritmo | caso curto (dificuldade básica) quando há streak ativo e nenhuma tentativa hoje | "Mantenha o ritmo" | `#18c39a` |

Regras:
- Um motor sem dado suficiente simplesmente não gera card. Com **zero** cards, o bloco mostra empty state: *"Complete seu primeiro caso para receber recomendações"* + CTA para `/cases`.
- A escolha do caso concreto dentro da especialidade recomendada reusa o pool já carregado (turma + gratuitos), preferindo caso ainda não tentado.
- Cliques respeitam a cota (`quota.regular_available <= 0` desabilita, como hoje) e abrem o mesmo popup de preview já existente.
- **Toda a lógica fica em um hook isolado** (`useStudyPlan`), puro sobre os dados já buscados — testável sem rede e requisito para os testes da fase SDD.

### 6.4 Domínio por especialidade (novo, sidebar)

Barras horizontais: rótulo 92px + trilha 8px + percentual. Fonte: `by_specialty`, ordenado por `average_score` crescente (fraco primeiro — o objetivo é acionar, não premiar), máx. 5 linhas, só especialidades com `attempts >= 1`. Cor da barra por faixa: <60 `#f04b87`, 60–79 `#f0a04b`, ≥80 `#18c39a`. Rótulo sempre via `specialtyLabel(key)` — nunca texto cru.

### 6.5 Sequência de estudo (novo, sidebar)

7 quadrados (segunda→domingo da semana corrente), preenchidos quando houve ≥1 tentativa naquele dia (`history`, fuso local). Hoje recebe borda `#7a55ff`. Rodapé: "**{{n}} dias** seguidos · sua marca é {{max}} dias". Streak = dias consecutivos até hoje/ontem; `max` = maior sequência de todo o histórico.

### 6.6 Meta da semana (novo, sidebar)

Texto "{{feitos}} de {{meta}} casos concluídos" + barra de progresso (altura 10px, gradiente do primário).

- `meta` = **constante `WEEKLY_GOAL = 5`** (D1), exportada de `@/config/constants.ts` — um lugar só, para virar configuração depois sem caçar literal.
- `feitos` = tentativas com `status === 'completed'` na semana corrente (segunda→domingo, fuso local).
- Barra satura em 100% quando `feitos > meta`; o texto continua mostrando o número real ("7 de 5 casos concluídos").

### 6.7 Pendências rápidas (novo, sidebar)

Lista compacta com ícone, título, meta e contador. Itens:
- **Flashcards para revisar** — soma de `due_count` de `GET /api/flashcards/decks`; renderiza só se > 0; navega para `/flashcards`.
- ~~**Módulos de exame físico**~~ — item **cancelado**: além de nunca ter havido estado persistido de conclusão em `features/minigame`, os módulos saíram da home (§5).

### 6.8 Perfil SOAP (fase 3b — ✅ implementado em 2026-08-12)

Mesmo componente de barras de 6.4, com as 4 dimensões (S/O/A/P) e média por dimensão nas últimas N tentativas avaliadas. Ordem **canônica S/O/A/P**, não do mais fraco ao mais forte como em 6.4: aqui a leitura é didática, o aluno reconhece o método na sequência em que aprendeu.

Entregue como:
1. Migration `20260812000000_add_case_attempts_breakdown.sql`: coluna `breakdown jsonb` (nullable) em `case_attempts`.
2. `routes/cases.py` grava o `breakdown` que o `eval_service` já devolvia e era descartado após a resposta HTTP.
3. `routes/profile.py::_soap_profile` agrega e devolve `soap_profile` no payload do perfil.

Duas decisões que a spec deixava em aberto, fechadas na implementação:
- **Onde agregar**: no **backend**, campo novo `soap_profile` — o `breakdown` carrega o feedback textual de cada dimensão, que engordaria o `history` inteiro se o front agregasse.
- **N** = **10** tentativas avaliadas mais recentes (`_SOAP_WINDOW`). Janela móvel: o card reage à evolução do aluno em vez de virar média histórica achatada.

Tentativas antigas ficam sem `breakdown`: o card usa só as que têm, e não renderiza com menos de 3 tentativas avaliadas (`soapDimensions`, regra de UI no front). Um aluno antigo volta a ver o bloco depois de 3 casos novos.

### 6.9 Resumo da semana por IA — ✅ **implementado e ligado** (D4)

Card escuro (`#241f42` → `#1a1730`), ícone `Sparkles`, 2–3 frases de coaching. Primeiro bloco da coluna lateral.

Entregue como:
1. Migration `20260813000000_add_weekly_summaries.sql`: tabela `weekly_summaries` com unique `(student_id, iso_year, iso_week)` — a unique **é** o cache.
2. `services/weekly_summary_service.py`: métricas da semana + `get_prompt("weekly-summary-prompt")` com fallback local + gravação no cache.
3. `GET /profile/me/weekly-summary` (rate limit 10/min), 404 com a flag do backend desligada.
4. `SummaryCard` + `useWeeklySummary` no front, atrás de `WEEKLY_SUMMARY_ENABLED`.

**Duas travas de custo, não uma.** A flag existe nos dois lados: no front (`@/config/constants.ts`) o hook nem dispara o efeito; no backend (env `WEEKLY_SUMMARY_ENABLED`) a rota responde 404. A do front sozinha só evita a chamada — a do backend evita o custo mesmo se alguém bater no endpoint direto. **Ambas estão ligadas em produção desde 12/08/2026**; para desativar a feature, desligue as duas. Continua valendo a trava estrutural: uma linha por aluno por semana ISO, então a segunda visita à home lê do banco.

⚠️ **Ordem ao ligar num ambiente novo**: migration primeiro. `_read_cache`/`_write_cache` engolem exceção de propósito (cache indisponível não pode derrubar a home) — então, sem a tabela, a feature "funciona" e gera um resumo novo a **cada** carregamento. O sintoma é a fatura, não um erro.

Decisões fechadas na implementação:
- **Semana sem atividade não gera resumo** (`attempts == 0` → `None`, nenhuma chamada à IA). Resumo de semana vazia não ensina nada e custaria token.
- **Falha da IA não vira erro na home**: o card some e nada é gravado no cache, então a próxima visita tenta de novo.
- **Trocar de idioma no meio da semana não regenera o texto** — seria até 4× o custo. A coluna `language` guarda em que idioma o resumo nasceu; o cache continua sendo por semana.
- **Prompt com fallback local** (`_WEEKLY_SUMMARY_PROMPT`), mesmo padrão de `eval_service`: a spec pedia "nada hardcoded", mas sem fallback a feature ficaria intestável até o cadastro — e todos os outros prompts do projeto já seguem esse padrão. Consequência a lembrar: editar o prompt no Langfuse **não** atualiza o fallback, que só entra em cena se o Langfuse cair.

Cadastrado no Langfuse (label `production`) em 12/08/2026; o fallback local `_WEEKLY_SUMMARY_PROMPT` permanece no código como rede para quando o Langfuse estiver fora. Variáveis `student_name`, `week_label`, `attempts`, `completed`, `goal`, `avg_score`, `prev_avg_score`, `specialties`, `weak_specialty`, `weak_dimension`, `language_name`.

---

## 7. Fases de entrega

| Fase | Conteúdo | Depende de |
|---|---|---|
| **1** | Reorganização do layout (grid, ordem das seções), hero com tendência, Domínio por especialidade, Sequência de estudo, Meta da semana (`WEEKLY_GOAL = 5`), Pendências (flashcards) | nada — só dado que já existe |
| **2** | Recomendado pra você — `useStudyPlan` com os 4 motores | fase 1 |
| **3a** ✅ | Resumo por IA: migration `weekly_summaries` + serviço + endpoint + card; entregue atrás de flag e **ligado** no mesmo dia | fase 2 |
| **3b** ✅ | Perfil SOAP: migration `breakdown jsonb` + escrita em `cases.py` + agregação `soap_profile` + card | **por último** (D3) — entregue antes da 3a |
| — | Bloco Retomar | **SPEC-014**, fora desta spec (D2) |

Cada fase é entregável e reversível sozinha.

---

## 8. i18n

Fase 0/1 do i18n já cobre a home (`common.json`, namespace `home`). Regras:
- Toda string nova entra em `home.*` nos **4 idiomas** (pt-BR, en, es, ru) — `parity.test.ts` falha se faltar.
- Chaves com contagem usam plural (`_one`/`_other` + formas do russo) conforme SPEC-008; validar com `npm test`.
- Nada de concatenar string com número no JSX — usar interpolação/`Trans`, como o hero já faz.
- Especialidades: `specialtyLabel(key)`, nunca o valor do banco.

## 9. Acessibilidade e responsividade

- Recomendações e Retomar são `<button>`/`<a>` reais, não `div` com `onClick`.
- Barras de progresso: `role="progressbar"` com `aria-valuenow/min/max` e rótulo textual visível.
- Quadrados de streak: `aria-label` com o dia e o estado; a cor não pode ser o único sinal.
- Contraste ≥4.5:1 em light e dark para todo texto sobre cor.
- Breakpoints: `<820px` coluna única; `<640px` stats 2×2; sidebar nunca ganha scroll próprio.

## 10. Fora de escopo

- Ranking / comparação com colegas da turma (decisão de produto: não combina com o tom).
- Notificações, e-mail ou push do plano de estudos.
- Home de professor/admin — esta spec é a home do aluno (`role: student`); professor continua indo para o dashboard atual.
- Redesign do `MainMenu`, do chat ou da página de casos.

## 11. Critérios de aceite

1. Aluno sem nenhuma tentativa vê: hero (stats zerados), empty state de recomendação, "Casos de hoje" — e **nenhum** card vazio de streak/especialidade/pendência.
2. Nenhum bloco "Retomar"/anel de progresso é renderizado nesta entrega (D2) — o slot fica vago até a SPEC-014.
3. Especialidade com `average_score` mais baixo e ≥3 tentativas aparece como primeira recomendação, com o número real na copy.
4. Nenhum número exibido na tela é constante hardcoded ou mock.
5. `npx tsc -b --noEmit`, `npm run lint` e `npm test` passam; paridade de chaves nos 4 idiomas.
6. Sem regressão nas seções mantidas (histórico, casos de hoje) — mesma navegação e mesmo respeito à cota. *(Módulos e dicas deixaram de fazer parte da home — ver revisão em §5.)*
7. Light e dark checados; layout íntegro em 1440, 1024, 820 e 390px.
8. ~~Com `WEEKLY_SUMMARY_ENABLED=false` (default), o card de resumo por IA não renderiza e **nenhuma chamada à OpenAI** parte da home.~~ **Superado**: a feature foi ligada em 12/08/2026. O critério vale hoje como comportamento de *desligamento* — desligar as duas flags tem de devolver a home ao estado sem card e sem chamada, e é o que `useWeeklySummary.test.tsx` (T9.2) trava. O que se verifica no Langfuse agora é o oposto: no máximo **um** trace `weekly-summary` por aluno por semana ISO.

## 12. Decisões fechadas

| # | Decisão | Resposta | Impacto nesta spec |
|---|---|---|---|
| **D1** | Meta semanal | **Fixa em 5 casos/semana para todos** neste primeiro momento. Sem configuração por aluno nem por turma. | Constante `WEEKLY_GOAL = 5` no front. Bloco 6.6 sai da fase 2 e entra na **fase 1** (não depende de backend) |
| **D2** | Progresso da tentativa em aberto | **Retomar caso em aberto não existe no produto hoje** e será uma feature própria, com spec separada. | Bloco "Retomar" (6.2) **sai desta spec**. Vira SPEC-014 |
| **D3** | Persistir `breakdown` SOAP | **Sim** — migration `jsonb` em `case_attempts` + escrita em `cases.py`. Mas **por último**, depois de tudo. | Fase 3b — ✅ entregue em 2026-08-12; agregação no backend (`soap_profile`), janela de 10 tentativas avaliadas |
| **D4** | Resumo semanal por IA | Era "deixar pronto, não ligar" — **revisto no mesmo dia**: com o prompt cadastrado no Langfuse e a tabela em produção, a feature foi ligada. | ✅ fase 3a (2026-08-12): serviço, endpoint, cache `weekly_summaries` e card, com as duas flags **ligadas** em produção. Ver 6.9 |
| **D5** | `ChatHistoryCarousel` | **Permanece**, abaixo do grid. | Confirmado em §5 |
