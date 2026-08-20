// Aviso pendente para ser exibido DEPOIS de um redirecionamento de sessão.
//
// Por que sessionStorage e não um estado em memória: quem dispara o aviso é o
// `authFetch`, que logo em seguida faz `window.location.href = '/'` — um reload
// completo. Um toast montado antes disso morre com a página; o alert() antigo só
// era visto porque bloqueava a thread. Gravar a intenção e consumi-la depois do
// reload é o que permite trocar o alert por um toast sem perder a mensagem.

const NOTICE_KEY = 'anamnes:session-notice';

// Chaves de tradução aceitas (namespace `common`). Um union em vez de string
// solta para o aviso não virar texto hardcoded fora do dicionário.
export type SessionNoticeKind = 'session_expired';

export function queueSessionNotice(kind: SessionNoticeKind): void {
  try {
    window.sessionStorage.setItem(NOTICE_KEY, kind);
  } catch {
    // Modo privativo / storage bloqueado: seguir sem aviso é aceitável.
  }
}

/** Lê e apaga o aviso pendente — chamar uma única vez, no mount do app. */
export function consumeSessionNotice(): SessionNoticeKind | null {
  try {
    const value = window.sessionStorage.getItem(NOTICE_KEY);
    if (value) window.sessionStorage.removeItem(NOTICE_KEY);
    return value === 'session_expired' ? value : null;
  } catch {
    return null;
  }
}
