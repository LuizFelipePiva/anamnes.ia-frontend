import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  LayoutDashboard, Building2, GraduationCap, BookOpen,
  Users, UserCheck, UserX, ChevronLeft, LogOut,
  Plus, Search, X, Eye, EyeOff, Activity,
  TrendingUp, FileText, BookMarked, CheckCircle2,
  AlertCircle, Info, ArrowRight, Shield, Pencil, Trash2, ToggleLeft, ToggleRight,
  School, Stethoscope, ChevronDown, Upload, Bot, Sliders, RefreshCw, MessageSquare, Zap, Wallet, Menu, ListChecks,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import AdminFlashcardsView from '../components/AdminFlashcardsView';
import QuestionsAdminPage from './QuestionsAdminPage';
import type { AdminOverview, AdminUser, Institution, AdminTab, BulkCreateResult, AdminClass, AdminClassDetail, AdminFreeCase, GptSettings, GptInfo, GptUsage, GptBalance, ConversationStats } from '../types/admin';
import {
  fetchOverview, fetchInstitutions, fetchUsers,
  createTeacher, createStudentsBulk, createTeachersBulk, toggleUserStatus, deleteUser, resetDailyQuota,
  createInstitution, updateInstitution, deleteInstitution,
  fetchAllClasses, fetchAdminClassDetail, fetchAdminFreeCases, createFreeCase, deleteAdminFreeCase,
  fetchGptSettings, updateGptSettings, fetchGptUsage, fetchGptBalance, fetchConversationStats, fetchGptInfo,
} from '../services/adminService';
import { SPECIALTIES, specialtyLabel } from '@/shared/utils/specialties';

type T = TFunction<'admin'>;

function formatExpiryLabel(expiresAt: string | null | undefined, t: T, locale: string): string | null {
  if (!expiresAt) return null;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return null;
  const diffMs = expiresMs - Date.now();
  if (diffMs <= 0) return t('panel.free_cases.expiry_today');
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return t('panel.free_cases.expiry_hours', { count: diffHours });
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return t('panel.free_cases.expiry_days', { count: diffDays });
  return t('panel.free_cases.expiry_date', { date: new Date(expiresAt).toLocaleDateString(locale) });
}

const font = { fontFamily: "'Inter', -apple-system, sans-serif" };

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: number; icon: React.ReactNode;
  accent: string; sub?: string; pct?: number; locale: string;
}> = ({ label, value, icon, accent, sub, pct, locale }) => (
  <div className="bg-white rounded-xl border border-[#eeedf2] p-5 flex flex-col gap-3 hover:border-[#d4cfe8] transition-colors" style={font}>
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold text-[#6b6880] uppercase tracking-widest">{label}</p>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
    </div>
    <div>
      <p className="text-3xl font-black text-[#111018] tabular-nums leading-none">{value.toLocaleString(locale)}</p>
      {sub && <p className="text-xs text-[#9893b0] mt-1.5 font-medium">{sub}</p>}
      {pct !== undefined && (
        <div className="mt-2.5 h-1 bg-[#f0edf8] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#6366f1] transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  </div>
);

// ─── Badges ───────────────────────────────────────────────────────────────────
const ActiveBadge: React.FC<{ active: boolean }> = ({ active }) => {
  const { t } = useTranslation('admin');
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${active ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fff1f2] text-[#e11d48]'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#10b981]' : 'bg-[#fb7185]'}`} />
      {active ? t('panel.common.active') : t('panel.common.inactive')}
    </span>
  );
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const { t } = useTranslation('admin');
  const cls: Record<string, string> = {
    admin: 'bg-[#f0f0fe] text-[#4f46e5]',
    teacher: 'bg-[#f0f9ff] text-[#0369a1]',
    student: 'bg-[#f8fafc] text-[#475569]',
  };
  const isKnown = role === 'admin' || role === 'teacher' || role === 'student';
  const label = isKnown ? t(`panel.roles.${role}`) : role;
  return <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${cls[role] ?? 'bg-gray-100 text-gray-600'}`}>{label}</span>;
};

// ─── Input ────────────────────────────────────────────────────────────────────
const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider" style={font}>{label}</label>}
    <input
      {...props}
      style={font}
      className="w-full px-3.5 py-2.5 rounded-lg border border-[#e5e2ef] bg-white text-sm text-[#111018] placeholder:text-[#b0aac8] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all"
    />
  </div>
);

// ─── Alert ────────────────────────────────────────────────────────────────────
const Alert: React.FC<{ type: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({ type, children }) => {
  const cfg = {
    error: { cls: 'bg-[#fff1f2] border-[#fecdd3] text-[#be123c]', icon: <AlertCircle size={14} /> },
    success: { cls: 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]', icon: <CheckCircle2 size={14} /> },
    info: { cls: 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]', icon: <Info size={14} /> },
  };
  const { cls, icon } = cfg[type];
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm font-medium ${cls}`} style={font}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      {children}
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({
  open, onClose, title, children,
}) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(7,5,20,.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ animation: 'modalIn .18s cubic-bezier(.34,1.56,.64,1)', ...font }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0edf8]">
          <h2 className="text-base font-bold text-[#111018]">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Institution Select ───────────────────────────────────────────────────────
const InstitutionSelect: React.FC<{
  institutions: Institution[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}> = ({ institutions, value, onChange, required }) => {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider" style={font}>{t('panel.institution_modal.label')}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        style={font}
        className="w-full px-3.5 py-2.5 rounded-lg border border-[#e5e2ef] bg-white text-sm text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all"
      >
        <option value="">{t('panel.institution_modal.select')}</option>
        {institutions.filter(i => i.active).map(i => (
          <option key={i.id} value={i.id}>{i.name}</option>
        ))}
      </select>
    </div>
  );
};

// ─── Create Institution Modal ─────────────────────────────────────────────────
const CreateInstitutionModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: Institution | null;
}> = ({ open, onClose, onSuccess, editing }) => {
  const { t } = useTranslation('admin');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && editing) {
      setName(editing.name);
      setDescription(editing.description ?? '');
      setAddress(editing.address ?? '');
    } else if (open) {
      setName(''); setDescription(''); setAddress(''); setError('');
    }
  }, [open, editing]);

  const handleClose = () => { setName(''); setDescription(''); setAddress(''); setError(''); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (editing) {
        await updateInstitution(editing.id, { name: name.trim(), description: description.trim() || undefined, address: address.trim() || undefined });
      } else {
        await createInstitution({ name: name.trim(), description: description.trim() || undefined, address: address.trim() || undefined });
      }
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('panel.common.unknown_error'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={handleClose} title={editing ? t('panel.institution_modal.title_edit') : t('panel.institution_modal.title_new')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert type="error">{error}</Alert>}
        <Field label={t('panel.institution_modal.name')} type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('panel.institution_modal.name_placeholder')} required autoFocus />
        <Field label={t('panel.institution_modal.description')} type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('panel.institution_modal.description_placeholder')} />
        <Field label={t('panel.institution_modal.address')} type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('panel.institution_modal.address_placeholder')} />
        <button type="submit" disabled={busy} style={{ boxShadow: busy ? 'none' : '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)', ...font }} className="w-full py-2.5 mt-1 rounded-xl bg-[#6366f1] text-white text-sm font-semibold hover:bg-[#4f46e5] disabled:opacity-50 active:scale-[.97] active:shadow-none transition-all">
          {busy ? t('panel.common.saving') : editing ? t('panel.institution_modal.submit_edit') : t('panel.institution_modal.submit_new')}
        </button>
      </form>
    </Modal>
  );
};

// ─── Create Teacher Modal ─────────────────────────────────────────────────────
const CreateTeacherModal: React.FC<{ open: boolean; onClose: () => void; onSuccess: () => void; institutions: Institution[] }> = ({ open, onClose, onSuccess, institutions }) => {
  const { t } = useTranslation('admin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ password: string } | null>(null);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const reset = () => { setName(''); setEmail(''); setInstitutionId(''); setResult(null); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await createTeacher({ name, email, institution_id: institutionId });
      setResult({ password: res.temporary_password });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('panel.common.unknown_error'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t('panel.teacher_modal.title')}>
      {result ? (
        <div className="flex flex-col gap-4">
          <Alert type="success">{t('panel.teacher_modal.success')}</Alert>
          <div className="rounded-xl border border-[#e5e2ef] bg-[#faf9fe] p-4">
            <p className="text-[11px] font-bold text-[#6366f1] uppercase tracking-widest mb-2">{t('panel.teacher_modal.temp_password')}</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xl font-black text-[#111018] flex-1 select-all tracking-wider">
                {showPwd ? result.password : '•'.repeat(result.password.length)}
              </p>
              <button onClick={() => setShowPwd(p => !p)} className="text-[#9893b0] hover:text-[#6366f1] transition-colors">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-[#9893b0] mt-2">{t('panel.teacher_modal.password_hint')}</p>
          </div>
          <button onClick={handleClose} style={{ boxShadow: '0 1px 2px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.06)', ...font }} className="w-full py-2.5 rounded-xl bg-[#111018] text-white text-sm font-semibold hover:bg-[#1e1b2e] active:scale-[.97] active:shadow-none transition-all">{t('panel.common.close')}</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Field label={t('panel.teacher_modal.name')} type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('panel.teacher_modal.name_placeholder')} required />
          <Field label={t('panel.teacher_modal.email')} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('panel.teacher_modal.email_placeholder')} required />
          <InstitutionSelect institutions={institutions} value={institutionId} onChange={setInstitutionId} required />
          <button type="submit" disabled={busy} style={{ boxShadow: busy ? 'none' : '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)', ...font }} className="w-full py-2.5 mt-1 rounded-xl bg-[#6366f1] text-white text-sm font-semibold hover:bg-[#4f46e5] disabled:opacity-50 active:scale-[.97] active:shadow-none transition-all">
            {busy ? t('panel.teacher_modal.creating') : t('panel.teacher_modal.submit')}
          </button>
        </form>
      )}
    </Modal>
  );
};

// ─── Shared CSV helpers ──────────────────────────────────────────────────────
function parseCsvText(raw: string): { name: string; email: string; password?: string }[] {
  const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
  return raw
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .flatMap(line => {
      const sep = line.includes(';') ? ';' : ',';
      const parts = line.split(sep).map(s => s.trim());
      const emailIdx = parts.findIndex(p => EMAIL_RE.test(p));
      if (emailIdx === -1) return []; // skip header rows or lines without valid email
      const name = emailIdx > 0
        ? parts.slice(0, emailIdx).join(sep === ';' ? '; ' : ', ').trim()
        : parts[0] ?? '';
      const email = parts[emailIdx];
      const password = parts[emailIdx + 1] || undefined;
      return [{ name, email, ...(password ? { password } : {}) }];
    });
}

