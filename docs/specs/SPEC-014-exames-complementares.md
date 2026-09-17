# SPEC-014 — Biblioteca de exames complementares anexáveis ao caso

- **Status**: ✅ **implementada** (2026-08-13). Migração, script de ingestão, API, seletor do professor e visualizador do aluno no ar; ~90 testes novos (56 pytest de rota/serviço + 20 de ingestão/schema + 30 Vitest + 8 E2E). Fase 2 (IA) segue fora do escopo — ver F3.
- **Origem do conteúdo**: pacote externo `BIBLIOTECA_EXAMES_REUTILIZAVEIS` (gerado a partir da feature *Trilhas*, que **não** existe neste repo). 316 registros, ~37 MB.
- **Decisões já fechadas pelo usuário** (2026-08-13): storage = **Supabase Storage bucket público**; vínculo = **tabela `case_exam_assets`**; rótulo exibido ao aluno = **neutro automático por modalidade**.

---

## 1. Contexto / Problema

Hoje um caso clínico (`cases`) é 100% textual: `summary`, `patient_prompt`, `form_data`. O aluno conduz a anamnese pelo chat e escreve o SOAP sem nunca ver um exame complementar — o que é uma lacuna clínica real: boa parte do raciocínio diagnóstico depende de interpretar um ECG, uma radiografia, um fundo de olho.

Existe um acervo pronto e curado (o pacote acima) com 316 assets de imagem já normalizados, com IDs estáveis, modalidade, diagnóstico/achado, tags e proveniência. Falta o encanamento: armazenar, deixar o professor selecionar na criação do caso, e exibir ao aluno durante a tentativa.

### 1.1 Anatomia do pacote de origem

```
copiar_para_frontend/
├── public/medical-assets/
│   ├── assets/<modalidade>/<arquivo>       # 301 binários locais (~37 MB)
│   ├── registry.json        # 316 registros, campo a campo (fonte de verdade)
│   ├── picker-index.json    # subconjunto leve p/ o seletor (7 campos)
│   ├── dynamic-media.json   # 15 vídeos/GIFs REMOTOS (Wikimedia)
│   ├── aliases.json         # URL legada das Trilhas → URL central
│   ├── asset-id-by-legacy-url.json
│   └── coverage.json        # contagem por modalidade
└── src/shared/medicalAssets/index.ts   # helper de fetch (não será usado — ver §3)
```

Campos de `registry.json`:

| Campo | Uso nesta spec |
|---|---|
| `id` | Chave primária estável (`DERM-ANGIOMA-001`). É o que o caso persiste. |
| `modality` | 9 valores; deriva o rótulo neutro do aluno (§6). |
| `displayName` | **Contém o diagnóstico** — nunca exposto ao aluno (§6). |
| `diagnosisOrFinding` | Gabarito. Só para professor e, na Fase 2, para a IA. |
| `filename` / `url` | Caminho relativo original; reescrito para a URL do bucket (§4.3). |
| `attachmentEligible` | Filtro do picker: 216 de 316 são `true`. |
| `tags` | Busca textual no picker. |
| `sha256` | Idempotência do script de ingestão (`REMOTE_NOT_STORED` nos 15 remotos). |
| `credits`, `license`, `sourceUrl` | Atribuição obrigatória no viewer quando presentes. |
| `legacyTrailUrls`, `sourceTrail*`, `originalFilename` | **Descartados** — proveniência das Trilhas, sem valor aqui. |

Cobertura por modalidade (`coverage.json`):

| Modalidade | Indexados | Anexáveis |
|---|---|---|
| radiografia | 80 | 80 |
| gasometria | 60 | **0** |
| ecg | 41 | 25 |
| ultrassonografia | 35 (+15 dinâmicos) | 35 |
| tomografia | 32 | 32 |
| espirometria | 30 | 21 |
| fundoscopia | 24 | 24 |
| dermatoscopia | 14 | 14 |
| colonoscopia | 0 | 0 |
| **Total** | **316** | **216** |

Gasometria inteira está fora: são cards/diagramas educacionais (SVG), não laudos brutos. Colonoscopia não tem asset local.

## 2. Objetivo

