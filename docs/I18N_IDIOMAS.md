# Guia de referência — adicionar qualquer idioma (plurais, i18next, gotchas)

> Objetivo: que adicionar um 5º, 6º… idioma seja mecânico, sem redescobrir regra de
> plural nem armadilha de runtime. Complementa `docs/I18N.md` (plano/decisões) e
> `docs/specs/SPEC-008-i18n-plurais-e-ferramental-csv.md` (correção do ferramental).
>
> **Tudo abaixo foi verificado neste repo** (Node v24.16.0 com ICU completo,
> `i18next@26.3.6`, `react-i18next@17.0.11`), não copiado de blog. Os comportamentos
> da §3 são saídas reais de execução.

---

## 1. Como o i18next escolhe a forma plural

Formato **JSON v4** (padrão desde i18next 21; o escape `compatibilityJSON` para v3
foi **removido na v24** — não existe volta para `_plural`/`_0`/`_1`).

A resolução é: `t("case", { count: n })` → `Intl.PluralRules(lng).select(n)` → sufixo
→ chave `case_<sufixo>`. Os sufixos possíveis são as 6 categorias CLDR:
`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`.

Consequências diretas:

- A variável **tem que se chamar `count`** e **tem que ser número**. String, `undefined`
  ou ausência não caem na chave-base — devolvem a chave crua (§3.1).
- Quem manda é o **runtime**, não o dicionário. Se a categoria escolhida não existir no
  JSON daquele idioma, o i18next vai para o `fallbackLng` — em silêncio (§3.2).
- Sem `Intl.PluralRules` (React Native/Hermes sem polyfill), desde a v24 **só** `_one`/
  `_other` resolvem. Irrelevante para nós (web), mas fatal se um dia houver app nativo.

---

## 2. Matriz de plurais por idioma

Gerada com `Intl.PluralRules` do Node do repo (script no fim da seção). Leia assim:

- **CLDR** — o conjunto que o idioma declara (`resolvedOptions().pluralCategories`).
- **Inteiros 0–200** — as formas que a UI realmente alcança contando coisas.
- **Fracionários** — as formas que só aparecem com decimais (`1,5 h`, médias, notas).
- **Ordinal** — conjunto separado, usado só com `{ ordinal: true }` (§4.3).

> ⚠️ **CLDR ≠ o que a UI precisa.** `pt-BR`, `es`, `fr`, `it` e `ca` declaram `many` no
> CLDR: é a forma de números compactos ("1 milhão"), que nossa UI não usa. Exigir o
> conjunto CLDR completo reprova esses idiomas por motivo errado — é exatamente o
> raciocínio do RF5 da SPEC-008, e a tabela abaixo é a evidência.

### 2.1 Uma forma — só `_other`

`ja` · `zh` · `ko` · `vi` · `th` · `id` · `ms` · `km` · `lo` · `my`

Não distinguem singular/plural gramaticalmente. **1 chave por termo.** Cuidado: o
tradutor tende a querer "1 caso / 2 casos" — não existe, e forçar isso quebra a língua.

### 2.2 Duas formas — `_one` / `_other` (o caso comum)

`en` · `de` · `es` · `pt-BR` · `fr` · `it` · `nl` · `sv` · `da` · `no` · `fi` · `tr` ·
`el` · `bg` · `hu` · `et` · `ca` · `gl` · `eu` · `af` · `sw` · `hi` · `bn` · `ur` ·
`ta` · `te` · `ml` · `kn` · `mr` · `gu` · `pa` · `ne` · `si` · `ka` · `hy` · `az` ·
`kk` · `uz` · `sq` · `mk` · `is` · `fo` · `fa` · `tl` · `am`

Nem todos se comportam igual com decimais: em `fr`, `hi`, `fa`, `da`, `is`, `mk`, `am`,
`kn`, `gu`, `hy` o **`1,5` cai em `_one`**, enquanto em `en`/`de`/`es` cai em `_other`.
Só importa se você exibe decimais.

