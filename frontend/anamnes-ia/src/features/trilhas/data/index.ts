import type { Licao, TrilhaMeta, UnidadeMeta } from '../types/trilha';
import { ECG_UNIDADES } from './ecg/meta';
import { SINAIS_VITAIS_UNIDADES } from './sinais-vitais/meta';
import { HEMOGRAMA_UNIDADES } from './hemograma/meta';
import { RADIOLOGIA_UNIDADES } from './radiologia/meta';

// ─────────────────────────────────────────────────────────────────────────────
// Registro de trilhas.
//
// Juntas, as trilhas somam ~800 questões. Carregar todos os enunciados de uma
// vez custaria ~230 kB à toa, então o conteúdo é publicado em duas camadas:
//
//   1. metadados (este arquivo + <trilha>/meta.ts) — títulos, XP, contagens.
//      Vão no bundle principal; o mapa renderiza sem esperar rede.
//   2. exercícios (<trilha>/m*.json) — import dinâmico via import.meta.glob.
//      Cada módulo vira um chunk próprio, buscado só quando o aluno abre uma
//      lição daquele módulo.
//
// Para adicionar uma trilha nova, ver CLAUDE.md nesta feature.
// ─────────────────────────────────────────────────────────────────────────────

interface ModuloJson {
  id: string;
  titulo: string;
  descricao: string;
  licoes: Licao[];
}

/** Um glob por trilha: o Vite exige um literal estático no caminho. */
const MODULOS: Record<string, Record<string, () => Promise<ModuloJson>>> = {
  ecg: import.meta.glob<ModuloJson>('./ecg/m*.json', { import: 'default' }),
  'sinais-vitais': import.meta.glob<ModuloJson>('./sinais-vitais/m*.json', { import: 'default' }),
  hemograma: import.meta.glob<ModuloJson>('./hemograma/m*.json', { import: 'default' }),
  radiologia: import.meta.glob<ModuloJson>('./radiologia/m*.json', { import: 'default' }),
};

export const TRILHAS: TrilhaMeta[] = [
  {
    id: 'ecg',
    titulo: 'ECG',
    descricao: 'Do papel milimetrado ao supra de ST, um traçado por vez.',
    emoji: '💓',
    cor: '#e0364f',
    corEscura: '#a11334',
    unidades: ECG_UNIDADES,
  },
  {
    id: 'radiologia',
    titulo: 'Radiologia — Tórax',
    descricao: 'Ler a técnica antes do achado, e o roteiro inteiro antes do laudo.',
    emoji: '🩻',
    cor: '#0f766e',
    corEscura: '#115e59',
    unidades: RADIOLOGIA_UNIDADES,
  },
  {
    id: 'hemograma',
    titulo: 'Hemograma',
    descricao: 'Três séries, um exame: do valor de referência à conduta.',
    emoji: '🧪',
    cor: '#7c3aed',
    corEscura: '#5b21b6',
    unidades: HEMOGRAMA_UNIDADES,
  },
  {
    id: 'sinais-vitais',
    titulo: 'Sinais vitais',
    descricao: 'Cinco números que dizem se o paciente pode esperar.',
    emoji: '🌡️',
    cor: '#18a5c3',
    corEscura: '#0f7d94',
    unidades: SINAIS_VITAIS_UNIDADES,
  },
];

export function buscarTrilha(id: string | undefined): TrilhaMeta | undefined {
  return TRILHAS.find(t => t.id === id);
}

export function unidadeDaLicao(trilha: TrilhaMeta, licaoId: string): UnidadeMeta | undefined {
  return trilha.unidades.find(u => u.licoes.some(l => l.id === licaoId));
}

export function totalLicoes(trilha: TrilhaMeta): number {
  return trilha.unidades.reduce((n, u) => n + u.licoes.length, 0);
}

export function totalExercicios(trilha: TrilhaMeta): number {
  return trilha.unidades.reduce(
    (n, u) => n + u.licoes.reduce((m, l) => m + l.totalExercicios, 0),
    0,
  );
}

// ── Carregamento sob demanda ─────────────────────────────────────────────────

const cache = new Map<string, Promise<Licao>>();

async function buscarLicao(trilhaId: string, licaoId: string): Promise<Licao> {
  const trilha = buscarTrilha(trilhaId);
  if (!trilha) throw new Error(`Trilha desconhecida: ${trilhaId}`);

  const unidade = trilha.unidades.find(u => u.licoes.some(l => l.id === licaoId));
  if (!unidade) throw new Error(`Lição desconhecida: ${licaoId}`);

  // O id do módulo precisa terminar em -m<numero>, que é o arquivo JSON:
  // 'ecg-m4' → './ecg/m4.json'. A regra é explícita para falhar alto quando um
  // módulo novo é nomeado fora do padrão, em vez de gerar caminho inválido.
  const casa = /-m(\d+)$/.exec(unidade.id);
  if (!casa) {
    throw new Error(
      `Id de módulo fora do padrão: "${unidade.id}". Deve terminar em -m<numero>.`,
    );
  }
  const carregar = MODULOS[trilhaId]?.[`./${trilhaId}/m${casa[1]}.json`];
  if (!carregar) throw new Error(`Módulo não encontrado: ${unidade.id}`);

  const mod = await carregar();
  const licao = mod.licoes.find(l => l.id === licaoId);
  if (!licao) throw new Error(`Lição ausente no módulo: ${licaoId}`);
  return licao;
}

/** Carrega os exercícios de uma lição. O resultado fica em cache na sessão. */
export function carregarLicao(trilhaId: string, licaoId: string): Promise<Licao> {
  const chave = `${trilhaId}:${licaoId}`;
  const emCache = cache.get(chave);
  if (emCache) return emCache;

  const promessa = buscarLicao(trilhaId, licaoId);
  cache.set(chave, promessa);
  promessa.catch(() => cache.delete(chave));
  return promessa;
}

/** Carrega várias lições em paralelo (usado pela sessão de revisão). */
export async function carregarLicoes(
  refs: { trilhaId: string; licaoId: string }[],
): Promise<Map<string, Licao>> {
  const unicos = [...new Map(refs.map(r => [`${r.trilhaId}:${r.licaoId}`, r])).values()];
  const carregadas = await Promise.all(
    unicos.map(async r => {
      const chave = `${r.trilhaId}:${r.licaoId}`;
      try {
        return [chave, await carregarLicao(r.trilhaId, r.licaoId)] as const;
      } catch {
        return null;
      }
    }),
  );
  return new Map(carregadas.filter((x): x is readonly [string, Licao] => x !== null));
}
