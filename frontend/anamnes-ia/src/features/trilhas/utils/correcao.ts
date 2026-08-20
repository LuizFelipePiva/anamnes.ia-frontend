import type {
  AlvoHotspot,
  Exercicio,
  Resposta,
  Licao,
  UnidadeMeta,
  LicaoMeta,
} from '../types/trilha';

/** Um clique caiu dentro do alvo? Coordenadas em fração do quadro. */
export function dentroDoAlvo(clique: { x: number; y: number }, alvo: AlvoHotspot): boolean {
  return (
    clique.x >= alvo.x &&
    clique.x <= alvo.x + alvo.largura &&
    clique.y >= alvo.y &&
    clique.y <= alvo.y + alvo.altura
  );
}

/** Embaralhamento determinístico: mesma seed → mesma ordem (evita re-shuffle a cada render). */
export function embaralharComSeed<T>(arr: T[], seed: string): T[] {
  let h = seed.split('').reduce((acc, c) => (Math.imul(31, acc) + c.charCodeAt(0)) | 0, 0);
  const rng = () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** O aluno já preencheu o suficiente para habilitar o botão "Verificar"? */
export function respostaCompleta(ex: Exercicio, r: Resposta | null): boolean {
  if (!r) return false;
  switch (ex.tipo) {
    case 'escolha_unica':
      return r.tipo === 'escolha_unica' && r.valor >= 0;
    case 'vf':
      return r.tipo === 'vf';
    case 'ordenar':
      return r.tipo === 'ordenar' && r.valor.length === ex.itens.length;
    case 'associar':
      return r.tipo === 'associar' && Object.keys(r.valor).length === ex.pares.length;
    case 'classificar':
      return r.tipo === 'classificar' && Object.keys(r.valor).length === ex.itens.length;
    case 'numerico':
      return r.tipo === 'numerico';
    case 'hotspot':
      return r.tipo === 'hotspot' && r.valor.length > 0;
  }
}

/** Correção. Tudo-ou-nada: o exercício só conta como acerto se estiver 100% certo. */
export function corrigir(ex: Exercicio, r: Resposta | null): boolean {
  if (!r) return false;
  switch (ex.tipo) {
    case 'escolha_unica':
      return r.tipo === 'escolha_unica' && r.valor === ex.correta;
    case 'vf':
      return r.tipo === 'vf' && r.valor === ex.correta;
    case 'ordenar':
      return r.tipo === 'ordenar' && r.valor.every((v, i) => v === i);
    case 'associar':
      return r.tipo === 'associar' && ex.pares.every((_, i) => r.valor[i] === i);
    case 'classificar':
      return (
        r.tipo === 'classificar' && ex.itens.every((item, i) => r.valor[i] === item.categoria)
      );
    case 'numerico':
      return (
        r.tipo === 'numerico' && r.valor >= ex.faixaCorreta[0] && r.valor <= ex.faixaCorreta[1]
      );
    case 'hotspot': {
      if (r.tipo !== 'hotspot') return false;
      // Todo alvo precisa de pelo menos um clique dentro, e nenhum clique pode
      // sobrar fora: marcar a imagem inteira não é acertar.
      const todosCobertos = ex.alvos.every(alvo => r.valor.some(c => dentroDoAlvo(c, alvo)));
      const semExcesso = r.valor.every(c => ex.alvos.some(alvo => dentroDoAlvo(c, alvo)));
      return todosCobertos && semExcesso;
    }
  }
}

/** Todas as lições da trilha, na ordem — usado para liberar os nós do mapa. */
export function licoesEmOrdem(unidades: UnidadeMeta[]): LicaoMeta[] {
  return unidades.flatMap(u => u.licoes);
}

export function chaveLicao(trilhaId: string, licaoId: string): string {
  return `${trilhaId}:${licaoId}`;
}

export function formatarTempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Embaralha os exercícios de uma lição sem mudar a lição original. */
export function licaoEmbaralhada(licao: Licao, seed: string): Licao {
  return { ...licao, exercicios: embaralharComSeed(licao.exercicios, seed) };
}