### 2.3 Três formas

| Idiomas | Inteiros 0–200 | Observação |
|---|---|---|
| `ro` | `one`, `few`, `other` | `few` = 0 e 2–19 (e restos 1–19 acima de 100) |
| `sr`, `hr`, `bs` | `one`, `few`, `other` | eslavo do sul; `few` = terminados em 2–4 |
| `he` | `one`, `two`, `other` | tem **dual** — `_two` é obrigatório |
| `lv` | `zero`, `one`, `other` | `zero` **alcançável por inteiros** (0, 10–20, 30…) |
| `cs`, `sk`, `lt` | `one`, `few`, `other` | 👉 `many` existe mas **só em fracionários** |

> 🪤 **`cs`/`sk`/`lt` são a pegadinha da tabela.** `many` nunca aparece contando itens
> inteiros, mas aparece em `2,5 dny`. Se a UI exibir qualquer decimal nesses idiomas,
> `_many` é obrigatório — e um teste que só varre inteiros **não** vai acusar a falta.

### 2.4 Quatro formas

| Idiomas | Inteiros 0–200 | Fracionários |
|---|---|---|
| `ru`, `pl`, `uk` | `one`, `few`, `many` | `other` |
| `sl` | `one`, `two`, `few`, `other` | `few` |

> Em `ru`/`pl`/`uk`, **`other` nunca ocorre com inteiro** — só em `1,5`. É por isso que
> a SPEC-008 exige `other` à parte, como rede de segurança, em vez de derivá-lo da
> varredura de inteiros. `ru`: `_one` = termina em 1 exceto 11 · `_few` = 2–4 exceto
> 12–14 · `_many` = 0, 5–20 e o resto.

### 2.5 Cinco e seis formas

| Idiomas | Formas |
|---|---|
| `ga`, `mt` | `one`, `two`, `few`, `many`, `other` |
| `ar`, `cy` | **as seis**: `zero`, `one`, `two`, `few`, `many`, `other` |

Em `ar` e `cy` todas as seis são alcançáveis por inteiros. `ar` traz ainda RTL (§5).

### 2.6 Regenerar a matriz

```bash
cd frontend/anamnes-ia && node -e "
const l='ru'; const r=new Intl.PluralRules(l);
const int=new Set(); for(let n=0;n<=200;n++) int.add(r.select(n));
const frac=new Set([0.5,1.5,2.5,1.1,3.7,10.5].map(n=>r.select(n)));
console.log(l, {cldr:r.resolvedOptions().pluralCategories, int:[...int], frac:[...frac],
  ordinal:new Intl.PluralRules(l,{type:'ordinal'}).resolvedOptions().pluralCategories});"
```

⚠️ Depende do **ICU do runtime**. Node `small-icu` degrada tudo que não é inglês e
transformaria qualquer teste derivado disso em falso negativo — daí a D7 da SPEC-008
(o teste deve quebrar explicitamente se `Intl.PluralRules('ru')` não trouxer `few`).

---

## 3. Comportamentos verificados (as armadilhas)

Saídas reais de `i18next@26.3.6`. São os casos que valem virar teste.

### 3.1 `count` inválido devolve a chave crua

Dicionário `pt-BR` com `a_one`/`a_other`:

| Chamada | Resultado |
|---|---|
| `t('a', { count: 2 })` | `"2 casos"` |
| `t('a', { count: '2' })` | **`"a"`** ← string não resolve |
| `t('a', { count: undefined })` | **`"a"`** |
| `t('a')` (sem count) | **`"a"`** — não há fallback para a chave-base |
| `t('a', { count: NaN })` | `"NaN casos"` |

`count` vindo de `input.value`, de query param ou de JSON de API é string. Sempre
`Number(...)` antes. `NaN` é pior que a chave crua: parece funcionar.

### 3.2 Forma faltando → fallback silencioso para pt-BR

