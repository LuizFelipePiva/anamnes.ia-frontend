# Learning Loop: Resumo → Simulados → Flashcards

## Objetivo

Conectar três fluxos já existentes da plataforma em um ciclo de estudo contínuo:

1. o resumo semanal identifica de forma estruturada as especialidades com pior desempenho;
2. a Home recomenda simulados prontos da principal especialidade fraca e, quando não houver um adequado, leva o aluno para a tela de Simulados já filtrada para aquela especialidade;
3. cada questão respondida incorretamente, tanto em Questões Avulsas quanto dentro de Simulados, gera de forma idempotente um flashcard pessoal no deck automático `Erros — <Especialidade>`.

A integração deve reaproveitar os módulos atuais, manter o gabarito no backend, não depender de interpretação de texto gerado por IA e não criar flashcards duplicados ao errar a mesma questão repetidamente.

## Decisões de produto aprovadas

- Resumo → Simulados usa estratégia híbrida:
  - prioriza um simulado pronto e acessível para a especialidade fraca;
  - se não houver, oferece acesso a `/simulados` já filtrado pela especialidade para criação/seleção de treino.
- Questão errada → Flashcard cria um deck automático por especialidade, por exemplo `Erros — Cardiologia`.
- O resumo semanal passa a retornar especialidades fracas de forma estruturada, além do texto atual.
- A especialidade estruturada vem dos dados calculados pela plataforma; nunca é extraída do texto da IA.
- A geração de flashcard a partir de questão errada não usa IA: o enunciado, alternativas, gabarito e explicação já existem no banco.

## Arquitetura

A integração não transforma Resumo, Simulados, Questões e Flashcards em um único serviço. Cada domínio continua responsável por seus próprios dados. Uma camada fina de integração no backend coordena os efeitos entre módulos.

Fluxo principal:

```text
case_attempts
    │
    ▼
weekly_summary_service
    │
    ├── summary (texto atual)
    └── weak_specialties (dados estruturados)
             │
             ▼
        SummaryCard / Home
             │
             ▼
 GET /simulados/recommended?specialty=Cardiologia
             │
      ┌──────┴──────┐
      │             │
   encontrou      nenhum
      │             │
      ▼             ▼
 iniciar/abrir   /simulados?specialty=Cardiologia
 simulado pronto    │
                    ▼
            filtros pré-preenchidos
```

```text
Questão Avulsa                         Simulado
POST /questions/{id}/answer            POST /simulados/.../answer
          │                                       │
          └──────────────┬────────────────────────┘
                         ▼
                    backend corrige
                         │
                  resposta incorreta?
                    │           │
                  não          sim
                    │           │
                    │           ▼
                    │   learning_loop_service
                    │           │
                    │     get_or_create_error_deck
                    │           │
                    │     ensure_question_flashcard
                    │           │
                    │           ▼
                    │   Erros — Cardiologia
                    │
                    ▼
             resposta normal da API
```

## 1. Resumo semanal estruturado

### Estado atual

`backend/app/services/weekly_summary_service.py::collect_metrics` já agrupa notas por especialidade e calcula `weak_specialty`. O texto do resumo usa esse valor no prompt, mas a API expõe apenas `summary`, `week`, `cached` e `language`.

### Novo contrato

`GET /profile/me/weekly-summary` passa a retornar:

```json
{
  "summary": "Você concluiu 4 casos nesta semana...",
  "week": "2026-W37",
  "cached": true,
  "language": "pt-BR",
  "weak_specialties": [
    {
      "specialty": "Cardiologia",
      "average_score": 42.5,
      "attempts": 2
    },
    {
      "specialty": "Pneumologia",
      "average_score": 58.0,
      "attempts": 1
    }
  ]
}
```

Regras:

