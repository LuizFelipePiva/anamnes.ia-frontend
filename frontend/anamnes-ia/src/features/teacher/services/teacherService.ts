/**
 * Teacher Service — camada de API para o módulo do professor.
 * Todas as chamadas autenticadas usam authFetch.
 */
import { authFetch } from '@/core/utils/authFetch';
import { config } from '@/config/env';
import { API_ENDPOINTS } from '@/config/constants';
import type {
  ClassInfo, ClassCreate, ClassUpdate, ClassWithStudents,
  ClassTeachersResponse, InstitutionTeachersResponse,
  CaseInfo, CaseCreate, CaseUpdate,
  CaseAssignmentDetail,
  DashboardStats, CaseStats, StudentStats, StudentHistoryItem, WeeklyStats,
  CaseAttemptItem, ConversationMessage,
} from '../types/teacher';

const api = (path: string) => `${config.apiUrl}${path}`;

// ─── CLASSES (TURMAS) ─────────────────────

export async function fetchClasses(): Promise<ClassInfo[]> {
  const res = await authFetch(api(API_ENDPOINTS.CLASSES));
  if (!res.ok) throw new Error('Erro ao carregar turmas');
  return res.json();
}

export async function createClass(data: ClassCreate): Promise<ClassInfo> {
  const res = await authFetch(api(API_ENDPOINTS.CLASSES), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao criar turma');
  return res.json();
}

export async function fetchClassDetail(classId: string): Promise<ClassWithStudents> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${classId}`));
  if (!res.ok) throw new Error('Erro ao carregar detalhes da turma');
  return res.json();
}

export async function updateClass(classId: string, data: ClassUpdate): Promise<ClassInfo> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${classId}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar turma');
  return res.json();
}

export async function deleteClass(classId: string): Promise<void> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${classId}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erro ao excluir turma');
}

export async function removeStudent(classId: string, studentId: string): Promise<void> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${classId}/students/${studentId}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erro ao remover aluno');
}

export async function fetchClassTeachers(classId: string): Promise<ClassTeachersResponse> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${classId}/teachers`));
  if (!res.ok) throw new Error('Erro ao carregar professores da turma');
  return res.json();
}

export async function fetchInstitutionTeachers(classId: string): Promise<InstitutionTeachersResponse> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${classId}/institution-teachers`));
  if (!res.ok) throw new Error('Erro ao carregar professores da instituição');
  return res.json();
}

export async function shareClass(classId: string, targetTeacherId: string): Promise<void> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${classId}/share/${targetTeacherId}`), {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao compartilhar turma' }));
    throw new Error(err.detail || 'Erro ao compartilhar turma');
  }
}

export async function unshareClass(classId: string, targetTeacherId: string): Promise<void> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${classId}/share/${targetTeacherId}`), {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao remover acesso' }));
    throw new Error(err.detail || 'Erro ao remover acesso');
  }
}

// ─── CASES (CASOS CLÍNICOS) ──────────────

export async function fetchCases(): Promise<CaseInfo[]> {
  const res = await authFetch(api(API_ENDPOINTS.CASES));
  if (!res.ok) throw new Error('Erro ao carregar casos');
  return res.json();
}

export async function createCase(data: CaseCreate): Promise<CaseInfo> {
  const res = await authFetch(api(API_ENDPOINTS.CASES), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao salvar caso');
  return res.json();
}

export async function updateCase(caseId: string, data: CaseUpdate): Promise<CaseInfo> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar caso');
  return res.json();
}

export async function deleteCase(caseId: string): Promise<void> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erro ao excluir caso');
}

export async function assignCase(caseId: string, classId: string, dueDate?: string): Promise<void> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}/assign`), {
    method: 'POST',
    body: JSON.stringify({ class_id: classId, due_date: dueDate || null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao atribuir caso' }));
    throw new Error(err.detail || 'Erro ao atribuir caso');
  }
}

export async function fetchCaseAssignments(caseId: string): Promise<CaseAssignmentDetail[]> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}/assignments`));
  if (!res.ok) throw new Error('Erro ao carregar atribuições');
  return res.json();
}

export async function updateCaseAssignment(
  caseId: string,
  assignmentId: string,
  data: { due_date?: string | null },
): Promise<void> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}/assignments/${assignmentId}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao atualizar atribuição' }));
    throw new Error(err.detail || 'Erro ao atualizar atribuição');
  }
}

export async function deleteCaseAssignment(caseId: string, assignmentId: string): Promise<void> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}/assignments/${assignmentId}`), {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao remover atribuição' }));
    throw new Error(err.detail || 'Erro ao remover atribuição');
  }
}

// ─── DASHBOARD ────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await authFetch(api(API_ENDPOINTS.DASHBOARD_STATS));
  if (!res.ok) throw new Error('Erro ao carregar estatísticas');
  return res.json();
}

export async function fetchCasesStats(): Promise<CaseStats[]> {
  const res = await authFetch(api(API_ENDPOINTS.DASHBOARD_CASES));
  if (!res.ok) throw new Error('Erro ao carregar estatísticas de casos');
  return res.json();
}

export async function fetchStudentsStats(): Promise<StudentStats[]> {
  const res = await authFetch(api(API_ENDPOINTS.DASHBOARD_STUDENTS));
  if (!res.ok) throw new Error('Erro ao carregar estatísticas de alunos');
  return res.json();
}

export async function fetchStudentHistory(studentId: string): Promise<StudentHistoryItem[]> {
  const res = await authFetch(api(`${API_ENDPOINTS.DASHBOARD_STUDENTS}/${studentId}/history`));
  if (!res.ok) throw new Error('Erro ao carregar histórico do aluno');
  return res.json();
}

export async function fetchDashboardWeekly(): Promise<WeeklyStats[]> {
  const res = await authFetch(api(API_ENDPOINTS.DASHBOARD_WEEKLY));
  if (!res.ok) throw new Error('Erro ao carregar dados semanais');
  return res.json();
}

export async function fetchCaseAttempts(caseId: string): Promise<CaseAttemptItem[]> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}/attempts`));
  if (!res.ok) throw new Error('Erro ao carregar tentativas');
  return res.json();
}

export async function fetchAttemptMessages(caseId: string, attemptId: string): Promise<ConversationMessage[]> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}/attempts/${attemptId}/messages`));
  if (!res.ok) throw new Error('Erro ao carregar mensagens');
  return res.json();
}
