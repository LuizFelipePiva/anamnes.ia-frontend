import { authFetch } from '@/core/utils/authFetch';
import type {
  AdminOverview,
  AdminUser,
  Institution,
  InstitutionCreate,
  InstitutionUpdate,
  CreateTeacherPayload,
  BulkStudent,
  BulkCreateResult,
  AdminClass,
  AdminClassDetail,
  AdminFreeCase,
  CreateFreeCasePayload,
  GptSettings,
  GptInfo,
  GptUsage,
  GptBalance,
  ConversationStats,
} from '../types/admin';

const BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchOverview(): Promise<AdminOverview> {
  const res = await authFetch(`${BASE}/admin/overview`);
  if (!res.ok) throw new Error('Erro ao buscar overview');
  return res.json();
}

export async function fetchInstitutions(): Promise<Institution[]> {
  const res = await authFetch(`${BASE}/admin/institutions`);
  if (!res.ok) throw new Error('Erro ao buscar instituições');
  return res.json();
}

export async function createInstitution(data: InstitutionCreate): Promise<Institution> {
  const res = await authFetch(`${BASE}/admin/institutions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao criar instituição');
  }
  return res.json();
}

export async function updateInstitution(id: string, data: InstitutionUpdate): Promise<Institution> {
  const res = await authFetch(`${BASE}/admin/institutions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao atualizar instituição');
  }
  return res.json();
}

export async function deleteInstitution(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/admin/institutions/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao excluir instituição');
  }
}

export async function fetchUsers(role?: string, institution?: string): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (institution) params.set('institution', institution);
  const res = await authFetch(`${BASE}/admin/users?${params}`);
  if (!res.ok) throw new Error('Erro ao buscar usuários');
  return res.json();
}

export async function createTeacher(
  data: CreateTeacherPayload,
): Promise<{ message: string; email: string; temporary_password: string }> {
  const res = await authFetch(`${BASE}/admin/users/teacher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao criar professor');
  }
  return res.json();
}

export async function createStudentsBulk(
  institution_id: string,
  students: BulkStudent[],
  options?: { user_type?: string; skip_email_confirmation?: boolean },
): Promise<{ institution: string; results: BulkCreateResult[] }> {
  const res = await authFetch(`${BASE}/admin/users/students/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institution_id: institution_id || null,
      students,
      user_type: options?.user_type ?? 'free',
      skip_email_confirmation: options?.skip_email_confirmation ?? false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao criar alunos');
  }
  return res.json();
}

export async function createTeachersBulk(
  institution_id: string,
  teachers: BulkStudent[],
  options?: { skip_email_confirmation?: boolean },
): Promise<{ institution: string; results: BulkCreateResult[] }> {
  const res = await authFetch(`${BASE}/admin/users/teachers/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institution_id,
      teachers,
      skip_email_confirmation: options?.skip_email_confirmation ?? false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao criar professores');
  }
  return res.json();
}

export async function toggleUserStatus(
  userId: string,
  active: boolean,
): Promise<void> {
  const res = await authFetch(`${BASE}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao atualizar status');
  }
}

export async function deleteUser(
  userId: string,
): Promise<{ message: string; deleted_email: string }> {
  const res = await authFetch(`${BASE}/admin/users/${userId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao excluir usuário');
  }
  return res.json();
}

export async function resetDailyQuota(
  userId: string,
): Promise<{ message: string; deleted_count: number; user_name: string }> {
  const res = await authFetch(`${BASE}/admin/users/${userId}/reset-daily-quota`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Erro ao resetar cota');
  }
  return res.json();
}

export async function fetchAllClasses(): Promise<AdminClass[]> {
  const res = await authFetch(`${BASE}/admin/classes`);
  if (!res.ok) throw new Error('Erro ao buscar turmas');
  return res.json();
}

export async function fetchAdminClassDetail(classId: string): Promise<AdminClassDetail> {
  const res = await authFetch(`${BASE}/admin/classes/${classId}`);
  if (!res.ok) throw new Error('Erro ao buscar detalhes da turma');
  return res.json();
}

export async function fetchAdminFreeCases(): Promise<AdminFreeCase[]> {
  const res = await authFetch(`${BASE}/cases/free`);
  if (!res.ok) throw new Error('Erro ao buscar casos gratuitos');
  return res.json();
}

export async function createFreeCase(data: CreateFreeCasePayload): Promise<AdminFreeCase> {
  const res = await authFetch(`${BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, published: true, visibility: 'turma' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao criar caso');
  }
  return res.json();
}

export async function deleteAdminFreeCase(caseId: string): Promise<void> {
  const res = await authFetch(`${BASE}/admin/cases/${caseId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao deletar caso');
  }
}

export async function generateCaseWithAI(
  description: string,
  difficulty: string,
): Promise<{ patient_prompt: string; summary: string; title: string; specialty: string | null }> {
  const res = await authFetch(`${BASE}/cases/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, difficulty }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao gerar caso');
  }
  return res.json();
}

export async function fetchGptSettings(): Promise<GptSettings> {
  const res = await authFetch(`${BASE}/admin/gpt-settings`);
  if (!res.ok) throw new Error('Erro ao buscar configurações GPT');
  return res.json();
}

export async function fetchGptInfo(): Promise<GptInfo> {
  const res = await authFetch(`${BASE}/admin/gpt-info`);
  if (!res.ok) throw new Error('Erro ao buscar informações GPT');
  return res.json();
}

export async function updateGptSettings(data: Partial<{ gpt_max_tokens: number; gpt_max_turns: number; gpt_daily_message_limit: number }>): Promise<void> {
  const res = await authFetch(`${BASE}/admin/gpt-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao salvar configurações');
  }
}

export async function fetchGptUsage(): Promise<GptUsage> {
  const res = await authFetch(`${BASE}/admin/gpt-usage`);
  if (!res.ok) throw new Error('Erro ao buscar uso GPT');
  return res.json();
}

export async function fetchGptBalance(): Promise<GptBalance> {
  const res = await authFetch(`${BASE}/admin/gpt-balance`);
  if (!res.ok) throw new Error('Erro ao buscar saldo GPT');
  return res.json();
}

export async function fetchConversationStats(): Promise<ConversationStats> {
  const res = await authFetch(`${BASE}/admin/conversation-stats`);
  if (!res.ok) throw new Error('Erro ao buscar estatísticas de conversas');
  return res.json();
}