`ru` com apenas `_one`/`_other`, `fallbackLng: 'pt-BR'`:

```
n=1  → "1 случай"     ✅ (_one existe)
n=2  → "2 casos"      ❌ português no meio da UI russa
n=5  → "5 casos"      ❌
n=21 → "21 случай"    ✅
```

Nenhum erro, nenhum warning. É o cenário exato do `ru` hoje no repo — e a razão de a
SPEC-008 existir. Com `debug: true` o i18next loga a chave tentada; vale ligar em dev.

### 3.3 `_zero` funciona em **qualquer** idioma

```js
// pt-BR, que NÃO tem categoria "zero" no CLDR
{ item_zero: 'nenhum item', item_one: '{{count}} item', item_other: '{{count}} itens' }
t('item', {count: 0}) // → "nenhum item"   ← o _zero vence
```

O i18next trata `_zero` como **override explícito para `count === 0`**, independente do
CLDR. Isso é ótimo para UX ("Nenhum caso pendente" em vez de "0 casos pendentes")…

> 🚨 **…e invalida o RF5(a) da SPEC-008 como está escrito.** A regra "todo sufixo
> presente deve pertencer a `pluralCategories`" **reprovaria um `_zero` legítimo em
> pt-BR/en/es**. Correção necessária: `_zero` é sempre válido; a regra (a) deve rodar
> sobre `{_one,_two,_few,_many,_other}` apenas. Ver §8.

### 3.4 Chave sem plural + `count` funciona

`t('d', { count: 3 })` com `d: 'sem plural nenhum'` → `"sem plural nenhum"`. Ou seja,
passar `count` só para interpolar (`{{count}}` sem variação de forma) é seguro.

### 3.5 Célula vazia some da tela

Default do i18next é `returnEmptyString: true` → tradução vazia renderiza `""`, sem
sinal. RF6 da SPEC-008 (`returnEmptyString: false`) continua correto e vale para
qualquer idioma novo.

---

## 4. Além do plural — o que mais varia por idioma

### 4.1 Nunca concatenar, sempre interpolar
Ordem de palavras muda. `"Você tem " + n + " casos"` é irrecuperável em japonês ou
alemão. Sempre `t("key", { count, nome })`. Para texto com marcação no meio, `<Trans>`
com placeholders indexados (`<1>`), nunca split de string.

### 4.2 Datas, números e moeda
Sempre `Intl.DateTimeFormat` / `Intl.NumberFormat` com o **locale ativo do i18next**
(`i18n.language`), nunca `toLocaleDateString("pt-BR")`. Desde i18next 21.3 dá para
formatar dentro da própria string: `{{data, datetime}}`, `{{n, number}}` — e na **v26 o
`interpolation.format` legado foi removido**, o Formatter embutido é sempre usado.

### 4.3 Ordinais são um conjunto à parte
`t("pos", { count: 3, ordinal: true })` → sufixo `_ordinal_<cat>`, com categorias de
`Intl.PluralRules(lng, {type:'ordinal'})`, **que não são as cardinais**:

| Idioma | Cardinal | Ordinal |
|---|---|---|
| `en` | one, other | **one, two, few, other** (1st/2nd/3rd/4th) |
| `pt-BR`, `es`, `ru`, `pl` | … | **other** (uma só) |
| `cy` | 6 formas | 6 formas |

Hoje não usamos ordinais. Se usar, é um eixo de chaves novo — não reaproveita as cardinais.

### 4.4 Context vs. plural
`_male`/`_female` (sufixo de context) e plural **combinam**: `key_male_one`. Gênero
gramatical do objeto contado é motivo legítimo de context em idiomas flexionados.

### 4.5 Expansão de texto
Alemão e russo estouram ~30% sobre o pt-BR; inglês encolhe; CJK encolhe muito. Layout
com largura fixa quebra. `ru` já é bom estressador — se cabe em russo, cabe em quase tudo.

