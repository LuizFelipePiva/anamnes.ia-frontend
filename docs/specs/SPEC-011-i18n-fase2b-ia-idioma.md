# SPEC-011 — i18n Fase 2B: idioma do usuário nos prompts de IA

- **Contexto**: `docs/I18N.md` (decisão **D5**, item 2.5 do escopo por camada). Fase 0 = `SPEC-007` (que já pôs `language` no JWT). Fases 1 e 1.5 (UI) ✅.
- **Par**: `SPEC-010-i18n-fase2a-erros-backend.md` (códigos de erro estáveis). As duas formam a Fase 2 e são **independentes** — tocam arquivos e linhas distintos, podem ser implementadas em qualquer ordem, sem bloqueio mútuo.
- **Status**: 🟢 **implementada (2026-07-31)**. T1–T9 verdes, `ruff check app/` limpo, suíte completa sem regressão (166 testes após o adendo). **Ver §10 — adendo de 2026-07-31**: a spec original cobriu 2 dos 3 prompts de paciente; o `ai-patient-prompt` (saudação inicial do Chat IA) ficou de fora e foi corrigido depois. Pendente: passo manual no Langfuse (§6), agora nos **três** templates.

---

## 1. Contexto / Problema

O paciente virtual e o avaliador SOAP respondem sempre em português, independente do idioma que o aluno escolheu na UI. A causa não é falta de dado: a Fase 0 já colocou o idioma no **claim `language` do JWT** (`auth/service.py::login` → `create_jwt_token`), disponível em qualquer rota via `Depends(verify_jwt_token)` — **sem round-trip ao banco**. O que falta é o prompt dizer ao modelo em que idioma responder.

### 1.1 Como os prompts são montados hoje

Arquitetura em camadas: `routes/*.py` → `services/{chat,eval}_service.py` → `services/openai_service.py` (única camada que fala com OpenAI/Langfuse).

Cada service monta o prompt com um par **template gerenciado + fallback local**:

```python
# padrão comum aos dois services
get_prompt("patient-system-prompt", patient_prompt=patient_prompt)   # Langfuse
_PATIENT_SYSTEM_PROMPT.format(patient_prompt=patient_prompt)         # fallback local
```

`openai_service.get_prompt(name, **variables)` só repassa as variáveis ao `.compile()` do Langfuse. `complete()`/`complete_json()`/`complete_with_files()` recebem `messages` já prontos — **nenhuma dessas assinaturas precisa mudar**. O idioma entra uma camada acima, na montagem do prompt.

Nenhum dos services recebe hoje objeto de usuário: só strings de negócio já resolvidas pela rota (`patient_prompt`, `soap_content`, `case_summary`, …). `chat_service` recebe `user_id`, mas apenas para lookup/log — não chega ao prompt.

### 1.2 Pegadinha: a avaliação SOAP tem dois caminhos

`cases.py` chama `evaluate_soap` em **dois lugares distintos**:

- `cases.py:950` — via o import do topo (`from app.services.eval_service import evaluate_soap as _ai_evaluate_soap`, linha 30).
- `cases.py:873` — `evaluate_soap_standalone` faz um **import local dentro da função** (`from app.services.eval_service import evaluate_soap as _eval`).

Os dois precisam passar `language`. Migrar só o caminho do topo deixa metade da avaliação SOAP respondendo em português sem nenhum sintoma óbvio — é o tipo de bug que só aparece em produção com usuário real. Coberto pelos testes T4 e T5.

### 1.3 O feedback da avaliação é persistido e lido pelo professor

Diferente do chat (efêmero do ponto de vista de terceiros), o resultado da avaliação SOAP é **gravado** em `case_attempts.feedback` (`cases.py:987`) e **exposto ao professor**: a rota de tentativas (`cases.py:683`) retorna `feedback` junto com os dados do aluno, documentada como "todas as tentativas de alunos para um caso do professor".

Consequência: aluno russo → feedback gerado e armazenado em russo → professor brasileiro vê russo no painel. É uma versão mais fraca do conflito com D5 que excluiu o `generate_case` (E1), e foi resolvida na direção oposta — ver **E2** (§8): o feedback segue o idioma do aluno, porque **o professor já vê conteúdo misto de qualquer forma** (o texto do SOAP é escrito pelo próprio aluno, no idioma dele). Forçar o feedback a pt-BR não pouparia o professor da mistura; só tiraria a tradução de quem mais precisa dela.

