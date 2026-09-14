import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '@/core/i18n';

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin' },
    logout: vi.fn(),
  }),
}));

vi.mock('../services/adminService', () => ({
  fetchOverview: vi.fn().mockResolvedValue({
    total_users: 0,
    total_students: 0,
    total_teachers: 0,
    total_admins: 1,
    total_institutions: 0,
    total_cases: 0,
    total_classes: 0,
    total_attempts: 0,
    total_completed: 0,
  }),
  fetchInstitutions: vi.fn().mockResolvedValue([]),
  fetchUsers: vi.fn().mockResolvedValue([]),
  createTeacher: vi.fn(),
  createStudentsBulk: vi.fn(),
  createTeachersBulk: vi.fn(),
  toggleUserStatus: vi.fn(),
  deleteUser: vi.fn(),
  resetDailyQuota: vi.fn(),
  createInstitution: vi.fn(),
  updateInstitution: vi.fn(),
  deleteInstitution: vi.fn(),
  fetchAllClasses: vi.fn().mockResolvedValue([]),
  fetchAdminClassDetail: vi.fn(),
  fetchAdminFreeCases: vi.fn().mockResolvedValue([]),
  createFreeCase: vi.fn(),
  deleteAdminFreeCase: vi.fn(),
  fetchGptSettings: vi.fn(),
  updateGptSettings: vi.fn(),
  fetchGptUsage: vi.fn(),
  fetchGptBalance: vi.fn(),
  fetchConversationStats: vi.fn(),
  fetchGptInfo: vi.fn(),
}));

vi.mock('../components/AdminFlashcardsView', () => ({ default: () => null }));

import AdminPanel from './AdminPanel';

function renderAdminPanel() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/questoes" element={<div>QUESTIONS_ROUTE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminPanel navigation', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt-BR');
  });

  it('navega para o banco de questões por uma entrada dedicada, sem transformá-lo em aba interna', async () => {
    const user = userEvent.setup();
    renderAdminPanel();

    const questionsLink = await screen.findByRole('button', { name: 'Banco de Questões' });
    await user.click(questionsLink);

    expect(await screen.findByText('QUESTIONS_ROUTE')).toBeInTheDocument();
  });
});
