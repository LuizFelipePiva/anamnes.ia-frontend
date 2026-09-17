# Resumo → Simulados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor especialidades fracas estruturadas no resumo semanal e transformar a principal delas em um CTA que abre um simulado pronto acessível ou, na ausência dele, abre a criação de simulado já filtrada.

**Architecture:** O backend continua sendo a fonte de verdade das métricas e de autorização. `weekly_summary_service` persiste o snapshot estruturado junto do texto; `simulado_service` recomenda apenas dentro do conjunto já retornável por `list_simulados`; o frontend adapta snake_case→camelCase, busca a recomendação para a principal especialidade fraca e mantém o resumo visível mesmo quando a recomendação falha.

**Tech Stack:** FastAPI, Pydantic, Supabase/PostgreSQL migrations, pytest, React 19, TypeScript, React Router, Vitest, Testing Library, i18next.

**Spec:** `docs/superpowers/specs/2026-09-07-learning-loop-summary-simulados-flashcards-design.md`

## Global Constraints

- Trabalhar na branch local `Simulados`; não fazer push durante a execução sem ordem explícita.
- Não extrair especialidade a partir do texto da IA; usar somente métricas calculadas pela plataforma.
- O cache semanal continua garantindo no máximo uma geração de IA por aluno/semana; backfill de `weak_specialties` não chama OpenAI.
- `weak_specialties` contém no máximo 3 itens, ordenados por menor média, maior número de tentativas e nome para desempate estável.
- Recomendação de simulado deve reutilizar o conjunto autorizado de `list_simulados`; não criar atalho de autorização paralelo.
- O CTA de simulado pronto navega para `/simulados/:id/run`; fallback usa `/simulados?specialty=<chave-canônica>&intent=create`.
- Falha da API de recomendação nunca remove o texto do resumo semanal.
- Não corrigir nesta entrega o modelo geral de `visibility=publico`, o sorteio de 500 questões, CID-10 ou exame físico.

---

### Task 1: Persistir especialidades fracas no resumo semanal

**Files:**
- Create: `supabase/migrations/20260907000100_add_weekly_summary_weak_specialties.sql`
- Modify: `backend/app/services/weekly_summary_service.py`
- Modify: `backend/tests/test_spec013_weekly_summary.py`

**Interfaces:**
- Consumes: `collect_metrics(sb, student_id, now)` e cache `weekly_summaries` existentes.
- Produces: `metrics["weak_specialties"]: list[dict]` e retorno de `get_weekly_summary(...)["weak_specialties"]`.

- [ ] **Step 1: Escrever os testes de ordenação e cache estruturado**

Adicionar a `backend/tests/test_spec013_weekly_summary.py`:

```python
def test_weak_specialties_ordena_media_tentativas_e_nome():
    sb = _FakeSupabase(case_attempts=[
        attempt(score=50, specialty="Pediatria"),
        attempt(score=50, specialty="Cardiologia"),
        attempt(score=50, specialty="Cardiologia"),
        attempt(score=70, specialty="Neurologia"),
        attempt(score=None, specialty="Ortopedia"),
    ])

    metrics = svc.collect_metrics(sb, "u1", NOW)

    assert metrics["weak_specialties"] == [
        {"specialty": "Cardiologia", "average_score": 50.0, "attempts": 2},
        {"specialty": "Pediatria", "average_score": 50.0, "attempts": 1},
        {"specialty": "Neurologia", "average_score": 70.0, "attempts": 1},
    ]
    assert metrics["weak_specialty"] == "Cardiologia"


def test_cache_novo_devolve_snapshot_de_weak_specialties_sem_recalcular():
    cached = [{
        "id": "ws1",
        "summary": "Texto já gerado.",
        "language": "pt-BR",
        "created_at": "x",
        "weak_specialties": [
            {"specialty": "Cardiologia", "average_score": 42.5, "attempts": 2}
        ],
    }]
    sb = _FakeSupabase(case_attempts=[], weekly_summaries=cached)

    with patch.object(svc, "collect_metrics") as collect, patch.object(svc, "complete") as complete:
        result = svc.get_weekly_summary(sb, "u1", now=NOW)

    collect.assert_not_called()
    complete.assert_not_called()
    assert result["weak_specialties"] == cached[0]["weak_specialties"]


def test_cache_legado_recalcula_metricas_sem_chamar_ia_e_faz_backfill():
    sb = _FakeSupabase(
        case_attempts=[attempt(score=40, specialty="Cardiologia")],
        weekly_summaries=[{
            "id": "ws1",
            "summary": "Texto legado.",
            "language": "pt-BR",
            "created_at": "x",
            "weak_specialties": None,
        }],
    )

    with patch.object(svc, "complete") as complete:
        result = svc.get_weekly_summary(sb, "u1", now=NOW)

    complete.assert_not_called()
    assert result["weak_specialties"] == [
        {"specialty": "Cardiologia", "average_score": 40.0, "attempts": 1}
    ]
```

