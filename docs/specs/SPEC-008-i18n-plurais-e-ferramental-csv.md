# SPEC-008 — Plurais por idioma e correção do ferramental de tradução (CSV)

- **Origem**: descoberto ao adicionar o russo (SPEC-007 / `docs/I18N.md` §2c, 2026-07-27)
- **Fonte**: `docs/I18N.md`, `docs/specs/SPEC-007-i18n-fase0.md` §9.2
- **Status**: ✅ **implementado** em 2026-07-30 (`src/core/i18n/plurals.ts` + `plurals.test.ts`,
  `parity.test.ts` por chave-base, `config.test.ts` para o RF6)
- **Ressalva medida (2026-07-30)**: a faixa 0–200 foi mantida, mas o caso **6d** não a
  demonstra. Medido em `ro`, `pl`, `cs`, `sk`, `lt`, `ar` e nos 4 idiomas do projeto: 0–100 e
  0–200 produzem **conjuntos idênticos** — em `ro`, `few` já é alcançado por `n=0`. Ou seja,
  `ro` sem `_few` falha igual com qualquer das duas faixas. A margem extra continua valendo
  (custa nada, como o §8.3 de `I18N_IDIOMAS.md` já dizia), mas o critério de aceite "a
  varredura vai até 200" não é observável por resultado: o teste verifica o **parâmetro**.
- ⚠️ **Recorte alterado em 2026-07-29**: os requisitos de **ferramental CSV** (RF1, RF2 e
  RF3) migraram para **`docs/specs/SPEC-009-i18n-ferramental-csv.md`**, que os
  redesenhou após a revisão do `i18nCsv.mjs` (export recortável, merge, header por nome,
  BOM/CRLF). Esta spec fica com as **regras de idioma**: RF4 (paridade por chave-base),
  RF5 (formas plurais) e RF6 (`returnEmptyString`). ✅ **A SPEC-009 foi implementada em
  2026-07-30** — o export já preserva as 64 entradas `_few`/`_many` do russo, então esta
  spec está desbloqueada e é o próximo passo.
- **Revisão 2026-07-29**: RF5 reescrito, D8/D9 adicionados e casos 6c/6d/11 incluídos na
  tabela, após a pesquisa consolidada em **`docs/I18N_IDIOMAS.md`** (comportamentos
  verificados contra `i18next@26.3.6`, não deduzidos da doc). Ver §8 daquele documento.

---

## 1. Contexto / Problema

O russo entrou como 4º idioma com a infraestrutura completa e os dicionários em
placeholder (`"TODO: <texto pt-BR>"`). Ao planejar a tradução real, dois defeitos
do ferramental vieram à tona.

### 1.1 O russo tem 4 formas plurais; o ferramental assume 2

Os dicionários usam apenas os sufixos `_one` / `_other`, suficientes para pt-BR,
en e es. O russo tem quatro formas (CLDR: `one`, `few`, `many`, `other`),
escolhidas pelo último dígito:

| Forma | Quando | Exemplo (*caso*) |
|---|---|---|
| `_one` | termina em 1, exceto 11 | 1, 21, 31 → *случай* |
| `_few` | termina em 2–4, exceto 12–14 | 2, 3, 23 → *случая* |
| `_many` | 0, 5–20, e o resto | 5, 11, 100 → *случаев* |
| `_other` | fracionários | 1,5 → *случая* |

São **32 chaves-base** com plural hoje (`admin` 13, `student` 6, `teacher` 6,
`flashcards` 4, `chat` 2, `case` 1) → **64 entradas a mais** só em `ru`.

Sem elas, o i18next cai no fallback pt-BR **silenciosamente**: aparece português
no meio da UI russa, sem erro no console.

### 1.2 O export descarta chaves que só existem num idioma (defeito principal)

`dictsToRows` (`scripts/i18nCsv.mjs:77`) percorre apenas as chaves do **pt-BR**:

```js
for (const key of Object.keys(flatByLang['pt-BR'])) { … }
```

Como o português não tem `_few`, a linha nunca é gerada. Verificado
experimentalmente:

```
entrada  ru: {days_one, days_few, days_many, days_other}
export   → linhas: days_one, days_other        ← _few e _many sumiram
import   → ru: {days_one, days_other}          ← tradução apagada
```