## 2. Objetivo

1. `chat_service.handle_chat_message` e `eval_service.evaluate_soap` recebem `language` e o repassam ao template do Langfuse **e** ao fallback local.
2. As rotas extraem o idioma do JWT (`payload.get("language", "pt-BR")`) e passam adiante — nos **dois** caminhos de avaliação SOAP (§1.2).
3. Token antigo sem o claim `language` nunca causa erro: cai em `pt-BR` silenciosamente.

## 3. Não-objetivos

- **`generation_service.generate_case` NÃO recebe idioma** (E1 — ver §8): caso gerado é conteúdo compartilhado da turma, gravado no banco; gerá-lo em outro idioma violaria D5 e criaria conteúdo misto sem coluna que o identifique. Continua sempre pt-BR até a Fase 3. **Travado por teste** (T7).
- **Editar os templates no Langfuse**: ferramenta externa, fora do repo. A spec garante que o código passa `language`; adicionar a variável ao template é passo manual pós-merge (§6).
- **Qualidade do `file_search` em en/es/ru**: o vector store tem material pt-BR. Responder em outro idioma sobre material português funciona, mas a qualidade pode variar — `docs/I18N.md` já sinaliza isso como validação manual antes de anunciar suporte. Fora do escopo automatizável.
- **Tradução de conteúdo do banco** (casos, questões, flashcards): Fase 3 (D6).
- **Códigos de erro estáveis**: é a `SPEC-010`, independente desta.

## 4. Requisitos funcionais

- **RF1 — rotas extraem `language`**: `language = payload.get("language", "pt-BR")`, disponível via `Depends(verify_jwt_token)` sem consulta ao banco. Aplica-se a:
  - `api.py:237` — rota de chat.
  - `cases.py:950` — avaliação SOAP do fluxo principal.
  - `cases.py:873` — `evaluate_soap_standalone` (§1.2).
  - `cases.py::start_ai_chat` — saudação inicial do Chat IA. **Omitido na spec original**, adicionado depois — ver §10.

- **RF2 — services recebem `language`**: `chat_service.handle_chat_message(..., language="pt-BR")` e `eval_service.evaluate_soap(..., language="pt-BR")`. O default preserva o comportamento atual se o chamador omitir — nenhum call site existente quebra.

- **RF3 — idioma no prompt**: cada service inclui `language` nas variáveis do `get_prompt(nome, …, language=…)` (Langfuse) **e** no `.format(...)` do fallback local. Os prompts locais (`_PATIENT_SYSTEM_PROMPT`, `_SOAP_EVALUATION_PROMPT`) ganham instrução do tipo `"Responda sempre em {language_name}."`.

- **RF4 — `language_name()`**: função pura em `app/i18n.py` mapeando `pt-BR|en|es|ru` → `português brasileiro|English|español|русский`; idioma desconhecido → `português brasileiro`. Nome por extenso funciona melhor no prompt que o código BCP 47.

- **RF5 — `openai_service` não muda de assinatura**: `get_prompt` continua repassando `**variables`; `complete()`/`complete_json()`/`complete_with_files()` continuam recebendo `messages` prontos.

- **RF6 — JWT sem o claim**: `payload.get("language", "pt-BR")` cobre tokens emitidos antes da Fase 0 — fallback silencioso, nunca exceção.

- **RF7 — idioma resolvido por mensagem, não por conversa** (E3): `handle_chat_message` lê o idioma do JWT **a cada chamada**. Se o aluno trocar de idioma no meio da consulta, o paciente virtual passa a responder no novo idioma a partir da próxima mensagem. **Não** existe `conversations.language` — nenhuma migration, nenhum estado extra. O histórico da conversa pode ficar misto, refletindo o que o aluno pediu em cada momento. Travado por teste (T6) para que ninguém "conserte" isso depois adicionando a coluna sem retomar a decisão.

## 5. Casos de teste — `backend/tests/test_spec011_i18n_ai_language.py`

