/**
 * ClassSharingPanel — Painel de compartilhamento de turma.
 * Exibe o dono + professores com acesso compartilhado.
 * Se o usuário for dono, permite adicionar/remover professores da mesma instituição.
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchClassTeachers,
  fetchInstitutionTeachers,
  shareClass,
  unshareClass,
} from '../services/teacherService';
import type { SharedTeacher } from '../types/teacher';

interface Props {
  classId: string;
  isOwner: boolean;
}

export default function ClassSharingPanel({ classId, isOwner }: Props) {
  const { t } = useTranslation('teacher');
  const [teachers, setTeachers] = useState<SharedTeacher[]>([]);
  const [available, setAvailable] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachersRes, availRes] = await Promise.all([
        fetchClassTeachers(classId),
        isOwner ? fetchInstitutionTeachers(classId) : Promise.resolve({ teachers: [] }),
      ]);
      setTeachers(teachersRes.teachers);
      setAvailable(availRes.teachers);
    } catch {
      setError(t('sharing.load_error'));
    } finally {
      setLoading(false);
    }
  }, [classId, isOwner, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleShare = async (targetId: string) => {
    setActionLoading(targetId);
    setError(null);
    try {
      await shareClass(classId, targetId);
      await load();
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sharing.share_error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnshare = async (targetId: string) => {
    setActionLoading(targetId);
    setError(null);
    try {
      await unshareClass(classId, targetId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sharing.unshare_error'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-[#f0edf8]">

      {/* Header */}
      <p className="text-[11px] font-extrabold text-[#9893b0] uppercase tracking-widest">
        {t('sharing.title')}
      </p>

      {error && (
        <p className="text-[12px] text-rose-500 font-medium">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-[#844AF5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Lista de professores */}
          <div className="flex flex-col gap-1.5">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#f8fafc]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${teacher.is_owner ? 'bg-[#844AF5]' : 'bg-[#38b2ac]'}`}>
                    {(teacher.name || teacher.email)[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#111018] truncate">{teacher.name || teacher.email}</p>
                    {teacher.name && <p className="text-[11px] text-[#94a3b8] truncate">{teacher.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {teacher.is_owner ? (
                    <span className="text-[10px] font-bold bg-[#844AF5] text-white px-2 py-0.5 rounded-full">{t('sharing.owner')}</span>
                  ) : (
                    <>
                      <span className="text-[10px] font-semibold bg-[#38b2ac] text-white px-2 py-0.5 rounded-full">{t('sharing.shared')}</span>
                      {isOwner && (
                        <button
                          onClick={() => handleUnshare(teacher.id)}
                          disabled={actionLoading === teacher.id}
                          className="text-[11px] px-2 py-1 rounded-lg bg-red-50 text-red-500 border border-red-100 font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                          {actionLoading === teacher.id ? '...' : t('actions.remove')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botão de adicionar professor — destaque total */}
          {isOwner && available.length > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setShowAdd((v) => !v)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                  showAdd
                    ? 'bg-[#f5f3fb] text-[#844AF5] border-[#e0d8f9]'
                    : 'bg-[#844AF5] text-white border-transparent hover:bg-[#6b35ff]'
                }`}
              >
                <span className="text-base leading-none">{showAdd ? '✕' : '+'}</span>
                {showAdd ? t('actions.cancel') : t('sharing.add_teacher')}
              </button>

              {/* Dropdown de professores disponíveis */}
              {showAdd && (
                <div className="mt-2 rounded-xl border border-[#e8e3fc] bg-white overflow-hidden shadow-sm">
                  <p className="px-4 py-2.5 text-[11px] font-bold text-[#9893b0] uppercase tracking-widest border-b border-[#f0edf8]">
                    {t('sharing.institution_teachers')}
                  </p>
                  {available.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-[#9893b0]">{t('sharing.none_available')}</p>
                  ) : (
                    <div className="flex flex-col">
                      {available.map((teacher) => (
                        <div key={teacher.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#faf9fe] transition-all border-b border-[#f8f7fb] last:border-0">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#111018] truncate">{teacher.name || teacher.email}</p>
                            {teacher.name && <p className="text-[11px] text-[#94a3b8] truncate">{teacher.email}</p>}
                          </div>
                          <button
                            onClick={() => handleShare(teacher.id)}
                            disabled={actionLoading === teacher.id}
                            className="ml-3 flex-shrink-0 text-[12px] px-3 py-1.5 rounded-lg bg-[#844AF5] text-white font-semibold hover:bg-[#6b35ff] transition-all disabled:opacity-50"
                          >
                            {actionLoading === teacher.id ? '...' : t('actions.add')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
