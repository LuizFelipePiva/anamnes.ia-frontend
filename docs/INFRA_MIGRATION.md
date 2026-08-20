# Plano de Migração de Infraestrutura

> Origem: análise de capacidade e teste de carga em 2026-06-29.
> Objetivo: suportar ~70 usuários simultâneos **grátis** agora, com caminho claro para ~200 simultâneos depois.

## Diagnóstico (medido em 2026-06-29)

Teste de carga contra produção (Render Free + Supabase Free + OpenAI Tier 1), feito de dentro de rede corporativa (atrás de proxy → números são **piso/lower-bound**).

| Endpoint | Teto medido | O que limita |
|---|---|---|
| `/api/health/liveness` (CPU pura) | ~113 req/s | CPU do Render (0,1 vCPU) |
| `/api/health` (+1 query Supabase) | **~6 req/s** | **round-trip Render↔Supabase** |

- Uma única query ao banco custa **~1s** mesmo com carga baixa; o throughput trava em ~6 req/s e a latência só cresce (p95 > 5s entre 5 e 15 conexões).
- **Gargalo real: latência de rede entre Render e Supabase**, não CPU nem OpenAI.

### Causa raiz: geografia
- **Render** está em **Virginia (US East)** — e o Render **não tem região na América do Sul**.
- **Supabase** está em **São Paulo** (correto: os usuários são do Brasil; o frontend fala direto com o Supabase para auth).
- Resultado: cada query do backend atravessa Virginia ↔ São Paulo (**~120ms RTT**), e o chat faz 4+ queries sequenciais por mensagem (~500ms só de rede, repetido).

### Por que NÃO mover o Supabase para os EUA
O frontend autentica direto contra o Supabase. Mover o banco para os EUA deixaria o **login lento para todos os usuários brasileiros**. O Supabase está no lugar certo — **a peça fora do lugar é o backend**.

## Capacidade estimada hoje

- **Confortável: ~30–60 alunos** em uso normal.
- O chat engasga acima de **~5–10 simultâneos** (segura a conexão ~3s esperando a OpenAI).

## Plano de migração

### Fase 1 — Grátis, até ~70 usuários (próximo passo)

Mover o **backend para São Paulo**, colocando-o junto do Supabase. Como o Render não tem SP, trocar de host.

| Componente | Plano | Custo |
|---|---|---|
| Backend | **Google Cloud Run** região `southamerica-east1` | Grátis (free tier: 2M req/mês) |
| Banco | **Supabase Free** (já em SP) | Grátis |
| Frontend | Vercel (edge, já perto dos usuários) | Grátis |
| **Total** | | **R$ 0** |

**Por que Cloud Run:** é o único managed que junta os três requisitos — grátis de verdade, região São Paulo e escala automática para a Fase 2 (sem trocar de plataforma de novo). Usa o `Dockerfile` existente (stage `production`).

**Alternativas consideradas:**
- **Fly.io** (`gru`/São Paulo): melhor DX, mas deixou de ter free tier (out/2024, ~$3–5/mês). Boa opção se topar pagar pouco por DX mais suave.
- **Render / Railway / Koyeb**: ótima DX, mas **nenhum tem São Paulo** → não resolvem o gargalo.
- **Oracle Cloud Always Free** (São Paulo): VM grátis pra sempre, mas você gerencia o servidor (SO, deploy, SSL).

**Ganho esperado:** com backend colado no Supabase, o ~120ms × N round-trips some; o teto de ~6 req/s deve subir várias vezes.

**Passos:**
1. Build do `Dockerfile` (stage `production`) e push para Artifact Registry / deploy direto via `gcloud run deploy`.
2. Configurar env vars no Cloud Run (mesmas do `render.yaml`: `SUPABASE_URL`, `SUPABASE_KEY`, `SECRET_KEY`, `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, `OPENAI_MODEL`, `ALLOWED_ORIGINS`, Langfuse, `LOG_LEVEL`).
3. Região: `southamerica-east1`.
4. Atualizar `VITE_API_URL` no frontend para a URL do Cloud Run.
5. Atualizar `ALLOWED_ORIGINS` (CORS) e o domínio.

### Fase 2 — ~200 usuários simultâneos (quando crescer)

Nesta fase o gargalo deixa de ser latência e passa a ser **capacidade do banco e limites de API**.

| Componente | Mudança | Custo aprox. |
|---|---|---|
| Backend | Cloud Run: aumentar `max-instances` + concurrency (automático) | poucos $/mês |
| **Banco** | **Supabase Pro** — mais conexões, mais CPU, sem pausar | **$25/mês** |
| Pooler | Ligar **transaction mode** (porta 6543) | grátis |
| OpenAI | Subir para **Tier 2** (limite de 10k req/dia do Tier 1 trava 200 no chat) | $50 + ~7 dias de espera |

⚠️ **Supabase Pro é obrigatório** para 200 simultâneos — o Free não aguenta tantas conexões. O backend (Cloud Run) escala fácil; o **banco** é quem vira o teto.

## Melhorias de código que ajudam a escalar (independentes do host)

- **`--workers`**: `backend/Dockerfile:45` e `railway.toml:13` usam `--workers 2`, arriscado no Render Free (512MB → OOM). No Cloud Run, dimensionar conforme a memória da instância.
- **Cliente Supabase síncrono** bloqueia o worker async a cada query. Avaliar cliente async / uso do pooler em transaction mode para não serializar as queries.
- **Chat faz 4+ queries sequenciais** por mensagem (`api.py` `/gpt`). Paralelizar ou reduzir round-trips dá ganho direto na latência percebida.

## Como remedir depois da migração

Scripts de teste de carga (sem dependências) foram usados em 2026-06-29:
- `loadtest.ps1` (PowerShell + proxy corporativo) e `loadtest.py` (stdlib).
- Medir `/api/health/liveness` (CPU pura) e `/api/health` (+banco), subindo concorrência em estágios até `p95 > 5s` / erros / 429 / 502-503.
- Converter em usuários: `usuarios_ativos = (req/s no teto) / (ações por usuário por segundo)`.
- Chat não foi testado por concorrência (rate limit 20/min por usuário); para medir latência sequencial, precisa de JWT + thread_id reais.