Estender `_FakeQuery` no mesmo arquivo com:

```python
    def update(self, row):
        self._store.setdefault("updates", []).append((self._table, row))
        return self
```

E inicializar o store com `"updates": []` em `_FakeSupabase.__init__`. O teste de cache legado deve então afirmar:

```python
assert ("weekly_summaries", {"weak_specialties": result["weak_specialties"]}) in sb._store["updates"]
```

- [ ] **Step 2: Executar os testes e confirmar RED**

Run:

```bash
cd backend
python -m pytest tests/test_spec013_weekly_summary.py -q
```

Expected: falha porque `weak_specialties` ainda não existe no retorno/métricas e o fake não recebe backfill.

- [ ] **Step 3: Implementar o cálculo estruturado e cache**

Em `collect_metrics`, depois de `by_spec`, calcular:

```python
weak_specialties = [
    {
        "specialty": specialty,
        "average_score": round(sum(values) / len(values), 1),
        "attempts": len(values),
    }
    for specialty, values in by_spec.items()
]
weak_specialties.sort(
    key=lambda item: (
        item["average_score"],
        -item["attempts"],
        item["specialty"].casefold(),
    )
)
weak_specialties = weak_specialties[:3]
weak_specialty = weak_specialties[0]["specialty"] if weak_specialties else None
```

Incluir `weak_specialties` no dict retornado por `collect_metrics`.

Alterar `_read_cache` para selecionar:

```python
.select("id, summary, language, created_at, weak_specialties")
```

Alterar `_write_cache` para receber `weak_specialties: list[dict]` e inserir o campo.

Adicionar helper:

```python
def _backfill_cache_weak_specialties(sb, cache_id: str, weak_specialties: list[dict]) -> None:
    try:
        sb.table("weekly_summaries").update({
            "weak_specialties": weak_specialties,
        }).eq("id", cache_id).execute()
    except Exception as e:
        logger.warning(f"[WeeklySummary] Falha ao atualizar cache legado: {e}")
```

No cache hit:

```python
if cached:
    weak_specialties = cached.get("weak_specialties")
    if weak_specialties is None:
        metrics = collect_metrics(sb, student_id, now)
        weak_specialties = metrics["weak_specialties"]
        if cached.get("id"):
            _backfill_cache_weak_specialties(sb, cached["id"], weak_specialties)
    return {
        "summary": cached["summary"],
        "week": week_label,
        "cached": True,
        "language": cached.get("language", language),
        "weak_specialties": weak_specialties,
    }
```

No caminho de geração nova, persistir e retornar `metrics["weak_specialties"]`.

- [ ] **Step 4: Criar a migration da coluna nullable**

Criar `supabase/migrations/20260907000100_add_weekly_summary_weak_specialties.sql`:

```sql
ALTER TABLE "public"."weekly_summaries"
    ADD COLUMN IF NOT EXISTS "weak_specialties" jsonb;

COMMENT ON COLUMN "public"."weekly_summaries"."weak_specialties" IS
    'Snapshot estruturado das até 3 especialidades mais fracas da semana; NULL identifica cache legado ainda não backfilled.';
```

- [ ] **Step 5: Executar testes e verificação da migration**

Run:

```bash
cd backend
python -m pytest tests/test_spec013_weekly_summary.py -q
cd ..
grep -q 'weak_specialties' supabase/migrations/20260907000100_add_weekly_summary_weak_specialties.sql
```

Expected: todos os testes do resumo passam e o grep retorna código 0.

