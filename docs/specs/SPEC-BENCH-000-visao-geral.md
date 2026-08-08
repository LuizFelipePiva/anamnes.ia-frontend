# SPEC-BENCH-000 — Bancada de avaliação de LLM (visão geral)

- **Projeto**: `anamnes-bench` — **repositório separado**, fora deste monorepo.
- **Este documento vive aqui** porque metade do contrato é com o anamnes.ia (o SUT). A implementação, porém, acontece no outro repo. Um chat que só tenha o repo da bancada consegue trabalhar lendo só este arquivo.
- **Status**: 🔵 rascunho — visão geral e objetivos. Casos de teste e implementação vêm depois (fluxo SDD).
- **Origem**: auditoria de contexto do chat (2026-07-31) que gerou a [SPEC-012](SPEC-012-chat-contexto-e-rag.md). Cinco defeitos passaram despercebidos em produção porque **nada mede coerência entre turnos**. A bancada existe para que isso deixe de ser verdade.

---

## 1. Contexto / Problema

O anamnes.ia tem três componentes de IA em produção e **zero avaliação automatizada** deles:

| Componente | Onde | O que pode dar errado sem ninguém ver |
|---|---|---|
| Paciente virtual | `chat_service.handle_chat_message` | Contradiz dado que ele mesmo deu; sai do personagem; vaza prompt; usa vocabulário técnico |
| Avaliador SOAP | `eval_service.evaluate_soap` | Infla nota; feedback genérico; ignora peso do professor |
| Gerador de casos | `generation_service.generate_case` | Caso incoerente; sem achados objetivos (P5 da SPEC-012) |

O único teste hoje é humano, manual e não repetível. Não há como responder "essa mudança de prompt melhorou ou piorou?".

Restrições que moldam a solução:

- **Custo**: não há orçamento para rodar paciente + judge pagos em volume. Daí o modelo local.
- **Hardware**: 8GB de VRAM nas duas máquinas (trabalho: i7 13ª gen; casa: Ryzen 7 5700X). Não cabem dois modelos carregados ao mesmo tempo.
- **Cadência**: o judge roda em **baterias**, não continuamente.
- **Escopo**: projeto de estudo. Explicitamente **não** será reaproveitado no trabalho.

## 2. Objetivo

1. Rodar **baterias reproduzíveis** de conversas simuladas contra o anamnes.ia e produzir notas por dimensão.
2. Suportar **modelo local e API, com switch**, em cada papel independentemente — não porque um seja melhor, mas porque **estudar os dois é um objetivo do projeto**.
3. Materializar transcripts em disco, para que iterar na rubrica do judge não custe uma nova rodada de simulação.
4. Publicar resultados no **Langfuse** (dataset runs + scores), reaproveitando a instância que o anamnes.ia já usa.
5. Ter um **núcleo genérico** (runner, providers, rubricas) separado das **suítes acopladas ao produto** — modelo pytest/promptfoo, para que a bancada sirva a outros SUTs depois.
6. Preparar terreno para uma **UI de configuração** (edição de suítes, switch de provider, leitura de relatórios) sem que ela vire o centro do sistema.

## 3. Não-objetivos

- **Não** é framework de avaliação genérico publicável. É bancada de estudo.
- **Não** treina nem faz fine-tune de modelo. "Treino" aqui significa *iterar prompt e rubrica*, não gradiente.
- **Não** roda em CI do anamnes.ia (bateria leva dezenas de minutos e gasta token).
- **Não** substitui os testes de `backend/tests/` — aqueles são determinísticos, estes são estatísticos.
- **Não** avalia o frontend nem o fluxo de UI.
- **Não** implementa a UI no primeiro milestone. A UI lê e escreve `suite.yaml`; o CLI vem primeiro.
- **Não** altera código de produto do anamnes.ia além do necessário para destravar a bateria (§7).

## 4. Arquitetura

### 4.1 Duas fases

Os 8GB de VRAM proíbem simulador e judge simultâneos. A separação vira vantagem:

```
FASE 1 — simulate                        FASE 2 — judge
┌────────────────┐                       ┌────────────────┐
│ simulador      │                       │ judge          │
│ (provider A)   │                       │ (provider B)   │
└───────┬────────┘                       └───────┬────────┘
        │ turno a turno                          │ lê transcript inteiro
        ▼                                        ▼
┌────────────────┐   runs/<run_id>/       ┌────────────────┐
│ SUT: anamnes.ia│──transcripts.jsonl────→ │ scores.jsonl   │
│ via HTTP       │   + meta.json           └───────┬────────┘
└────────────────┘                                 │
                                            Langfuse (run + scores)
```

`transcripts.jsonl` é o artefato central. Regravar rubrica e re-julgar **não** re-executa a fase 1.

### 4.2 Camadas

```
anamnes-bench/
├── core/                  # genérico, não sabe o que é anamnese
│   ├── providers/         # openai_compatible.py — local e API pelo mesmo cliente
│   ├── runner/            # loop de turnos, retry, rate limit, artefatos
│   ├── judge/             # aplica rubrica sobre transcript
│   └── report/            # agregação, comparação entre runs
├── adapters/
│   └── anamnesia.py       # SUT: fala HTTP com o backend
├── suites/
│   └── paciente-coerencia/suite.yaml
├── runs/                  # artefatos (git-ignored)
└── cli.py
```

**Regra**: `core/` nunca importa `adapters/`. Um SUT novo é um arquivo em `adapters/` implementando o protocolo de §5 RF3.

### 4.3 Providers

Local e API entram pelo **mesmo cliente OpenAI-compatível**, mudando só `base_url` e `model`. Ollama e vLLM expõem `/v1`. Isso é o que torna o switch uma linha de config, não um `if` espalhado.

⚠️ Armadilha conhecida: o Ollama usa `num_ctx` **4096 por padrão** e **trunca silenciosamente** acima disso. Uma conversa de 30 turnos passa disso fácil. `num_ctx` é obrigatório na config do provider local.

## 5. Requisitos funcionais

**Núcleo**

- **RF1** — Executar uma suíte a partir de `suite.yaml`, sem argumentos obrigatórios além do caminho.
- **RF2** — Fase 1 e fase 2 executáveis **separadamente** (`bench simulate` / `bench judge <run_id>`) e em conjunto (`bench run`).
- **RF3** — SUT atrás de um protocolo mínimo: `start(case_id) -> session`, `send(session, texto) -> resposta`, `finish(session) -> artefatos opcionais (ex.: avaliação SOAP)`.
- **RF4** — Providers configurados por papel (`simulator`, `judge`), cada um apontando para uma entrada de `providers`. Trocar local↔API é editar uma palavra no YAML.
- **RF5** — `transcripts.jsonl`: uma linha por conversa, com `run_id`, `persona`, `case_id`, `repetition`, `seed`, lista de turnos (papel, conteúdo, latência, tokens quando disponível) e motivo de término.
- **RF6** — `meta.json` por run: hash da suíte, versão dos prompts, provider/modelo de cada papel, timestamp, versão do SUT (commit do backend, se obtível).

**Simulação**

- **RF7** — Persona = objetivo + estilo + critério de parada. O simulador recebe só o que um aluno saberia — **nunca** o `patient_prompt` nem o diagnóstico.
- **RF8** — Critérios de término: objetivo cumprido, teto de turnos, ou detecção da mensagem de limite do SUT.
- **RF9** — `repetitions` por (persona × caso), para medir variância. Temperatura e seed registrados.

**Judge**

- **RF10** — Rubrica declarativa: dimensões com escala (1–5 ou binária) e **âncoras textuais** por ponto da escala. Âncora é o que separa judge de gerador de números.
- **RF11** — Uma chamada por conversa por padrão; saída JSON estruturada com nota + justificativa por dimensão.
- **RF12** — O judge **nunca** vê qual provider gerou a conversa (evita viés de rótulo).
- **RF13** — Dimensão sem calibração aprovada (§9) é marcada `uncalibrated` no relatório e não entra em agregado.

