import { describe, it, expect, afterAll } from 'vitest';
import i18n from './index';

// SPEC-008 RF6 — uma célula deixada em branco pelo tradutor não pode sumir da
// tela. Com o default do i18next (`returnEmptyString: true`) a UI renderiza "",
// que é pior que mostrar o português: não há sinal nenhum de que faltou algo.
describe('fallback visível em vez de vazio (RF6)', () => {
  // `i18next.d.ts` tipa as chaves a partir do pt-BR real; as chaves injetadas
  // aqui são sintéticas, então a chamada precisa escapar da tipagem.
  const t = i18n.t as unknown as (key: string) => string;

  afterAll(async () => {
    await i18n.changeLanguage('pt-BR');
  });

  it('a instância declara returnEmptyString: false', () => {
    expect(i18n.options.returnEmptyString).toBe(false);
  });

  // #10 da tabela §5 — o comportamento que o flag compra.
  it('#10 chave vazia em ru cai no fallback pt-BR em vez de renderizar ""', async () => {
    i18n.addResource('pt-BR', 'common', 'spec008_vazia', 'Texto em português');
    i18n.addResource('ru', 'common', 'spec008_vazia', '');

    await i18n.changeLanguage('ru');
    expect(t('common:spec008_vazia')).toBe('Texto em português');
  });

  it('tradução preenchida em ru continua vencendo o fallback', async () => {
    i18n.addResource('pt-BR', 'common', 'spec008_ok', 'Olá');
    i18n.addResource('ru', 'common', 'spec008_ok', 'Привет');

    await i18n.changeLanguage('ru');
    expect(t('common:spec008_ok')).toBe('Привет');
  });
});