- [ ] **Step 6: Commit local da tarefa**

```bash
git add backend/app/services/weekly_summary_service.py \
        backend/tests/test_spec013_weekly_summary.py \
        supabase/migrations/20260907000100_add_weekly_summary_weak_specialties.sql
git commit -m "feat: expose structured weak specialties in weekly summary"
```

---

### Task 2: Adicionar endpoint seguro de simulados recomendados

**Files:**
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/services/simulado_service.py`
- Modify: `backend/app/routes/simulados.py`
- Create: `backend/tests/test_simulado_recommendations.py`

**Interfaces:**
- Consumes: `list_simulados(sb, user_id, role)` e `get_my_attempts(sb, student_id)`.
- Produces: `recommend_simulados(sb, user_id, role, specialty, limit=3, now=None) -> list[dict]` e `GET /simulados/recommended`.

- [ ] **Step 1: Escrever testes do ranking e autorização herdada**

Criar `backend/tests/test_simulado_recommendations.py`:

```python
from datetime import UTC, datetime

from app.services import simulado_service as svc

NOW = datetime(2026, 9, 7, 15, 0, tzinfo=UTC)


def sim(id, specialty="Cardiologia", due_date=None, created_at="2026-09-01T12:00:00+00:00"):
    return {
        "id": id,
        "title": id,
        "description": None,
        "specialty": specialty,
        "subspecialty": None,
        "num_questions": 10,
        "created_by": "owner",
        "class_id": None,
        "due_date": due_date,
        "visibility": "privado",
        "created_at": created_at,
    }


def test_recommend_filtra_specialty_sobre_lista_ja_autorizada(monkeypatch):
    monkeypatch.setattr(svc, "list_simulados", lambda *_: [
        sim("cardio"),
        sim("neuro", specialty="Neurologia"),
    ])
    monkeypatch.setattr(svc, "get_my_attempts", lambda *_: [])

    items = svc.recommend_simulados(None, "student-1", "student", "Cardiologia", now=NOW)

    assert [item["id"] for item in items] == ["cardio"]


def test_recommend_prioriza_nao_concluido_e_depois_mais_recente(monkeypatch):
    monkeypatch.setattr(svc, "list_simulados", lambda *_: [
        sim("done", created_at="2026-09-06T12:00:00+00:00"),
        sim("new", created_at="2026-09-05T12:00:00+00:00"),
        sim("old", created_at="2026-09-01T12:00:00+00:00"),
    ])
    monkeypatch.setattr(svc, "get_my_attempts", lambda *_: [
        {"simulado_id": "done", "status": "completed"},
    ])

    items = svc.recommend_simulados(None, "student-1", "student", "Cardiologia", now=NOW)

    assert [item["id"] for item in items] == ["new", "old", "done"]


def test_recommend_coloca_expirado_depois_dos_validos(monkeypatch):
    monkeypatch.setattr(svc, "list_simulados", lambda *_: [
        sim("expired", due_date="2026-09-01T00:00:00+00:00", created_at="2026-09-07T12:00:00+00:00"),
        sim("active", due_date="2026-09-10T00:00:00+00:00", created_at="2026-09-01T12:00:00+00:00"),
    ])
    monkeypatch.setattr(svc, "get_my_attempts", lambda *_: [])

    items = svc.recommend_simulados(None, "student-1", "student", "Cardiologia", now=NOW)

    assert [item["id"] for item in items] == ["active", "expired"]