**Consequência**: quem traduzir editando `src/locales/ru/*.json` direto — o
caminho natural — **perde o trabalho** no próximo ciclo export→import, sem
nenhum aviso. É uma armadilha de perda de dados, mais grave que o problema 1.1.

### 1.3 `parity.test.ts` proíbe a correção

O teste exige conjuntos de chaves **idênticos** entre idiomas. Adicionar
`_few`/`_many` apenas em `ru` faz as novas entradas contarem como `extra` e
quebra a suíte — ou seja, hoje o teste bloqueia a solução correta.

### 1.4 Célula vazia some da tela

`src/core/i18n/index.ts` não define `returnEmptyString`; o default do i18next é
`true`. Se um tradutor deixar uma célula em branco, a UI renderiza **string
vazia** — o texto desaparece sem sinal algum, pior que exibir o fallback.

---

## 2. Objetivo

Permitir que um idioma tenha **mais formas plurais que o pt-BR**, sem perda de
dados no ciclo export→import e sem falso positivo no teste de paridade,
mantendo o fluxo de revisão por não-devs via CSV.

---

## 3. Não-objetivos

- **Traduzir o russo.** Esta spec entrega o ferramental; o conteúdo entra depois.
- **Migrar dicionários para banco.** Avaliado e descartado: não resolve o
  problema (que é de regra de plural, não de armazenamento) e custaria a tipagem
  em tempo de compilação, a atomicidade do deploy e um round-trip no boot — num
  sistema onde o round-trip com o Supabase mede ~1s (ver `CLAUDE.md`, *Capacity*).
- **Adotar TMS** (Tolgee/Weblate/Crowdin). Continua sendo a evolução natural
  (SPEC-007 §9.2), mas só se justifica com tradutores externos em paralelo.
- **Validar interpolações** (`{{count}}`, tags `<1>`) no import — follow-up §9.
- **Corrigir o encoding do Excel** (CSV sem BOM) — follow-up §9.

---

## 4. Requisitos funcionais

### RF1 — Export baseado na união das chaves
`dictsToRows` deve percorrer a **união** das chaves de todos os idiomas de
`LANGS`, não apenas as do pt-BR. Chave ausente num idioma vira célula vazia.

### RF2 — Ordenação estável
As linhas seguem a ordem do pt-BR; chaves que não existem no pt-BR aparecem logo
após a sua chave-base (ex.: `days_few` depois de `days_one`/`days_other`), para
o revisor ver as formas do mesmo termo agrupadas. Ordem determinística entre
execuções — o CSV é comparado por diff.

### RF3 — Import preserva chave ausente
Célula vazia **não** cria a chave naquele idioma (hoje cria com `''`). Assim
`days_few` vazio em pt-BR não polui `pt-BR/case.json`.

> ⚠️ Distinguir "célula vazia" de "tradução apagada de propósito" é impossível no
> CSV. Decisão: **vazio = chave ausente**. Para remover uma chave, remova a linha
> inteira (que a apaga em todos os idiomas).

### RF4 — Paridade por chave-base
`parity.test.ts` compara as chaves **sem o sufixo de plural**
(`_one|_few|_many|_two|_zero|_other`). Um idioma pode ter mais formas que outro
sem que isso seja divergência. O que continua sendo erro:
- chave-base presente em pt-BR e ausente em outro idioma;
- chave-base presente em outro idioma e ausente em pt-BR (chave órfã).

### RF5 — Formas plurais válidas para o idioma
Novo teste, derivado de `Intl.PluralRules`, com **três regras distintas**:

- **(a) Nenhum sufixo inválido** — todo sufixo presente deve pertencer a
  `Intl.PluralRules(lang).resolvedOptions().pluralCategories`.
  Pega forma supérflua (ex.: `_few` em pt-BR).
  ⚠️ **`_zero` é exceção e sempre permitido, em qualquer idioma** — ver D8.
  A regra (a) roda sobre `{_one, _two, _few, _many, _other}` apenas.
- **(b) Cobertura das formas alcançáveis por inteiros** — devem existir todas as
  categorias produzidas por `select(n)` para `n` inteiro em **0–200**, mais
  `_other` como rede de segurança. Pega forma faltando (ex.: `ru` sem `_many`).
  A faixa é 0–200, não 0–100: em romeno `few` depende de restos acima de 100
  (101–119), e 0–100 só cobre por coincidência. Ampliar não custa nada.