- `weak_specialties` é ordenado por `average_score` crescente;
- apenas tentativas da semana com `score` entram no cálculo;
- especialidades sem tentativa avaliada não entram;
- no máximo 3 especialidades são retornadas;
- empate de média é desempatado por maior número de tentativas e depois pelo nome da especialidade para estabilidade;
- a primeira entrada é a principal recomendação da Home;
- quando não houver especialidade avaliada, `weak_specialties` é `[]`;
- o texto da IA continua sendo gerado com a principal especialidade fraca, preservando o comportamento atual.

### Cache

O cache de IA continua evitando nova chamada à OpenAI. Para que o contrato estruturado continue disponível em cache hit sem depender de dados antigos, a tabela `weekly_summaries` recebe uma coluna:

```sql
weak_specialties jsonb NULL
```

Ao gravar um resumo novo, o backend persiste o array calculado. Em cache hit:

- `weak_specialties IS NOT NULL`: devolve exatamente o snapshot persistido;
- `weak_specialties IS NULL`: trata como linha criada antes da migration, recalcula apenas as métricas (sem chamar OpenAI), atualiza a linha e devolve o resultado.

A coluna nullable diferencia um cache legado de um snapshot novo legitimamente vazio (`[]`). Depois do primeiro acesso, a linha antiga fica backfilled e as visitas seguintes não recalculam métricas.

## 2. Recomendação de Simulados

### Endpoint

Adicionar:

```http
GET /simulados/recommended?specialty=Cardiologia&limit=3
```

Resposta:

```json
{
  "specialty": "Cardiologia",
  "items": [
    {
      "id": "uuid",
      "title": "Revisão de Cardiologia",
      "description": "...",
      "specialty": "Cardiologia",
      "num_questions": 20,
      "visibility": "turma",
      "due_date": null
    }
  ]
}
```

### Regras de acesso

O endpoint nunca consulta simulados fora do conjunto que o usuário já pode acessar. A implementação deve reutilizar a mesma regra de `list_simulados` e só depois filtrar por `specialty`.

Critérios de ranking dentro da especialidade:

1. simulados ainda dentro de `due_date` ou sem prazo;
2. simulados que o aluno ainda não concluiu;
3. mais recentes primeiro.

O endpoint não cria simulado automaticamente.

### Fallback

Quando `items` vier vazio, a Home navega para:

```text
/simulados?specialty=Cardiologia&intent=create
```

`SimuladosListPage` lê os parâmetros e:

- pré-seleciona `Cardiologia` no filtro;
- abre o fluxo de criação/seleção já com a especialidade aplicada quando `intent=create`;
- mantém os demais filtros livres para o aluno ajustar.

O valor enviado na URL é sempre a chave canônica do banco, não o rótulo traduzido.

## 3. Home / SummaryCard

### Novo tipo no frontend

`weeklySummaryService.ts` passa a devolver:

```ts
export interface WeeklySummary {
  summary: string;
  week: string;
  cached: boolean;
  language: string;
  weakSpecialties: Array<{
    specialty: string;
    averageScore: number;
    attempts: number;
  }>;
}
```

`weeklySummaryService.ts` faz a adaptação explícita do JSON snake_case da API (`weak_specialties`, `average_score`) para o tipo camelCase acima.

`useWeeklySummary` deixa de retornar apenas `string | null` e passa a retornar `WeeklySummary | null`.

`MainPage` passa os dados ao card sem esconder o contrato:

```tsx
<SummaryCard
  summary={weeklySummary?.summary ?? null}
  weakSpecialties={weeklySummary?.weakSpecialties ?? []}
/>
```

### UI

O `SummaryCard` continua exibindo o texto atual e adiciona uma ação contextual apenas quando existir `weakSpecialties[0]`.

Com recomendação pronta:

```text
[ Treinar Cardiologia ]
```

O clique abre o simulado recomendado. Se houver mais de um, a UI pode abrir `/simulados?specialty=Cardiologia`, mas a primeira versão deve usar o primeiro item retornado para manter o fluxo simples.

Sem simulado recomendado:

```text
[ Criar treino de Cardiologia ]
```

O clique abre o fallback filtrado.