def test_recommend_sem_candidato_retorna_lista_vazia(monkeypatch):
    monkeypatch.setattr(svc, "list_simulados", lambda *_: [])
    monkeypatch.setattr(svc, "get_my_attempts", lambda *_: [])

    assert svc.recommend_simulados(None, "student-1", "student", "Cardiologia", now=NOW) == []
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
cd backend
python -m pytest tests/test_simulado_recommendations.py -q
```

Expected: falha com `AttributeError` porque `recommend_simulados` ainda não existe.

- [ ] **Step 3: Implementar `recommend_simulados`**

Em `backend/app/services/simulado_service.py`, adicionar helper de parse e a função:

```python
def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def recommend_simulados(
    sb: Client,
    user_id: str,
    role: str,
    specialty: str,
    limit: int = 3,
    now: datetime | None = None,
) -> list[dict]:
    now = now or datetime.now(UTC)
    candidates = [
        item for item in list_simulados(sb, user_id, role)
        if item.get("specialty") == specialty
    ]

    completed = set()
    if role == "student":
        completed = {
            row["simulado_id"]
            for row in get_my_attempts(sb, user_id)
            if row.get("status") == "completed"
        }

    def sort_key(item: dict):
        due = _parse_iso_datetime(item.get("due_date"))
        created = _parse_iso_datetime(item.get("created_at"))
        is_expired = due is not None and due < now
        is_completed = item.get("id") in completed
        created_ts = created.timestamp() if created else 0.0
        return (is_expired, is_completed, -created_ts, item.get("id", ""))

    return sorted(candidates, key=sort_key)[:limit]
```

- [ ] **Step 4: Adicionar schemas e rota antes de `/{simulado_id}`**

Em `backend/app/models/schemas.py`:

```python
class SimuladoRecommendationResponse(BaseModel):
    specialty: str
    items: list[SimuladoPublic]
