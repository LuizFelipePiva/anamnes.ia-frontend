# SPEC-014 — Casos de teste (contrato)

Complemento de `SPEC-014-exames-complementares.md`.

**Status: ✅ implementados (2026-08-13)** — 114 testes verdes: 56 pytest (T1–T6 + extras), 20 pytest de ingestão/schema (T7–T8), 30 Vitest (T9–T12), 8 Playwright (T13). Um desvio de recorte no T13, explicado em §13.

Cada caso vira um `def test_...` (pytest) ou um `it(...)` (Vitest), 1:1.

## Camadas (as "de sempre" deste repo)

| Camada | Ferramenta | Arquivos previstos |
|---|---|---|
| Unitário puro (backend) | pytest | `backend/tests/test_spec014_exam_assets.py` |
| Integração de rota | pytest + `TestClient` (`conftest.py`) | idem |
| Script de ingestão | pytest | `backend/tests/test_spec014_ingest.py` |
| Unitário puro (front) | Vitest | `src/features/case/utils/examLabel.test.ts` |
| Componente | Vitest + Testing Library | `src/features/case/components/ExamPicker.test.tsx`, `ExamViewer.test.tsx` |
| **E2E (navegador)** | **Playwright + stack real** | `e2e/exams.spec.ts` |

> **E2E foi adicionado ao repo nesta spec** (2026-08-13). Não existia antes — nem Playwright nem Cypress. Infra instalada e validada: `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/smoke.spec.ts` (4 testes passando contra Supabase local + FastAPI + Vite). Ver `frontend/anamnes-ia/e2e/README.md`.
>
> **Pré-requisito ainda pendente**: seed de autenticação. `supabase/seed.sql` não cria usuário, então nenhum spec E2E com sessão roda hoje. Ver §13.

## Decisão de testabilidade

A lógica que precisa de teste unitário sai das rotas para funções puras, senão só resta testar via HTTP:

```python
# app/services/medical_asset_service.py
def public_url(storage_path: str, base_url: str) -> str: ...
def to_teacher_dto(row: dict, base_url: str) -> dict: ...        # com diagnóstico
def to_student_dto(row: dict, position: int, ordinal: int | None) -> dict: ...  # SEM diagnóstico
def neutral_label_key(modality: str) -> str: ...
```

```ts
// src/features/case/utils/examLabel.ts
export function examLabel(modality: string, ordinal: number | null, t: TFunction): string;
export function filterAssets(assets: MedicalAsset[], query: string, modality?: string): MedicalAsset[];
```

`base_url` é **parâmetro**, não leitura de env dentro da função — sem isso o teste depende do `.env`.

Regras transversais:
- **R1** — nenhuma função pura lança exceção com entrada vazia/desconhecida; devolve o "zero" do tipo ou o fallback documentado.
- **R2** — não mutam a entrada.
- **R3** — nenhuma função pura emite texto de UI: só chave i18n (`exams.modality.<slug>`).
- **R4** — DTO do aluno é construído por função própria, nunca por `del` sobre o DTO do professor.

---

## 1. `to_student_dto` — anti-vazamento de gabarito (§6 da spec)

O grupo mais importante. Se um destes passar a falhar, o produto entrega o diagnóstico de graça.

- **T1.1** — DTO do aluno não contém a chave `display_name`.
- **T1.2** — DTO do aluno não contém a chave `diagnosis_or_finding`.
- **T1.3** — nenhum **valor** do DTO do aluno contém a string de `diagnosis_or_finding` do asset (pega vazamento por `label`, `alt`, `url` ou campo novo). Fixture: asset com diagnóstico `"Pneumotórax"`.
- **T1.4** — DTO do aluno tem exatamente as chaves `{id, label, url, media_type, credits}`. Chave nova no catálogo não entra sozinha (trava R4).
- **T1.5** — `to_student_dto` preserva `credits` quando presente (atribuição de licença é obrigação legal, §9 Q3).