Falha da API de recomendação não remove o resumo: nesse caso a ação usa diretamente o fallback `/simulados?...`.

## 4. Questão errada → Flashcard

### Serviço de integração

Criar:

```text
backend/app/services/learning_loop_service.py
```

Responsabilidades públicas:

```python
def ensure_error_flashcard(
    sb,
    *,
    student_id: str,
    question_id: str,
) -> dict:
    ...
```

O serviço:

1. busca a questão no backend com `statement`, `options`, `correct_answer`, `explanation`, `specialty`, `subspecialty`;
2. normaliza a especialidade (`specialty or "Geral"`);
3. encontra ou cria o deck automático daquela especialidade;
4. verifica se já existe um flashcard desse aluno para a mesma `question_id`;
5. se já existir, retorna o card existente sem inserir outro;
6. caso contrário cria o flashcard e registra sua origem em `flashcard_sources`.

O serviço não faz chamada à OpenAI.

### Formato do deck

Nome exibido:

```text
Erros — Cardiologia
```

Metadados:

```text
student_id = aluno autenticado
specialty = Cardiologia
kind = question_errors
```

A lógica nunca identifica um deck automático apenas pelo texto do nome. O aluno pode traduzir/renomear títulos no futuro sem quebrar a associação técnica.

### Formato do flashcard

Frente:

```text
<enunciado>

A) alternativa A
B) alternativa B
C) alternativa C
D) alternativa D
```

Verso:

```text
Resposta correta: C) <texto da alternativa correta>

<explicação da questão, se houver>
```

Metadados do card:

```text
difficulty = medium
status = active
specialty = specialty da questão
tags = ["questao-errada", <subspecialty quando existir>]
```

Não incluir no card a alternativa errada escolhida pelo aluno. O card ensina o conteúdo correto e continua reutilizável em revisões futuras.

## 5. Alterações de banco para idempotência

### `flashcard_decks`

Adicionar:

```sql
kind text NOT NULL DEFAULT 'manual'
```

Valores inicialmente usados:

```text
manual
question_errors
```

Criar índice único parcial:

```sql
CREATE UNIQUE INDEX ...
ON flashcard_decks(student_id, specialty, kind)
WHERE student_id IS NOT NULL AND kind = 'question_errors';
```

Isso garante um único deck automático de erros por aluno e especialidade, inclusive sob duas requisições concorrentes.

### `flashcard_sources`

Adicionar:

```sql
student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
```

Para linhas novas do learning loop, `student_id` é obrigatório em nível de aplicação.

Criar índice único parcial:

```sql
CREATE UNIQUE INDEX ...
ON flashcard_sources(student_id, source_type, source_id)
WHERE student_id IS NOT NULL AND source_id IS NOT NULL;
```

Para questões erradas:

```text
source_type = question_error
source_id   = questions_bank.id
student_id  = aluno
```

Esse índice é a última barreira contra duplicação em concorrência.

`source_meta` registra contexto não sensível:

```json
{
  "specialty": "Cardiologia",
  "subspecialty": "Arritmias"
}
```

Não gravar gabarito em `source_meta`; o gabarito já pertence ao card e ao banco de questões.

## 6. Integração com Questões Avulsas

### Estado atual

`POST /questions/{question_id}/answer` chama `questions_service.check_answer`, mas ignora o usuário autenticado para fins de aprendizagem.

### Novo fluxo

1. `check_answer` continua sendo a fonte da correção;
2. a rota usa `user["sub"]`;
3. somente quando `result["correct"] is False` e o usuário for aluno, chama `learning_loop_service.ensure_error_flashcard`;
4. falha ao criar flashcard não transforma uma resposta já corrigida em erro HTTP.

A geração é um efeito secundário de aprendizagem. Se ela falhar, o backend registra warning e ainda devolve a correção normalmente.

### Contrato de resposta

Manter compatibilidade e adicionar campo opcional:

```json
{
  "correct": false,
  "correct_answer": "C",
  "explanation": "...",
  "review_flashcard": {
    "created": true,
    "deck_id": "uuid",
    "flashcard_id": "uuid"
  }
}
```