- **(c) Cobertura de fracionários, quando a UI exibir decimais** — ver D9. Não é
  exigência para os 4 idiomas atuais; é uma verificação a ativar por idioma, e a
  regra existe para que `cs`/`sk`/`lt` não entrem quebrados no futuro.

> ⚠️ **Não usar `pluralCategories` como critério de cobertura.** Medido:
>
> | Idioma | CLDR (`pluralCategories`) | Alcançável por inteiros 0–100 |
> |---|---|---|
> | pt-BR | `many`, `one`, `other` | `one`, `other` |
> | es | `many`, `one`, `other` | `one`, `other` |
> | en | `one`, `other` | `one`, `other` |
> | ru | `few`, `many`, `one`, `other` | `few`, `many`, `one` |
> | pl | `few`, `many`, `one`, `other` | `few`, `many`, `one` |
>
> pt-BR e es declaram `many` no CLDR — é a forma de números compactos
> ("1 milhão"), que a UI não usa. Exigir o conjunto CLDR completo reprovaria
> **pt-BR, es e ru de uma vez**, todos por motivo errado. Por isso a regra (b)
> usa o alcançável por inteiros, que é o que aparece em contagens de UI.
> Em `ru`, `other` só ocorre em fracionários (1,5) — daí ser exigido à parte,
> como fallback. A matriz completa (~70 idiomas, com as colunas CLDR × inteiros ×
> fracionários × ordinal) está em **`docs/I18N_IDIOMAS.md` §2**.

> Enquanto o `ru` estiver em `TODO:`, este teste falharia. Deve nascer com uma
> **allowlist explícita** de idiomas em migração (`ru`), removida quando a
> tradução entrar — a allowlist é o registro visível da dívida.

### RF6 — Fallback visível em vez de vazio
`src/core/i18n/index.ts` passa a definir `returnEmptyString: false`, para célula
em branco cair no fallback pt-BR (visível) em vez de sumir da tela.

### RF7 — Sincronia das listas de idioma
Sem mudança de comportamento, mas a spec reafirma o invariante (ver `docs/I18N.md`):
`SUPPORTED_LANGS` (front) · `LANGS` (`scripts/i18nCsv.mjs`) · `SUPPORTED_LANGUAGES`
(backend) · constraint `users_language_check` (banco).

---

## 5. Tabela de comportamento (vira teste)

| # | Situação | Hoje | Esperado |
|---|---|---|---|
| 1 | `ru` tem `days_few`, pt-BR não | export **omite** a linha | linha exportada, pt-BR vazio |
| 2 | Roundtrip export→import com `days_few` só em `ru` | chave **apagada** de `ru` | chave preservada |
| 3 | Célula pt-BR vazia no import | cria `days_few: ""` em pt-BR | chave **não** criada em pt-BR |
| 4 | `ru` com `_one/_few/_many/_other`, pt-BR com `_one/_other` | paridade **falha** | paridade passa |
| 5 | `ru` sem `_many` (fora da allowlist) | ninguém percebe | teste RF5(b) **falha** |
| 6 | pt-BR com `_few` (forma inválida em português) | ninguém percebe | teste RF5(a) **falha** |
| 6b | pt-BR sem `_many` (declarado no CLDR, só p/ compactos) | — | teste RF5 **passa** (não é exigido) |
| 6c | pt-BR **com** `_zero` (`item_zero: "Nenhum caso"`) | funciona em runtime | teste RF5(a) **passa** — `_zero` é override válido (D8) |
| 6d | `ro` sem `_few` | ninguém percebe | RF5(b) **falha** — exige varredura até 200 |
| 11 | `t('x', { count: '2' })` — count como string | devolve a **chave crua** (`"x"`) | fora do escopo do teste; documentado em `I18N_IDIOMAS.md` §3.1 |
| 7 | Chave-base existe em pt-BR e falta em `en` | paridade falha | continua falhando |
| 8 | Chave órfã (existe em `en`, não em pt-BR) | export a omite; import a apaga | paridade **falha** (erro explícito) |
| 9 | Linha removida do CSV | chave apagada em todos | mantido (é a forma de apagar) |
| 10 | Célula `ru` vazia em runtime | renderiza `""` | fallback pt-BR |

---

## 6. Critérios de aceite

- [x] Traduzir editando `src/locales/ru/*.json` direto **sobrevive** a um ciclo
      `i18n:export` → `i18n:import` (cenário 2 da tabela). *Entregue pela SPEC-009.*