## 2. `neutral_label_key`

- **T2.1** — cada uma das 9 modalidades conhecidas devolve `exams.modality.<slug>`.
- **T2.2** — modalidade desconhecida (`"pet-ct"`) devolve `exams.modality.unknown`, **nunca** o `display_name`.
- **T2.3** — modalidade `None` ou `""` devolve `exams.modality.unknown` sem lançar (R1).
- **T2.4** — retorno é sempre chave i18n, nunca texto pronto (R3): `assert result.startswith("exams.modality.")`.

## 3. `public_url`

- **T3.1** — monta `{base}/storage/v1/object/public/medical-assets/{path}` a partir de `storage_path`.
- **T3.2** — `base_url` com barra final não gera `//` no meio da URL.
- **T3.3** — asset `storage_mode='remote'` usa `remote_url` e ignora `storage_path`.
- **T3.4** — `storage_path` nulo e sem `remote_url` → `None`, sem exceção (R1).

## 4. `PUT /api/cases/{case_id}/exams` — autorização e validação

Padrão do `conftest.py`: `as_role("teacher")`, Supabase mockado.

- **T4.1** — aluno chamando o endpoint → **403**.
- **T4.2** — professor que não é dono do caso → **403**.
- **T4.3** — admin em caso de terceiro → **200** (admin sempre passa, convenção do `RoleRoute`).
- **T4.4** — `asset_id` inexistente → **422** com código de erro estável (SPEC-010).
- **T4.5** — `asset_id` com `attachment_eligible=false` (ex.: gasometria) → **422**.
- **T4.6** — 9 IDs → **422** (limite de 8, §7).
- **T4.7** — lista vazia → **200**, remove todos os vínculos (é o jeito de desanexar).
- **T4.8** — mesma lista enviada duas vezes → estado idêntico, sem duplicata (idempotência).
- **T4.9** — ordem enviada vira `position` 0,1,2… na mesma ordem.
- **T4.10** — mesmo `asset_id` repetido no payload → **422** (ou dedup silencioso — **decidir, ver Q6**).
- **T4.11** — `case_id` não-UUID → **400** pelo `validate_uuid` (convenção do backend).

## 5. `GET /api/attempts/{attempt_id}/exams` — visão do aluno

- **T5.1** — aluno dono da tentativa → **200** com a lista.
- **T5.2** — aluno de **outra** tentativa → **403**.
- **T5.3** — resposta serializa via `to_student_dto`: nenhum item traz `display_name`/`diagnosis_or_finding` (o teste T1 no nível HTTP, porque o vazamento pode nascer da rota e não da função).
- **T5.4** — caso sem exames anexados → **200** com `[]`, não 404.
- **T5.5** — itens vêm ordenados por `position`.
- **T5.6** — `attempt_id` não-UUID → **400**.

## 6. `GET /api/medical-assets` — catálogo do professor

- **T6.1** — aluno → **403** (o catálogo expõe diagnósticos).
- **T6.2** — professor → **200**, só itens com `attachment_eligible=true`.
- **T6.3** — `?modality=ecg` filtra; modalidade inválida → lista vazia, não erro.
- **T6.4** — item traz `diagnosis_or_finding` (aqui é intencional — é o professor).

## 7. Script de ingestão (`ingest_medical_assets.py`)

Roda contra um fake de Supabase no padrão `_FakeSupabase` do `test_spec013_weekly_summary.py`.