Quando acertar:

```json
"review_flashcard": null
```

Quando a criação falhar por indisponibilidade do serviço de flashcard, também retorna `null`; a correção da questão nunca é perdida.

## 7. Integração com Simulados

### Estado atual

`simulado_service.record_answer` já calcula `is_correct` no backend e persiste a resposta sem revelar o gabarito durante a tentativa.

### Novo fluxo

`record_answer` continua apenas corrigindo e persistindo `is_correct` no backend. Ele **não cria flashcard durante uma tentativa em andamento**. Criar um card nesse momento permitiria ao aluno abrir o módulo de Flashcards em outra aba e descobrir a resposta correta antes de finalizar o simulado.

A materialização acontece em `finish_attempt`, depois que a tentativa muda para `completed` e no mesmo ponto em que o relatório passa a poder revelar gabarito:

1. finaliza a tentativa e calcula o score;
2. busca as respostas finais com `is_correct = false`;
3. para cada `question_id` errado chama `learning_loop_service.ensure_error_flashcard`;
4. monta e devolve o relatório normal.

Regras:

- `record_answer` continua sem revelar `correct_answer`;
- `SimuladoAnswerResponse` permanece apenas com `recorded: bool`;
- somente a resposta **final** da questão conta para geração do card; se o aluno corrigiu sua escolha antes de finalizar e terminou com a resposta correta, não é criado flashcard;
- se a resposta final estiver errada, o card é criado no fechamento;
- finalizar novamente é idempotente: `finish_attempt` já é idempotente e `ensure_error_flashcard` não duplica origem/card;
- o flashcard só fica visível depois do momento em que o próprio relatório do simulado já pode mostrar o gabarito.

Falhas ao gerar um ou mais flashcards são logadas e não impedem a finalização nem a entrega do relatório.

## 8. Segurança e autorização

- O frontend nunca recebe `correct_answer` antes da correção permitida pelo fluxo atual.
- O endpoint de Simulados continua sem revelar gabarito durante a tentativa.
- `learning_loop_service` recebe `student_id` do JWT/attempt validado, nunca de payload do navegador.
- O deck automático sempre pertence ao aluno autenticado.
- `question_id` é buscado novamente no backend; nenhum conteúdo do flashcard é aceito do cliente.
- A rota de recomendação só trabalha sobre simulados já acessíveis ao usuário.
- IDs de deck/card retornados ao frontend não dão permissão adicional; CRUD pessoal continua verificando `student_id`.

## 9. Falhas e idempotência

### Resumo

- sem atividade semanal: comportamento atual continua `{"summary": null}`;
- sem especialidade avaliada: `weak_specialties: []`;
- falha da IA: card continua ausente como hoje;
- cache hit devolve o snapshot estruturado persistido.

### Simulados recomendados

- especialidade sem simulado: `items: []`, não 404;
- especialidade vazia/inválida: 422;
- falha de recomendação na Home: usar fallback filtrado.

### Flashcards

- duas respostas erradas concorrentes para a mesma questão: uma inserção vence e a outra reutiliza a origem já existente;
- duas questões diferentes da mesma especialidade: reutilizam o mesmo deck automático;
- falha de flashcard não deve reverter resposta de questão já registrada/corrigida;
- deletar manualmente um card de erro remove sua `flashcard_source` por cascade; um erro futuro pode recriá-lo;
- deletar o deck automático deve continuar permitido pela API atual, mas o próximo erro daquela especialidade o recria.

## 10. Testes obrigatórios

### Backend — resumo

- ordena `weak_specialties` pela menor média;
- ignora tentativas sem score;
- limita a 3;
- cache persiste e retorna `weak_specialties`;
- semana sem atividade continua sem chamada à IA.

### Backend — recomendação

- recomenda somente specialty solicitada;
- não retorna simulado inacessível;
- prioriza não concluídos;
- retorna `items: []` quando não houver candidatos.