| # | Cenário | Esperado |
|---|---|---|
| T1 | `chat_service.handle_chat_message(..., language="en")` | `get_prompt` (mock) recebe `language="en"` |
| T2 | `chat_service.handle_chat_message(...)` sem `language` | Default `"pt-BR"`; comportamento idêntico ao atual (regressão) |
| T3 | `eval_service.evaluate_soap(..., language="es")` | `get_prompt` e fallback local recebem `language="es"` |
| T4 | Rota de chat com JWT `language: "en"` | `handle_chat_message` chamado com `language="en"` (`patch.object` + `call_args`) |
| T5 | **Ambos** os caminhos de avaliação SOAP (`cases.py:950` e `:873`) com JWT `language: "es"` | `evaluate_soap` chamado com `language="es"` nos dois — trava a pegadinha do §1.2 |
| T6 | Duas mensagens na **mesma** conversa, JWT com `language` diferente em cada | Cada chamada usa o idioma do momento (`pt-BR`, depois `en`) — trava a E3 (por mensagem, sem `conversations.language`) |
| T7 | Rota de chat com JWT **sem** o claim `language` | `handle_chat_message` chamado com `language="pt-BR"` (RF6), sem exceção |
| T8 | Rota de geração de caso com JWT `language: "ru"` | `generate_case` chamado **sem** `language` / prompt em pt-BR — trava a decisão E1 (D5) |
| T9 | `language_name()` nos 4 idiomas + valor desconhecido | Mapeamento correto; desconhecido → `"português brasileiro"` |

## 6. Critérios de aceite

- [ ] T1–T9 verdes (pytest).
- [ ] `ruff check app/` limpo.
- [ ] Claim `language` ausente no JWT nunca causa 500.
- [ ] `generation_service.py` não modificado (E1).
- [ ] Nenhuma migration criada — sem `conversations.language` (E3).
- [ ] **Passo manual pós-merge**: adicionar a instrução de idioma aos **três** templates no Langfuse — `patient-system-prompt`, `soap-evaluation-prompt` e `ai-patient-prompt` (este último via §10). Sem isso o fallback local cobre, mas o template gerenciado ignora o idioma — e o sintoma é silencioso (IA responde em pt-BR como antes, parecendo que a feature não funcionou). Usar `{{language_name}}` (nome por extenso) e não `{{language}}` (código cru): "responda em `pt-BR`" instrui pior que "responda em `português brasileiro`". Os três call sites passam **as duas** variáveis, então um template que já use `{{language}}` continua compilando.
- [ ] Docs no mesmo PR: `docs/I18N.md`, `docs/MIGRATION_OPENAI.md` (prompts), `backend/app/services/CLAUDE.md`.

## 7. Arquivos afetados

**Novos**
- `backend/tests/test_spec011_i18n_ai_language.py`

**Modificados**
- `backend/app/services/chat_service.py` — parâmetro `language` + instrução de idioma no prompt local.
- `backend/app/services/eval_service.py` — idem.
- `backend/app/i18n.py` — `language_name()`.
- `backend/app/routes/api.py` — extração do idioma do JWT no call site do chat (linha ~237).
- `backend/app/routes/cases.py` — idem nos **dois** call sites de avaliação SOAP (linhas ~950 e ~873) e, pelo §10, em `start_ai_chat` (`_build_ai_patient_prompt` + `get_prompt("ai-patient-prompt", …)`).

> `generation_service.py` **não** é modificado (E1). Nenhum arquivo de `app/auth/` ou `app/errors.py` é tocado — isso é a `SPEC-010`.

## 8. Decisões (fechadas em 2026-07-31)

| ID | Decisão | Escolha | Motivo |
|---|---|---|---|
| E1 | `generate_case` recebe idioma? | **Não** — segue sempre pt-BR | Caso gerado é conteúdo compartilhado gravado no banco; gerá-lo em outro idioma violaria D5 e criaria conteúdo misto sem coluna que o identifique. Um professor russo geraria um caso que os alunos pt-BR da mesma turma veriam em russo. Conteúdo multilíngue é Fase 3, que tem a arquitetura de dados para isso |
| E2 | Idioma do feedback SOAP, que é persistido e lido pelo professor (§1.3) | **Idioma do aluno** | O aluno é o consumidor principal — lê o feedback logo após enviar o SOAP. E o professor **já** vê conteúdo misto: o texto do SOAP é escrito pelo aluno no idioma dele. Forçar pt-BR não pouparia o professor da mistura, só tiraria a tradução de quem mais precisa. A tentativa fica coerente: SOAP e feedback no mesmo idioma |
| E3 | Idioma travado por conversa ou resolvido por mensagem? | **Por mensagem** — idioma atual sempre vence | Trocar de idioma no meio da consulta é raro, e o comportamento resultante é previsível ("a UI está em X, o paciente responde em X"). Travar exigiria `conversations.language` + migration + decidir o que fazer com conversas antigas sem o campo — custo desproporcional ao caso de uso |