- **T7.1** — **idempotência**: rodar duas vezes com o mesmo `registry.json` → mesma contagem de linhas, zero duplicata.
- **T7.2** — asset cujo `sha256` já bate com a linha existente **não** refaz upload (economia de banda e o que torna o re-run barato).
- **T7.3** — `sha256` diferente → refaz upload e atualiza a linha.
- **T7.4** — **encoding**: registry com `"TVP — avaliação"` chega ao banco acentuado, não `"TVP â€” avaliaÃ§Ã£o"`. Regressão do gotcha de UTF-8 (§4.4).
- **T7.5** — os 15 de `dynamic-media.json` entram com `storage_mode='remote'`, `media_type` em `{video, gif}` e sem upload de binário.
- **T7.6** — `--dry-run` não chama `upload` nem `upsert` nenhuma vez.
- **T7.7** — contagem final divergente de `coverage.json` → exit code ≠ 0.
- **T7.8** — `--only-modality ecg` toca apenas assets de ECG.
- **T7.9** — `storage_path` gerado é `assets/<modality>/<filename>`, sem `..` nem barra inicial (path traversal).

## 8. Integridade no banco

Estes tocam schema, não código. Se rodarem contra o Supabase real, ficam marcados `@pytest.mark.integration` e **fora do CI** (a suíte atual não toca serviço externo — `CLAUDE.md`). Alternativa: validar só o SQL da migração.

- **T8.1** — apagar caso remove os vínculos (`on delete cascade`).
- **T8.2** — apagar asset em uso → erro (`on delete restrict`).
- **T8.3** — inserir o mesmo `(case_id, asset_id)` duas vezes → violação de PK.

## 9. Front — `examLabel` (Vitest puro)

- **T9.1** — modalidade conhecida, exame único no caso → `"Eletrocardiograma"` (sem numeração).
- **T9.2** — 2+ exames da mesma modalidade → `"Radiografia 1"`, `"Radiografia 2"`.
- **T9.3** — modalidades diferentes → nenhuma ganha numeração.
- **T9.4** — modalidade desconhecida → `"Exame complementar"`.
- **T9.5** — o rótulo nunca contém o diagnóstico, mesmo se o objeto recebido tiver o campo por engano.

## 10. Front — `filterAssets` (Vitest puro)

- **T10.1** — busca casa em `display_name`, `diagnosis_or_finding` e `tags`.
- **T10.2** — busca é case-insensitive e **ignora acento** (`"pneumotorax"` acha `"Pneumotórax"`) — sem isso o professor não encontra metade do acervo.
- **T10.3** — `modality` + texto combinam (AND).
- **T10.4** — query vazia devolve tudo que é elegível.
- **T10.5** — nunca devolve item com `attachment_eligible=false`.
- **T10.6** — não muta o array de entrada (R2).

## 11. Front — `ExamPicker` (componente)

- **T11.1** — renderiza os assets elegíveis vindos do service mockado.
- **T11.2** — digitar no campo de busca filtra a lista exibida.
- **T11.3** — selecionar um exame o marca; selecionar de novo desmarca.
- **T11.4** — ao atingir 8 selecionados, os demais ficam desabilitados e aparece o aviso do limite.
- **T11.5** — salvar chama o service com a lista de IDs na ordem de seleção.

## 12. Front — `ExamViewer` (componente, visão do aluno)

- **T12.1** — botão "Exames complementares" só aparece quando o caso tem exames.
- **T12.2** — abrir mostra um item por exame, com o rótulo neutro.
- **T12.3** — **o DOM renderizado não contém o texto do diagnóstico** (`queryByText(/pneumotórax/i)` → null). Última linha de defesa do §6.
- **T12.4** — asset com `credits` renderiza a atribuição (fonte + licença).
- **T12.5** — `img` tem `alt` com o rótulo neutro, nunca o diagnóstico (acessibilidade + vazamento por leitor de tela).

---

## 13. E2E — `e2e/exams.spec.ts` (stack real)

Fluxos de ponta a ponta, com banco de verdade. O seed de autenticação existe:
`supabase/seed_e2e.sql` (professor, aluno matriculado, aluno de fora, turma, caso
publicado, 4 assets) + `e2e/fixtures/auth.ts` (login programático).