- [x] `ru` pode ter `_few`/`_many` sem quebrar `parity.test.ts`. *Paridade por chave-base.*
- [x] Nenhuma chave nova vazia aparece em `pt-BR`/`en`/`es` após um roundtrip.
      *Entregue pela SPEC-009 (RF6: célula vazia = "não mexi").*
- [x] `npm test` verde (127 + 11 skipped); `npx tsc -b --noEmit` limpo; `npm run lint` limpo.
- [x] `python -m pytest -q` verde (nada de backend muda, mas é gate do repo).
- [x] Diff de `i18n-review.csv` entre duas execuções seguidas de `i18n:export`
      é **vazio**. *Entregue pela SPEC-009 (verificado com `cmp`).*
- [x] A allowlist do RF5 contém `ru` e um comentário apontando esta spec.
      *`PLURALS_ALLOWLIST` em `parity.test.ts`, com um teste que a fixa em `['ru']`.*
- [x] Um `_zero` adicionado em `pt-BR` **não** quebra o teste RF5(a) (caso 6c / D8).
      *Mais um teste de runtime confirmando que `item_zero` vence para `count: 0` em pt-BR.*
- [x] A varredura do RF5(b) vai até **200** (caso 6d) — com a ressalva medida no topo.

---

## 7. Arquivos afetados (estimativa)

| Arquivo | Mudança |
|---|---|
| ~~`scripts/i18nCsv.mjs`~~ | RF1/RF2/RF3 — **absorvidos pela SPEC-009** (casos 1, 2, 3 e 9 da tabela §5) |
| `frontend/anamnes-ia/src/core/i18n/plurals.ts` | **novo** — `baseKey`/`baseKeys`, `reachableCategories`, `allowedSuffixes`, `requiredSuffixes`, `validatePlurals` |
| `frontend/anamnes-ia/src/core/i18n/plurals.test.ts` | **novo** — RF5(a)(b)(c), D7 (guard de ICU), D8 (`_zero` em runtime) |
| `frontend/anamnes-ia/src/core/i18n/parity.test.ts` | comparação por chave-base (RF4, casos 4/7/8) + teste de formas plurais com allowlist (RF5) |
| `frontend/anamnes-ia/src/core/i18n/config.test.ts` | **novo** — RF6 (caso 10) |
| `frontend/anamnes-ia/src/core/i18n/index.ts` | `returnEmptyString: false` (RF6) |
| `frontend/anamnes-ia/i18n-review.csv` | regenerado (git-ignored) |
| `docs/I18N.md` | remover o aviso 🚧 de plurais; apontar para esta spec |
| `README.md` | atualizar a seção *Plurais* após a correção |

Estimativa: ~60 linhas de produção + ~80 de teste.

---

## 8. Casos de borda / decisões

- **D1 — Vazio significa ausente (RF3).** Perde-se a distinção entre "sem
  tradução" e "traduzido como string vazia". String vazia intencional não é caso
  de uso real em UI; e com `returnEmptyString: false` (RF6) ela seria inútil.
- **D2 — pt-BR continua sendo a fonte de verdade dos *tipos*.** `i18next.d.ts`
  segue derivando de pt-BR. Chave que só existe em `ru` não é tipada — aceitável,
  porque sufixo de plural nunca é escrito à mão no código (o i18next resolve a
  partir da chave-base + `count`).
- **D3 — Chave órfã vira erro (caso 8).** Hoje o export a omite e o import a
  apaga, silenciosamente. Com a união (RF1) ela passa a aparecer, e a paridade
  (RF4) a denuncia. Pode acusar órfãs pré-existentes na primeira execução — é o
  efeito desejado; corrigir caso a caso.
- **D4 — Allowlist em vez de teste desligado (RF5).** Um `skip` some do radar;
  uma allowlist nomeando `ru` é dívida visível e falha assim que alguém adiciona
  um idioma sem traduzir.
- **D5 — Idiomas com mais formas.** A regra do RF5 é derivada de
  `Intl.PluralRules` em tempo de execução, então polonês (`few/many/one/other`)
  e árabe (`zero/one/two/few/many/other`) já funcionam sem código novo.