### 4.6 RTL (`ar`, `he`, `fa`, `ur`)
Fora do escopo de plural, mas é o que torna esses idiomas caros: `dir="rtl"` no `<html>`,
lógica de espelhamento (`margin-inline-start` em vez de `margin-left`), ícones
direcionais. Adicionar `ar` **não** é o mesmo trabalho que adicionar `pl`.

---

## 5. Padrões: BCP 47, ISO e CLDR

Plural é só uma das regras. A identidade do idioma tem norma própria, e é onde
nascem bugs que não aparecem em teste com `en`/`pt-BR`.

### 5.1 A pilha de normas

| Norma | O que define | Onde aparece aqui |
|---|---|---|
| **BCP 47** (RFC 5646+4647) | O formato da *tag* completa | `SUPPORTED_LANGS`, `<html lang>`, `Accept-Language`, todo `Intl.*` |
| **ISO 639-1/-2/-3** | Código do idioma (`pt`, `ru`, `arb`) | subtag primária |
| **ISO 15924** | Sistema de escrita (`Latn`, `Cyrl`, `Hans`) | `zh-Hans`, `sr-Latn`, `uz-Latn` |
| **ISO 3166-1 alpha-2** | País/região (`BR`, `PT`, `RU`) | `pt-BR` vs `pt-PT` |
| **UN M.49** | Região supranacional numérica | `es-419` (espanhol da América Latina) |
| **ISO 8601** | Data/hora de máquina | tudo que trafega em API/banco |
| **ISO 4217** | Moeda (`BRL`, `USD`) | `Intl.NumberFormat(..., {currency})` |
| **CLDR** (UTS #35) | Os *dados* — plurais, formatos, nomes, direção | via `Intl.*` do runtime |

Estrutura da tag: `idioma[-Script][-REGIÃO][-variante]`, nessa ordem, com a convenção
de caixa `pt-Latn-BR` (idioma minúsculo, Script capitalizado, REGIÃO maiúscula). A caixa
não é semântica, mas seguir evita comparação de string quebrada. O registro autoritativo
é o **IANA Language Subtag Registry** — não é preciso consultar as ISOs separadamente.

**Regras práticas:**
- **Não invente região sem necessidade.** Use `en`, não `en-US`, salvo se o conteúdo for
  realmente regional. Nosso `pt-BR` é justificado (pt-PT diverge em vocabulário).
- **`zh` se distingue por script, não por país**: `zh-Hans` / `zh-Hant`. `zh-CN` é
  legado. Idem `sr-Cyrl`/`sr-Latn`, `uz-Latn`/`uz-Cyrl`.
- **`es-419`** cobre a América Latina inteira — melhor que escolher `es-MX` como proxy.

### 5.2 Canonicalização e códigos legados (gotcha verificado)

```js
Intl.getCanonicalLocales(['PT-br','ZH-hans-cn','iw','in'])
// → ['pt-BR', 'zh-Hans-CN', 'he', 'id']
```

`iw`→`he` (hebraico), `in`→`id` (indonésio), `ji`→`yi` (iídiche): códigos ISO 639
**obsoletos** que sistemas antigos ainda emitem. Um `Accept-Language: iw` nunca casaria
com um dicionário registrado como `he`. Canonicalize a entrada antes de comparar.

### 5.3 O matching correto (RFC 4647 *lookup*)

O algoritmo padrão trunca a tag da direita para a esquerda até achar:

```
zh-Hant-CN-x-priv → zh-Hant-CN → zh-Hant → zh
```

> 🪤 **Nosso `normalizeLocale` (`resolveLocale.ts:18`) usa `startsWith` sobre a string
> bruta**, não truncamento por subtag. Funciona para os 4 idiomas atuais, mas é frágil
> por construção: é prefixo de *caracteres*, então um código ISO 639-3 de três letras
> iniciado por `en`/`es`/`pt` casaria por engano, e `iw` (§5.2) não casa com nada.
> O robusto é comparar a **subtag primária** (`tag.split('-')[0]` após canonicalizar) e
> só então considerar script/região. Vale trocar quando entrar um idioma com script
> variante — hoje não é urgente, mas está registrado.

### 5.4 Likely subtags (CLDR): deduzir o que faltou

```js
new Intl.Locale('zh').maximize().toString()  // → 'zh-Hans-CN'
new Intl.Locale('sr').maximize().toString()  // → 'sr-Cyrl-RS'
new Intl.Locale('uz').maximize().toString()  // → 'uz-Latn-UZ'
```

É a tabela do CLDR que preenche script/região ausentes. Serve para decidir qual variante
de escrita servir quando o usuário mandou só `sr`. ⚠️ Esses dados **mudam entre versões
do CLDR** — não persista o resultado maximizado no banco; persista o que o usuário
escolheu (`ru`), e maximize só em runtime.

### 5.5 O que o CLDR dá de graça via `Intl` (não hardcodar)

Verificado neste runtime:

| Precisa de | API | Exemplo real |
|---|---|---|
| Direção do texto (RTL) | `new Intl.Locale('ar').textInfo.direction` | `'rtl'` |
| Nome do idioma / endônimo | `Intl.DisplayNames` | `of('ru')` → `russo` (em pt-BR) / `русский` (em ru) |
| "3 dias atrás" | `Intl.RelativeTimeFormat` | ru → `3 дня назад` (já com o plural certo) |
| "A, B e C" | `Intl.ListFormat` | ru → `A, B и C` |
| Data/número/moeda | `Intl.DateTimeFormat` / `NumberFormat` | — |

> 🎯 **`textInfo.direction` elimina a lista hardcoded de idiomas RTL** do §4.6 — é o CLDR
> respondendo, e cobre `ar`/`he`/`fa`/`ur`/`ckb` sem manutenção.
>
> ⚠️ `DisplayNames` devolve o endônimo em **caixa baixa** onde a língua assim exige
> (`русский`). Nosso `common.language_names` grava `Русский` capitalizado para o seletor.
> Mantenha o dicionário como fonte da UI — o `DisplayNames` serve de conferência, não de
> substituto, justamente por causa da capitalização.

### 5.6 ISO 8601 e ISO 4217

- **Persistência e API sempre em ISO 8601 UTC** (`2026-07-29T14:30:00Z`); a conversão
  para o locale acontece **só na renderização**, via `Intl`. Nunca trafegue data já
  formatada — `29/07/2026` é ambíguo com `07/29/2026`.
- **Moeda**: o código ISO 4217 (`BRL`) é dado do negócio, não do idioma. Um usuário em
  `en` continua pagando em `BRL`; o que muda é a *formatação* (`R$ 10,00` → `R$10.00`).
  Nunca derive moeda do idioma.

---

## 6. Checklist — adicionar um idioma novo

Ordem importa; os passos 1–4 são o invariante das 4 listas de `docs/I18N.md` §2c.

1. `src/core/i18n/resolveLocale.ts` → `SUPPORTED_LANGS` + regra de prefixo em `normalizeLocale`
2. `scripts/i18nCsv.mjs` → `LANGS` (o import lê a coluna pelo **nome** no header, então a
   posição não importa; idioma fora de `LANGS` é rejeitado como header desconhecido)
3. `backend/app/i18n.py` → `SUPPORTED_LANGUAGES`
4. **Migration da constraint `users_language_check`** no banco
   ⚠️ Esquecer esta é a falha mais traiçoeira: a UI troca de idioma (localStorage), mas
   `PUT /profile/me` falha e a escolha reverte no F5.
5. `src/locales/<lang>/` — criar a pasta (o import **não** cria) + os JSONs de namespace
6. `src/core/i18n/index.ts` → imports + `resources`
7. `Settings.tsx` → item do seletor; `common.language_names` → **endônimo real**
   (`Русский`, `العربية`) — nome de idioma nunca é `TODO:` nem traduzido
8. `parity.test.ts` / `csv.test.ts` → mapas de idioma (a paridade compara **chaves-base**,
   então o idioma pode ter mais formas plurais que o pt-BR — SPEC-008 RF4)
9. **Consultar §2 aqui** e gerar as chaves plurais que o idioma exige — não copiar o
   par `_one`/`_other` do pt-BR
10. Se RTL (§4.6): tratar `dir` antes de anunciar suporte
11. Enquanto os dicionários estiverem em `TODO:`, entrar na **allowlist** do teste de
    plurais (RF5/D4 da SPEC-008) — dívida visível, não `skip`

---

## 7. Fontes

- [Plurals — i18next](https://www.i18next.com/translation-function/plurals)
- [JSON Format v4 — i18next](https://www.i18next.com/misc/json-format)
- [Formatting (Intl) — i18next](https://www.i18next.com/translation-function/formatting)
- [Namespaces — i18next](https://www.i18next.com/principles/namespaces)
- [Unicode CLDR — Plural Rules](https://cldr.unicode.org/index/cldr-spec/plural-rules)
- [Language Plural Rules (chart) — Unicode](https://www.unicode.org/cldr/cldr-aux/charts/34/supplemental/language_plural_rules.html)
- [i18n Pluralization: CLDR, i18next & ICU (2026) — locize](https://www.locize.com/blog/i18n-pluralization)
- [Guide to i18n key naming — locize](https://www.locize.com/blog/guide-to-i18n-key-naming)
- [RFC 4647 — Matching of Language Tags](https://www.rfc-editor.org/rfc/rfc4647.html) · [BCP 47 (índice)](https://www.rfc-editor.org/info/bcp47/)
- [UTS #35 — Unicode Locale Data Markup Language (likely subtags)](https://unicode.org/reports/tr35/#likely-subtag)
- [Choosing a language tag — W3C i18n](https://www.w3.org/International/questions/qa-choosing-language-tags)
- [BCP 47 language tag — MDN](https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag)

---

## 8. Impacto na SPEC-008 (incorporado na spec em 2026-07-29)

Três achados desta pesquisa afetaram a spec e **já foram incorporados** nela
(RF5 reescrito, D8/D9 novos, casos 6c/6d/11 na tabela):

1. **`_zero` invalida o RF5(a)** (§3.3). A regra "sufixo ∈ `pluralCategories`" reprova um
   `_zero` legítimo em pt-BR/en/es. Corrigir para: `_zero` sempre permitido; a validação
   de sufixo inválido roda sobre as outras cinco categorias.
2. **`cs`/`sk`/`lt` furam o RF5(b)** (§2.3). `many` só é alcançável por fracionários, então
   a varredura de inteiros 0–100 não o exigiria — e a UI quebraria ao exibir decimais.
   Ou documentar como limitação conhecida, ou incluir uma sonda de fracionários.
3. **RF5(b) varre 0–100; `ro` precisa de mais** — `few` em romeno depende de restos acima
   de 100 (101–119). 0–100 cobre por sorte (0 e 2–19), mas a margem é fina: elevar a
   varredura para **0–200** custa nada e fecha a lacuna.
   ✅ Incorporado (`reachableCategories(lang, { max: 200 })`), **com uma medição a registrar**:
   nos 10 idiomas avaliados em 2026-07-30 (incluindo `ro`, `pl`, `cs`, `sk`, `lt`, `ar`),
   0–100 e 0–200 devolvem conjuntos **idênticos**. A margem é seguro contra idioma futuro,
   não correção de lacuna atual — nenhum teste consegue distinguir as duas faixas hoje.

Os três foram incorporados à SPEC-008 (implementada em 2026-07-30, `src/core/i18n/plurals.ts`).
Nenhum deles muda o defeito principal (RF1: export por união de chaves), entregue pela SPEC-009.