1. Ingerir o acervo uma única vez para o Supabase (bucket público `medical-assets` + tabela `medical_assets`), de forma **idempotente** e re-executável quando o acervo crescer.
2. Professor anexa exames a um caso via seletor com busca e filtro por modalidade, persistindo **somente IDs** (`case_exam_assets`).
3. Aluno vê os exames anexados durante a tentativa, por um botão "Exames complementares", **sem receber o diagnóstico** no rótulo.
4. Deixar o terreno pronto para a Fase 2 (IA lê os exames na avaliação) sem implementá-la agora.

## 3. Não-objetivos

- **Upload pelo app**: o acervo é curado offline pelo dono do produto. Nem professor nem admin sobem arquivo pela UI. Novos exames entram pelo script de ingestão (§4.4). **Adiado, não descartado** — ver follow-up F1 (§11).
- **Usar o helper `src/shared/medicalAssets/index.ts` do pacote**: ele faz `fetch('/medical-assets/picker-index.json')` de um arquivo estático. Como o catálogo vai para o Postgres, o helper é substituído por um service de feature que chama o backend via `authFetch`.
- **`aliases.json` / `asset-id-by-legacy-url.json`**: existem para migrar as Trilhas, que não estão neste repo. Ignorados.
- **Fase 2 (IA)**: passar imagem para o modelo na avaliação SOAP. Escopo separado (§8).
- **DICOM, PDF, laudos estruturados**: o acervo é só imagem raster/SVG + vídeo. Não abrir o escopo.
- **Tradução do catálogo**: `displayName`/`diagnosisOrFinding` são pt-BR e ficam pt-BR (mesma regra de D6 em `docs/I18N.md` — conteúdo de banco é Fase 3). Só o **rótulo do aluno** é i18n, porque é derivado da modalidade (§6).
- **Gasometria e demais `attachmentEligible: false`**: ingeridos para rastreabilidade, mas invisíveis no picker.

## 4. Ingestão (one-shot, re-executável)

### 4.1 Bucket

Bucket **público** `medical-assets`, caminho **opaco**: `assets/<hh>/<sha256><ext>`, onde `hh` são os dois primeiros caracteres do hash.

> **Revisão de 2026-08-14 (segurança).** A spec original espelhava a origem (`assets/<modality>/<filename>`). Isso vazava o gabarito: o bucket é público e o `src` da `<img>` mostra o caminho inteiro, então `assets/radiografia/rx_pneumo_001.webp` entregava o diagnóstico num clique direito — sem inspetor. Pela mesma razão o **`id` saiu do DTO do aluno** (§6): os identificadores do acervo são falantes (`DERM-ANGIOMA-001`) e viajavam na resposta da API.
>
> Consequências: o caminho no bucket deixou de ser navegável a olho (o mapa é a tabela `medical_assets`); binários byte-idênticos convergem para o mesmo objeto; e a re-ingestão do acervo deixa os objetos do layout antigo órfãos — `--prune-legacy` os apaga, e sem esse passo o vazamento continua servível pela URL antiga.
>
> Fora do alcance desta correção: os **15 assets remotos**, cujas URLs (Wikimedia) trazem nomes descritivos que não controlamos. Fechar isso exige baixá-los para o nosso bucket.

Público (e não URL assinada) porque: o conteúdo não é sensível (imagens didáticas de acervo aberto), URL estável é cacheável pelo CDN, e o custo de assinar cada URL a cada visualização não compra nenhuma proteção real — quem tem o link do caso já tem acesso legítimo.

⚠️ **Egress**: Supabase Free dá 5 GB/mês. Média de ~120 KB/asset; um caso com 4 exames = ~500 KB por aluno na primeira visita (depois, cache do browser). Confortável para as ~30–60 contas atuais (`CLAUDE.md` §Capacity), mas é a primeira métrica a vigiar se a base crescer.

### 4.2 Tabela `medical_assets`

```sql
create table medical_assets (
  id                   text primary key,          -- "DERM-ANGIOMA-001"
  modality             text not null,
  display_name         text not null,             -- contém diagnóstico; nunca vai ao aluno
  diagnosis_or_finding text not null,
  storage_path         text,                      -- "assets/ab/<sha256>.webp" (opaco, §4.1); null se remoto
  remote_url           text,                      -- só para storage_mode='remote'
  storage_mode         text not null default 'supabase'
                       check (storage_mode in ('supabase','remote')),
  media_type           text not null default 'image'
                       check (media_type in ('image','video','gif')),
  attachment_eligible  boolean not null default true,
  tags                 text[] not null default '{}',
  license              text,
  source_url           text,
  credits              jsonb,
  sha256               text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index medical_assets_modality_idx on medical_assets (modality)
  where attachment_eligible;
```

