import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { authFetch } from '@/core/utils';

const PREVIEW_LIMIT = 4;

type ScoreMeta = { score: number | null; is_ai_chat?: boolean };

type ChatItem = {
  id: string;
  title: string | null;
  created_at: string;
  // Dados de score enriquecidos pelo backend
  score?: number | null;
  attempt_status?: string | null;
  is_ai_chat?: boolean | null;
};

function fmtDate(iso: string, t: TFunction<'chat'>, locale: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const hora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoje.toDateString()) return t('history.today', { time: hora });
  if (d.toDateString() === ontem.toDateString()) return t('history.yesterday', { time: hora });
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) + ` · ${hora}`;
}

const ChatHistoryCarousel: React.FC<{ scoreMap?: Record<string, ScoreMeta> }> = ({ scoreMap }) => {
  const [items, setItems] = useState<ChatItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('chat');
  const { token } = useAuth();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!token) { setItems([]); setLoading(false); return; }
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(`${import.meta.env.VITE_API_URL}/conversations`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ChatItem[] = await res.json();
        if (!mounted) return;

        // Fire-and-forget title update for untitled conversations
        if (data.some(c => !c.title)) {
          authFetch(`${import.meta.env.VITE_API_URL}/conversations/update-titles`, { method: 'POST' })
            .then(r => r.ok ? r.json() : null)
            .then(updated => {
              if (!updated || !mounted) return;
              authFetch(`${import.meta.env.VITE_API_URL}/conversations`)
                .then(r => r.ok ? r.json() : null)
                .then(refreshed => { if (refreshed && mounted) setItems(refreshed); });
            })
            .catch(() => {/* silently ignore */});
        }

        setItems(data);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : t('history.load_error'));
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [token, t]);

  const titleClass = 'text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase pl-3 border-l-[3px] border-[#7a55ff]';

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className={titleClass}>{t('history.title')}</h2>
        </div>
        <div className="chat-history-list bg-white rounded-2xl border border-[var(--card-divide)] divide-y divide-[var(--card-divide)]">
          {Array.from({ length: PREVIEW_LIMIT }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-[#f0eeff] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[#f0eeff] rounded w-3/4" />
                <div className="h-2.5 bg-[#f5f3ff] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Erro ── */
  if (error) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className={titleClass}>{t('history.title')}</h2>
        </div>
        <div className="bg-white rounded-2xl border border-rose-100 p-5 text-sm text-rose-600">
          {t('history.load_error_detail', { error })}
        </div>
      </div>
    );
  }

  /* ── Vazio ── */
  if (!items || items.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className={titleClass}>{t('history.title')}</h2>
        </div>
        <div className="chat-history-list bg-white rounded-2xl border border-[var(--card-divide)] p-8 flex flex-col items-center gap-3">
          <MessageSquare size={32} className="text-[#c4bfea]" />
          <p className="text-sm text-[#6a6a78] text-center leading-relaxed">
            {t('history.empty_line1')}<br />{t('history.empty_line2')}
          </p>
          <button
            onClick={() => navigate('/student-chat')}
            className="text-xs font-semibold text-[#7a55ff] hover:text-[#5a2ad9] transition-colors"
          >
            {t('history.start_now')}
          </button>
        </div>
      </div>
    );
  }

  const preview = items.slice(0, PREVIEW_LIMIT);
  const hasMore = items.length > PREVIEW_LIMIT;

  /* ── Lista preview ── */
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={titleClass}>{t('history.title')}</h2>
        {hasMore && (
          <button
            onClick={() => navigate('/student-chat')}
            className="text-[11px] font-semibold text-[#7a55ff] hover:text-[#5a2ad9] transition-colors whitespace-nowrap"
          >
            {t('history.see_all')}
          </button>
        )}
      </div>

      <div className="chat-history-list bg-white rounded-2xl border border-[var(--card-divide)] divide-y divide-[var(--card-divide)] overflow-hidden">
        {preview.map((chat) => {
          // Prefere dados do API (score/status direto), cai no scoreMap como fallback
          const hasApiData = chat.attempt_status !== undefined;
          const effectiveMeta: ScoreMeta | undefined = hasApiData
            ? { score: chat.score ?? null, is_ai_chat: chat.is_ai_chat ?? false }
            : scoreMap?.[chat.id];
          const isKnownNoAttempt = hasApiData && chat.attempt_status === null && chat.is_ai_chat === null;
          const scoreBadge = (effectiveMeta !== undefined && !isKnownNoAttempt)
            ? effectiveMeta.is_ai_chat
              ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex-shrink-0">IA</span>
              : effectiveMeta.score !== null
                ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    (effectiveMeta.score as number) >= 80 ? 'bg-emerald-100 text-emerald-700'
                    : (effectiveMeta.score as number) >= 60 ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                  }`}>{effectiveMeta.score}</span>
                : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 flex-shrink-0">—</span>
            : null;
          return (
          <button
            key={chat.id}
            onClick={() => navigate(`/conversation/${chat.id}`)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#faf9ff] transition-colors text-left focus:outline-none group"
            aria-label={t('history.open_aria', { title: chat.title ?? chat.id })}
          >
            <div className="w-9 h-9 rounded-xl bg-[#f0eeff] flex items-center justify-center flex-shrink-0 group-hover:bg-[#e8e2ff] transition-colors">
              <MessageSquare size={16} className="text-[#7a55ff]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#20202a] truncate group-hover:text-[#7a55ff] transition-colors">
                {chat.title ?? t('history.untitled', { date: new Date(chat.created_at).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' }) })}
              </p>
              <p className="text-[11px] text-[#9a9aab] mt-0.5">{fmtDate(chat.created_at, t, i18n.language)}</p>
            </div>
            {scoreBadge}
            <span className="text-[#c4bfea] text-sm flex-shrink-0 group-hover:text-[#7a55ff] transition-colors">›</span>
          </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChatHistoryCarousel;