# SPEC-007 — i18n Fase 0: fundação (lib, locales, seletor, persistência)

- **Contexto**: `docs/I18N.md` (mapeamento e decisões D1–D9, todas 🟢 em 2026-07-23).
- **Status**: 🟢 **implementada** (2026-07-23). Backend + fundação front + piloto `auth` (componentes). Testes: pytest T1–T5 + Vitest T6–T13 verdes; tsc/lint/ruff limpos. Ver §10 (reconciliação com o código existente) e §11 (o que ficou de fora).

---

## 1. Contexto / Problema

O projeto não tem nenhuma infraestrutura de i18n: todas as strings de UI estão hardcoded em pt-BR nos componentes, o backend responde `detail` em pt-BR e os prompts de IA fixam português. Decidido (D1/D5): suportar `pt-BR`, `en` e `es` na UI e na IA, com conteúdo do banco permanecendo pt-BR.

Esta SPEC cobre **somente a Fase 0 — fundação**: instalar a infraestrutura, seletor de idioma, persistência e migrar **uma feature piloto** (auth) como prova do padrão. A extração das demais features (Fase 1), erros por `code` (Fase 2/D4) e prompts de IA (Fase 2) ficam para SPECs seguintes.

## 2. Objetivo

Ao final da Fase 0:
1. `react-i18next` configurado com locales `pt-BR`, `en`, `es` e detecção automática (D2).
2. Usuário troca o idioma em Settings; escolha persiste em `localStorage` **e** no perfil no banco (D3).
3. Feature `auth` 100% traduzida nos 3 idiomas (piloto do padrão de extração).
4. Lint `i18next/no-literal-string` ativo **apenas** na pasta `features/auth` (D9).

## 3. Não-objetivos

- Extrair strings das demais 11 features (Fase 1, incremental — D7).
- `code` de erro no backend (Fase 2 — D4). Erros do backend continuam chegando em pt-BR por ora.
- Idioma nos prompts de IA/Langfuse (Fase 2).
- Tradução de conteúdo do banco: casos, questões, flashcards, especialidades (adiado — D6).
- Formatação `Intl` de datas/números fora da feature auth.

## 4. Requisitos funcionais

### Infraestrutura (frontend)

- **RF1 — dependências**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`. Sem backend de carregamento remoto — dicionários importados estaticamente (bundle).
- **RF2 — estrutura de locales**: `src/locales/{pt-BR,en,es}/<namespace>.json`, um namespace por feature + `common.json` (botões genéricos, navegação, erros de rede). Fase 0 cria `common` e `auth`.
- **RF3 — inicialização**: módulo `src/core/i18n.ts` (ou `core/lib/`) configura i18next com `fallbackLng: "pt-BR"`, `supportedLngs: ["pt-BR", "en", "es"]`; importado uma vez no bootstrap da app (`app/`).
- **RF4 — detecção (D2)**: ordem `localStorage` → `navigator.language` → fallback `pt-BR`. `pt`/`pt-PT` resolvem para `pt-BR`; `en-*` → `en`; `es-*` → `es`; qualquer outro → `pt-BR`.
- **RF5 — tipagem**: chaves tipadas (TS strict/CI): `d.ts` gerado a partir do dicionário pt-BR (fonte da verdade). Chave inexistente = erro de compilação.

### Persistência (D3)

- **RF6 — banco**: coluna `language text not null default 'pt-BR'` (check em `('pt-BR','en','es')`) na tabela `users`, via migration em `supabase/migrations/`. Verificar impacto em RLS (tabela sensível).
- **RF7 — API**: `GET /api/profile` retorna `language`; endpoint de update de perfil aceita `language` validando contra os 3 valores (senão `400`).
- **RF8 — sincronização**: ao trocar idioma na UI: aplica imediato (re-render), grava `localStorage`, e persiste no perfil via API (falha da API não desfaz a troca local — toast de aviso). No login, o valor do perfil **prevalece** sobre o `localStorage`.
- **RF9 — usuário novo**: registro grava o idioma detectado no navegador (D2) como valor inicial no perfil.

### UI

- **RF10 — seletor**: em `Settings.tsx`, seção "Idioma" com os 3 idiomas (nome nativo: "Português (Brasil)", "English", "Español"), seguindo o padrão visual existente da página (tema via CSS custom properties). Ao selecionar `en` ou `es`, exibir aviso "em desenvolvimento" (traduzido) informando que partes da plataforma ainda estão em português (A3).
- **RF11 — piloto auth**: todas as strings visíveis de `features/auth` (Login, RegisterForm, ResetPassword, EmailConfirmed etc.) extraídas para `auth.json` nos 3 idiomas. Interpolação via `t(key, {...})` — proibido concatenar.
- **RF12 — `<html lang>`**: atributo `lang` do documento acompanha o idioma ativo (acessibilidade + evita auto-translate do navegador por cima).

### Qualidade / CI

- **RF13 — lint (D9)**: regra `i18next/no-literal-string` (plugin `eslint-plugin-i18next`) ativada com override **apenas** para `src/features/auth/**`. Demais pastas sem a regra até serem migradas.
- **RF14 — paridade de dicionários**: as três línguas têm exatamente o mesmo conjunto de chaves (teste ou script que compara; chave faltando = falha).
- **RF15 — traduções (D8)**: en/es geradas por IA e marcadas para revisão humana; espanhol em vocabulário latino-americano neutro (A2).
- **RF16 — revisão por não-devs (A1)**: script (`npm run i18n:export` / `i18n:import`) que exporta os dicionários para CSV (`chave · pt-BR · en · es`) e importa de volta preservando estrutura/paridade. Permite que um revisor sem acesso ao código revise numa planilha.

## 5. Casos de teste (suíte aprovada em 2026-07-23 — TDD: escrever antes de implementar)

> Decisão: **suíte completa**, incluindo adicionar **Vitest + Testing Library** ao frontend (que hoje não tem test runner — só lint + tsc). A base de testes de front fica pro projeto todo.

### Backend — `backend/tests/test_spec007_i18n.py` (pytest, padrão dos SPECs anteriores)

| # | Cenário | Esperado |
|---|---|---|
| T1 | `PUT /api/profile` com `language: "es"` | 200; valor persistido |
| T2 | `PUT /api/profile` com `language: "de"` | 400 |
| T3 | `PUT /api/profile` com `language: "pt_BR"` (formato não canônico) | 400 — só `pt-BR`/`en`/`es` |
| T4 | `GET /api/profile` de usuário sem valor definido | `language: "pt-BR"` (default) |
| T5 | Registro com `language` enviado pelo front / ausente | grava o enviado / default `pt-BR` |

### Frontend unitário — Vitest (`src/core/i18n.test.ts`, `scripts/i18n.test.ts`)

| # | Cenário | Esperado |
|---|---|---|
| T6 | `resolveLocale`: `en-US`→`en`; `es-MX`→`es`; `pt-PT`→`pt-BR`; `fr-FR`→`pt-BR` | mapeamento correto |
| T7 | Precedência de detecção | `localStorage` > `navigator.language` > fallback `pt-BR` |
| T8 | Paridade de chaves entre `pt-BR`/`en`/`es` por namespace | falha listando as chaves faltantes |
| T9 | Roundtrip `i18n:export` → editar CSV → `i18n:import` | JSON atualizado; estrutura e paridade intactas |

### Frontend componente — Vitest + Testing Library (`Settings.test.tsx` etc.)

| # | Cenário | Esperado |
|---|---|---|
| T10 | Selecionar "Español" em Settings | UI re-renderiza em es; `localStorage="es"`; PUT com `language:"es"` |
| T11 | Trocar idioma com PUT falhando (mock de rede) | UI permanece no novo idioma; toast de aviso |
| T12 | Boot com perfil `en` e `localStorage` `pt-BR` | UI em `en` (perfil prevalece) |
| T13 | Selecionar `en`/`es` | aviso "em desenvolvimento" visível, no idioma escolhido |
| T13b | Idioma ativo | `<html lang>` acompanha (RF12) |

### Gates de CI (a config é o teste)

| # | Cenário | Esperado |
|---|---|---|
| T14 | String literal JSX em `features/auth` | `npm run lint` falha |
| T15 | `t("auth.chave_inexistente")` | `npx tsc -b --noEmit` falha |

### Checklist manual (no PR)

| # | Cenário |
|---|---|
| T16 | Registro real num navegador em inglês → conta nasce com `language: "en"` |
| T17 | Seletor de idioma visualmente ok em dark e light theme |

## 6. Critérios de aceite

- [ ] T1–T15 automatizados e verdes (pytest + Vitest + gates); T16–T17 verificados manualmente no PR.
- [ ] `features/auth` sem nenhuma string pt-BR hardcoded (lint verde com a regra ativa).
- [ ] Dicionários `pt-BR`/`en`/`es` com paridade de chaves (verificação automática).
- [ ] Migration da coluna `language` aplicada; RLS revisada.
- [ ] `npx tsc -b --noEmit`, `npm run lint`, `ruff check app/` e `pytest` passam.
- [ ] Docs atualizadas no mesmo PR: `docs/I18N.md` (fase 0 ✅), `docs/FRONTEND.md`, `docs/PROJECT.md` (coluna nova), `CLAUDE.md`s das pastas tocadas.

## 7. Arquivos afetados (estimativa)

**Frontend**
- `package.json` — novas deps (i18next + Vitest/Testing Library + script `npm test`).
- `src/core/i18n.ts` (novo) + import no bootstrap (`src/app/`).
- `src/locales/{pt-BR,en,es}/{common,auth}.json` (novos) + `d.ts` de tipagem.
- `src/features/auth/**` — extração das strings (piloto).
- `src/features/settings/pages/Settings.tsx` — seletor de idioma.
- `src/features/profile/**` — tipo/serviço do perfil ganham `language`.
- `eslint.config` — plugin i18next + override em `features/auth`.

**Backend**
- `app/routes/profile.py` — `language` no GET e no update (validação).
- `app/models/schemas.py` — `language` nos schemas de perfil.
- `backend/tests/` — testes da validação de `language`.

**Infra**
- `supabase/migrations/` — coluna `users.language`.

## 8. Decisões (fechadas em 2026-07-23)

- **A1 🟢** — Revisão das traduções por humano, com **fluxo acessível a não-devs**: os dicionários devem poder ser exportados/importados num formato revisável fora do código (planilha CSV `chave · pt-BR · en · es`). Vira o RF16.
- **A2 🟢** — Locale `es` único, vocabulário latino-americano neutro (sem `es-419` separado).
- **A3 🟢** — Seletor disponível já na Fase 0, com **aviso "em desenvolvimento"** ao selecionar en/es (partes da plataforma ainda em português). Incorporado ao RF10.

## 9. Rotas de evolução (escalabilidade)

O design da Fase 0 foi escolhido pela simplicidade; cada ponto abaixo tem rota de upgrade **incremental** que preserva o trabalho feito. Gatilhos documentados pra quem pegar isso no futuro.

### 9.1 Bundle estático → lazy-loading de dicionários

- **Hoje (RF1)**: dicionários importados estaticamente — todos os idiomas vão no bundle. Com 3 idiomas × ~13 namespaces, custo de dezenas de KB gzipped: irrelevante.
- **Gatilho**: peso dos locales passar de ~150–200 KB no bundle (medir no `npm run build`), ou 4º idioma entrar.
- **Rota**: `i18next-resources-to-backend` + dynamic import por idioma/namespace. Mudança só no `core/i18n.ts` — nenhuma chave, componente ou JSON muda.

### 9.2 CSV → TMS (plataforma de tradução)

- **Hoje (RF16)**: export/import CSV pra revisão por não-devs. Funciona bem com 1–2 revisores e revisões esporádicas.
- **Gatilho**: revisão virar rotina (muitas strings novas/semana), 3+ revisores, ou necessidade de histórico/atribuição de quem revisou.
- **Rota**: Weblate / Crowdin / Tolgee (têm tier grátis). Todos importam o JSON do i18next nativamente — o CSV é descartado, os dicionários não.

### 9.3 Higiene de chaves órfãs

- **Problema futuro**: strings removidas da UI deixam chaves mortas nos JSONs (não quebra, só suja).
- **Gatilho**: dicionários visivelmente inchados ou após a migração das 12 features (fim da Fase 1).
- **Rota**: `i18next-parser` no CI acusando chaves não usadas e faltantes. Complementa o teste de paridade (RF14).

### 9.4 Conteúdo do banco (D6 — implementação futura CONFIRMADA)

D6 **vai acontecer** (Fase 3). As fases anteriores devem ser compatíveis — regras pra não fechar portas:

- **Direção arquitetural**: tabela de traduções por entidade (ex.: `case_translations (case_id, language, title, description, …)`), **não** colunas por idioma (`title_en`, `title_es`) — colunas por idioma explodem o schema a cada idioma novo e complicam RLS. A tabela de traduções herda as políticas da entidade pai.
- **Coluna `users.language` (RF6)** é o seletor de conteúdo da Fase 3 — o mesmo valor filtra a tradução servida. Manter os códigos de idioma **idênticos** entre UI, perfil e futuras tabelas de tradução (`pt-BR`, `en`, `es` — nunca `pt_BR`/`ptbr`).
- **Fallback obrigatório**: conteúdo sem tradução no idioma do usuário serve pt-BR (original) — nunca 404/vazio. As queries da Fase 3 nascem com `COALESCE`/join de fallback.
- **Especialidades** (`shared/utils/specialties.ts`): são 14 valores fixos — na prática podem ser traduzidas como **UI** (chaves no dicionário, ex.: `specialties.cardiologia`) já na Fase 1, sem esperar a Fase 3, desde que o **valor persistido** no banco continue sendo o identificador canônico pt-BR atual (só o rótulo exibido é traduzido).
- **Fase 1 não pode**: concatenar conteúdo do banco com strings de UI traduzidas na mesma sentença (ex.: `t("case.intro") + case.title`) — compor via interpolação (`t("case.intro", { title })`) pra sentença sobreviver à Fase 3.
- **O que a Fase 3 vai precisar decidir** (fora desta SPEC): pipeline de tradução médica revisada, versionamento de conteúdo traduzido quando o original muda, e se casos gerados por IA nascem já no idioma do aluno (provável — mais barato que traduzir depois).

## 10. Reconciliação com o código existente (descoberto na implementação)

A premissa "zero i18n" do §1 estava **parcialmente errada**. O código já tinha, no `ThemeProvider` (`core/components/`), um estado de idioma: tipo `Lang` com **5 idiomas** (`pt-BR/en/es/fr/ru`), persistência em `localStorage` por usuário, aplicação de `<html lang>` e um seletor em `Settings` — além de dicionários inline ad-hoc por componente. Decisões tomadas com o dono:

- **fr/ru removidos** (alinha ao D1): fora do tipo `Lang`, do guard, do seletor e do dict inline do `Settings`.
- **Reaproveitar o `ThemeProvider`** como fonte da verdade do `lang` (em vez de um `core/i18n.ts` com detector próprio). O i18next **segue** o `lang` via `i18n.changeLanguage` dentro do `applyLang`.
- Consequência: `<html lang>` (RF12) e persistência em localStorage **já existiam** — a Fase 0 só adicionou detecção via navegador, sincronização do i18next, tipagem de chaves e persistência no perfil.

Arquitetura final da detecção/persistência:
- Precedência resolvida por `detectInitialLang` (função pura, testada): **perfil (via JWT) > localStorage por usuário > navegador > pt-BR**.
- O idioma vai no **JWT** (`create_jwt_token`) e é lido pelo `AuthContext` → passado ao `ThemeProvider` como `profileLang`, que prevalece no login (RF8) — funciona para todos os papéis (o `GET /profile/me` restringe a student/admin, por isso não serve de fonte).
- Troca em `Settings` → `setLang` (imediato) + `localStorage` + `PUT /api/profile/me {language}` (falha não desfaz a troca local).

## 11. O que ficou de fora da Fase 0 (follow-ups)

- ~~**Páginas de auth** (`Login.tsx`, `ResetPassword.tsx`, `EmailConfirmed.tsx`): não extraídas.~~ **Concluído na Fase 1 (2026-07-23):** a feature `auth` inteira está internacionalizada e o lint `no-literal-string` cobre todo `features/auth/**`.
- **Texto jurídico dos Termos de Uso**: extraído para chaves (`auth:terms.*`), mas o conteúdo **en/es está em pt-BR**, marcado para **revisão jurídica** — traduzir texto legal por IA sem revisão tem o mesmo risco do conteúdo clínico (D8). É o único ponto onde a paridade de chaves existe mas o valor ainda não é a tradução final.
- **Backend por `code` de erro (D4)** e **idioma nos prompts de IA**: são Fase 2, não tocados aqui.
- **`Intl` para datas/números**: fora do escopo (auth não tem datas).