**RLS**: `select` liberado para qualquer usuário autenticado; nenhuma policy de `insert/update/delete` (só a service key do script escreve).

Busca textual: o picker filtra por `display_name`, `diagnosis_or_finding` e `tags`. Com 216 linhas elegíveis (~50 KB de metadados), a decisão é **carregar o catálogo inteiro uma vez no cliente e filtrar em memória** — evita debounce, latência por tecla e um índice `pg_trgm`. Se o acervo passar de ~2000 assets, migrar para busca server-side.

### 4.3 Reescrita de URL

O `url` do registry (`/medical-assets/assets/ecg/x.webp`) é relativo ao `public/` de um front estático e **não é persistido**. A tabela guarda `storage_path`; a URL final é montada no backend:

```
{SUPABASE_URL}/storage/v1/object/public/medical-assets/{storage_path}
```

Assim, trocar de bucket/CDN no futuro não exige tocar em 316 linhas.

### 4.4 Script

`backend/scripts/ingest_medical_assets.py` — one-shot, idempotente, roda com a **service key**:

1. Lê `registry.json` **em UTF-8 explícito** (⚠️ gotcha: os JSONs são UTF-8 sem BOM; ler com o encoding default do Windows corrompe acentos — `"TVP — avaliação"` vira `"TVP â€” avaliaÃ§Ã£o"`).
2. Para cada asset com binário local: `upload` com `upsert=true` em `assets/<hh>/<sha256><ext>` (§4.1). O arquivo é **lido** de `assets/<modality>/<filename>` — a organização do pacote em disco não mudou. Pula se o `sha256` já bater com o da linha existente.
3. `upsert` na tabela por `id`.
4. Para os 15 de `dynamic-media.json`: grava `storage_mode='remote'` + `remote_url` (**ver Q1 em §9**).
5. Ao final, imprime contagem por modalidade e compara com `coverage.json`; diverge → sai com código ≠ 0.

Flags: `--dry-run`, `--only-modality <slug>`.

## 5. Vínculo caso ↔ exames

```sql
create table case_exam_assets (
  case_id    uuid not null references cases(id) on delete cascade,
  asset_id   text not null references medical_assets(id) on delete restrict,
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  primary key (case_id, asset_id)
);
```

- `on delete cascade` no caso: apagar o caso limpa os vínculos.
- `on delete restrict` no asset: **nunca** apagar um asset que algum caso usa. O script de ingestão só insere/atualiza, nunca deleta.
- `position` dá ordem de exibição controlada pelo professor (drag ou ordem de seleção).
- Chave composta em vez de `id` próprio: o par é naturalmente único — o mesmo exame não é anexado duas vezes ao mesmo caso.

**RLS**:
- `select`: quem já pode ler o caso (professor dono, professor da turma, aluno com `case_assignment`). Espelha a policy existente de `cases`.
- `insert`/`delete`: só o `teacher_id` dono do caso, e `admin`.

## 6. Rótulo neutro (anti-vazamento de gabarito)

`display_name` é literalmente o diagnóstico — `"Carcinoma basocelular com estruturas em folha"`, `"Pneumotórax"`. Exibir isso ao aluno junto da imagem entrega a resposta antes de ele raciocinar. É o requisito mais fácil de quebrar por descuido e o de maior impacto pedagógico.

**Regra**: a resposta do endpoint do aluno (§7) **não contém** `display_name` nem `diagnosis_or_finding`. O serializer do aluno é um modelo Pydantic separado, não um filtro aplicado sobre o modelo do professor — assim, um campo novo no catálogo não vaza por omissão.

O aluno vê `t("exams.modality.<slug>")`, resolvido pelo i18n nos 4 idiomas:

| slug | pt-BR |
|---|---|
| `ecg` | Eletrocardiograma |
| `radiografia` | Radiografia |
| `tomografia` | Tomografia computadorizada |
| `ultrassonografia` | Ultrassonografia |
| `fundoscopia` | Fundoscopia |
| `dermatoscopia` | Dermatoscopia |
| `espirometria` | Espirometria |
| `gasometria` | Gasometria arterial |
| `colonoscopia` | Colonoscopia |

Vários exames da mesma modalidade no mesmo caso ficam com rótulo idêntico; desempate por numeração posicional (`Radiografia 1`, `Radiografia 2`), não por conteúdo.