- **D7 — `Intl.PluralRules` depende do ICU do runtime.** Node com ICU reduzido
  (`small-icu`) degrada as categorias de idiomas não-inglês e tornaria o RF5 um
  falso negativo. O teste deve **falhar explicitamente** se
  `new Intl.PluralRules('ru').resolvedOptions().pluralCategories` não trouxer
  `few` — melhor quebrar do que aprovar por engano. (Verificado: o Node em uso
  neste repo tem ICU completo.)
- **D8 — `_zero` é sempre válido (corrige o RF5(a)).** Verificado no `i18next@26.3.6`:
  um `item_zero` em **pt-BR** — idioma que não tem categoria `zero` no CLDR — vence
  para `count === 0` e renderiza normalmente. O i18next trata `_zero` como override
  explícito de zero, fora do CLDR. Como isso é um recurso de UX legítimo ("Nenhum caso
  pendente" em vez de "0 casos pendentes"), a regra (a) **não pode** reprová-lo:
  ela valida apenas `{_one,_two,_few,_many,_other}`. Sem este ajuste, o teste proibiria
  uma prática correta.
- **D9 — Fracionários ficam fora da exigência, por ora (RF5(c)).** Em `cs`, `sk` e `lt`,
  `many` **não** é alcançável por inteiro nenhum — só por decimais (`2,5 dny`). A regra
  (b) portanto não o exigiria, e a UI cairia no fallback ao exibir qualquer decimal.
  Decisão: não exigir agora (nenhum dos 4 idiomas atuais é afetado, e a UI conta itens
  inteiros), mas registrar como pré-condição de entrada desses idiomas. A regra (c)
  nasce desligada, com o comentário apontando para `docs/I18N_IDIOMAS.md` §2.3.
- **D6 — Ordem das colunas do CSV** segue `LANGS`. Ao adicionar idioma, a coluna
  nova entra no fim; planilhas antigas continuam parseáveis pelas colunas
  anteriores (o import lê por índice).

---

## 9. Follow-ups (fora do escopo)

> Status em 2026-07-30: **todos fechados, exceto o TMS** (item 5, que é decisão
> de ferramenta externa, não código). Os itens 1–3 já haviam sido resolvidos pela
> própria SPEC-009 — esta lista os registrava como pendentes por engano.

1. ~~**Validar interpolações no import**~~ ✅ — feito na SPEC-009 (`validateImport`
   compara os tokens `{{var}}`/`<1>` da referência com os da tradução e aborta).
2. ~~**BOM no CSV**~~ ✅ — feito na SPEC-009: o export grava UTF-8 com BOM e CRLF.
3. ~~**Validar o header no import**~~ ✅ — feito na SPEC-009 (`headerErrors`);
   coluna desconhecida é erro, não é mais ignorada em silêncio.
4. ~~**Higiene de chaves órfãs**~~ ✅ (2026-07-30) — `scripts/i18nUsage.mjs`
   indexa os usos de `t(...)`/`<Trans>`/props `*Key` e cruza com os dicionários.
   `npm run i18n:keys` reporta órfãs e faltantes; `usage.test.ts` trava as duas
   em zero. A varredura encontrou 8 chaves mortas (removidas) e um bug real: o
   seletor de idioma repetia os nomes em vez de ler `common.language_names.*`.
   Chave montada dinamicamente que o scanner não enxergue entra em
   `USAGE_ALLOWLIST`, com justificativa.
5. **TMS** — SPEC-007 §9.2, quando houver tradutores externos em paralelo.
   **Único item ainda aberto.**
6. ~~**`normalizeLocale` por subtag (BCP 47 / RFC 4647)**~~ ✅ (2026-07-30) —
   `resolveLocale.ts` decompõe a tag (subtag primária + script, `_` do POSIX
   aceito) e normaliza códigos legados (`iw`→`he`, `in`→`id`, `ji`→`yi`,
   `mo`→`ro`) antes de comparar. Corrigiu casos em que o `startsWith` casava
   idioma alheio: `rue` (russino) virava `ru`, `enm` virava `en`. Script
   desempata quando um idioma suportado tiver variante (`zh-Hans`).
7. ~~**RTL via `Intl.Locale(lang).textInfo.direction`**~~ ✅ (2026-07-30) —
   `dirFor(lang)` em `resolveLocale.ts`, aplicado como `<html dir>` pelo
   `ThemeProvider` junto com o `lang`. Lista hardcoded sobra só como fallback
   para engines sem `textInfo` (Chrome < 99, Safari < 17).