## 9. Dívida registrada (não resolvida aqui)

- **`language` desatualizado no JWT**: só é reemitido quando o próprio usuário troca o idioma via `PUT /profile/me` (Fase 0). Se o idioma mudar por outro caminho, o token antigo carrega o valor velho até o próximo login. O RF6 cobre ausência do claim, não claim errado.
- **Professor vendo tentativas em idioma que não fala** (consequência aceita da E2): com aluno estrangeiro, SOAP e feedback chegam no idioma do aluno. Se isso virar atrito real (turma internacional, professor sem o idioma), a rota de saída **não** é forçar pt-BR na geração — é traduzir sob demanda na leitura (o painel do professor pede tradução do feedback armazenado), preservando o valor para o aluno. Requer decisão de produto + custo de IA por visualização.
- **Histórico de conversa em idiomas misturados** (consequência aceita da E3): aluno que troca de idioma no meio deixa a conversa com mensagens do paciente em duas línguas. Se incomodar, a rota é `conversations.language` + migration, retomando a E3.
- **Conteúdo gerado por IA fixo em pt-BR** (E1): quando a Fase 3 introduzir a arquitetura multilíngue de conteúdo, revisitar se `generate_case` passa a gerar no idioma do professor com marcação de idioma no banco.
- **Qualidade do `file_search` com material pt-BR**: validar manualmente as respostas em en/es/ru antes de anunciar suporte multilíngue da IA. Se a qualidade cair, a rota é popular o vector store com material traduzido — o que é escopo de conteúdo (Fase 3), não de código.

## 10. Adendo (2026-07-31) — o terceiro prompt de paciente

A spec original mapeou os prompts de IA pelos **services** (§1.1) e encontrou dois: `patient-system-prompt` e `soap-evaluation-prompt`. Faltou um terceiro, que não está em `services/` e sim **direto na rota**: `cases.py::start_ai_chat` monta a **saudação inicial** do Chat IA com `get_prompt("ai-patient-prompt", …)` + `complete()`, sem passar pelo `chat_service`.

Resultado antes da correção: o aluno russo iniciava o Chat IA, recebia a primeira fala do paciente **em português**, e só a partir da segunda mensagem (aí sim via `chat_service`) a IA passava a falar russo. A rota nem sequer extraía `language` do JWT.

**Por que escapou**: o levantamento seguiu a convenção "todo acesso a IA passa por `services/`" (CLAUDE.md). Este call site a viola — é a única chamada de `get_prompt`/`complete` dentro de `routes/`. Vale como lição para a Fase 3: mapear por `grep get_prompt(` em `app/` inteiro, não pela camada de services.

**Correção aplicada**:
- `cases.py::start_ai_chat` extrai `language = payload.get("language", "pt-BR")` (mesmo padrão do RF1/RF6).
- `_build_ai_patient_prompt(specialty, language)` — o fallback local ganha a linha `"Responda sempre em {language_name(language)}, …"`, espelhando `_PATIENT_SYSTEM_PROMPT`. O prompt resultante também é gravado como `cases.patient_prompt` do caso placeholder, então a instrução de idioma acompanha o caso.
- `get_prompt("ai-patient-prompt", …)` passa `language` **e** `language_name`.
- `chat_service.py` passou a mandar `language_name` também (antes só `language`): o fallback local usava o nome por extenso enquanto o template do Langfuse recebia só o código cru — divergência silenciosa entre os dois caminhos. Agora os três call sites passam as duas variáveis.

**Não conflita com E1**: o caso placeholder do Chat IA é privado do aluno (`visibility: "privado"`, `published: False`) e efêmero — não é conteúdo compartilhado com a turma, que é o que motivou excluir o `generate_case`.

### 10.1 Ressalva sobre `{{specialty}}` no template

`ai-patient-prompt` expõe `{{specialty}}`, que chega **string vazia** quando o aluno não escolhe especialidade. O fallback local trata isso com um `if` (`_build_ai_patient_prompt`), alternando entre "O caso DEVE ser de X" e "Varie a especialidade médica (…)". O template do Langfuse **não tem condicional** — se usar `{{specialty}}` de forma incondicional, o prompt vira uma frase quebrada ("O caso DEVE ser de .") sempre que o aluno não filtrar. Ao editar o template, escrever a frase de forma que funcione com o valor vazio.
