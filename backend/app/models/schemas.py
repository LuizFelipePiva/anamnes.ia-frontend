"""
Schemas Pydantic para validação e serialização de dados.
"""
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)


class UserResponse(UserBase):
    id: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


# Auth Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    # Registro público só cria alunos; professor é promovido via admin (admin.py)
    role: str = Field("student", pattern="^(student)$")
    # Idioma detectado no navegador (SPEC-007). Inválido/ausente → normalizado p/ pt-BR.
    language: str | None = None


class AuthResponse(BaseModel):
    user: UserResponse
    token: str


# Conversation Models
class ConversationBase(BaseModel):
    thread_id: str | None = None
    title: str | None = None


class ConversationResponse(ConversationBase):
    id: str
    user_id: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


# Message Models
class MessageBase(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=10000)


class MessageResponse(MessageBase):
    id: str
    conversation_id: str | None = None
    timestamp: datetime

    class Config:
        from_attributes = True


# Chat Models
class ChatRequest(BaseModel):
    thread_id: str | None = None
    message: str = Field(..., min_length=1, max_length=5000)


class ChatResponse(BaseModel):
    reply: str


class StartChatRequest(BaseModel):
    case_title: str | None = None


class StartChatResponse(BaseModel):
    thread_id: str | None = None
    conversation_id: str


# Evaluation data (from case_attempts)
class EvaluationData(BaseModel):
    attempt_id: str
    score: int | None = None
    feedback: str | None = None
    duration_seconds: int | None = None
    status: str = "in_progress"


# Conversation with Messages
class ConversationWithMessages(BaseModel):
    conversation: ConversationResponse
    messages: list[MessageResponse] = []
    evaluation: EvaluationData | None = None


# =============================================
# CLASS (TURMA) MODELS
# =============================================

class ClassCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    term: str | None = Field(None, max_length=20)
    open_join: bool = True
    goal: int = Field(1, ge=1, le=100)


class ClassUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    term: str | None = Field(None, max_length=20)
    status: str | None = Field(None, pattern="^(active|archived)$")
    open_join: bool | None = None
    goal: int | None = Field(None, ge=1, le=100)


class ClassResponse(BaseModel):
    id: str
    teacher_id: str
    name: str
    code: str
    term: str | None = None
    status: str = "active"
    open_join: bool = True
    goal: int = 1
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ClassWithStudents(ClassResponse):
    students: list[dict] = []
    students_count: int = 0


class JoinClassResponse(BaseModel):
    message: str
    class_name: str
    class_id: str


# =============================================
# CASE (CASO CLÍNICO) MODELS
# =============================================

class AiChatStartRequest(BaseModel):
    """Body opcional para iniciar Chat IA — aluno pode escolher especialidade."""
    specialty: str | None = Field(None, max_length=100)


class CaseGenerateRequest(BaseModel):
    """Request para gerar caso clínico completo via GPT a partir de uma descrição livre."""
    description: str = Field(..., min_length=10, max_length=500)
    difficulty: str = Field("Intermediário", pattern="^(Básico|Intermediário|Avançado)$")


class CaseGenerateResponse(BaseModel):
    """Response com o caso clínico completo gerado pelo GPT."""
    patient_prompt: str
    summary: str
    title: str
    specialty: str | None = None


class CaseCreate(BaseModel):
    """Salvar caso aprovado pelo professor."""
    title: str = Field(..., min_length=2, max_length=200)
    specialty: str | None = Field(None, max_length=100)
    difficulty: str = Field("Intermediário", pattern="^(Básico|Intermediário|Avançado)$")
    summary: str | None = Field(None, max_length=1000)
    patient_prompt: str = Field(..., min_length=10)
    form_data: dict[str, Any] | None = None
    published: bool = False
    visibility: str = Field("turma", pattern="^(turma|privado)$")
    available_until: datetime | None = None


class CaseUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=200)
    specialty: str | None = Field(None, max_length=100)
    difficulty: str | None = Field(None, pattern="^(Básico|Intermediário|Avançado)$")
    summary: str | None = Field(None, max_length=1000)
    patient_prompt: str | None = Field(None, min_length=10)
    published: bool | None = None
    visibility: str | None = Field(None, pattern="^(turma|privado)$")
    available_until: datetime | None = None


class CaseResponse(BaseModel):
    id: str
    teacher_id: str
    title: str
    specialty: str | None = None
    difficulty: str = "Intermediário"
    summary: str | None = None
    patient_prompt: str
    form_data: dict[str, Any] | None = None
    published: bool = False
    visibility: str = "turma"
    available_until: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# =============================================