**Relatório e observabilidade**

- **RF14** — Sumário por dimensão: média, desvio, pior conversa (link para o transcript).
- **RF15** — Comparação entre dois `run_id` (antes/depois de mudar prompt), com delta por dimensão.
- **RF16** — Publicação no Langfuse: a suíte vira **Dataset**, cada bateria vira **Dataset Run**, cada dimensão vira **Score**. Langfuse ausente **não** quebra a bateria — degrada para arquivo local.

## 6. Requisitos não-funcionais

- **RNF1** — Bateria interrompida é retomável: fase 2 roda sobre transcripts parciais.
- **RNF2** — Nenhum segredo em `suite.yaml`. Chaves só por variável de ambiente.
- **RNF3** — A bancada **nunca** aponta para produção. O adapter recusa `base_url` que não seja localhost/staging, salvo flag explícita.
- **RNF4** — Concorrência configurável e por padrão baixa (o SUT é rate-limited — §7).
- **RNF5** — Custo estimado impresso **antes** de disparar bateria com provider de API.

## 7. Contrato com o anamnes.ia

A bateria esbarra em limites reais do backend. Todos já são configuráveis — a saída é um **perfil de ambiente de teste**, não código novo no produto.

| Limite | Onde | Impacto | Ação |
|---|---|---|---|
| `/api/gpt` 20 req/min | rate limit `slowapi` | 20 conversas × 30 turnos = 600 chamadas ⇒ **piso de 30 min**, sem concorrência | 🔴 bloqueante — precisa ser configurável por env |
| `gpt_daily_message_limit` = 100 | `platform_settings` | bateria estoura na 4ª conversa | 🔴 bloqueante — elevar no ambiente de teste ou usar N usuários |
| `gpt_max_turns` = 30 | `platform_settings` | define o teto de turno da persona | 🟡 ok, só precisa ser lido pela bancada |
| Auth Supabase | JWT | bancada precisa de usuário-aluno semeado | 🟡 seed de usuário + casos fixos |

Casos usados na bateria devem ser **fixos e versionados** (seed), não gerados na hora — senão o resultado não é comparável entre runs.

## 8. `suite.yaml` — formato

Mesmo arquivo lido pelo CLI e, futuramente, editado pela UI. Se ele estiver certo, a UI é um formulário.

```yaml
name: paciente-coerencia
sut:
  kind: http
  base_url: http://localhost:8000/api
  auth: { kind: supabase_jwt, user_env: BENCH_USER_TOKEN }

providers:
  local: { base_url: http://localhost:11434/v1, model: qwen2.5:7b-instruct-q4_K_M, num_ctx: 16384 }
  api:   { base_url: https://api.openai.com/v1, model: gpt-4o-mini }

roles:
  simulator: local     # volume alto (30 chamadas/conversa) → local
  judge:     api       # volume baixo (1 chamada/conversa) → qualidade

personas:
  - id: direto
    goal: "Conduzir anamnese completa em até 25 turnos."
  - id: pede-exame-e-questiona
    goal: "Pedir sinais vitais, depois questionar o valor informado."   # regressão da SPEC-012

cases: [ "<uuid-caso-1>", "<uuid-caso-2>" ]

rubric:
  - id: coerencia_entre_turnos
    scale: [1, 5]
    anchors:
      1: "Contradiz dado objetivo que ele mesmo forneceu antes."
      3: "Não contradiz, mas evita reafirmar dados anteriores."
      5: "Mantém todos os dados objetivos consistentes ao longo da conversa."
  - id: persona_leigo
    scale: [1, 5]
  - id: nao_vaza_prompt
    scale: binary

run: { repetitions: 3, seed: 42, concurrency: 1 }
```

## 9. Protocolo de calibração do judge

**Nenhuma dimensão vale nota antes de passar por isto.** Judge não calibrado faz otimizar o produto contra o ruído do avaliador.

1. Rodar a fase 1 e gerar 20 transcripts.
2. **Humano** pontua os 20 na rubrica, às cegas (sem ver nota de IA). Human annotation do Langfuse serve.
3. Rodar o judge nos mesmos 20.
4. Concordância por dimensão: **Spearman ρ** para escala 1–5, **Cohen's κ** para binária.
5. Corte: **κ ≥ 0,60** / **ρ ≥ 0,70**. Abaixo disso, reescrever a âncora e repetir, ou aposentar a dimensão.
6. Recalibrar sempre que trocar o modelo do judge ou mexer na rubrica.

É uma tarde de trabalho, uma vez por rubrica. É o que separa bancada de teatro.

## 10. Decisões

- **E1 — Repositório separado.** Motivo declarado: a UI de configuração e o switch local↔API pedem ciclo de vida próprio. Custo aceito: o limite com o anamnes.ia vira **HTTP**, o que traz os limites de §7 para dentro do escopo.
- **E2 — Duas fases com artefato intermediário.** Forçado por VRAM; mantido mesmo se a VRAM crescer, porque desacopla iteração de rubrica de custo de simulação.
- **E3 — Local e API convivem, sempre.** Custo é o motivo do local; **estudo dos dois é objetivo próprio**. Nenhum papel fica preso a um provider.
- **E4 — Padrão inicial: simulador local, judge na API.** O simulador é o glutão (30 chamadas/conversa); o judge lê o transcript uma vez (~$0,05 por bateria de 20 no gpt-4o-mini). Isso é **padrão, não regra**: judge local é primeiro-classe e é justamente o que o protocolo de §9 existe para validar.
- **E5 — O judge não vê o gabarito do caso, só o transcript e a rubrica**, exceto em dimensões que exijam ground truth (aí o gabarito entra explicitamente na rubrica).
- **E6 — Casos de bateria são fixos e versionados**, não gerados por IA na hora.
- **E7 — Langfuse é opcional.** Mesma decisão que o anamnes.ia já tomou para produção.

## 11. Milestones

| # | Entrega | Critério de pronto |
|---|---|---|
| **M0** | 1 persona, 1 caso, 1 dimensão (`coerencia_entre_turnos`); fases 1 e 2; saída JSONL. Sem UI, sem Langfuse, sem calibração. | A bateria detecta sozinha o bug do `[NARRADOR]` (SPEC-012 P1) |
| M1 | Switch de provider funcionando nos dois papéis; `num_ctx` correto; custo estimado | Mesma suíte roda 100% local e 100% API |
| M2 | Rubrica completa + calibração (§9) | ρ/κ acima do corte em ≥ 2 dimensões |
| M3 | Langfuse (dataset run + scores) e comparação entre runs | Delta antes/depois de uma mudança de prompt |
| M4 | Segundo SUT: avaliador SOAP | `core/` não precisou mudar |
| M5 | UI de configuração e relatório | Edita `suite.yaml` e dispara bateria |

## 12. Questões abertas

- **Q1 🔴** — Os 8GB de VRAM são **GPU NVIDIA dedicada ou iGPU Intel**? Define o modelo local viável e o tempo de fase 1. iGPU muda o cálculo por completo.
- **Q2** — Modelo local do simulador: partir de um 7–8B instruct em Q4_K_M. Escolha final depende de Q1.
- **Q3** — Persona precisa de "conhecimento clínico" para conduzir bem a anamnese? Um 7B pode não saber o que perguntar. Alternativa: roteiro semiestruturado por persona.
- **Q4** — Métrica de custo por bateria: instrumentar tokens do SUT exige acesso ao Langfuse do produto, não à resposta HTTP.

## 13. Próximo passo (fluxo SDD)

Este documento é a **spec de visão**. Seguindo o processo da casa:

1. ✅ Spec geral (este arquivo).
2. ⬜ Casos de teste do M0 — definidos pelo usuário.
3. ⬜ Implementação, no repositório `anamnes-bench`.

Nada deve ser implementado antes do passo 2.