> **Desvio de recorte, decidido na implementação.** Os cinco casos rodam contra a
> API e o banco reais, **não pelo DOM do chat**. Abrir o visualizador pela UI
> exige uma tentativa com conversa viva, e a primeira mensagem do paciente passa
> pela OpenAI — que `backend/.env.e2e` desliga de propósito (chave dummy, §"Decisões"
> do `e2e/README.md`). Ligar a IA nos E2E trocaria determinismo e custo zero por
> uma dependência paga e instável, para exercitar navegação que não é o objeto
> do teste. As asserções de DOM do visualizador ficam em `ExamViewer.test.tsx`
> (T12.2–T12.5), que renderiza o componente de verdade. O que os E2E provam e o
> Vitest não: autorização real, RLS, join no Postgres e serialização no mesmo
> caminho HTTP.
>
> Consequência a registrar: **nenhum teste cobre hoje a navegação até o botão de
> exames dentro do chat**. Se isso importar, o caminho é um modo de chat sem IA
> no ambiente de teste — não ligar a chave da OpenAI no `.env.e2e`.

Gotchas descobertos ao montar o seed (ambos travariam qualquer spec com sessão):
- **`auth.users` com token NULL quebra o login.** O GoTrue lê `confirmation_token`,
  `recovery_token`, `email_change*`, `phone_change*` e `reauthentication_token` em
  strings Go não anuláveis. Com NULL o login responde `500 "Database error querying
  schema"` — que não aponta para coluna nenhuma. Precisa ser `''`.
- **Domínio `.local` é recusado.** O `email-validator` do backend rejeita TLDs
  reservados (`.local`, `.test`, `.example`). O seed usa `@anamnes-e2e.com`.

- **T13.1** — professor anexa 2 exames e eles persistem: releitura numa requisição nova traz os 2, na ordem enviada. Se só o estado do React tivesse mudado, viria vazio.
- **T13.2** — o aluno da turma recebe os 3 exames com rótulo neutro e numeração resolvida (2 radiografias numeradas, 1 ECG sem número).
- **T13.3** — **nada do que chega ao aluno contém o diagnóstico**: o corpo cru da resposta (não o JSON parseado) não casa com o achado nem traz `display_name`/`diagnosis`. É o T1/T5.3/T12.3 no único nível onde autorização e serialização são reais ao mesmo tempo.
- **T13.4** — aluno **legítimo mas de fora da turma** que force a URL da tentativa recebe 403, não a lista. Impossível de montar com `page.route()`: exige dois usuários reais e o banco de verdade.
- **T13.5** — professor remove um exame; a visão do aluno reflete a remoção na chamada seguinte.

Mais três, que caíram junto por serem baratos no mesmo cenário: o inelegível não aparece no catálogo e é recusado com `asset_not_attachable`; o catálogo é 403 para aluno; e o próprio fixture de login é verificado no navegador (senão uma falha nele apareceria como "403" e mandaria o diagnóstico para o lado errado).

`createAttempt` escreve a tentativa **direto no banco** (service key) em vez de chamar `POST /cases/{id}/start`: aquele endpoint consome a cota diária de 2 tentativas, e a suíte quebraria na terceira execução do mesmo dia — falha intermitente que parece bug do produto e não é.

---

## Questões abertas nos testes

**Fechadas em 2026-08-13:**
- ~~**Q5 — E2E de navegador**~~ → **Playwright com stack completa real**. Infra instalada e validada; specs em §13.
- ~~**Q6 — `asset_id` duplicado no `PUT`**~~ → **deduplicar em silêncio** (T4.10 vira: `["A","A","B"]` → 200 com 2 vínculos).
- ~~**Q7 — integridade do banco**~~ → **validar o SQL da migração** (§8 roda no CI, sem rede).

**Abertas:**
- **Q8 — E2E no CI**: entra no `ci.yml` (exige subir Supabase CLI + backend no runner, minutos por push) ou fica como job manual/nightly? Recomendo nightly ou sob label — a suíte pytest hoje roda em ~2s e vale preservar isso no caminho crítico.