# CASE ASSIGNMENT MODELS
# =============================================

class CaseAssignRequest(BaseModel):
    class_id: str
    due_date: date | None = None


class CaseAssignResponse(BaseModel):
    id: str
    case_id: str
    class_id: str
    due_date: date | None = None
    assigned_at: datetime | None = None

    class Config:
        from_attributes = True


class CaseAssignmentUpdate(BaseModel):
    """Atualiza só campos enviados (ex.: due_date para alterar ou null para remover prazo)."""
    due_date: date | None = None


# =============================================
# CASE ATTEMPT MODELS
# =============================================

class CaseStartResponse(BaseModel):
    attempt_id: str
    thread_id: str | None = None
    conversation_id: str
    patient_prompt: str
    case_id: str | None = None  # retornado apenas pelo /ai/start


class CaseCompleteRequest(BaseModel):
    soap_content: str = Field(..., min_length=10, max_length=10000)


class CaseCompleteResponse(BaseModel):
    attempt_id: str
    score: int | None
    feedback: str
    duration_seconds: int
    breakdown: dict[str, Any] | None = None


# =============================================
# DASHBOARD MODELS
# =============================================

class DashboardStats(BaseModel):
    total_classes: int = 0
    total_students: int = 0
    total_cases: int = 0
    total_attempts: int = 0
    completed_attempts: int = 0
    completion_rate: float = 0.0
    average_score: float = 0.0
    average_duration_seconds: int = 0


class CaseStats(BaseModel):
    case_id: str
    title: str
    attempts: int = 0
    completed: int = 0
    average_score: float = 0.0
    average_duration: int = 0


class StudentStats(BaseModel):
    student_id: str
    name: str
    email: str
    attempts: int = 0
    completed: int = 0
    completed_by_class: dict[str, int] = {}
    average_score: float = 0.0
    last_activity: datetime | None = None


# ── Flashcard Schemas ─────────────────────────────────────────────────────────

class FlashcardReviewRequest(BaseModel):
    flashcard_id: str
    rating: str = Field(..., pattern="^(again|hard|good|easy)$")


class FlashcardReviewResponse(BaseModel):
    flashcard_id: str
    ef: float
    interval_days: int
    repetitions: int
    next_review_at: datetime


class FlashcardResponse(BaseModel):
    id: str
    deck_id: str
    front: str
    back: str
    hint: str | None = None
    difficulty: str | None = None
    tags: list[str] | None = None


class DeckResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    specialty: str | None = None
    teacher_id: str | None = None
    class_ids: list[str] = []
    class_names: list[str] = []
    total: int = 0
    due_count: int = 0
    created_at: datetime | None = None


class DeckCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(None, max_length=500)
    specialty: str | None = Field(None, max_length=100)
    class_ids: list[str] | None = None


class DeckUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = Field(None, max_length=500)
    specialty: str | None = Field(None, max_length=100)
    class_ids: list[str] | None = None


class CardCreate(BaseModel):
    front: str = Field(..., min_length=1, max_length=1000)
    back: str = Field(..., min_length=1, max_length=2000)
    hint: str | None = Field(None, max_length=500)
    difficulty: str | None = Field("medium", pattern="^(easy|medium|hard)$")
    tags: list[str] | None = None


class CardUpdate(BaseModel):
    front: str | None = Field(None, min_length=1, max_length=1000)
    back: str | None = Field(None, min_length=1, max_length=2000)
    hint: str | None = Field(None, max_length=500)
    difficulty: str | None = Field(None, pattern="^(easy|medium|hard)$")
    tags: list[str] | None = None


class FlashcardGenerateRequest(BaseModel):
    """Request para gerar flashcards automaticamente a partir de uma conversa."""
    conversation_id: str
    deck_name: str = Field(..., min_length=2, max_length=100)
    existing_deck_id: str | None = None


class FlashcardGenerateResponse(BaseModel):
    """Response com o resultado da geração automática de flashcards."""
    deck_id: str
    deck_name: str
    cards_created: int
    specialty: str | None = None


# Question Bank Models
class QuestionPublic(BaseModel):
    """Questão vista pelo aluno — sem gabarito (correct_answer/explanation)."""
    id: str
    statement: str
    options: dict[str, str]
    specialty: str
    subspecialty: str
    image_url: str | None = None
    created_at: datetime | None = None


