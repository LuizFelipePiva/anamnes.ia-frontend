import { authFetch } from '@/core/utils/authFetch';
import type { StudentProfile } from '../types/profile';

const BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchMyProfile(): Promise<StudentProfile> {
  const res = await authFetch(`${BASE}/profile/me`);
  if (!res.ok) throw new Error('Erro ao carregar perfil');
  return res.json();
}

export async function fetchStudentProfile(studentId: string): Promise<StudentProfile> {
  const res = await authFetch(`${BASE}/profile/${studentId}`);
  if (!res.ok) throw new Error('Erro ao carregar perfil do aluno');
  return res.json();
}

export async function updateMyProfile(data: { name?: string; institution?: string }): Promise<void> {
  const res = await authFetch(`${BASE}/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erro ao salvar perfil');
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await authFetch(`${BASE}/profile/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erro ao alterar senha');
  }
}