function downloadCsvTemplate(role: 'teacher' | 'student', t: T) {
  const header = t('panel.bulk.csv_template_header');
  const examples = role === 'teacher'
    ? t('panel.bulk.csv_example_teacher')
    : t('panel.bulk.csv_example_student');
  const blob = new Blob([`${header}\n${examples}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `modelo_${role}s.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportCredentialsCsv(results: BulkCreateResult[], t: T) {
  const loginUrl = `${window.location.origin}/login`;
  const lines = [t('panel.bulk.csv_credentials_header')];
  results.forEach(r => {
    lines.push(`${r.email},${r.temporary_password ?? t('panel.bulk.csv_already_existed')},${r.status},${loginUrl}`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `credenciais_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Reusable bulk upload body ────────────────────────────────────────────────
interface ImportedFile { id: string; name: string; content: string }

const BulkUploadBody: React.FC<{
  role: 'teacher' | 'student';
  csvText: string;
  onCsvText: (v: string) => void;
  institutionId: string;
  onInstitutionId: (v: string) => void;
  institutions: Institution[];
  busy: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  userType?: string;
  onUserType?: (v: string) => void;
  skipEmailConfirmation?: boolean;
  onSkipEmailConfirmation?: (v: boolean) => void;
}> = ({ role, csvText, onCsvText, institutionId, onInstitutionId, institutions, busy, error, onSubmit, userType, onUserType, skipEmailConfirmation, onSkipEmailConfirmation }) => {
  const { t } = useTranslation('admin');
  const [dragging, setDragging] = useState(false);
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [manualText, setManualText] = useState('');

  // Reset local state when parent clears csvText (modal reset)
  useEffect(() => {
    if (!csvText) { setImportedFiles([]); setManualText(''); }
  }, [csvText]);

  const recompute = (files: ImportedFile[], manual: string) => {
    const combined = [...files.map(f => f.content), manual].filter(Boolean).join('\n');
    onCsvText(combined);
  };

  const addFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = (e.target?.result as string ?? '').trim();
      const entry: ImportedFile = { id: Math.random().toString(36).slice(2), name: file.name, content };
      setImportedFiles(prev => {
        const updated = [...prev, entry];
        recompute(updated, manualText);
        return updated;
      });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const removeFile = (id: string) => {
    setImportedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      recompute(updated, manualText);
      return updated;
    });
  };

  const handleManualChange = (v: string) => {
    setManualText(v);
    recompute(importedFiles, v);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    Array.from(e.dataTransfer.files).forEach(addFile);
  };

  const isTeacher = role === 'teacher';

  const USER_TYPE_OPTIONS = [
    { value: 'free', label: t('panel.bulk.plan_free'), color: 'text-[#6b6880]', bg: 'bg-[#f0edf8]' },
    { value: 'paid', label: t('panel.bulk.plan_paid'), color: 'text-[#059669]', bg: 'bg-[#f0fdf9]' },
    { value: 'b2b', label: t('panel.bulk.plan_b2b'), color: 'text-[#0369a1]', bg: 'bg-[#f0f9ff]' },
  ];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <Alert type="error">{error}</Alert>}
      {(role === 'teacher' || userType === 'b2b') && (
        <InstitutionSelect institutions={institutions} value={institutionId} onChange={onInstitutionId} required />
      )}

      {/* Plano — só para alunos */}
      {role === 'student' && onUserType && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#374151] uppercase tracking-wider" style={font}>{t('panel.bulk.plan')}</label>
          <div className="flex gap-2">
            {USER_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUserType(opt.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${userType === opt.value
                    ? `${opt.bg} ${opt.color} border-current`
                    : 'text-[#9893b0] border-[#e5e2ef] hover:border-[#c4bee0]'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {userType === 'paid' && (
            <p className="text-[11px] text-[#059669]">{t('panel.bulk.plan_paid_hint')}</p>
          )}
          {userType === 'b2b' && (
            <p className="text-[11px] text-[#0369a1]">{t('panel.bulk.plan_b2b_hint')}</p>
          )}
        </div>
      )}

      {/* Skip email confirmation */}
      {onSkipEmailConfirmation && (
        <label className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e2ef] bg-[#faf9fe] cursor-pointer hover:border-[#c4bee0] transition-colors">
          <input
            type="checkbox"
            checked={skipEmailConfirmation ?? false}
            onChange={e => onSkipEmailConfirmation(e.target.checked)}
            className="w-4 h-4 accent-[#6366f1] rounded"
          />
          <div>
            <p className="text-sm font-semibold text-[#374151]">{t('panel.bulk.skip_email')}</p>
            <p className="text-[11px] text-[#9893b0]">{t('panel.bulk.skip_email_hint')}</p>
          </div>
        </label>
      )}

      {/* File drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 transition-colors ${dragging ? 'border-[#6366f1] bg-[#f0f0fe]' : 'border-[#e5e2ef] bg-[#faf9fe] hover:border-[#c4bee0]'
          }`}
      >
        <Upload size={18} className="text-[#9893b0]" />
        <p className="text-sm font-medium text-[#374151]">{t('panel.bulk.drop')}</p>
        <p className="text-xs text-[#9893b0]">
          <Trans t={t} i18nKey={isTeacher ? 'panel.bulk.format_teacher' : 'panel.bulk.format_student'}
            components={[<span key="0" />, <span key="1" className="font-mono" />]} />
        </p>
        <p className="text-xs text-[#9893b0]">
          <Trans t={t} i18nKey="panel.bulk.password_hint"
            components={[<span key="0" />, <span key="1" className="font-semibold text-[#374151]" />]} />
        </p>
        <label className="mt-1 cursor-pointer text-xs font-semibold text-[#6366f1] hover:text-[#4f46e5] transition-colors">
          {importedFiles.length > 0 ? t('panel.bulk.add_more') : t('panel.bulk.select_file')}
          <input
            type="file"
            accept=".csv,.txt"
            multiple
            className="hidden"
            onChange={e => { Array.from(e.target.files ?? []).forEach(addFile); e.currentTarget.value = ''; }}
          />
        </label>
      </div>

      {/* File chips */}
      {importedFiles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold text-[#6b6880] uppercase tracking-wider">{t('panel.bulk.imported_files')}</p>
          <div className="flex flex-wrap gap-2">
            {importedFiles.map(f => {
              const lineCount = f.content.split('\n').filter(Boolean).length;
              return (
                <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f0edf8] border border-[#d4cfe8] rounded-lg text-xs font-medium text-[#374151] max-w-[220px]">
                  <FileText size={12} className="text-[#844AF5] shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-[#9893b0] shrink-0">({lineCount})</span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="ml-0.5 text-[#9893b0] hover:text-[#e11d48] transition-colors shrink-0"
                    title={t('panel.bulk.remove_file')}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editable text area */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#374151] uppercase tracking-wider" style={font}>{isTeacher ? t('panel.bulk.paste_teachers') : t('panel.bulk.paste_students')}</label>
          <button
            type="button"
            onClick={() => downloadCsvTemplate(role, t)}
            className="text-[10px] font-semibold text-[#6366f1] hover:text-[#4f46e5] transition-colors"
          >
            {t('panel.bulk.download_template')}
          </button>
        </div>
        <textarea
          value={manualText}
          onChange={e => handleManualChange(e.target.value)}
          placeholder={isTeacher ? t('panel.bulk.placeholder_teacher') : t('panel.bulk.placeholder_student')}
          rows={5}
          style={font}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[#e5e2ef] bg-white text-sm text-[#111018] placeholder:text-[#b0aac8] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] font-mono resize-none transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={busy || !csvText.trim()}
        style={{ boxShadow: (busy || !csvText.trim()) ? 'none' : '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)', ...font }}
        className="w-full py-2.5 mt-1 rounded-xl bg-[#6366f1] text-white text-sm font-semibold hover:bg-[#4f46e5] disabled:opacity-50 active:scale-[.97] active:shadow-none transition-all"
      >
        {busy
          ? (isTeacher ? t('panel.bulk.submitting_teachers') : t('panel.bulk.submitting_students'))
          : (isTeacher ? t('panel.bulk.submit_teachers') : t('panel.bulk.submit_students'))}
      </button>
    </form>
  );
};

const BulkResultsView: React.FC<{ results: BulkCreateResult[]; onClose: () => void }> = ({ results, onClose }) => {
  const { t } = useTranslation('admin');
  const created = results.filter(r => r.status === 'criado').length;
  const loginUrl = `${window.location.origin}/login`;
  return (
    <div className="flex flex-col gap-4">
      <Alert type={created === results.length ? 'success' : 'info'}>
        {t('panel.bulk.results_summary', { created, total: results.length })}
      </Alert>

      {/* Instruções de compartilhamento */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#f0f9ff] border border-[#bae6fd]">
        <Info size={14} className="text-[#0369a1] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-[#0369a1]">{t('panel.bulk.share_title')}</p>
          <p className="text-xs text-[#0c4a6e] mt-0.5">
            <Trans t={t} i18nKey="panel.bulk.share_body" values={{ url: loginUrl }}
              components={[<span key="0" />, <span key="1" className="font-mono font-semibold" />]} />
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => exportCredentialsCsv(results, t)}
        style={font}
        className="self-end text-xs font-semibold text-[#6366f1] hover:text-[#4f46e5] transition-colors"
      >
        {t('panel.bulk.download_credentials')}
      </button>
      <div className="max-h-60 overflow-y-auto flex flex-col divide-y divide-[#f0edf8] rounded-xl border border-[#e5e2ef]">
        {results.map(r => (
          <div key={r.email} className="flex items-center justify-between px-4 py-2.5 gap-2">
            <span className="text-sm text-[#374151] font-medium truncate min-w-0">{r.email}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {r.temporary_password && (
                <span className="font-mono text-xs text-[#6366f1] bg-[#f0f0fe] px-2 py-0.5 rounded-md">{r.temporary_password}</span>
              )}
              <span className={`text-xs font-semibold ${r.status === 'criado' ? 'text-[#059669]' : 'text-[#e11d48]'}`}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.06)', ...font }}
        className="w-full py-2.5 rounded-xl bg-[#111018] text-white text-sm font-semibold hover:bg-[#1e1b2e] active:scale-[.97] transition-all"
      >
        {t('panel.common.close')}
      </button>
    </div>
  );
};

// ─── Bulk Student Modal ───────────────────────────────────────────────────────
const BulkStudentModal: React.FC<{ open: boolean; onClose: () => void; onSuccess: () => void; institutions: Institution[] }> = ({ open, onClose, onSuccess, institutions }) => {
  const { t } = useTranslation('admin');
  const [institutionId, setInstitutionId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [userType, setUserType] = useState('free');
  const [skipEmailConfirmation, setSkipEmailConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BulkCreateResult[]>([]);
  const [error, setError] = useState('');

  const reset = () => { setInstitutionId(''); setCsvText(''); setUserType('free'); setSkipEmailConfirmation(false); setResults([]); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const students = parseCsvText(csvText);
      if (students.some(s => !s.name || !s.email))
        throw new Error(t('panel.bulk.invalid_format'));
      const res = await createStudentsBulk(institutionId, students, { user_type: userType, skip_email_confirmation: skipEmailConfirmation });
      setResults(res.results);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('panel.common.unknown_error'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t('panel.bulk.student_title')}>
      {results.length > 0
        ? <BulkResultsView results={results} onClose={handleClose} />
        : <BulkUploadBody role="student" csvText={csvText} onCsvText={setCsvText} institutionId={institutionId} onInstitutionId={setInstitutionId} institutions={institutions} busy={busy} error={error} onSubmit={handleSubmit} userType={userType} onUserType={setUserType} skipEmailConfirmation={skipEmailConfirmation} onSkipEmailConfirmation={setSkipEmailConfirmation} />}
    </Modal>
  );
};

// ─── Bulk Teacher Modal ───────────────────────────────────────────────────────
const BulkTeacherModal: React.FC<{ open: boolean; onClose: () => void; onSuccess: () => void; institutions: Institution[] }> = ({ open, onClose, onSuccess, institutions }) => {
  const { t } = useTranslation('admin');
  const [institutionId, setInstitutionId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [skipEmailConfirmation, setSkipEmailConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BulkCreateResult[]>([]);
  const [error, setError] = useState('');

  const reset = () => { setInstitutionId(''); setCsvText(''); setSkipEmailConfirmation(false); setResults([]); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const teachers = parseCsvText(csvText);
      if (teachers.some(t => !t.name || !t.email))
        throw new Error(t('panel.bulk.invalid_format'));
      const res = await createTeachersBulk(institutionId, teachers, { skip_email_confirmation: skipEmailConfirmation });
      setResults(res.results);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('panel.common.unknown_error'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t('panel.bulk.teacher_title')}>
      {results.length > 0
        ? <BulkResultsView results={results} onClose={handleClose} />
        : <BulkUploadBody role="teacher" csvText={csvText} onCsvText={setCsvText} institutionId={institutionId} onInstitutionId={setInstitutionId} institutions={institutions} busy={busy} error={error} onSubmit={handleSubmit} skipEmailConfirmation={skipEmailConfirmation} onSkipEmailConfirmation={setSkipEmailConfirmation} />}
    </Modal>
  );
};

// ─── Users Table ──────────────────────────────────────────────────────────────
const UsersTable: React.FC<{
  users: AdminUser[]; loading: boolean;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string, name: string, email: string) => void;
  onResetQuota?: (id: string, name: string) => void;
  quotaResetting?: string | null;
}> = ({ users, loading, onToggle, onDelete, onResetQuota, quotaResetting }) => {
  const { t } = useTranslation('admin');
  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!users.length) return (
    <div className="flex flex-col items-center justify-center py-20 gap-2" style={font}>
      <Users size={32} className="text-[#d4cfe8]" />
      <p className="text-sm font-medium text-[#9893b0]">{t('panel.users.empty')}</p>
    </div>
  );

  return (
    <div className="overflow-x-auto" style={font}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {([
              t('panel.users.col_name'), t('panel.users.col_email'), t('panel.users.col_institution'),
              t('panel.users.col_type'), t('panel.users.col_role'), t('panel.users.col_status'), '',
            ]).map(h => (
              <th key={h} className="text-left pb-3 pr-6 text-[11px] font-semibold text-[#9893b0] uppercase tracking-widest border-b border-[#f0edf8]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.id} className={`group ${i !== users.length - 1 ? 'border-b border-[#f7f5fc]' : ''}`}>
              <td className="py-3.5 pr-6 font-semibold text-[#111018] whitespace-nowrap">{u.name}</td>
              <td className="py-3.5 pr-6 text-[#5c5480] max-w-[220px] truncate">{u.email}</td>
              <td className="py-3.5 pr-6 text-sm text-[#5c5480] whitespace-nowrap">{u.institution ?? <span className="text-[#c4bfda]">—</span>}</td>
              <td className="py-3.5 pr-6 whitespace-nowrap">
                {u.role === 'student' ? (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${u.user_type === 'paid' ? 'bg-[#f0fdf9] text-[#059669]' :
                      u.user_type === 'b2b' ? 'bg-[#f0f0fe] text-[#6366f1]' :
                        'bg-[#f8fafc] text-[#64748b]'
                    }`}>
                    {u.user_type === 'paid' ? t('panel.users.type_paid') : u.user_type === 'b2b' ? t('panel.users.type_b2b') : t('panel.users.type_free')}
                  </span>
                ) : <span className="text-[#c4bfda]">—</span>}
              </td>
              <td className="py-3.5 pr-6"><RoleBadge role={u.role} /></td>
              <td className="py-3.5 pr-6"><ActiveBadge active={u.active ?? true} /></td>
              <td className="py-3.5">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => onToggle(u.id, !(u.active ?? true))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6b6880] border border-[#e5e2ef] hover:border-[#c8c3e0] hover:text-[#111018] transition-all"
                  >
                    {(u.active ?? true) ? <><UserX size={12} /> {t('panel.common.deactivate')}</> : <><UserCheck size={12} /> {t('panel.common.activate')}</>}
                  </button>
                  {onResetQuota && u.role === 'student' && (
                    <button
                      onClick={() => onResetQuota(u.id, u.name)}
                      disabled={quotaResetting === u.id}
                      title={t('panel.users.reset_quota_title')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#d97706] border border-[#fde68a] hover:border-[#f59e0b] hover:bg-[#fffbeb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {quotaResetting === u.id
                        ? <><span className="w-3 h-3 border border-[#d97706] border-t-transparent rounded-full animate-spin" /> {t('panel.users.resetting')}</>
                        : <><RefreshCw size={12} /> {t('panel.users.reset_quota')}</>
                      }
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(u.id, u.name, u.email)}
                    title={t('panel.users.delete_title')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#e11d48] border border-[#fecdd3] hover:border-[#e11d48] hover:bg-[#fff1f2] transition-all"
                  >
                    <Trash2 size={12} /> {t('panel.common.delete')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Nav ──────────────────────────────────────────────────────────────────────
// `labelKey` aponta para `panel.nav.*` — o rótulo é resolvido no render.
type NavKey = 'overview' | 'institutions' | 'teachers' | 'students' | 'classes' | 'free_cases' | 'gpt' | 'flashcards' | 'questoes';
const NAV: { id: AdminTab; labelKey: NavKey; icon: React.ReactNode }[] = [
  { id: 'overview', labelKey: 'overview', icon: <LayoutDashboard size={20} /> },
  { id: 'institutions', labelKey: 'institutions', icon: <Building2 size={20} /> },
  { id: 'teachers', labelKey: 'teachers', icon: <BookOpen size={20} /> },
  { id: 'students', labelKey: 'students', icon: <GraduationCap size={20} /> },
  { id: 'classes', labelKey: 'classes', icon: <School size={20} /> },
  { id: 'free-cases', labelKey: 'free_cases', icon: <Stethoscope size={20} /> },
  { id: 'gpt', labelKey: 'gpt', icon: <Bot size={20} /> },
  { id: 'flashcards', labelKey: 'flashcards', icon: <Sliders size={20} /> },
  { id: 'questions', labelKey: 'questoes', icon: <BookOpen size={20} /> },
];

// ─── Free Case Form helpers (mirrors CaseForm) ───────────────────────────────
interface FreeCaseFormData {
  patologia: string; queixa_principal: string; sintomas: string; especificidades: string; exames: string;
  historico_familiar: string; habitos: string; dificuldade: string;
  especialidade: string; persona_nome: string; persona_idade: string;
  persona_profissao: string; persona_emocional: string; persona_contexto: string;
}

const INITIAL_FREE_FORM: FreeCaseFormData = {
  patologia: '', queixa_principal: '', sintomas: '', especificidades: '', exames: '',
  historico_familiar: '', habitos: '', dificuldade: 'Intermediário',
  especialidade: '', persona_nome: '', persona_idade: '',
  persona_profissao: '', persona_emocional: '', persona_contexto: '',
};

const twFree = 'w-full px-3.5 py-2.5 rounded-xl border border-[#e5e2ef] bg-white text-sm text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all disabled:opacity-60';

const FField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] font-bold text-[#6b6880] uppercase tracking-widest">{label}</span>
    {children}
  </label>
);

function buildFreeCasePrompt(f: FreeCaseFormData): string {
  return `Você é ${f.persona_nome || 'um(a) paciente'}, ${f.persona_idade ? f.persona_idade + ' anos' : 'idade não informada'}, ${f.persona_profissao || 'profissão não informada'}.

PERSONALIDADE E COMPORTAMENTO:
- Estado emocional: ${f.persona_emocional || 'Neutro'}
- Contexto social: ${f.persona_contexto || 'Não especificado'}
- Fale como uma pessoa REAL, usando linguagem simples e coloquial
- NÃO use termos médicos — descreva tudo do seu ponto de vista como paciente
- Revele informações GRADUALMENTE, apenas quando perguntado(a) diretamente
- Demonstre emoções condizentes com seu estado emocional

QUADRO CLÍNICO (você NÃO sabe esses termos, apenas sente os sintomas):
- Patologia real: ${f.patologia}
- Queixa principal (o que te fez vir ao médico): ${f.queixa_principal}
- Sintomas associados (descreva com suas palavras quando perguntado): ${f.sintomas || 'Não informado'}
- Especificidades relevantes: ${f.especificidades || 'Nenhuma'}
- Exames que podem ser solicitados: ${f.exames || 'Não especificado'}

HISTÓRICO:
- Histórico familiar: ${f.historico_familiar || 'Não informado'}
- Hábitos de vida: ${f.habitos || 'Não informado'}

REGRAS:
- NUNCA diga seu diagnóstico ou termos técnicos
- Se perguntado algo que não sabe, diga que não sabe
- Seja consistente com suas respostas anteriores
- Nível de dificuldade para o estudante: ${f.dificuldade}`;
}

function buildFreeCaseTitle(f: FreeCaseFormData): string {
  return f.persona_nome.trim() || 'Novo Caso Clínico';
}

function buildFreeCaseSummary(f: FreeCaseFormData): string {
  const parts: string[] = [];
  if (f.persona_nome) parts.push(f.persona_nome);
  if (f.persona_idade) parts.push(`${f.persona_idade} anos`);
  if (f.persona_profissao) parts.push(f.persona_profissao);
  const who = parts.length ? parts.join(', ') : 'Paciente';
  return `${who}. Queixa principal: ${f.queixa_principal || 'não informada'}. Nível: ${f.dificuldade}.`;
}

// ─── Create Free Case Modal ───────────────────────────────────────────────────
const CreateFreeCaseModal: React.FC<{ open: boolean; onClose: () => void; onSuccess: () => void }> = ({
  open, onClose, onSuccess,
}) => {
  const { t } = useTranslation('admin');
  type AvailabilityMode = 'permanent' | 'days';
  const [step, setStep] = useState<'form' | 'preview' | 'saving'>('form');
  const [form, setForm] = useState<FreeCaseFormData>(INITIAL_FREE_FORM);
  const [title, setTitle] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [summary, setSummary] = useState('');
  const [patientPrompt, setPatientPrompt] = useState('');
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>('permanent');
  const [availabilityDays, setAvailabilityDays] = useState(7);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    setStep('form'); setForm(INITIAL_FREE_FORM);
    setTitle(''); setSpecialty(''); setSummary(''); setPatientPrompt(''); setError('');
    setAvailabilityMode('permanent'); setAvailabilityDays(7);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, handleClose]);

  const up = <K extends keyof FreeCaseFormData>(key: K, val: FreeCaseFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleGeneratePrompt = () => {
    if (!form.patologia.trim() || !form.queixa_principal.trim()) {
      setError(t('panel.free_case_modal.error_required'));
      return;
    }
    if (!form.persona_nome.trim()) {
      setError(t('panel.free_case_modal.error_name'));
      return;
    }
    setError('');
    setPatientPrompt(buildFreeCasePrompt(form));
    setTitle(buildFreeCaseTitle(form));
    setSummary(buildFreeCaseSummary(form));
    setSpecialty(form.especialidade);
    setStep('preview');
  };

  const handleSave = async () => {
    if (!title.trim() || !patientPrompt.trim()) return;
    setStep('saving'); setError('');
    try {
      const availableUntil = availabilityMode === 'days'
        ? new Date(Date.now() + availabilityDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      await createFreeCase({
        title: title.trim(),
        specialty: specialty.trim() || undefined,
        difficulty: form.dificuldade,
        summary: summary.trim() || undefined,
        patient_prompt: patientPrompt.trim(),
        form_data: form as unknown as Record<string, unknown>,
        available_until: availableUntil,
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('panel.free_case_modal.error_save'));
      setStep('preview');
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(7,5,20,.65)', backdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8"
        style={{ animation: 'modalIn .18s cubic-bezier(.34,1.56,.64,1)', ...font }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0edf8] bg-gradient-to-r from-[#f3f1ff] to-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-[#111018]">
              {step === 'form' ? t('panel.free_case_modal.title_form') : t('panel.free_case_modal.title_preview')}
            </h2>
            <p className="text-xs text-[#6b6880] mt-0.5">
              {step === 'form'
                ? t('panel.free_case_modal.subtitle_form')
                : t('panel.free_case_modal.subtitle_preview')}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={step === 'saving'}
            className="w-7 h-7 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}

          {step === 'form' ? (
            <>
              <p className="text-[10px] font-bold text-[#9893b0] uppercase tracking-widest">{t('panel.free_case_modal.clinical_data')}</p>

              <div className="grid grid-cols-2 gap-3">
                <FField label={t('panel.free_case_modal.pathology')}>
                  <input style={font} className={twFree} value={form.patologia} onChange={e => up('patologia', e.target.value)} placeholder={t('panel.free_case_modal.pathology_ph')} />
                </FField>
                <FField label={t('panel.free_case_modal.specialty')}>
                  <select style={font} className={twFree} value={form.especialidade} onChange={e => up('especialidade', e.target.value)}>
                    <option value="">{t('panel.free_case_modal.specialty_select')}</option>
                    {SPECIALTIES.map(s => (
                      <option key={s.key} value={s.key}>{s.emoji} {specialtyLabel(s.key)}</option>
                    ))}
                  </select>
                </FField>
              </div>

              <FField label={t('panel.free_case_modal.chief_complaint')}>
                <input style={font} className={twFree} value={form.queixa_principal} onChange={e => up('queixa_principal', e.target.value)} placeholder={t('panel.free_case_modal.chief_complaint_ph')} />
              </FField>

              <FField label={t('panel.free_case_modal.symptoms')}>
                <textarea style={font} className={twFree} rows={2} value={form.sintomas} onChange={e => up('sintomas', e.target.value)} placeholder={t('panel.free_case_modal.symptoms_ph')} />
              </FField>

              <div className="grid grid-cols-2 gap-3">
                <FField label={t('panel.free_case_modal.exams')}>
                  <input style={font} className={twFree} value={form.exames} onChange={e => up('exames', e.target.value)} placeholder={t('panel.free_case_modal.exams_ph')} />
                </FField>
                <FField label={t('panel.free_case_modal.difficulty')}>
                  {/* os valores continuam em pt-BR (são gravados no banco, D5) — só o rótulo é traduzido */}
                  <select style={font} className={twFree} value={form.dificuldade} onChange={e => up('dificuldade', e.target.value)}>
                    <option value="Básico">{t('panel.difficulty.basic')}</option>
                    <option value="Intermediário">{t('panel.difficulty.intermediate')}</option>
                    <option value="Avançado">{t('panel.difficulty.advanced')}</option>
                  </select>
                </FField>
              </div>

              <FField label={t('panel.free_case_modal.specifics')}>
                <input style={font} className={twFree} value={form.especificidades} onChange={e => up('especificidades', e.target.value)} placeholder={t('panel.free_case_modal.specifics_ph')} />
              </FField>

              <div className="grid grid-cols-2 gap-3">
                <FField label={t('panel.free_case_modal.family_history')}>
                  <input style={font} className={twFree} value={form.historico_familiar} onChange={e => up('historico_familiar', e.target.value)} placeholder={t('panel.free_case_modal.family_history_ph')} />
                </FField>
                <FField label={t('panel.free_case_modal.habits')}>
                  <input style={font} className={twFree} value={form.habitos} onChange={e => up('habitos', e.target.value)} placeholder={t('panel.free_case_modal.habits_ph')} />
                </FField>
              </div>

              <hr className="border-0 border-t border-[#f0edf8]" />
              <p className="text-[10px] font-bold text-[#9893b0] uppercase tracking-widest">{t('panel.free_case_modal.persona')}</p>

              <div className="grid grid-cols-2 gap-3">
                <FField label={t('panel.free_case_modal.name')}>
                  <input style={font} className={twFree} value={form.persona_nome} onChange={e => up('persona_nome', e.target.value)} placeholder={t('panel.free_case_modal.name_ph')} />
                </FField>
                <FField label={t('panel.free_case_modal.age')}>
                  <input style={font} className={twFree} value={form.persona_idade} onChange={e => up('persona_idade', e.target.value)} placeholder={t('panel.free_case_modal.age_ph')} />
                </FField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FField label={t('panel.free_case_modal.job')}>
                  <input style={font} className={twFree} value={form.persona_profissao} onChange={e => up('persona_profissao', e.target.value)} placeholder={t('panel.free_case_modal.job_ph')} />
                </FField>
                <FField label={t('panel.free_case_modal.emotional')}>
                  <input style={font} className={twFree} value={form.persona_emocional} onChange={e => up('persona_emocional', e.target.value)} placeholder={t('panel.free_case_modal.emotional_ph')} />
                </FField>
              </div>

              <FField label={t('panel.free_case_modal.context')}>
                <textarea style={font} className={twFree} rows={2} value={form.persona_contexto} onChange={e => up('persona_contexto', e.target.value)} placeholder={t('panel.free_case_modal.context_ph')} />
              </FField>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.9)', ...font }}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#374151] text-sm font-semibold border border-[#e5e2ef] hover:border-[#c4bee0] hover:bg-[#faf9fe] active:scale-[.97] transition-all"
                >
                  {t('panel.common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  style={{ boxShadow: '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)', ...font }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] text-white text-sm font-semibold hover:bg-[#4f46e5] active:scale-[.97] active:shadow-none transition-all"
                >
                  {t('panel.free_case_modal.generate')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FField label={t('panel.free_case_modal.case_title')}>
                  <input style={font} className={twFree} value={title} onChange={e => setTitle(e.target.value)} disabled={step === 'saving'} />
                </FField>
                <FField label={t('panel.free_case_modal.specialty')}>
                  <select style={font} className={twFree} value={specialty} onChange={e => setSpecialty(e.target.value)} disabled={step === 'saving'}>
                    <option value="">{t('panel.free_case_modal.specialty_select')}</option>
                    {SPECIALTIES.map(s => (
                      <option key={s.key} value={s.key}>{s.emoji} {specialtyLabel(s.key)}</option>
                    ))}
                  </select>
                </FField>
              </div>

              <FField label={t('panel.free_case_modal.summary')}>
                <textarea style={font} className={twFree} rows={2} value={summary} onChange={e => setSummary(e.target.value)} disabled={step === 'saving'} />
              </FField>

              <div className="grid grid-cols-2 gap-3">
                <FField label={t('panel.free_case_modal.availability')}>
                  <select
                    style={font}
                    className={twFree}
                    value={availabilityMode}
                    onChange={e => setAvailabilityMode(e.target.value as AvailabilityMode)}
                    disabled={step === 'saving'}
                  >
                    <option value="permanent">{t('panel.free_case_modal.permanent')}</option>
                    <option value="days">{t('panel.free_case_modal.expire_days')}</option>
                  </select>
                </FField>
                <FField label={t('panel.free_case_modal.days')}>
                  <input
                    style={font}
                    className={twFree}
                    type="number"
                    min={1}
                    max={30}
                    value={availabilityDays}
                    onChange={e => setAvailabilityDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                    disabled={step === 'saving' || availabilityMode === 'permanent'}
                  />
                </FField>
              </div>

              <FField label={t('panel.free_case_modal.prompt')}>
                <textarea
                  style={font}
                  className={`${twFree} font-mono text-[12px] leading-relaxed`}
                  rows={14}
                  value={patientPrompt}
                  onChange={e => setPatientPrompt(e.target.value)}
                  disabled={step === 'saving'}
                />
              </FField>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  disabled={step === 'saving'}
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.9)', ...font }}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#374151] text-sm font-semibold border border-[#e5e2ef] hover:border-[#c4bee0] hover:bg-[#faf9fe] active:scale-[.97] disabled:opacity-50 transition-all"
                >
                  {t('panel.free_case_modal.back_to_form')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={step === 'saving'}
                  style={{ boxShadow: step === 'saving' ? 'none' : '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)', ...font }}
                  className="flex-1 py-2.5 rounded-xl bg-[#6366f1] text-white text-sm font-semibold hover:bg-[#4f46e5] disabled:opacity-50 active:scale-[.97] active:shadow-none transition-all"
                >
                  {step === 'saving' ? t('panel.free_case_modal.publishing') : t('panel.free_case_modal.publish')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const AdminPanel: React.FC = () => {
  const { t, i18n } = useTranslation('admin');
  const locale = i18n.language;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [freeCases, setFreeCases] = useState<AdminFreeCase[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingFreeCases, setLoadingFreeCases] = useState(false);
  const [teacherModal, setTeacherModal] = useState(false);
  const [bulkTeacherModal, setBulkTeacherModal] = useState(false);
  const [studentModal, setStudentModal] = useState(false);
  const [institutionModal, setInstitutionModal] = useState(false);
  const [freeCaseModal, setFreeCaseModal] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [filterInstitution, setFilterInstitution] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [classDetailCache, setClassDetailCache] = useState<Record<string, AdminClassDetail>>({});
  const [quotaResetting, setQuotaResetting] = useState<string | null>(null);
  const [quotaMsg, setQuotaMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [classDetailLoading, setClassDetailLoading] = useState<string | null>(null);
  const [classDetailError, setClassDetailError] = useState<string | null>(null);
  const [casesPreview, setCasesPreview] = useState<(AdminClassDetail & { className: string }) | null>(null);

  // ── GPT tab state ───────────────────────────────────────────────────────
  const [gptSettings, setGptSettings] = useState<GptSettings | null>(null);
  const [gptUsage, setGptUsage] = useState<GptUsage | null>(null);
  const [gptBalance, setGptBalance] = useState<GptBalance | null>(null);
  const [gptBalanceLoading, setGptBalanceLoading] = useState(false);
  const [convStats, setConvStats] = useState<ConversationStats | null>(null);
  const [gptLoading, setGptLoading] = useState(false);
  const [gptUsageLoading, setGptUsageLoading] = useState(false);
  const [gptUsageError, setGptUsageError] = useState<string | null>(null);
  const [gptSaving, setGptSaving] = useState(false);
  const [gptMsg, setGptMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const toGptForm = (s: GptSettings) => ({
    gpt_max_tokens: s.gpt_max_tokens,
    gpt_max_turns: s.gpt_max_turns,
    gpt_daily_message_limit: s.gpt_daily_message_limit,
  });
  const [gptForm, setGptForm] = useState({ gpt_max_tokens: 600, gpt_max_turns: 30, gpt_daily_message_limit: 100 });
  const [gptInfo, setGptInfo] = useState<GptInfo | null>(null);

  useEffect(() => {
    Promise.all([fetchOverview(), fetchInstitutions()])
      .then(([ov, inst]) => { setOverview(ov); setInstitutions(inst); })
      .catch(console.error)
      .finally(() => setLoadingOverview(false));
  }, []);

  useEffect(() => {
    if (tab !== 'teachers' && tab !== 'students') return;
    setUserSearch('');
    const role = tab === 'teachers' ? 'teacher' : 'student';
    setLoadingUsers(true);
    fetchUsers(role, filterInstitution || undefined)
      .then(setUsers).catch(console.error).finally(() => setLoadingUsers(false));
  }, [tab, filterInstitution]);

  useEffect(() => {
    if (tab !== 'classes') return;
    setLoadingClasses(true);
    fetchAllClasses().then(setClasses).catch(console.error).finally(() => setLoadingClasses(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'free-cases') return;
    setLoadingFreeCases(true);
    fetchAdminFreeCases().then(setFreeCases).catch(console.error).finally(() => setLoadingFreeCases(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'gpt') return;
    setGptLoading(true);
    fetchGptSettings()
      .then(s => { setGptSettings(s); setGptForm(toGptForm(s)); })
      .catch(console.error)
      .finally(() => setGptLoading(false));
    setGptUsageLoading(true);
    setGptUsageError(null);
    Promise.all([fetchGptUsage(), fetchConversationStats()])
      .then(([u, c]) => { setGptUsage(u); setConvStats(c); })
      .catch((e: unknown) => setGptUsageError(e instanceof Error ? e.message : t('panel.gpt.usage_load_error')))
      .finally(() => setGptUsageLoading(false));
    setGptBalanceLoading(true);
    fetchGptBalance()
      .then(setGptBalance)
      .catch(() => setGptBalance({ has_credits: false, source: 'unavailable', detail: t('panel.gpt.balance_load_error') }))
      .finally(() => setGptBalanceLoading(false));
    fetchGptInfo().then(setGptInfo).catch(() => setGptInfo(null));
  }, [tab, t]);

  const refreshAll = useCallback(() => {
    if (tab === 'teachers' || tab === 'students') {
      const role = tab === 'teachers' ? 'teacher' : 'student';
      setLoadingUsers(true);
      fetchUsers(role, filterInstitution || undefined)
        .then(setUsers).catch(console.error).finally(() => setLoadingUsers(false));
    }
    if (tab === 'classes') {
      setLoadingClasses(true);
      fetchAllClasses().then(setClasses).catch(console.error).finally(() => setLoadingClasses(false));
    }
    if (tab === 'free-cases') {
      setLoadingFreeCases(true);
      fetchAdminFreeCases().then(setFreeCases).catch(console.error).finally(() => setLoadingFreeCases(false));
    }
    Promise.all([fetchOverview(), fetchInstitutions()])
      .then(([ov, inst]) => { setOverview(ov); setInstitutions(inst); })
      .catch(console.error);
  }, [tab, filterInstitution]);

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleUserStatus(id, active);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, active } : u));
    } catch (err) { console.error(err); }
  };

  const handleResetQuota = async (id: string, name: string) => {
    setQuotaResetting(id);
    setQuotaMsg(null);
    try {
      const result = await resetDailyQuota(id);
      setQuotaMsg({ type: 'ok', text: `✓ ${name}: ${result.message}` });
    } catch (err) {
      setQuotaMsg({ type: 'err', text: err instanceof Error ? err.message : t('panel.users.quota_error') });
    } finally {
      setQuotaResetting(null);
      setTimeout(() => setQuotaMsg(null), 5000);
    }
  };

  const handleDeleteUser = async (id: string, name: string, email: string) => {
    if (!window.confirm(t('panel.users.delete_confirm', { name, email }))) return;
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setOverview(prev => prev ? {
        ...prev,
        total_users: Math.max(0, prev.total_users - 1),
        total_students: tab === 'students' ? Math.max(0, prev.total_students - 1) : prev.total_students,
        total_teachers: tab === 'teachers' ? Math.max(0, prev.total_teachers - 1) : prev.total_teachers,
      } : null);
      setClassDetailCache(prev => {
        const updated: typeof prev = {};
        for (const [classId, detail] of Object.entries(prev)) {
          updated[classId] = {
            ...detail,
            students: detail.students.filter(s => s.id !== id),
          };
        }
        return updated;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : t('panel.users.delete_error'));
    }
  };

  const handleToggleClass = async (classId: string) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      return;
    }
    setExpandedClassId(classId);
    setClassDetailError(null);
    if (classDetailCache[classId]) return;
    setClassDetailLoading(classId);
    try {
      const detail = await fetchAdminClassDetail(classId);
      setClassDetailCache(prev => ({ ...prev, [classId]: detail }));
    } catch (err) {
      console.error(err);
      setClassDetailError(classId);
    } finally {
      setClassDetailLoading(null);
    }
  };

  const handleToggleInstitution = async (inst: Institution) => {
    try {
      await updateInstitution(inst.id, { active: !inst.active });
      setInstitutions(prev => prev.map(i => i.id === inst.id ? { ...i, active: !inst.active } : i));
    } catch (err) { console.error(err); }
  };

  const handleDeleteInstitution = async (inst: Institution) => {
    if (!window.confirm(t('panel.institutions.delete_confirm', { name: inst.name }))) return;
    try {
      await deleteInstitution(inst.id);
      setInstitutions(prev => prev.filter(i => i.id !== inst.id));
      refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('panel.institutions.delete_error'));
    }
  };

  return (
    <div className="h-screen bg-[#f7f6fa]" style={font}>
      {/* Aurora */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{
        background: [
          'radial-gradient(ellipse 65% 55% at 0% 0%, rgba(138,91,255,0.20) 0%, transparent 70%)',
          'radial-gradient(ellipse 55% 50% at 100% 0%, rgba(99,179,237,0.16) 0%, transparent 70%)',
          'radial-gradient(ellipse 45% 40% at 100% 100%, rgba(122,85,255,0.13) 0%, transparent 70%)',
        ].join(', '),
      }} />
      {/* Dot grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(122,85,255,0.18) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <div className="flex h-full overflow-hidden relative z-10">

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className={`w-56 flex-shrink-0 flex flex-col border-r border-white/[.06] overflow-hidden fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: '#1a1730' }}>
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/[.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center flex-shrink-0">
                <Shield size={13} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-none tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>Anamnes.IA</p>
                <p className="text-[#7c78a0] text-[10px] mt-0.5 font-medium tracking-wider uppercase">{t('panel.sidebar.admin')}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
            {NAV.map(item => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setTab(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all text-left select-none focus:outline-none focus-visible:outline-none ${active
                      ? 'bg-[#6366f1] text-white shadow-[0_4px_14px_rgba(99,102,241,.40)] border-[3px] border-white'
                      : 'text-[#a39dc4] hover:bg-white/[.06] hover:text-white border-[3px] border-transparent'
                    }`}
                >
                  {item.icon}
                  {t(`panel.nav.${item.labelKey}`)}
                </button>
              );
            })}
            <button
              onClick={() => { navigate('/admin/questoes'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-[#a39dc4] hover:bg-white/[.06] hover:text-white transition-all select-none focus:outline-none"
            >
              <ListChecks size={20} /> Questões
            </button>
          </nav>

          {/* Bottom */}
          <div className="px-2 pt-3 pb-4 border-t border-white/[.06] flex flex-col gap-0.5">
            <button onClick={() => navigate('/mainpage')} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-[#a39dc4] hover:bg-white/[.06] hover:text-white transition-all select-none focus:outline-none">
              <ChevronLeft size={20} /> {t('panel.sidebar.back')}
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-[#a39dc4] hover:bg-red-500/10 hover:text-red-400 transition-all select-none focus:outline-none">
              <LogOut size={20} /> {t('panel.sidebar.logout')}
            </button>
            <div className="mt-2 flex items-center gap-3 px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-[#e2dff5] text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-[#7c78a0] text-xs truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-7 py-3.5">
            <div className="flex items-center gap-1.5 text-sm">
              <button className="md:hidden mr-2 p-1 text-[#9893b0] hover:text-[#111018] focus:outline-none" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <span className="text-[#9893b0] font-medium">{t('panel.sidebar.admin')}</span>
              <span className="text-[#d4cfe8]">/</span>
              <span className="text-[#111018] font-semibold">{(() => {
                const key = NAV.find(n => n.id === tab)?.labelKey;
                return key ? t(`panel.nav.${key}`) : '';
              })()}</span>
            </div>
            <div className="flex items-center gap-2">
              {tab === 'teachers' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setBulkTeacherModal(true)} style={{ boxShadow: '0 1px 2px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.9)' }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#374151] text-xs font-semibold rounded-xl border border-[#e5e2ef] hover:border-[#c4bee0] hover:bg-[#faf9fe] active:scale-[.97] transition-all">
                    <Upload size={13} /> {t('panel.topbar.import_csv')}
                  </button>
                  <button onClick={() => setTeacherModal(true)} style={{ boxShadow: '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)' }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6366f1] text-white text-xs font-semibold rounded-xl hover:bg-[#4f46e5] active:scale-[.97] active:shadow-none transition-all">
                    <Plus size={13} /> {t('panel.topbar.new_teacher')}
                  </button>
                </div>
              )}
              {tab === 'students' && (
                <button onClick={() => setStudentModal(true)} style={{ boxShadow: '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)' }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6366f1] text-white text-xs font-semibold rounded-xl hover:bg-[#4f46e5] active:scale-[.97] active:shadow-none transition-all">
                  <Plus size={13} /> {t('panel.topbar.bulk_create')}
                </button>
              )}
              {tab === 'free-cases' && (
                <button onClick={() => setFreeCaseModal(true)} style={{ boxShadow: '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)' }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6366f1] text-white text-xs font-semibold rounded-xl hover:bg-[#4f46e5] active:scale-[.97] active:shadow-none transition-all">
                  <Plus size={13} /> {t('panel.topbar.new_free_case')}
                </button>
              )}
              {tab === 'gpt' && (
                <button
                  onClick={() => {
                    setGptUsageLoading(true);
                    Promise.all([fetchGptUsage(), fetchConversationStats()])
                      .then(([u, c]) => { setGptUsage(u); setConvStats(c); })
                      .catch(console.error)
                      .finally(() => setGptUsageLoading(false));
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#374151] text-xs font-semibold rounded-xl border border-[#e5e2ef] hover:bg-[#faf9fe] transition-all"
                >
                  <RefreshCw size={13} /> {t('panel.topbar.refresh_usage')}
                </button>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-7">

            {/* ── OVERVIEW ───────────────────────────────────── */}
            {tab === 'overview' && (() => {
              const ov = overview ?? {
                total_users: 0, total_students: 0, total_teachers: 0, total_admins: 0,
                total_institutions: 0, total_cases: 0, total_classes: 0,
                total_attempts: 0, total_completed: 0,
              };
              const rate = ov.total_attempts > 0
                ? Math.round((ov.total_completed / ov.total_attempts) * 100)
                : 0;
              const empty = !overview;
              return loadingOverview ? (
                <div className="flex justify-center py-28">
                  <div className="w-7 h-7 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {empty && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#fffbeb] border border-[#fde68a] rounded-xl text-sm text-[#92400e] font-medium" style={font}>
                      <Info size={15} className="flex-shrink-0 text-[#d97706]" />
                      {t('panel.overview.empty_notice')}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard locale={locale} label={t('panel.overview.students')} value={ov.total_students} icon={<GraduationCap size={15} className="text-[#6366f1]" />} accent="bg-[#f0f0fe]" sub={t('panel.overview.institutions_sub', { count: ov.total_institutions })} />
                    <StatCard locale={locale} label={t('panel.overview.teachers')} value={ov.total_teachers} icon={<BookOpen size={15} className="text-[#0369a1]" />} accent="bg-[#f0f9ff]" sub={t('panel.overview.registered')} />
                    <StatCard locale={locale} label={t('panel.overview.cases')} value={ov.total_cases} icon={<FileText size={15} className="text-[#0f766e]" />} accent="bg-[#f0fdf9]" sub={t('panel.overview.classes_sub', { count: ov.total_classes })} />
                    <StatCard locale={locale} label={t('panel.overview.attempts')} value={ov.total_attempts} icon={<Activity size={15} className="text-[#9333ea]" />} accent="bg-[#faf5ff]" sub={t('panel.overview.completed_sub', { count: ov.total_completed })} pct={rate} />
                  </div>

                  {/* Second row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Completion */}
                    <div className="bg-white rounded-xl border border-[#eeedf2] p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#6b6880] uppercase tracking-widest">{t('panel.overview.completion_rate')}</p>
                        <TrendingUp size={14} className="text-[#10b981]" />
                      </div>
                      <div>
                        <p className="text-4xl font-black text-[#111018] tabular-nums leading-none">{rate}<span className="text-xl text-[#9893b0] font-bold">%</span></p>
                        <p className="text-xs text-[#9893b0] mt-2 font-medium">{t('panel.overview.completion_detail', { completed: ov.total_completed, total: ov.total_attempts })}</p>
                      </div>
                      <div className="h-1.5 bg-[#f0edf8] rounded-full overflow-hidden">
                        <div className="h-full bg-[#10b981] rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                      </div>
                    </div>

                    {/* Summary grid */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-[#eeedf2] p-5 flex flex-col gap-3">
                      <p className="text-xs font-semibold text-[#6b6880] uppercase tracking-widest">{t('panel.overview.summary')}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: t('panel.overview.total_users'), value: ov.total_users, icon: <Users size={13} /> },
                          { label: t('panel.overview.admins'), value: ov.total_admins, icon: <Shield size={13} /> },
                          { label: t('panel.overview.open_classes'), value: ov.total_classes, icon: <BookMarked size={13} /> },
                          { label: t('panel.overview.created_cases'), value: ov.total_cases, icon: <FileText size={13} /> },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-[#faf9fe] border border-[#f0edf8]">
                            <span className="text-[#9893b0]">{item.icon}</span>
                            <div>
                              <p className="text-base font-bold text-[#111018] tabular-nums leading-none">{item.value.toLocaleString(locale)}</p>
                              <p className="text-[11px] text-[#9893b0] mt-0.5 font-medium">{item.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Institutions preview */}
                  <div className="bg-white rounded-xl border border-[#eeedf2] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0edf8]">
                      <p className="text-xs font-semibold text-[#6b6880] uppercase tracking-widest">{t('panel.overview.institutions')}</p>
                      {institutions.length > 0 && (
                        <button onClick={() => setTab('institutions')} className="flex items-center gap-1 text-xs font-semibold text-[#6366f1] hover:text-[#4f46e5] transition-colors">
                          {t('panel.overview.see_all')} <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                    {institutions.length === 0 ? (
                      <div className="flex items-center gap-3 px-5 py-5 text-sm text-[#9893b0] font-medium" style={font}>
                        <Building2 size={16} className="text-[#d4cfe8] flex-shrink-0" />
                        {t('panel.overview.no_institutions')}
                      </div>
                    ) : (
                      <div className="divide-y divide-[#f7f5fc]">
                        {institutions.slice(0, 4).map(inst => (
                          <div key={inst.name} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#faf9fe] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg border border-[#eeedf2] bg-[#f7f5fc] flex items-center justify-center">
                                <Building2 size={13} className="text-[#9893b0]" />
                              </div>
                              <p className="text-sm font-semibold text-[#111018]">{inst.name}</p>
                            </div>
                            <div className="flex items-center gap-5 text-xs text-[#9893b0] font-medium">
                              <span>{t('panel.overview.inst_teachers', { count: inst.teachers })}</span>
                              <span>{t('panel.overview.inst_students', { count: inst.students })}</span>
                              <ActiveBadge active={inst.active} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: t('panel.overview.qa_new_teacher'), icon: <Plus size={13} />, action: () => { setTab('teachers'); setTeacherModal(true); }, primary: true },
                      { label: t('panel.overview.qa_bulk_students'), icon: <Users size={13} />, action: () => { setTab('students'); setStudentModal(true); }, primary: false },
                      { label: t('panel.overview.qa_teachers'), icon: <BookOpen size={13} />, action: () => setTab('teachers'), primary: false },
                      { label: t('panel.overview.qa_students'), icon: <GraduationCap size={13} />, action: () => setTab('students'), primary: false },
                    ].map(btn => (
                      <button
                        key={btn.label}
                        onClick={btn.action}
                        style={btn.primary
                          ? { boxShadow: '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)' }
                          : { boxShadow: '0 1px 2px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.9)' }}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[.97] active:shadow-none ${btn.primary
                            ? 'bg-[#6366f1] text-white hover:bg-[#4f46e5]'
                            : 'bg-white text-[#374151] border border-[#e5e2ef] hover:border-[#c4bee0] hover:bg-[#faf9fe]'
                          }`}
                      >
                        {btn.icon}{btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── INSTITUTIONS ──────────────────────────────── */}
            {tab === 'institutions' && (
              institutions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 gap-3">
                  <Building2 size={36} className="text-[#d4cfe8]" />
                  <p className="text-sm font-semibold text-[#374151]">{t('panel.institutions.empty_title')}</p>
                  <p className="text-sm text-[#9893b0]">{t('panel.institutions.empty_hint')}</p>
                  <button onClick={() => { setEditingInstitution(null); setInstitutionModal(true); }} style={{ boxShadow: '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)', ...font }} className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] text-white text-sm font-semibold rounded-xl hover:bg-[#4f46e5] active:scale-[.97] active:shadow-none transition-all">
                    <Plus size={14} /> {t('panel.institutions.new')}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-white rounded-xl border border-[#eeedf2] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#f0edf8] flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#6b6880] uppercase tracking-widest">{t('panel.institutions.count', { count: institutions.length })}</p>
                      <button
                        onClick={() => { setEditingInstitution(null); setInstitutionModal(true); }}
                        style={{ boxShadow: '0 1px 3px rgba(99,102,241,.25), inset 0 1px 0 rgba(255,255,255,.15)', ...font }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#6366f1] text-white text-xs font-semibold rounded-lg hover:bg-[#4f46e5] active:scale-[.97] transition-all"
                      >
                        <Plus size={12} /> {t('panel.institutions.new_short')}
                      </button>
                    </div>
                    <div className="divide-y divide-[#f7f5fc]">
                      {institutions.map(inst => (
                        <div
                          key={inst.id}
                          className="flex items-center justify-between px-5 py-4 hover:bg-[#faf9fe] transition-colors group"
                        >
                          <div
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                            onClick={() => { setTab('teachers'); setFilterInstitution(inst.name); }}
                          >
                            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${inst.active ? 'border-[#eeedf2] bg-[#f7f5fc]' : 'border-[#fecdd3] bg-[#fff1f2]'
                              }`}>
                              <Building2 size={15} className={inst.active ? 'text-[#9893b0]' : 'text-[#fb7185]'} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-[#111018]">{inst.name}</p>
                                {!inst.active && (
                                  <span className="text-[10px] font-bold bg-[#fff1f2] text-[#e11d48] px-1.5 py-0.5 rounded-md">{t('panel.institutions.inactive')}</span>
                                )}
                              </div>
                              {(inst.address || inst.description) && (
                                <p className="text-xs text-[#9893b0] truncate">{inst.address || inst.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-5 flex-shrink-0">
                            {[{ label: t('panel.institutions.col_teachers'), value: inst.teachers }, { label: t('panel.institutions.col_students'), value: inst.students }, { label: t('panel.institutions.col_active'), value: inst.active_users }].map(s => (
                              <div key={s.label} className="text-center min-w-[36px]">
                                <p className="text-sm font-bold text-[#111018] tabular-nums">{s.value}</p>
                                <p className="text-[10px] text-[#9893b0] font-medium">{s.label}</p>
                              </div>
                            ))}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingInstitution(inst); setInstitutionModal(true); }}
                                title={t('panel.common.edit')}
                                className="w-7 h-7 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] hover:text-[#6366f1] transition-colors"
                              ><Pencil size={12} /></button>
                              <button
                                onClick={() => handleToggleInstitution(inst)}
                                title={inst.active ? t('panel.common.deactivate') : t('panel.common.activate')}
                                className="w-7 h-7 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] hover:text-[#6366f1] transition-colors"
                              >{inst.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}</button>
                              <button
                                onClick={() => handleDeleteInstitution(inst)}
                                title={t('panel.common.delete')}
                                className="w-7 h-7 rounded-lg bg-[#fff1f2] text-[#fb7185] flex items-center justify-center hover:bg-[#ffe4e6] transition-colors"
                              ><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* ── TEACHERS / STUDENTS ───────────────────────── */}
            {(tab === 'teachers' || tab === 'students') && (
              <div>
                <div className="bg-white rounded-xl border border-[#eeedf2] overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0edf8] flex-wrap">
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aac8]" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder={t('panel.users.search_placeholder')}
                        style={font}
                        className="pl-8 pr-3 py-2 rounded-lg border border-[#e5e2ef] bg-[#faf9fe] text-sm text-[#111018] placeholder:text-[#b0aac8] w-52 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all"
                      />
                    </div>
                    {userSearch && (
                      <button onClick={() => setUserSearch('')} className="text-[#9893b0] hover:text-[#111018] transition-colors">
                        <X size={13} />
                      </button>
                    )}
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aac8]" />
                      <input
                        type="text"
                        value={filterInstitution}
                        onChange={e => setFilterInstitution(e.target.value)}
                        placeholder={t('panel.users.filter_placeholder')}
                        style={font}
                        className="pl-8 pr-3 py-2 rounded-lg border border-[#e5e2ef] bg-[#faf9fe] text-sm text-[#111018] placeholder:text-[#b0aac8] w-52 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all"
                      />
                    </div>
                    {filterInstitution && (
                      <button onClick={() => setFilterInstitution('')} className="text-[#9893b0] hover:text-[#111018] transition-colors">
                        <X size={13} />
                      </button>
                    )}
                    <p className="ml-auto text-xs font-medium text-[#9893b0]">
                      {(() => {
                        const count = users.filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).length;
                        return tab === 'teachers' ? t('panel.users.count_teachers', { count }) : t('panel.users.count_students', { count });
                      })()}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    {quotaMsg && (
                      <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-medium ${quotaMsg.type === 'ok'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>{quotaMsg.text}</div>
                    )}
                    <UsersTable
                      users={users.filter(u =>
                        !userSearch ||
                        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(userSearch.toLowerCase())
                      )}
                      loading={loadingUsers}
                      onToggle={handleToggle}
                      onDelete={handleDeleteUser}
                      onResetQuota={tab === 'students' ? handleResetQuota : undefined}
                      quotaResetting={quotaResetting}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── CLASSES ─────────────────────────────────────── */}
            {tab === 'classes' && (
              <div className="flex flex-col gap-4" style={font}>
                {/* Search bar */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aac8]" />
                    <input
                      type="text"
                      value={classSearch}
                      onChange={e => setClassSearch(e.target.value)}
                      placeholder={t('panel.classes.search_placeholder')}
                      style={font}
                      className="pl-8 pr-3 py-2 rounded-lg border border-[#e5e2ef] bg-white text-sm text-[#111018] placeholder:text-[#b0aac8] w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all"
                    />
                  </div>
                  {classSearch && <button onClick={() => setClassSearch('')} className="text-[#9893b0] hover:text-[#111018] transition-colors"><X size={13} /></button>}
                  <p className="ml-auto text-xs font-medium text-[#9893b0]">{t('panel.classes.count', { count: classes.length })}</p>
                </div>

                {loadingClasses ? (
                  <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" /></div>
                ) : classes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-28 gap-3">
                    <School size={36} className="text-[#d4cfe8]" />
                    <p className="text-sm font-semibold text-[#374151]">{t('panel.classes.empty_title')}</p>
                    <p className="text-sm text-[#9893b0]">{t('panel.classes.empty_hint')}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#eeedf2] overflow-hidden divide-y divide-[#f7f5fc]">
                    {classes
                      .filter(c =>
                        !classSearch ||
                        c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
                        c.teacher_name.toLowerCase().includes(classSearch.toLowerCase())
                      )
                      .map(cls => {
                        const isOpen = expandedClassId === cls.id;
                        const detail = classDetailCache[cls.id];
                        const loading = classDetailLoading === cls.id;
                        return (
                          <div key={cls.id}>
                            {/* ── Row header (clickable) ── */}
                            <div
                              className="flex items-center gap-4 px-5 py-4 hover:bg-[#faf9fe] transition-colors cursor-pointer select-none"
                              onClick={() => handleToggleClass(cls.id)}
                            >
                              {/* Chevron */}
                              <div className={`w-6 h-6 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${isOpen ? 'bg-[#6366f1] border-[#6366f1]' : 'bg-[#f7f5fc] border-[#e5e2ef]'}`}>
                                <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'text-white rotate-180' : 'text-[#9893b0]'}`} />
                              </div>

                              {/* Name + teacher */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#111018] truncate">{cls.name}</p>
                                <p className="text-[11px] text-[#9893b0] mt-0.5 truncate">{cls.teacher_name} · {cls.term ?? t('panel.classes.no_term')}</p>
                              </div>

                              {/* Code */}
                              <span className="font-mono text-xs bg-[#f0f0fe] text-[#4f46e5] px-2 py-1 rounded-md font-bold tracking-wider flex-shrink-0 hidden sm:inline-block">{cls.code}</span>

                              {/* Stats */}
                              <div className="flex items-center gap-5 flex-shrink-0">
                                <div className="text-center hidden md:block">
                                  <p className="text-sm font-bold text-[#111018] tabular-nums">{cls.students_count}</p>
                                  <p className="text-[10px] text-[#9893b0] uppercase tracking-wider">{t('panel.classes.students')}</p>
                                </div>
                                <div className="text-center hidden md:block">
                                  <p className="text-sm font-bold text-[#111018] tabular-nums">{cls.cases_count}</p>
                                  <p className="text-[10px] text-[#9893b0] uppercase tracking-wider">{t('panel.classes.cases')}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold flex-shrink-0 ${cls.status === 'active' ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#f8fafc] text-[#64748b]'
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cls.status === 'active' ? 'bg-[#10b981]' : 'bg-[#94a3b8]'}`} />
                                  {cls.status === 'active' ? t('panel.classes.active') : t('panel.classes.archived')}
                                </span>
                              </div>
                            </div>

                            {/* ── Expanded panel ── */}
                            {isOpen && (
                              <div className="border-t border-[#f0edf8] bg-[#faf9fe] px-6 py-5">
                                {loading ? (
                                  <div className="flex justify-center py-8">
                                    <div className="w-5 h-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                                  </div>
                                ) : classDetailError === cls.id ? (
                                  <div className="flex items-center gap-2 py-4 text-sm text-[#be123c]">
                                    <AlertCircle size={14} />
                                    {t('panel.classes.detail_error')}
                                  </div>
                                ) : detail ? (
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Professores */}
                                    <div>
                                      <p className="text-[10px] font-bold text-[#6b6880] uppercase tracking-widest mb-3">
                                        {t('panel.classes.teachers_count', { count: detail.teachers.length })}
                                      </p>
                                      {detail.teachers.length === 0 ? (
                                        <p className="text-xs text-[#b0aac8]">{t('panel.classes.no_teachers')}</p>
                                      ) : (
                                        <div className="flex flex-col gap-2.5">
                                          {detail.teachers.map(teacher => (
                                            <div key={teacher.id} className="flex items-center gap-2.5">
                                              <div className="w-8 h-8 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {teacher.name.charAt(0).toUpperCase()}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[#111018] truncate">{teacher.name}</p>
                                                <p className="text-[10px] text-[#9893b0] truncate">{teacher.email}</p>
                                                {teacher.is_owner && (
                                                  <span className="text-[10px] font-bold text-[#6366f1]">{t('panel.classes.owner')}</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Alunos */}
                                    <div className="lg:col-span-2">
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-bold text-[#6b6880] uppercase tracking-widest">
                                          {t('panel.classes.students_count', { count: detail.students.length })}
                                        </p>
                                        <button
                                          onClick={e => { e.stopPropagation(); setCasesPreview({ ...detail, className: cls.name }); }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6366f1] text-white text-xs font-semibold rounded-lg hover:bg-[#4f46e5] active:scale-[.97] transition-all"
                                          style={font}
                                        >
                                          <FileText size={11} />
                                          {t('panel.classes.see_cases', { count: detail.cases.length })}
                                        </button>
                                      </div>
                                      {detail.students.length === 0 ? (
                                        <p className="text-xs text-[#b0aac8]">{t('panel.classes.no_students')}</p>
                                      ) : (
                                        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                                          {detail.students.map((s, idx) => (
                                            <div key={s.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${idx % 2 === 0 ? 'bg-white' : 'bg-transparent'}`}>
                                              <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-6 h-6 rounded-full bg-[#f0f0fe] flex items-center justify-center text-[#6366f1] text-[10px] font-bold flex-shrink-0">
                                                  {s.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-[#111018] truncate">{s.name}</span>
                                              </div>
                                              <span className="text-[11px] text-[#9893b0] flex-shrink-0 ml-3 hidden sm:block">{s.email}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* ── FREE CASES ──────────────────────────────────── */}
            {tab === 'free-cases' && (
              <div className="flex flex-col gap-4">
                {loadingFreeCases ? (
                  <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" /></div>
                ) : freeCases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-28 gap-3">
                    <Stethoscope size={36} className="text-[#d4cfe8]" />
                    <p className="text-sm font-semibold text-[#374151]">{t('panel.free_cases.empty_title')}</p>
                    <p className="text-sm text-[#9893b0]">{t('panel.free_cases.empty_hint')}</p>
                    <button onClick={() => setFreeCaseModal(true)} style={{ boxShadow: '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)', ...font }} className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] text-white text-sm font-semibold rounded-xl hover:bg-[#4f46e5] active:scale-[.97] active:shadow-none transition-all">
                      <Plus size={14} /> {t('panel.free_cases.new')}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#eeedf2] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#f0edf8]">
                      <p className="text-xs font-semibold text-[#6b6880] uppercase tracking-widest">{t('panel.free_cases.count', { count: freeCases.length })}</p>
                    </div>
                    <div className="divide-y divide-[#f7f5fc]">
                      {freeCases.map(fc => (
                        <div key={fc.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#faf9fe] transition-colors group">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-lg border border-[#eeedf2] bg-[#f7f5fc] flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Stethoscope size={15} className="text-[#9893b0]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#111018] truncate">{fc.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {fc.specialty && (
                                  <span className="text-[11px] text-[#5c5480] bg-[#f7f5fc] px-2 py-0.5 rounded-md">{specialtyLabel(fc.specialty)}</span>
                                )}
                                <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${fc.difficulty === 'Básico' ? 'bg-[#f0fdf9] text-[#059669]'
                                    : fc.difficulty === 'Avançado' ? 'bg-[#fff1f2] text-[#e11d48]'
                                      : 'bg-[#fffbeb] text-[#d97706]'
                                  }`}>{fc.difficulty}</span>
                                {formatExpiryLabel(fc.available_until, t, locale) && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-rose-100 text-rose-700">
                                    {formatExpiryLabel(fc.available_until, t, locale)}
                                  </span>
                                )}
                                {fc.created_at && (
                                  <span className="text-[11px] text-[#9893b0]">{new Date(fc.created_at).toLocaleDateString(locale)}</span>
                                )}
                              </div>
                              {fc.summary && <p className="text-xs text-[#9893b0] mt-1 truncate max-w-[400px]">{fc.summary}</p>}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!window.confirm(t('panel.free_cases.delete_confirm', { title: fc.title }))) return;
                              try {
                                await deleteAdminFreeCase(fc.id);
                                setFreeCases(prev => prev.filter(c => c.id !== fc.id));
                              } catch (err) { alert(err instanceof Error ? err.message : t('panel.free_cases.delete_error')); }
                            }}
                            title={t('panel.common.delete')}
                            className="w-7 h-7 rounded-lg bg-[#fff1f2] text-[#fb7185] flex items-center justify-center hover:bg-[#ffe4e6] transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-4"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GPT / TOKENS */}
            {tab === 'gpt' && (
              <div className="flex flex-col gap-5">

                {/* Modelo e Langfuse */}
                {gptInfo && (
                  <div className="bg-white rounded-xl border border-[#eeedf2] p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Bot size={15} className="text-[#6366f1]" />
                      <p className="text-xs font-bold text-[#6b6880] uppercase tracking-widest">{t('panel.gpt.model_config')}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-[#f5f4fb] p-3">
                        <p className="text-[10px] text-[#9893b0] font-medium uppercase tracking-wide">{t('panel.gpt.chat_model')}</p>
                        <p className="text-sm font-bold text-[#111018] mt-1 truncate">{gptInfo.model}</p>
                      </div>
                      <div className="rounded-lg bg-[#f5f4fb] p-3">
                        <p className="text-[10px] text-[#9893b0] font-medium uppercase tracking-wide">{t('panel.gpt.eval_model')}</p>
                        <p className="text-sm font-bold text-[#111018] mt-1 truncate">{gptInfo.eval_model}</p>
                      </div>
                      <div className={`rounded-lg p-3 ${gptInfo.vector_store_configured ? 'bg-[#f0fdf9]' : 'bg-[#fff1f2]'}`}>
                        <p className="text-[10px] text-[#9893b0] font-medium uppercase tracking-wide">{t('panel.gpt.vector_store')}</p>
                        <p className={`text-sm font-bold mt-1 ${gptInfo.vector_store_configured ? 'text-[#059669]' : 'text-[#e11d48]'}`}>
                          {gptInfo.vector_store_configured ? t('panel.gpt.configured') : t('panel.gpt.not_configured')}
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 ${gptInfo.langfuse_active ? 'bg-[#f0fdf9]' : 'bg-[#fafaf8]'}`}>
                        <p className="text-[10px] text-[#9893b0] font-medium uppercase tracking-wide">Langfuse</p>
                        {gptInfo.langfuse_active ? (
                          <a href={gptInfo.langfuse_host} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-bold text-[#059669] mt-1 block hover:underline">
                            {t('panel.gpt.langfuse_active')}
                          </a>
                        ) : (
                          <p className="text-sm font-bold text-[#9893b0] mt-1">{t('panel.gpt.langfuse_inactive')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Saldo / Créditos OpenAI */}
                <div className="bg-white rounded-xl border border-[#eeedf2] p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Wallet size={15} className="text-[#6366f1]" />
                    <p className="text-xs font-bold text-[#6b6880] uppercase tracking-widest">{t('panel.gpt.balance')}</p>
                  </div>
                  {gptBalanceLoading ? (
                    <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" /></div>
                  ) : gptBalance?.source === 'credit_grants' ? (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: t('panel.gpt.available'), value: `$${(gptBalance.total_available ?? 0).toFixed(2)}`, color: 'text-[#059669]', bg: 'bg-[#f0fdf9]' },
                          { label: t('panel.gpt.used'), value: `$${(gptBalance.total_used ?? 0).toFixed(2)}`, color: 'text-[#e11d48]', bg: 'bg-[#fff1f2]' },
                          { label: t('panel.gpt.granted'), value: `$${(gptBalance.total_granted ?? 0).toFixed(2)}`, color: 'text-[#6366f1]', bg: 'bg-[#f0f0fe]' },
                        ].map(c => (
                          <div key={c.label} className={`rounded-lg p-4 ${c.bg}`}>
                            <p className={`text-2xl font-black tabular-nums ${c.color}`}>{c.value}</p>
                            <p className="text-[11px] text-[#9893b0] font-medium mt-1">{c.label}</p>
                          </div>
                        ))}
                      </div>
                      {gptBalance.credits_expire_at && (
                        <p className="text-[11px] text-[#9893b0]">
                          {t('panel.gpt.credits_expire', { date: new Date(gptBalance.credits_expire_at).toLocaleDateString(locale) })}
                        </p>
                      )}
                    </div>
                  ) : gptBalance?.source === 'subscription' ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 p-3 bg-[#f0f0fe] rounded-lg">
                        <CheckCircle2 size={14} className="text-[#6366f1]" />
                        <p className="text-sm font-semibold text-[#374151]">
                          {gptBalance.has_payment_method ? t('panel.gpt.payment_method') : t('panel.gpt.no_payment_method')}
                        </p>
                      </div>
                      {(gptBalance.hard_limit_usd || gptBalance.soft_limit_usd) && (
                        <div className="grid grid-cols-2 gap-3">
                          {gptBalance.soft_limit_usd != null && (
                            <div className="rounded-lg p-4 bg-[#fffbeb]">
                              <p className="text-2xl font-black tabular-nums text-[#d97706]">${gptBalance.soft_limit_usd.toFixed(2)}</p>
                              <p className="text-[11px] text-[#9893b0] font-medium mt-1">{t('panel.gpt.soft_limit')}</p>
                            </div>
                          )}
                          {gptBalance.hard_limit_usd != null && (
                            <div className="rounded-lg p-4 bg-[#fff1f2]">
                              <p className="text-2xl font-black tabular-nums text-[#e11d48]">${gptBalance.hard_limit_usd.toFixed(2)}</p>
                              <p className="text-[11px] text-[#9893b0] font-medium mt-1">{t('panel.gpt.hard_limit')}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#6366f1] hover:underline">
                        {t('panel.gpt.billing_link')}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-[#fffbeb] border border-[#fde68a] rounded-lg">
                      <AlertCircle size={15} className="text-[#d97706] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#92400e]">{t('panel.gpt.balance_unavailable')}</p>
                        <p className="text-xs text-[#b45309] mt-1">{gptBalance?.detail ?? t('panel.gpt.balance_unavailable_detail')}</p>
                        <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#6366f1] hover:underline mt-2 inline-block">
                          {t('panel.gpt.billing_panel')}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Uso de tokens (OpenAI) */}
                <div className="bg-white rounded-xl border border-[#eeedf2] p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={15} className="text-[#f59e0b]" />
                      <p className="text-xs font-bold text-[#6b6880] uppercase tracking-widest">{t('panel.gpt.tokens_title')}</p>
                    </div>
                    {gptUsageError && (
                      <button
                        onClick={() => {
                          setGptUsageLoading(true);
                          setGptUsageError(null);
                          Promise.all([fetchGptUsage(), fetchConversationStats()])
                            .then(([u, c]) => { setGptUsage(u); setConvStats(c); })
                            .catch((e: unknown) => setGptUsageError(e instanceof Error ? e.message : t('panel.gpt.error')))
                            .finally(() => setGptUsageLoading(false));
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6366f1] hover:text-[#4f46e5] transition-colors"
                      >
                        <RefreshCw size={12} /> {t('panel.common.retry')}
                      </button>
                    )}
                  </div>
                  {gptUsageLoading ? (
                    <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" /></div>
                  ) : gptUsageError ? (
                    <div className="flex items-start gap-3 p-4 bg-[#fff1f2] border border-[#fecdd3] rounded-lg">
                      <AlertCircle size={15} className="text-[#be123c] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#be123c]">{t('panel.gpt.usage_error_title')}</p>
                        <p className="text-xs text-[#9f1239] mt-1">{gptUsageError}</p>
                      </div>
                    </div>
                  ) : gptUsage ? (
                    (gptUsage.source === 'openai_usage_api' || gptUsage.source === 'db_estimate') ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { label: t('panel.gpt.total'), value: (gptUsage.total_tokens ?? 0).toLocaleString(locale), color: 'text-[#6366f1]', bg: 'bg-[#f0f0fe]' },
                            { label: t('panel.gpt.prompt'), value: (gptUsage.total_prompt_tokens ?? 0).toLocaleString(locale), color: 'text-[#0369a1]', bg: 'bg-[#f0f9ff]' },
                            { label: t('panel.gpt.completion'), value: (gptUsage.total_completion_tokens ?? 0).toLocaleString(locale), color: 'text-[#059669]', bg: 'bg-[#f0fdf9]' },
                          ].map(c => (
                            <div key={c.label} className={`rounded-lg p-4 ${c.bg}`}>
                              <p className={`text-2xl font-black tabular-nums ${c.color}`}>{c.value}</p>
                              <p className="text-[11px] text-[#9893b0] font-medium mt-1">{c.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-[#9893b0]">{t('panel.gpt.period', { start: gptUsage.period_start, end: gptUsage.period_end })}</p>
                          {gptUsage.source === 'db_estimate' && (
                            <span className="text-[10px] font-semibold text-[#d97706] bg-[#fef9c3] px-2 py-0.5 rounded-full">
                              {t('panel.gpt.db_estimate')}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-[#fffbeb] border border-[#fde68a] rounded-lg">
                        <AlertCircle size={15} className="text-[#d97706] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-[#92400e]">{t('panel.gpt.usage_unavailable')}</p>
                          <p className="text-xs text-[#b45309] mt-1">{gptUsage.detail}</p>
                          <a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#6366f1] hover:underline mt-2 inline-block">
                            {t('panel.gpt.openai_panel')}
                          </a>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-[#9893b0] py-4 text-center">{t('panel.gpt.no_data')}</p>
                  )}
                </div>

                {/* Stats de conversas */}
                <div className="bg-white rounded-xl border border-[#eeedf2] p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-[#6366f1]" />
                    <p className="text-xs font-bold text-[#6b6880] uppercase tracking-widest">{t('panel.gpt.conv_stats')}</p>
                  </div>
                  {gptUsageLoading ? (
                    <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" /></div>
                  ) : gptUsageError ? (
                    <p className="text-sm text-[#9893b0]">—</p>
                  ) : convStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: t('panel.gpt.conversations'), value: convStats.total_conversations.toLocaleString(locale), color: 'text-[#6366f1]', bg: 'bg-[#f0f0fe]' },
                        { label: t('panel.gpt.messages'), value: convStats.total_messages.toLocaleString(locale), color: 'text-[#0369a1]', bg: 'bg-[#f0f9ff]' },
                        { label: t('panel.gpt.avg_per_conv'), value: String(convStats.avg_messages_per_conversation), color: 'text-[#059669]', bg: 'bg-[#f0fdf9]' },
                        { label: t('panel.gpt.over_60'), value: String(convStats.conversations_over_60_messages), color: convStats.conversations_over_60_messages > 0 ? 'text-[#e11d48]' : 'text-[#059669]', bg: convStats.conversations_over_60_messages > 0 ? 'bg-[#fff1f2]' : 'bg-[#f0fdf9]' },
                      ].map(c => (
                        <div key={c.label} className={`rounded-lg p-4 ${c.bg}`}>
                          <p className={`text-2xl font-black tabular-nums ${c.color}`}>{c.value}</p>
                          <p className="text-[11px] text-[#9893b0] font-medium mt-1">{c.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Configurações */}
                <div className="bg-white rounded-xl border border-[#eeedf2] p-5 flex flex-col gap-5">
                  <div className="flex items-center gap-2">
                    <Sliders size={15} className="text-[#6366f1]" />
                    <p className="text-xs font-bold text-[#6b6880] uppercase tracking-widest">{t('panel.gpt.settings_title')}</p>
                  </div>

                  {gptLoading ? (
                    <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" /></div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {/* max_tokens */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-[#374151]">
                            {t('panel.gpt.max_tokens')}
                          </label>
                          <span className="text-xs text-[#9893b0]">{t('panel.gpt.default', { value: gptSettings?.defaults.gpt_max_tokens ?? 600 })}</span>
                        </div>
                        <p className="text-xs text-[#9893b0] -mt-1">{t('panel.gpt.max_tokens_hint')}</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min={100} max={4000} step={50}
                            value={gptForm.gpt_max_tokens}
                            onChange={e => setGptForm(f => ({ ...f, gpt_max_tokens: Number(e.target.value) }))}
                            className="flex-1 accent-[#6366f1]"
                          />
                          <input
                            type="number" min={100} max={4000} step={50}
                            value={gptForm.gpt_max_tokens}
                            onChange={e => setGptForm(f => ({ ...f, gpt_max_tokens: Math.max(100, Math.min(4000, Number(e.target.value))) }))}
                            className="w-20 px-2 py-1.5 rounded-lg border border-[#e5e2ef] text-sm text-center font-semibold text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
                          />
                          <span className="text-xs text-[#9893b0] w-12">{t('panel.gpt.tokens_unit')}</span>
                        </div>
                      </div>

                      {/* max_turns */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-[#374151]">
                            {t('panel.gpt.max_turns')}
                          </label>
                          <span className="text-xs text-[#9893b0]">{t('panel.gpt.default', { value: gptSettings?.defaults.gpt_max_turns ?? 30 })}</span>
                        </div>
                        <p className="text-xs text-[#9893b0] -mt-1">{t('panel.gpt.max_turns_hint')}</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min={5} max={200} step={5}
                            value={gptForm.gpt_max_turns}
                            onChange={e => setGptForm(f => ({ ...f, gpt_max_turns: Number(e.target.value) }))}
                            className="flex-1 accent-[#6366f1]"
                          />
                          <input
                            type="number" min={5} max={200} step={5}
                            value={gptForm.gpt_max_turns}
                            onChange={e => setGptForm(f => ({ ...f, gpt_max_turns: Math.max(5, Math.min(200, Number(e.target.value))) }))}
                            className="w-20 px-2 py-1.5 rounded-lg border border-[#e5e2ef] text-sm text-center font-semibold text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
                          />
                          <span className="text-xs text-[#9893b0] w-12">{t('panel.gpt.turns_unit')}</span>
                        </div>
                      </div>

                      {/* daily_message_limit */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-[#374151]">
                            {t('panel.gpt.daily_limit')}
                          </label>
                          <span className="text-xs text-[#9893b0]">{t('panel.gpt.default', { value: gptSettings?.defaults.gpt_daily_message_limit ?? 100 })}</span>
                        </div>
                        <p className="text-xs text-[#9893b0] -mt-1">{t('panel.gpt.daily_limit_hint')}</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min={1} max={500} step={5}
                            value={gptForm.gpt_daily_message_limit}
                            onChange={e => setGptForm(f => ({ ...f, gpt_daily_message_limit: Number(e.target.value) }))}
                            className="flex-1 accent-[#6366f1]"
                          />
                          <input
                            type="number" min={1} max={500} step={5}
                            value={gptForm.gpt_daily_message_limit}
                            onChange={e => setGptForm(f => ({ ...f, gpt_daily_message_limit: Math.max(1, Math.min(500, Number(e.target.value))) }))}
                            className="w-20 px-2 py-1.5 rounded-lg border border-[#e5e2ef] text-sm text-center font-semibold text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
                          />
                          <span className="text-xs text-[#9893b0] w-12">{t('panel.gpt.msgs_unit')}</span>
                        </div>
                      </div>

                      {gptMsg && (
                        <Alert type={gptMsg.type === 'ok' ? 'success' : 'error'}>{gptMsg.text}</Alert>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={async () => {
                            setGptSaving(true);
                            setGptMsg(null);
                            try {
                              await updateGptSettings(gptForm);
                              const fresh = await fetchGptSettings();
                              setGptSettings(fresh);
                              setGptForm(toGptForm(fresh));
                              setGptMsg({ type: 'ok', text: t('panel.gpt.saved') });
                            } catch (e) {
                              setGptMsg({ type: 'err', text: e instanceof Error ? e.message : t('panel.gpt.save_error') });
                            } finally {
                              setGptSaving(false);
                            }
                          }}
                          disabled={gptSaving}
                          style={{ boxShadow: '0 1px 3px rgba(99,102,241,.35), 0 4px 12px rgba(99,102,241,.2), inset 0 1px 0 rgba(255,255,255,.15)' }}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-[#6366f1] text-white text-sm font-semibold rounded-xl hover:bg-[#4f46e5] disabled:opacity-60 transition-all"
                        >
                          {gptSaving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sliders size={13} />}
                          {t('panel.gpt.save')}
                        </button>
                        <button
                          onClick={() => gptSettings && setGptForm(toGptForm(gptSettings))}
                          className="text-sm text-[#9893b0] hover:text-[#374151] transition-colors"
                        >
                          {t('panel.gpt.discard')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FLASHCARDS ─────────────────────────────────── */}
            {tab === 'flashcards' && (
              <div className="h-full min-h-[500px]">
                <AdminFlashcardsView />
              </div>
            )}

          </div>
        </main>

        <CreateTeacherModal open={teacherModal} onClose={() => setTeacherModal(false)} onSuccess={refreshAll} institutions={institutions} />
        <BulkTeacherModal open={bulkTeacherModal} onClose={() => setBulkTeacherModal(false)} onSuccess={refreshAll} institutions={institutions} />
        <BulkStudentModal open={studentModal} onClose={() => setStudentModal(false)} onSuccess={refreshAll} institutions={institutions} />
        <CreateInstitutionModal
          open={institutionModal}
          onClose={() => { setInstitutionModal(false); setEditingInstitution(null); }}
          onSuccess={refreshAll}
          editing={editingInstitution}
        />
        <CreateFreeCaseModal
          open={freeCaseModal}
          onClose={() => setFreeCaseModal(false)}
          onSuccess={() => {
            setFreeCaseModal(false);
            setLoadingFreeCases(true);
            fetchAdminFreeCases().then(setFreeCases).catch(console.error).finally(() => setLoadingFreeCases(false));
          }}
        />

        {/* ── Cases preview modal ──────────────────────────── */}
        {casesPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,16,24,.55)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: '85vh', animation: 'modalIn .18s ease', ...font }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0edf8]">
                <div>
                  <p className="text-[10px] font-bold text-[#9893b0] uppercase tracking-widest mb-0.5">{t('panel.classes.cases_modal_title')}</p>
                  <p className="text-base font-bold text-[#111018]">{casesPreview.className}</p>
                </div>
                <button onClick={() => setCasesPreview(null)} className="w-8 h-8 rounded-lg bg-[#f7f5fc] flex items-center justify-center text-[#9893b0] hover:bg-[#ede9f7] hover:text-[#111018] transition-colors">
                  <X size={14} />
                </button>
              </div>
              {/* Body */}
              <div className="overflow-y-auto flex-1 px-6 py-5">
                {casesPreview.cases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <FileText size={32} className="text-[#d4cfe8]" />
                    <p className="text-sm font-semibold text-[#374151]">{t('panel.classes.no_cases_title')}</p>
                    <p className="text-xs text-[#9893b0]">{t('panel.classes.no_cases_hint')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {casesPreview.cases.map(c => {
                      const diffColor =
                        c.difficulty === 'Avançado' ? 'bg-[#fff1f2] text-[#be123c]' :
                          c.difficulty === 'Intermediário' ? 'bg-[#fefce8] text-[#854d0e]' :
                            'bg-[#ecfdf5] text-[#065f46]';
                      return (
                        <div key={c.id} className="flex items-start justify-between gap-3 p-4 rounded-xl border border-[#e5e2ef] bg-[#faf9fe]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#111018] mb-1.5">{c.title}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.specialty && (
                                <span className="text-[11px] bg-white text-[#5c5480] px-2 py-0.5 rounded-md border border-[#e5e2ef] font-medium">{specialtyLabel(c.specialty)}</span>
                              )}
                              <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${diffColor}`}>{c.difficulty}</span>
                              {!c.published && (
                                <span className="text-[11px] bg-[#f8fafc] text-[#64748b] px-2 py-0.5 rounded-md border border-[#e2e8f0] font-medium">{t('panel.classes.draft')}</span>
                              )}
                            </div>
                          </div>
                          {c.due_date && (
                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] text-[#9893b0] uppercase tracking-wider">{t('panel.classes.due')}</p>
                              <p className="text-xs font-semibold text-[#374151]">{new Date(c.due_date).toLocaleDateString(locale)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(.97) translateY(5px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;