Modalidade desconhecida (asset futuro) cai em `t("exams.modality.unknown")` = "Exame complementar" — nunca no `display_name` como fallback.

## 7. API

| Método | Rota | Quem | Retorna |
|---|---|---|---|
| `GET` | `/api/medical-assets` | teacher, admin | Catálogo elegível: `id`, `modality`, `display_name`, `diagnosis_or_finding`, `url`, `media_type`, `tags`. Filtros opcionais `?modality=`. |
| `PUT` | `/api/cases/{case_id}/exams` | dono do caso, admin | Substitui o conjunto anexado (`{"asset_ids": [...]}`, ordem = `position`). Idempotente. |
| `GET` | `/api/cases/{case_id}/exams` | professor do caso, admin | Lista completa (com diagnóstico). |
| `GET` | `/api/attempts/{attempt_id}/exams` | aluno dono da tentativa | Lista **neutra**: `label`, `url`, `media_type`, `credits`. Sem `id` desde a revisão de 2026-08-14 (§4.1) — nada do lado do aluno depende dele. |

Notas:
- Rota do aluno ancorada na **tentativa**, não no caso: garante que ele só vê exames de um caso que efetivamente iniciou, sem uma segunda checagem de autorização.
- `PUT` valida que todo `asset_id` existe e tem `attachment_eligible = true` → 422 com código de erro estável (`docs/specs/SPEC-010`).
- Limite de **8 exames por caso**, validado no `PUT`.
- Nova camada: `app/services/medical_asset_service.py`. Rotas em `app/routes/cases.py` (caso/tentativa) e um `app/routes/medical_assets.py` para o catálogo.

## 8. Fase 2 — IA (fora do escopo, só o encaixe)

Quando a avaliação usar os exames, o caminho é `eval_service.evaluate_soap` recebendo os assets do caso e montando um bloco de contexto **textual** com `diagnosis_or_finding` + modalidade — não a imagem. Motivo: o gabarito escrito é mais barato, mais determinístico e mais fiel do que fazer o `gpt-4o-mini` reinterpretar a imagem, e o objetivo é avaliar o raciocínio do aluno, não a visão do modelo. Vision entra só se o requisito virar "avaliar a leitura da imagem pelo aluno".

Nada nesta spec bloqueia essa escolha: a tabela guarda os dois (`storage_path` e `diagnosis_or_finding`).

## 9. Riscos e questões abertas