class QuestionAdmin(QuestionPublic):
    """Questão completa (admin) — inclui gabarito."""
    correct_answer: str
    explanation: str | None = None


class QuestionCreate(BaseModel):
    statement: str = Field(..., min_length=1)
    options: dict[str, str]
    correct_answer: str = Field(..., min_length=1, max_length=5)
    explanation: str | None = None
    specialty: str = Field(..., min_length=1, max_length=100)
    subspecialty: str = Field(..., min_length=1, max_length=100)
    image_url: str | None = None


class QuestionUpdate(BaseModel):
    statement: str | None = Field(None, min_length=1)
    options: dict[str, str] | None = None
    correct_answer: str | None = Field(None, min_length=1, max_length=5)
    explanation: str | None = None
    specialty: str | None = Field(None, min_length=1, max_length=100)
    subspecialty: str | None = Field(None, min_length=1, max_length=100)
    image_url: str | None = None


class QuestionAnswerRequest(BaseModel):
    answer: str = Field(..., min_length=1, max_length=5)


class QuestionAnswerResponse(BaseModel):
    correct: bool
    correct_answer: str
    explanation: str | None = None


class QuestionsImportRequest(BaseModel):
    """Importação em lote — aceita chaves em pt (enunciado/alternativas/...) ou en."""
    items: list[dict[str, Any]] = Field(..., min_length=1)


class QuestionsImportResponse(BaseModel):
    imported: int


class QuestionImageUploadResponse(BaseModel):
    image_url: str


# ── Simulados ──────────────────────────────────────────────────────────────────

class SimuladoCreate(BaseModel):
    """Payload para criar um simulado (professor ou aluno)."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    specialty: str | None = Field(None, max_length=100)    # None = todas especialidades
    subspecialty: str | None = Field(None, max_length=100) # None = todas subespecialidades
    num_questions: int = Field(40, ge=1, le=200)
    class_id: str | None = None           # None = simulado pessoal/livre
    due_date: datetime | None = None
    visibility: str = "privado"

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title não pode ser apenas espaços em branco")
        return v

    @field_validator("visibility")
    @classmethod
    def check_visibility(cls, v: str) -> str:
        allowed = {"privado", "turma", "publico"}
        if v not in allowed:
            raise ValueError(f"visibility deve ser um de {allowed}")
        return v


class SimuladoPublic(BaseModel):
    """Simulado listado para o aluno/professor."""
    id: str
    title: str
    description: str | None = None
    specialty: str | None = None
    subspecialty: str | None = None
    num_questions: int
    created_by: str
    class_id: str | None = None
    due_date: datetime | None = None
    visibility: str
    created_at: datetime


class SimuladoAttemptStart(BaseModel):
    """Resposta ao iniciar uma tentativa — contém as questões sem gabarito."""
    attempt_id: str
    simulado_id: str
    questions: list[dict]  # list[QuestionPublic] sem correct_answer/explanation


class SimuladoAnswerRequest(BaseModel):
    """Envio de resposta de uma questão durante o simulado."""
    question_id: str = Field(..., min_length=1)
    # Aceita apenas letras A-E (alternativas padrão de questões médicas)
    selected_answer: str = Field(..., pattern=r"^[A-Ea-e]$")


class SimuladoAnswerResponse(BaseModel):
    """Confirmação de registro da resposta (sem revelar gabarito ainda)."""
    recorded: bool


class SimuladoReportQuestion(BaseModel):
    """Uma questão no relatório final — inclui gabarito e explicação."""
    question_id: str
    statement: str
    options: dict[str, str]
    image_url: str | None = None
    specialty: str
    subspecialty: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str | None = None


class SimuladoReport(BaseModel):
    """Relatório completo de uma tentativa finalizada."""
    attempt_id: str
    simulado_id: str
    simulado_title: str
    status: str
    score: int
    num_correct: int
    num_total: int
    time_spent_seconds: int | None = None
    started_at: datetime
    completed_at: datetime | None = None
    questions: list[SimuladoReportQuestion]


class SimuladoAttemptSummary(BaseModel):
    """Resumo de uma tentativa (para listagens)."""
    id: str
    simulado_id: str
    student_id: str
    status: str
    score: int | None = None
    num_correct: int | None = None
    num_total: int | None = None
    started_at: datetime
    completed_at: datetime | None = None
    time_spent_seconds: int | None = None