```

Em `backend/app/routes/simulados.py`, importar `SimuladoRecommendationResponse` e adicionar antes da rota dinâmica `@router.get("/{simulado_id}")`:

```python
@router.get("/recommended", response_model=SimuladoRecommendationResponse)
def recommended_simulados(
    specialty: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(3, ge=1, le=10),
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    items = simulado_service.recommend_simulados(
        sb,
        user_id=user["sub"],
        role=user.get("role", "student"),
        specialty=specialty,
        limit=limit,
    )
    return {"specialty": specialty, "items": items}
```

- [ ] **Step 5: Adicionar teste HTTP da rota**

No fim de `backend/tests/test_simulado_recommendations.py`:

```python
def test_endpoint_recommended_retorna_envelope(as_role, monkeypatch):
    from app.routes import simulados as route_module

    monkeypatch.setattr(
        route_module.simulado_service,
        "recommend_simulados",
        lambda *args, **kwargs: [sim("cardio")],
    )
    client = as_role("student")

    response = client.get("/api/simulados/recommended?specialty=Cardiologia")

    assert response.status_code == 200
    body = response.json()
    assert body["specialty"] == "Cardiologia"
    assert body["items"][0]["id"] == "cardio"
```

- [ ] **Step 6: Executar testes e commit local**

```bash
cd backend
python -m pytest tests/test_simulado_recommendations.py -q
cd ..
git add backend/app/models/schemas.py backend/app/services/simulado_service.py \
        backend/app/routes/simulados.py backend/tests/test_simulado_recommendations.py
git commit -m "feat: recommend accessible simulados by specialty"
```

---

### Task 3: Atualizar contrato do resumo no frontend

**Files:**
- Modify: `frontend/anamnes-ia/src/features/student/services/weeklySummaryService.ts`
- Modify: `frontend/anamnes-ia/src/features/student/hooks/useWeeklySummary.ts`
- Modify: `frontend/anamnes-ia/src/features/student/hooks/useWeeklySummary.test.tsx`
- Create: `frontend/anamnes-ia/src/features/student/services/weeklySummaryService.test.ts`

**Interfaces:**
- Consumes: JSON do backend com `weak_specialties`/`average_score`.
- Produces: `WeeklySummary` camelCase e `useWeeklySummary(enabled): WeeklySummary | null`.

- [ ] **Step 1: Escrever teste do adapter snake_case → camelCase**

Criar `weeklySummaryService.test.ts` mockando `authFetch` e afirmando:

```ts
expect(await fetchWeeklySummary()).toEqual({
  summary: 'Você treinou Cardiologia.',
  week: '2026-W37',
  cached: false,
  language: 'pt-BR',
  weakSpecialties: [
    { specialty: 'Cardiologia', averageScore: 42.5, attempts: 2 },
  ],
});
```

O mock JSON deve usar:

```ts
{
  summary: 'Você treinou Cardiologia.',
  week: '2026-W37',
  cached: false,
  language: 'pt-BR',
  weak_specialties: [
    { specialty: 'Cardiologia', average_score: 42.5, attempts: 2 },
  ],
}
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
cd frontend/anamnes-ia
npx vitest run src/features/student/services/weeklySummaryService.test.ts
```

Expected: falha porque `fetchWeeklySummary` ainda devolve apenas `string | null`.

- [ ] **Step 3: Implementar o tipo e adapter explícito**

Em `weeklySummaryService.ts`:

```ts
export interface WeakSpecialtySummary {
  specialty: string;
  averageScore: number;
  attempts: number;
}

export interface WeeklySummary {
  summary: string;
  week: string;
  cached: boolean;
  language: string;
  weakSpecialties: WeakSpecialtySummary[];
}

type WeeklySummaryApi = {
  summary?: string | null;
  week?: string;
  cached?: boolean;
  language?: string;
  weak_specialties?: Array<{
    specialty: string;
    average_score: number;
    attempts: number;
  }>;
};

export async function fetchWeeklySummary(): Promise<WeeklySummary | null> {
  const res = await authFetch(`${BASE}/profile/me/weekly-summary`);
  if (!res.ok) return null;
  const data = (await res.json()) as WeeklySummaryApi;
  const summary = data.summary?.trim();
  if (!summary) return null;
  return {
    summary,
    week: data.week ?? '',
    cached: data.cached ?? false,
    language: data.language ?? 'pt-BR',
    weakSpecialties: (data.weak_specialties ?? []).map(item => ({
      specialty: item.specialty,
      averageScore: item.average_score,
      attempts: item.attempts,
    })),
  };
}
```

Atualizar `useWeeklySummary` para armazenar `WeeklySummary | null`.

- [ ] **Step 4: Atualizar teste do hook para o novo contrato**

No mock de `useWeeklySummary.test.tsx`, usar:

```ts
const mockSummary = {
  summary: 'Você concluiu 3 casos nesta semana.',
  week: '2026-W37',
  cached: false,
  language: 'pt-BR',
  weakSpecialties: [],
};
```

E no `Host` passar temporariamente apenas `summary={useWeeklySummary(enabled)?.summary ?? null}` até a Task 4 ampliar `SummaryCard`.

- [ ] **Step 5: Executar testes e commit local**

```bash
cd frontend/anamnes-ia
npx vitest run src/features/student/services/weeklySummaryService.test.ts \
  src/features/student/hooks/useWeeklySummary.test.tsx
npx tsc -b --noEmit
cd ../..
git add frontend/anamnes-ia/src/features/student/services/weeklySummaryService.ts \
        frontend/anamnes-ia/src/features/student/services/weeklySummaryService.test.ts \
        frontend/anamnes-ia/src/features/student/hooks/useWeeklySummary.ts \
        frontend/anamnes-ia/src/features/student/hooks/useWeeklySummary.test.tsx
git commit -m "feat: expose weak specialties in weekly summary client"
```

---

### Task 4: Buscar recomendação e conectar CTA do SummaryCard

**Files:**
- Modify: `frontend/anamnes-ia/src/features/simulados/types/simulado.ts`
- Modify: `frontend/anamnes-ia/src/features/simulados/services/simuladosService.ts`
- Create: `frontend/anamnes-ia/src/features/simulados/services/simuladosService.test.ts`
- Modify: `frontend/anamnes-ia/src/features/student/components/home/SummaryCard.tsx`
- Create: `frontend/anamnes-ia/src/features/student/components/home/SummaryCard.test.tsx`
- Modify: `frontend/anamnes-ia/src/app/MainPage.tsx`
- Modify: `frontend/anamnes-ia/src/app/MainPage.home.test.tsx`
- Modify: `frontend/anamnes-ia/src/locales/pt-BR/common.json`
- Modify: `frontend/anamnes-ia/src/locales/en/common.json`
- Modify: `frontend/anamnes-ia/src/locales/es/common.json`
- Modify: `frontend/anamnes-ia/src/locales/ru/common.json`

**Interfaces:**
- Consumes: `WeeklySummary.weakSpecialties[0]` e `GET /simulados/recommended`.
- Produces: CTA que navega para `/simulados/:id/run` ou fallback filtrado.

- [ ] **Step 1: Escrever teste do service de recomendação**

Adicionar em `simuladosService.test.ts` um caso que espera chamada a:

```text
/simulados/recommended?specialty=Cardiologia&limit=3
```

E retorno tipado:

```ts
{
  specialty: 'Cardiologia',
  items: [{ id: 's1', title: 'Revisão', ... }],
}
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
cd frontend/anamnes-ia
npx vitest run src/features/simulados/services/simuladosService.test.ts
```

Expected: falha porque `fetchRecommendedSimulados` ainda não existe.

- [ ] **Step 3: Implementar type + service**

Em `types/simulado.ts`:

```ts
export interface SimuladoRecommendation {
  specialty: string;
  items: Simulado[];
}
```

Em `simuladosService.ts`:

```ts
export async function fetchRecommendedSimulados(
  specialty: string,
  limit = 3,
): Promise<SimuladoRecommendation> {
  const params = new URLSearchParams({ specialty, limit: String(limit) });
  const res = await authFetch(`${BASE}/simulados/recommended?${params.toString()}`);
  if (!res.ok) return parseError(res, 'Erro ao buscar simulados recomendados');
  return res.json();
}
```

- [ ] **Step 4: Escrever testes do CTA do SummaryCard**

Criar `SummaryCard.test.tsx` com três casos:

```ts
it('preserva o texto e chama onTrain para especialidade fraca', async () => {
  const onTrain = vi.fn();
  render(
    <SummaryCard
      summary="Revise Cardiologia nesta semana."
      weakSpecialty="Cardiologia"
      trainingMode="recommended"
      onTrain={onTrain}
    />,
  );
  expect(screen.getByText('Revise Cardiologia nesta semana.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Cardiologia/i }));
  expect(onTrain).toHaveBeenCalledTimes(1);
});

it('não renderiza CTA sem especialidade fraca', () => {
  render(<SummaryCard summary="Texto" weakSpecialty={null} trainingMode={null} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('mantém resumo visível enquanto recomendação ainda está carregando', () => {
  render(<SummaryCard summary="Texto" weakSpecialty="Cardiologia" trainingMode={null} />);
  expect(screen.getByText('Texto')).toBeInTheDocument();
});
```

- [ ] **Step 5: Executar e confirmar RED**

```bash
npx vitest run src/features/student/components/home/SummaryCard.test.tsx
```

Expected: falha porque as novas props ainda não existem.

- [ ] **Step 6: Implementar props e labels i18n**

Alterar `SummaryCard` para:

```ts
type TrainingMode = 'recommended' | 'create' | null;

interface SummaryCardProps {
  summary: string | null;
  weakSpecialty?: string | null;
  trainingMode?: TrainingMode;
  onTrain?: () => void;
}
```

Renderizar o botão apenas quando `weakSpecialty`, `trainingMode` e `onTrain` existirem. Usar `specialtyLabel(weakSpecialty)` no texto exibido.

Adicionar em `home.summary` dos quatro `common.json` exatamente estes pares:

PT-BR:

```json
"train_specialty": "Treinar {{specialty}}",
"create_training": "Criar treino de {{specialty}}"
```

EN:

```json
"train_specialty": "Practice {{specialty}}",
"create_training": "Create {{specialty}} practice"
```

ES:

```json
"train_specialty": "Practicar {{specialty}}",
"create_training": "Crear práctica de {{specialty}}"
```

RU:

```json
"train_specialty": "Тренировать: {{specialty}}",
"create_training": "Создать тренировку: {{specialty}}"
```

- [ ] **Step 7: Integrar a busca e navegação em MainPage**

Adicionar imports de `fetchRecommendedSimulados` e `Simulado`.

Adicionar estado:

```ts
const [recommendedSimulado, setRecommendedSimulado] = useState<Simulado | null>(null);
const [recommendationResolved, setRecommendationResolved] = useState(false);
```

Derivar:

```ts
const weakSpecialty = weeklySummary?.weakSpecialties[0]?.specialty ?? null;
```

Adicionar efeito:

```ts
useEffect(() => {
  if (!weakSpecialty) {
    setRecommendedSimulado(null);
    setRecommendationResolved(false);
    return;
  }
  let alive = true;
  setRecommendationResolved(false);
  fetchRecommendedSimulados(weakSpecialty)
    .then(data => {
      if (alive) setRecommendedSimulado(data.items[0] ?? null);
    })
    .catch(() => {
      if (alive) setRecommendedSimulado(null);
    })
    .finally(() => {
      if (alive) setRecommendationResolved(true);
    });
  return () => { alive = false; };
}, [weakSpecialty]);
```

Adicionar handler:

```ts
const handleTrainWeakSpecialty = () => {
  if (!weakSpecialty) return;
  if (recommendedSimulado) {
    navigate(`/simulados/${recommendedSimulado.id}/run`);
    return;
  }
  const params = new URLSearchParams({ specialty: weakSpecialty, intent: 'create' });
  navigate(`/simulados?${params.toString()}`);
};
```

Atualizar render:

```tsx
<SummaryCard
  summary={weeklySummary?.summary ?? null}
  weakSpecialty={weakSpecialty}
  trainingMode={
    recommendationResolved
      ? (recommendedSimulado ? 'recommended' : 'create')
      : null
  }
  onTrain={weakSpecialty ? handleTrainWeakSpecialty : undefined}
/>
```

- [ ] **Step 8: Atualizar MainPage.home.test.tsx**

Mockar `fetchRecommendedSimulados` e adicionar dois cenários. O mock do resumo deve devolver:

```ts
{
  summary: 'Resumo semanal',
  week: '2026-W37',
  cached: false,
  language: 'pt-BR',
  weakSpecialties: [{ specialty: 'Cardiologia', averageScore: 42.5, attempts: 2 }],
}
```

Cenário com simulado pronto:

```ts
fetchRecommendedSimulados.mockResolvedValue({
  specialty: 'Cardiologia',
  items: [{
    id: 'sim-cardio',
    title: 'Revisão de Cardiologia',
    description: null,
    specialty: 'Cardiologia',
    subspecialty: null,
    num_questions: 10,
    created_by: 'teacher-1',
    class_id: null,
    due_date: null,
    visibility: 'privado',
    created_at: '2026-09-07T10:00:00Z',
  }],
});
```

Após o CTA aparecer, clicar e afirmar navegação para `/simulados/sim-cardio/run`.

Cenário de falha:

```ts
fetchRecommendedSimulados.mockRejectedValue(new Error('offline'));
```

Após o CTA de fallback aparecer, clicar e afirmar navegação para `/simulados?specialty=Cardiologia&intent=create`. Em ambos os cenários, afirmar `screen.getByText('Resumo semanal')` antes e depois da resolução da recomendação.

- [ ] **Step 9: Rodar testes e commit local**

```bash
cd frontend/anamnes-ia
npx vitest run \
  src/features/simulados/services/simuladosService.test.ts \
  src/features/student/components/home/SummaryCard.test.tsx \
  src/app/MainPage.home.test.tsx
npx tsc -b --noEmit
cd ../..
git add frontend/anamnes-ia/src/features/simulados \
        frontend/anamnes-ia/src/features/student/components/home/SummaryCard.tsx \
        frontend/anamnes-ia/src/features/student/components/home/SummaryCard.test.tsx \
        frontend/anamnes-ia/src/app/MainPage.tsx \
        frontend/anamnes-ia/src/app/MainPage.home.test.tsx \
        frontend/anamnes-ia/src/locales/*/common.json
git commit -m "feat: connect weekly summary to simulados"
```

---

### Task 5: Pré-preencher a criação de Simulado pelo fallback da Home

**Files:**
- Modify: `frontend/anamnes-ia/src/features/simulados/pages/SimuladosListPage.tsx`
- Create: `frontend/anamnes-ia/src/features/simulados/pages/SimuladosListPage.query.test.tsx`

**Interfaces:**
- Consumes: query params `specialty` e `intent=create`.
- Produces: `form.specialties=[specialty]`, `drillEsp=specialty` e fluxo aberto para ajustes gerais quando a especialidade existe nas opções do banco.

- [ ] **Step 1: Escrever teste com MemoryRouter**

Criar teste que monta a página com:

```ts
<MemoryRouter initialEntries={['/simulados?specialty=Cardiologia&intent=create']}>
  <Routes>
    <Route path="/simulados" element={<SimuladosListPage />} />
  </Routes>
</MemoryRouter>
```

Mockar `fetchFilterOptions` para retornar `specialties: ['Cardiologia', 'Neurologia']` e `countAvailableQuestions`.

Afirmar que, após carregar:

```ts
expect(screen.getByText(/área.*Cardiologia/i)).toBeInTheDocument();
expect(countAvailableQuestions).toHaveBeenCalledWith(
  expect.objectContaining({ specialties: ['Cardiologia'] }),
);
```

Adicionar um segundo teste com `specialty=EspecialidadeInexistente` e afirmar que nenhuma specialty inválida entra no formulário.

- [ ] **Step 2: Executar e confirmar RED**

```bash
cd frontend/anamnes-ia
npx vitest run src/features/simulados/pages/SimuladosListPage.query.test.tsx
```

Expected: falha porque a página ignora query params.

- [ ] **Step 3: Implementar leitura segura dos query params**

Trocar import para:

```ts
import { useNavigate, useSearchParams } from 'react-router-dom';
```

No componente:

```ts
const [searchParams] = useSearchParams();
const requestedSpecialty = searchParams.get('specialty');
const createIntent = searchParams.get('intent') === 'create';
```

Dentro do `fetchFilterOptions().then(data => { ... })`, antes da primeira contagem:

```ts
const validRequestedSpecialty = requestedSpecialty && data.specialties.includes(requestedSpecialty)
  ? requestedSpecialty
  : null;

const initialForm = validRequestedSpecialty
  ? { ...defaultForm, specialties: [validRequestedSpecialty] }
  : defaultForm;

setForm(initialForm);
if (validRequestedSpecialty) {
  setDrillEsp(validRequestedSpecialty);
  if (createIntent) setActivePanel('ger');
}

countAvailableQuestions(initialForm).then(...);
```

Garantir que o efeito debounced não resete o filtro.

- [ ] **Step 4: Executar testes e validação TypeScript**

```bash
npx vitest run src/features/simulados/pages/SimuladosListPage.query.test.tsx
npx tsc -b --noEmit
npx eslint src/features/simulados/pages/SimuladosListPage.tsx \
  src/features/simulados/pages/SimuladosListPage.query.test.tsx
```

Expected: testes passam e ESLint sem erros.

- [ ] **Step 5: Commit local**

```bash
cd ../..
git add frontend/anamnes-ia/src/features/simulados/pages/SimuladosListPage.tsx \
        frontend/anamnes-ia/src/features/simulados/pages/SimuladosListPage.query.test.tsx
git commit -m "feat: prefill simulados from weak specialty"
```

---

### Task 6: Verificação integrada do fluxo Resumo → Simulados

**Files:**
- No production files expected unless a verification exposes a regression.

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: evidência de que o fluxo pode ser integrado sem regressão conhecida.

- [ ] **Step 1: Rodar testes backend focados**

```bash
cd backend
python -m pytest tests/test_spec013_weekly_summary.py tests/test_simulado_recommendations.py -q
```

Expected: 0 failures.

- [ ] **Step 2: Rodar testes frontend focados**

```bash
cd ../frontend/anamnes-ia
npx vitest run \
  src/features/student/services/weeklySummaryService.test.ts \
  src/features/student/hooks/useWeeklySummary.test.tsx \
  src/features/student/components/home/SummaryCard.test.tsx \
  src/features/simulados/services/simuladosService.test.ts \
  src/features/simulados/pages/SimuladosListPage.query.test.tsx \
  src/app/MainPage.home.test.tsx
```

Expected: 0 failures.

- [ ] **Step 3: Rodar verificações estáticas completas relevantes**

```bash
npx tsc -b --noEmit
npx eslint src/features/student src/features/simulados src/app/MainPage.tsx
cd ../..
git diff --check
```

Expected: TypeScript e `diff --check` com código 0; ESLint sem erros novos.

- [ ] **Step 4: Rodar regressões de integração já existentes**

```bash
cd frontend/anamnes-ia
node --test scripts/tests/*.test.mjs
```

Expected: todas as regressões de merge continuam passando.

- [ ] **Step 5: Registrar checkpoint local**

```bash
cd ../..
git status --short --branch
git log --oneline -6
```

Expected: branch `Simulados`, commits das Tasks 1–5 presentes, nenhum arquivo de produção não rastreado.
