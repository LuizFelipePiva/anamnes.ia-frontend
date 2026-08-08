// Higiene de chaves (SPEC-008 §9.4 / SPEC-007 §9.3): nenhuma chave definida sem
// uso, nenhum uso sem chave. Complementa o teste de paridade — aquele garante
// que os idiomas têm o mesmo conjunto de chaves; este, que o conjunto é o que o
// código realmente consome.
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scanUsage, findOrphans, loadDefined, extractFromSource } from '../../../scripts/i18nUsage.mjs';

const SRC_DIR = resolve(__dirname, '../..');
const REFERENCE_DIR = resolve(SRC_DIR, 'locales/pt-BR');

describe('extração de chaves do código', () => {
  it('reconhece as formas de chamada usadas no projeto', () => {
    const { keys } = extractFromSource(`
      const { t } = useTranslation('chat');
      const { t: tCommon } = useTranslation('common');
      t('a.simples');
      tCommon("b.alias");
      i18n.t('c.direta');
      <Trans i18nKey="d.trans" />
      <Trans i18nKey={cond ? 'e.um' : 'e.dois'} />
      const item = { labelKey: 'f.prop' };
    `);
    const found = keys.map((k: { key: string }) => k.key);
    for (const expected of ['a.simples', 'b.alias', 'c.direta', 'd.trans', 'e.um', 'e.dois', 'f.prop']) {
      expect(found).toContain(expected);
    }
  });

  it('captura o prefixo estático de chave dinâmica', () => {
    const { prefixes } = extractFromSource('t(`panel.nav.${item.id}`)');
    expect(prefixes.map((p: { prefix: string }) => p.prefix)).toContain('panel.nav.');
  });

  it('ignora campo de dado que só termina em Key', () => {
    // `dataKey` do Recharts não é chave de tradução.
    const { keys } = extractFromSource('<XAxis dataKey="name" />');
    expect(keys.map((k: { key: string }) => k.key)).not.toContain('name');
  });
});

describe('dicionários vs. código', () => {
  const usage = scanUsage(SRC_DIR);
  const defined = loadDefined(REFERENCE_DIR);
  const { orphans, missing } = findOrphans(defined, usage);

  it('não há chave usada no código e ausente do dicionário', () => {
    expect(missing.map((m: { id: string }) => m.id)).toEqual([]);
  });

  it('não há chave definida e sem uso (órfã)', () => {
    // Se esta falhar e a chave for montada dinamicamente, acrescente o prefixo
    // em USAGE_ALLOWLIST (scripts/i18nUsage.mjs) — não relaxe o teste.
    expect(orphans).toEqual([]);
  });
});