### Backend — learning loop

- primeiro erro cria deck + card + source;
- segundo erro na mesma questão não cria outro card;
- questão diferente da mesma especialidade reutiliza deck;
- especialidade diferente cria outro deck;
- formato front/back usa alternativas e resposta correta;
- não usa IA;
- concorrência é protegida pelas constraints do banco.

### Backend — Questões Avulsas

- acerto não cria flashcard;
- erro cria/reutiliza flashcard;
- falha do flashcard não quebra `QuestionAnswerResponse`.

### Backend — Simulados

- `record_answer` não cria flashcard nem revela gabarito durante tentativa ativa;
- `finish_attempt` cria/reutiliza cards apenas para respostas finais erradas;
- resposta final correta não cria card;
- reexecução idempotente de `finish_attempt` não duplica cards;
- falha do flashcard não impede finalização nem relatório.

### Frontend

- `useWeeklySummary` aceita o novo contrato;
- `SummaryCard` preserva texto existente;
- CTA usa simulado recomendado quando disponível;
- sem recomendação usa fallback filtrado;
- erro da busca de recomendação mantém o resumo visível;
- `SimuladosListPage` interpreta `specialty` e `intent=create` sem quebrar navegação normal.

## 11. Arquivos previstos

### Backend

Modificar:

- `backend/app/services/weekly_summary_service.py`
- `backend/app/routes/profile.py`
- `backend/app/services/simulado_service.py`
- `backend/app/routes/simulados.py`
- `backend/app/services/questions_service.py`
- `backend/app/routes/questions.py`
- `backend/app/services/flashcard_service.py` apenas se for necessário reaproveitar helpers de deck/card
- `backend/app/models/schemas.py`

Criar:

- `backend/app/services/learning_loop_service.py`
- migration Supabase para `weekly_summaries.weak_specialties`, `flashcard_decks.kind`, `flashcard_sources.student_id` e índices únicos
- testes unitários/integrados específicos do learning loop

### Frontend

Modificar:

- `frontend/anamnes-ia/src/features/student/services/weeklySummaryService.ts`
- `frontend/anamnes-ia/src/features/student/hooks/useWeeklySummary.ts`
- `frontend/anamnes-ia/src/features/student/hooks/useWeeklySummary.test.tsx`
- `frontend/anamnes-ia/src/features/student/components/home/SummaryCard.tsx`
- `frontend/anamnes-ia/src/app/MainPage.tsx`
- `frontend/anamnes-ia/src/features/simulados/services/simuladosService.ts`
- `frontend/anamnes-ia/src/features/simulados/pages/SimuladosListPage.tsx`
- tipos de Simulados/Resumo quando necessário
- locales `common.json` apenas para os novos CTAs

## 12. Não objetivos desta entrega

Esta integração não deve, no mesmo trabalho:

- corrigir todo o modelo de visibilidade `publico` dos Simulados;
- alterar o algoritmo de sorteio das primeiras 500 questões;
- mover CID-10 para backend;
- implementar exame físico seguro;
- modificar SM-2;
- gerar flashcards por IA a partir de questões;
- apagar automaticamente flashcards porque o aluno acertou a questão depois;
- criar um simulado automaticamente sem ação do aluno.

Esses pontos permanecem independentes e podem ser tratados em etapas posteriores.

## Critério de aceite final

Um aluno com Cardiologia como principal ponto fraco deve poder abrir a Home, ler seu resumo semanal, iniciar um simulado pronto de Cardiologia ou cair na tela de Simulados já filtrada. Ao errar uma questão de Cardiologia em Questões Avulsas, deve aparecer imediatamente exatamente um flashcard correspondente no deck pessoal automático `Erros — Cardiologia`. Em um Simulado, o mesmo card só deve aparecer após a finalização da tentativa e apenas se a resposta final estiver errada. Em ambos os fluxos, o gabarito não pode ser exposto antes do momento permitido e erros repetidos não podem criar duplicatas.