- **Q1 — os 15 vídeos/GIFs remotos (Wikimedia)**: manter `remote_url` (hotlink) ou baixar para o bucket? Hotlink é grátis mas depende de terceiro, exige liberar `upload.wikimedia.org` na CSP e alguns são `.ogv` (sem suporte no Safari). Baixar resolve os três, custa banda no bucket. **Implementado como o pacote traz** (`storage_mode='remote'`, `attachment_eligible` do registry): o script ingere e o viewer só renderiza `<img>`, então mídia dinâmica ainda não aparece na tela do aluno. Fechar em F2.
- ~~**Q2 — CSP**~~ → **fechada, sem ação necessária** (verificado em 2026-08-13). Não existe `Content-Security-Policy` no projeto: `vercel.json` só define `Cache-Control` para `/assets/`, e o `SecurityHeadersMiddleware` emite `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e HSTS — nenhum `img-src`. As imagens do bucket carregam. ⚠️ Se um dia alguém adicionar CSP, `img-src` precisa incluir o domínio do Supabase, senão **esta feature quebra silenciosamente** (imagem vazia, sem erro visível ao usuário).
- **Q3 — atribuição de licença**: assets com `credits`/`license` (CC BY) exigem exibir fonte e autor no viewer. Nos 301 locais o `credits` está majoritariamente vazio; confirmar a proveniência antes de publicar, porque a responsabilidade é do produto, não do pacote. O viewer já renderiza `credits` quando existe (T12.4); o que falta é a **curadoria**, não o código.
- **Q4 — 37 MB no bucket**: cabe folgado em 1 GB do Free, mas some com o `git`. Se o acervo crescer 10×, revisitar.

## 9.1. Desvios da spec durante a implementação

Três pontos saíram diferentes do desenhado, todos por motivo concreto:

1. **`to_student_dto(row, ordinal, base_url)`** em vez de `(row, position, ordinal)`. `position` não aparece em nenhuma das 5 chaves do DTO (T1.4) — ordenar é trabalho de quem monta a lista (`to_student_list`), e um parâmetro sem uso convida a alguém "consertá-lo" errado depois. `base_url` entrou porque o DTO precisa da URL e a spec proíbe ler env dentro da função.
2. **`label` é um objeto `{key, ordinal}`**, não string. Manter "Radiografia 2" traduzível exige separar a chave i18n do número; embutir o número na string obrigaria o backend a escolher o idioma, e um campo `ordinal` solto quebraria T1.4.
3. **`public_url` foi dividida em duas**: `public_url(storage_path, base_url)` (composição pura, T3.1/T3.2) e `asset_url(row, base_url)` (despacha por `storage_mode`, T3.3/T3.4). Com uma função só, T3.3 seria impossível — a assinatura da spec não recebe o modo de armazenamento.

## 10. Casos de teste

Contrato completo em `SPEC-014-casos-de-teste.md` (T1–T13). Arquivos:
`backend/tests/test_spec014_exam_assets.py`, `backend/tests/test_spec014_ingest.py`,
`frontend/anamnes-ia/src/features/case/utils/examLabel.test.ts`,
`.../components/{ExamPicker,ExamViewer}.test.tsx`, `frontend/anamnes-ia/e2e/exams.spec.ts`.

Esqueleto original do que a spec pedia:

- **T1** — `PUT /cases/{id}/exams` por professor que não é dono → 403.
- **T2** — `PUT` com `asset_id` inexistente ou `attachment_eligible=false` → 422.
- **T3** — `PUT` com 9 IDs → 422 (limite de 8).
- **T4** — `PUT` duas vezes com a mesma lista → idempotente, sem duplicata.
- **T5** — **`GET /attempts/{id}/exams` não retorna `display_name` nem `diagnosis_or_finding`** (o teste que trava §6).
- **T6** — `GET /attempts/{id}/exams` de tentativa de outro aluno → 403.
- **T7** — rótulo neutro resolve pela modalidade; modalidade desconhecida → "Exame complementar", nunca o nome do asset.
- **T8** — script de ingestão rodado duas vezes → contagem idêntica, sem duplicata (idempotência).
- **T9** — ingestão preserva acentuação (`"avaliação"`, não `"avaliaÃ§Ã£o"`) — regressão do gotcha de encoding.
- **T10** — apagar caso remove vínculos; apagar asset em uso → erro (restrict).

## 11. Follow-ups (fora desta spec)

### F1 — Endpoint admin de upload de exames

Decisão de 2026-08-13: **nesta spec, só o script** (§4.4). O endpoint fica anotado para uma spec própria, quando rodar o script na máquina local virar incômodo.

O que essa spec futura precisa cobrir — nada disso é difícil isoladamente, mas é o motivo de não enxertar aqui:

- `POST /api/admin/medical-assets` — **admin only**, multipart. Rate limit próprio (upload é caro).
- **Validação por magic bytes**, nunca pelo `Content-Type` do request, que o cliente controla.
- **Sanitização de SVG** — 90 dos 316 assets do acervo são SVG, e SVG aceita `<script>` embutido. Renderizado via `<img>` o script não executa, mas o arquivo fica numa URL pública do bucket: abrir direto no navegador executa no domínio do Supabase. Com carga por script curado o risco é controlado pela curadoria; com endpoint, sanitizar (ou converter para raster) passa a ser obrigatório.
- **Limite de tamanho** e nome de arquivo normalizado (sem path traversal no `storage_path`).
- **Geração do `id` estável** no padrão `MODALIDADE-DIAGNOSTICO-NNN`, com colisão resolvida pelo sufixo numérico.
- **Formulário de metadados**: modalidade, diagnóstico/achado, tags, `attachment_eligible`, licença/créditos. Sem isso o asset entra no catálogo sem ser buscável no picker.
- Tela em `features/admin/`.

Enquanto F1 não existe, o caminho de entrada continua sendo: colocar o arquivo na pasta do acervo, atualizar o `registry.json` e rodar `ingest_medical_assets.py` (idempotente — reprocessar o acervo inteiro é seguro).

### F2 — Mídias dinâmicas (vídeo/GIF)

Os 15 assets remotos do Wikimedia (Q1, §9). Exige `<video>` no viewer, decisão sobre hotlink vs. download para o bucket e CSP para `upload.wikimedia.org`.

### F3 — Fase 2 da IA

Ver §8.
