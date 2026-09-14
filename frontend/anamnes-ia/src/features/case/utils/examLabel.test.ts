/**
 * SPEC-014 — funções puras dos exames complementares (grupos T9 e T10).
 *
 * Usa a instância real do i18next (não um `t` de mentira): o que se quer provar
 * é que a chave existe no dicionário e resolve para o texto certo. Um mock que
 * devolvesse a chave passaria mesmo com o dicionário vazio.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import i18n from '@/core/i18n';

import { examLabel, filterAssets, modalityFromLabelKey, MAX_EXAMS_PER_CASE } from './examLabel';
import type { MedicalAsset } from '../types/exams';

const t = i18n.getFixedT(null, 'case');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

afterAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

function makeAsset(overrides: Partial<MedicalAsset> = {}): MedicalAsset {
  return {
    id: 'RX-PNEUMO-001',
    modality: 'radiografia',
    display_name: 'Radiografia de tórax — Pneumotórax',
    diagnosis_or_finding: 'Pneumotórax',
    url: 'https://x.local/rx.webp',
    media_type: 'image',
    tags: ['tórax', 'urgência'],
    attachment_eligible: true,
    credits: null,
    license: null,
    source_url: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// T9 — examLabel
// ═══════════════════════════════════════════════════════════════════════════

describe('examLabel (T9)', () => {
  it('T9.1 — modalidade conhecida e exame único não recebe numeração', () => {
    expect(examLabel('ecg', null, t)).toBe('Eletrocardiograma');
  });

  it('T9.2 — exames repetidos da mesma modalidade são numerados', () => {
    expect(examLabel('radiografia', 1, t)).toBe('Radiografia 1');
    expect(examLabel('radiografia', 2, t)).toBe('Radiografia 2');
  });

  it('T9.3 — modalidades diferentes não ganham numeração', () => {
    expect(examLabel('ecg', null, t)).toBe('Eletrocardiograma');
    expect(examLabel('tomografia', null, t)).toBe('Tomografia computadorizada');
  });

  it('T9.4 — modalidade desconhecida cai no rótulo genérico', () => {
    expect(examLabel('pet-ct', null, t)).toBe('Exame complementar');
  });

  it('T9.4 — modalidade vazia também cai no genérico, sem lançar', () => {
    expect(examLabel('', null, t)).toBe('Exame complementar');
  });

  it('T9.5 — o rótulo nunca contém o diagnóstico, mesmo com o campo por engano', () => {
    // Simula o pior caso: alguém passa o objeto inteiro do catálogo no lugar
    // da modalidade. O rótulo tem de degradar para o genérico, não vazar.
    const rotulo = examLabel(
      makeAsset().display_name as unknown as string,
      null,
      t,
    );
    expect(rotulo).toBe('Exame complementar');
    expect(rotulo.toLowerCase()).not.toContain('pneumot');
  });

  it('resolve nos outros idiomas com a mesma chave', async () => {
    await i18n.changeLanguage('en');
    expect(examLabel('ecg', null, i18n.getFixedT(null, 'case'))).toBe('Electrocardiogram');
    await i18n.changeLanguage('pt-BR');
  });

  it('modalityFromLabelKey extrai o slug da chave vinda da API', () => {
    expect(modalityFromLabelKey('exams.modality.radiografia')).toBe('radiografia');
    expect(modalityFromLabelKey('qualquer.outra.coisa')).toBe('unknown');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T10 — filterAssets
// ═══════════════════════════════════════════════════════════════════════════

describe('filterAssets (T10)', () => {
  const catalogo: MedicalAsset[] = [
    makeAsset(),
    makeAsset({
      id: 'ECG-FA-001', modality: 'ecg',
      display_name: 'ECG — Fibrilação atrial',
      diagnosis_or_finding: 'Fibrilação atrial',
      tags: ['arritmia'],
    }),
    makeAsset({
      id: 'TC-AVC-001', modality: 'tomografia',
      display_name: 'TC de crânio — AVC isquêmico',
      diagnosis_or_finding: 'AVC isquêmico',
      tags: ['neuro', 'urgência'],
    }),
    makeAsset({ id: 'GASO-001', modality: 'gasometria', attachment_eligible: false }),
  ];

  it('T10.1 — busca casa em display_name, diagnóstico e tags', () => {
    expect(filterAssets(catalogo, 'crânio').map(a => a.id)).toEqual(['TC-AVC-001']);
    expect(filterAssets(catalogo, 'Fibrilação').map(a => a.id)).toEqual(['ECG-FA-001']);
    expect(filterAssets(catalogo, 'arritmia').map(a => a.id)).toEqual(['ECG-FA-001']);
  });

  it('T10.2 — busca ignora caixa e acento', () => {
    // Sem isto, quem digita "pneumotorax" conclui que o exame não existe no
    // acervo — e boa parte dos diagnósticos é acentuada.
    expect(filterAssets(catalogo, 'pneumotorax').map(a => a.id)).toEqual(['RX-PNEUMO-001']);
    expect(filterAssets(catalogo, 'PNEUMOTÓRAX').map(a => a.id)).toEqual(['RX-PNEUMO-001']);
    expect(filterAssets(catalogo, 'FIBRILACAO').map(a => a.id)).toEqual(['ECG-FA-001']);
  });

  it('T10.3 — modalidade e texto combinam em AND', () => {
    expect(filterAssets(catalogo, 'urgência', 'tomografia').map(a => a.id)).toEqual(['TC-AVC-001']);
    expect(filterAssets(catalogo, 'urgência', 'ecg')).toEqual([]);
  });

  it('T10.4 — query vazia devolve tudo que é elegível', () => {
    expect(filterAssets(catalogo, '').map(a => a.id))
      .toEqual(['RX-PNEUMO-001', 'ECG-FA-001', 'TC-AVC-001']);
    expect(filterAssets(catalogo, '   ')).toHaveLength(3);
  });

  it('T10.5 — nunca devolve item inelegível', () => {
    const ids = filterAssets(catalogo, 'gasometria').map(a => a.id);
    expect(ids).not.toContain('GASO-001');
    expect(filterAssets(catalogo, '', 'gasometria')).toEqual([]);
  });

  it('T10.6 — não muta o array de entrada', () => {
    const copia = [...catalogo];
    filterAssets(catalogo, 'ecg', 'ecg');
    expect(catalogo).toEqual(copia);
  });

  it('tolera asset sem tags', () => {
    const semTags = [makeAsset({ tags: undefined as unknown as string[] })];
    expect(filterAssets(semTags, 'pneumotorax')).toHaveLength(1);
  });
});

describe('limite de exames por caso', () => {
  it('espelha o teto do backend', () => {
    expect(MAX_EXAMS_PER_CASE).toBe(8);
  });
});
