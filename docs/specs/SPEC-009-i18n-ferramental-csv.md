# SPEC-009 — Ferramental de export/import de traduções (CSV por recorte)

- **Origem**: revisão do `scripts/i18nCsv.mjs` em 2026-07-29, ao planejar a tradução do russo
- **Substitui**: RF1, RF2 e RF3 da SPEC-008 (que fica só com plurais/paridade — §10)
- **Fonte**: `docs/I18N.md`, `docs/I18N_IDIOMAS.md`, `docs/specs/SPEC-007-i18n-fase0.md` §9.2
- **Status**: ✅ **implementado** em 2026-07-30 (`scripts/i18nCsv.mjs` + `src/core/i18n/csv.test.ts`, 30 testes)

---

## 1. Contexto / Problema

O ferramental atual (`scripts/i18nCsv.mjs`, SPEC-007 RF16) gera **um CSV com tudo**:
1365 linhas × 6 colunas, 166 KB, dos quais 1328 ainda em `TODO:`. Ao planejar a
tradução real do russo, seis defeitos apareceram — todos **verificados por execução**,
não deduzidos.

### 1.1 Coluna reordenada troca os idiomas, em silêncio
`rowsToDicts` (`:93`) lê as colunas **por índice**, descartando o header (`:88`):

```
CSV:  namespace,key,pt-BR,ru,en,es      ← revisor arrastou "ru" p/ perto da referência
→ en.json recebe o russo, ru.json recebe o inglês
```

Reordenar coluna é o primeiro movimento de quem revisa numa planilha. Nada acusa.

### 1.2 O Excel corrompe o arquivo antes mesmo da revisão
O CSV sai **UTF-8 sem BOM**, com **LF** e separador **vírgula**. No Excel pt-BR/Windows:
o separador de lista é `;` (tudo cai numa coluna só) e a ausência de BOM faz o arquivo
ser lido como cp1252 — acentos e **todo o cirílico** viram lixo ao salvar. Na prática, o
fluxo "revisão por não-dev" não funciona hoje no Windows.

### 1.3 Export só enxerga as chaves do pt-BR
`dictsToRows` (`:80`) itera `Object.keys(flatByLang['pt-BR'])`. Chave que só existe em
outro idioma (`days_few` em `ru`) **não é exportada** e é **apagada** no import seguinte.
Traduzir editando o JSON direto — o caminho natural — perde o trabalho, sem aviso.
(Era o RF1 da SPEC-008; é o defeito de maior impacto.)

### 1.4 Roundtrip destrói tipos não-string
Verificado: `5`→`"5"`, `true`→`"true"`, `null`→`""`, e **`["a","b"]` → `"a,b"`** —
o array vira string e a estrutura é irrecuperável. Hoje os dicionários são 100% string
(verificado nos 40+ arquivos), então é **latente**; uma lista de dicas em `common.tips`
o ativaria.

### 1.5 Import destrutivo e não-atômico
Sobrescreve os JSONs sem dry-run, sem validação e sem transação: CSV truncado no meio
deixa estado misto entre idiomas.

### 1.6 Não dá para recortar o trabalho
Tudo ou nada. Mas o escopo real **difere por idioma**: `admin` e `teacher` não são
prioridade no russo agora, e são no inglês. Hoje o revisor russo recebe as 5328 células
dos 4 idiomas, incluindo as áreas que ninguém pediu.

---

## 2. Objetivo

Um ciclo export→revisão→import **seguro e recortável**: escolher idiomas e áreas por
rodada, sobreviver ao Excel no Windows, e nunca apagar trabalho sem intenção explícita.

## 3. Não-objetivos

- **Traduzir qualquer idioma.** Esta spec entrega ferramenta.
- **Trocar CSV por XLSX ou TMS.** Decidido em 2026-07-29: fica CSV. TMS segue como
  evolução (SPEC-007 §9.2) se um dia houver tradutores externos em paralelo.
- **Regras de plural e paridade** — permanecem na SPEC-008 (§10).
- **Interface web de tradução.**

---

## 4. Requisitos funcionais

### RF1 — Export recortável
```bash
npm run i18n:export -- [--lang ru] [--ns chat,case,student] [--todo] [--out arquivo.csv]
```
- `--lang`: idiomas a **editar** (default: todos de `LANGS`).
- `--ns`: namespaces a incluir (default: todos). Nome inválido → **erro**, com a lista
  dos válidos (`--ns amdin` é erro de digitação, não pedido de conjunto vazio).
- `--todo`: só linhas cujo valor no idioma-alvo esteja ausente ou comece com `TODO:`.
- `--out`: caminho de saída (default `i18n-review.csv`).

Sem flag nenhuma, o comportamento é o de hoje: tudo, em um arquivo.

### RF2 — Coluna de referência explícita
Quando o pt-BR não está em `--lang`, ele entra como **coluna de referência**, com header
`ref:pt-BR`. O import **ignora** toda coluna prefixada por `ref:`. O tradutor vê a origem
sem poder alterá-la por engano.

```
namespace;key;ref:pt-BR;ru
chat;messages.count_one;{{count}} mensagem;{{count}} сообщение
```

### RF3 — O arquivo se auto-descreve
O import deduz idiomas e namespaces **do próprio conteúdo** (header + coluna `namespace`).
Não há metadado de recorte, nem convenção de nome de arquivo: qualquer CSV gerado por
este script é importável, incluindo os de recortes diferentes, em qualquer ordem.

### RF4 — Header lido por nome
O import mapeia coluna→idioma pelo **nome no header**, nunca por posição (corrige §1.1).
- Reordenar colunas é seguro.
- Coluna com header desconhecido → **erro**, listando o que se esperava.
- Coluna faltando (`key`, `namespace`) → erro.

### RF5 — Export pela união das chaves, com ordem determinística
Percorre a **união** das chaves de todos os idiomas do recorte, não só as do pt-BR
(corrige §1.3). Ordem: a do pt-BR; chave inexistente no pt-BR aparece logo após a sua
chave-base (`days_few` depois de `days_one`/`days_other`), agrupando as formas do mesmo
termo. Dois exports seguidos produzem **bytes idênticos**.

### RF6 — Import é merge, não substituição
O CSV **atualiza** as chaves que traz e **não toca** no resto. Consequência direta do
recorte (RF1): um arquivo com `--ns chat` não pode apagar `admin`.
- Célula vazia → chave **não** é criada/alterada naquele idioma (não vira `""`).
- Remover chave exige `--allow-delete` **e** a linha presente no CSV com a marca
  `<DELETE>` na célula. Linha ausente nunca apaga nada.

> Muda a semântica de hoje (CSV = verdade absoluta). É a troca que torna o recorte
> possível, e elimina a armadilha do "CSV velho apaga trabalho novo".

### RF7 — Dry-run e relatório
`--dry-run` imprime o efeito sem gravar; o import normal imprime o mesmo resumo:
```
i18n:import --lang ru --dry-run
  ~ 1328 atualizadas   + 64 novas   = 4 inalteradas   - 0 removidas
  ! 2 erros de interpolação → aborta
```

### RF8 — Validações que abortam o import
Nenhuma escrita acontece se qualquer uma falhar (validar tudo primeiro — RF9):
1. Header desconhecido ou coluna obrigatória ausente (RF4).
2. **Interpolação perdida**: a tradução precisa conter os mesmos `{{var}}` e as mesmas
   tags `<n>` do pt-BR. É o erro que só aparece em produção, em runtime.
3. **Valor não-string** no dicionário de origem durante o export (§1.4) — aborta com o
   caminho da chave, em vez de achatar silenciosamente.
4. Namespace inexistente.

### RF9 — Escrita atômica
Valida tudo → serializa tudo em memória → grava em temporário → `rename`. Falha no meio
não deixa idiomas em estados diferentes (corrige §1.5).

### RF10 — Sobreviver ao Excel no Windows
- **BOM UTF-8** no início do arquivo.
- **CRLF** como terminador (RFC 4180).
- Separador **`;`** por padrão, com `--sep ,` para quem preferir. O import **detecta** o
  separador pelo header, aceitando ambos.
- **Anti-fórmula**: célula iniciada por `=`, `+`, `@` ou tab é prefixada com apóstrofo no
  export; o import remove o prefixo. A simetria é garantida por teste de roundtrip.

---

## 5. Formato do CSV

```
namespace ; key ; [ref:<lang>] ; <lang1> [; <lang2> …]
```

| Coluna | Papel |
|---|---|
| `namespace` | arquivo de origem (`chat` → `chat.json`) |
| `key` | chave achatada (`messages.count_one`) |
| `ref:<lang>` | somente leitura, ignorada no import (RF2) |
| `<lang>` | editável; vazio = sem alteração (RF6) |

---

## 6. Tabela de comportamento (vira teste)

| # | Situação | Hoje | Esperado |
|---|---|---|---|
| 1 | `ru` tem `days_few`, pt-BR não | export **omite** a linha | linha exportada (RF5) |
| 2 | Roundtrip com `days_few` só em `ru` | chave **apagada** | preservada |
| 3 | Célula vazia no import | grava `""` | chave intocada (RF6) |
| 4 | Colunas reordenadas no CSV | **idiomas trocados** | import correto (RF4) |
| 5 | Coluna `ref:pt-BR` editada pelo revisor | — | ignorada (RF2) |
| 6 | `--ns chat` importado | apagaria `admin` | `admin` intocado (RF6) |
| 7 | Linha ausente do CSV | chave apagada | preservada (RF6) |
| 8 | Célula `<DELETE>` sem `--allow-delete` | — | erro, nada gravado |
| 9 | Tradução perde `{{count}}` | passa; quebra em runtime | **aborta** (RF8.2) |
| 10 | Dicionário com array | vira `"a,b"` | **aborta** no export (RF8.3) |
| 11 | Dois exports seguidos | — | bytes idênticos (RF5) |
| 12 | Arquivo salvo pelo Excel pt-BR | acentos/cirílico corrompidos | roundtrip limpo (RF10) |
| 13 | CSV com `,` quando default é `;` | — | detectado pelo header (RF10) |
| 14 | Texto iniciado por `=` | Excel avalia como fórmula | escapado e restaurado (RF10) |
| 15 | `--ns amdin` (typo) | — | erro com a lista de namespaces válidos |
| 16 | Erro de validação na linha 900 | metade dos JSONs já gravada | nada gravado (RF9) |

---

## 7. Critérios de aceite

- [x] `i18n:export --lang ru --ns chat,case --todo` gera só as pendências dessas áreas.
      *Verificado: 142 linhas, header `namespace;key;ref:pt-BR;ru`.*
- [x] Um CSV recortado importado **não** altera nenhum namespace fora do recorte.
      *Verificado: import de um CSV de `chat` tocou 1 arquivo (`ru/chat.json`).*
- [x] Editar `src/locales/ru/*.json` à mão sobrevive a um ciclo export→import.
      *Verificado: export completo → `--dry-run` = 5328 inalteradas, 0 atualizadas.*
- [x] Reordenar as colunas no Excel e salvar não corrompe idioma nenhum.
      *Verificado com CSV `namespace;key;ru;ref:pt-BR` (ordem trocada + `ref:` editada).*
- [x] Abrir/salvar no Excel pt-BR preserva acentos e cirílico.
      *Export com BOM+CRLF+`;`; roundtrip de `Клинические данные` sem perda.*
- [x] Dois `i18n:export` seguidos produzem arquivos byte a byte idênticos.
      *Verificado com `cmp`.*
- [x] `npm test` verde (65 testes); `npx tsc -b --noEmit` limpo; `npm run lint` limpo.

---

## 8. Arquivos afetados (estimativa)

| Arquivo | Mudança |
|---|---|
| `frontend/anamnes-ia/scripts/i18nCsv.mjs` | parsing de flags, união de chaves, header por nome, merge, validações, escrita atômica, BOM/CRLF/`;` |
| `frontend/anamnes-ia/src/core/i18n/csv.test.ts` | os 16 casos da §6 |
| `frontend/anamnes-ia/package.json` | scripts aceitando `--` |
| `docs/I18N.md` · `README.md` · `CLAUDE.md` | documentar o novo fluxo |

Estimativa: ~250 linhas de produção (hoje são 147) + ~200 de teste.

---

## 9. Decisões

- **D1 — CSV, não XLSX nem TMS** (2026-07-29). CSV mantém o diff textual e zero
  dependência; os problemas de Excel são de *geração* (BOM/CRLF/separador), não do
  formato. XLSX resolveria por construção, mas troca diff textual por binário.
- **D2 — Um arquivo por rodada, com recorte manual** (2026-07-29). Não fatiar
  automaticamente por namespace: quem decide o recorte é quem organiza a revisão, e o
  escopo difere por idioma (`admin`/`teacher` interessam ao `en`, não ao `ru` agora).
- **D3 — Merge é consequência do recorte, não preferência.** Um CSV parcial tratado como
  verdade total apagaria tudo que ficou de fora.
- **D4 — Vazio = "não mexi", não "apague".** Distinguir os dois é impossível numa
  planilha; o `<DELETE>` explícito + `--allow-delete` dá a saída sem ambiguidade.
- **D5 — `ref:` no header em vez de coluna travada.** CSV não tem célula bloqueada; o
  prefixo é o equivalente honesto e sobrevive ao roundtrip pelo Excel.
- **D6 — Namespace inválido é erro, não conjunto vazio.** Um typo que "não exporta nada"
  é indistinguível de sucesso e faz perder uma rodada de revisão.
- **D7 — Sem metadado de recorte no arquivo** (RF3). Header + coluna `namespace` já
  descrevem o conteúdo; metadado seria uma segunda fonte de verdade, capaz de divergir.
- **D8 — `i18n-review.csv` continua git-ignored.** O determinismo (RF5) é verificado por
  **teste**, não por `git diff` — não há baseline versionado.

---

## 10. Relação com a SPEC-008

Esta spec absorve a parte de **ferramental** (RF1/RF2/RF3 da SPEC-008). A SPEC-008 fica
com o que é **regra de idioma**: paridade por chave-base (RF4), formas plurais válidas
via `Intl.PluralRules` (RF5, revisado em 2026-07-29) e `returnEmptyString: false` (RF6).

Ordem sugerida: **SPEC-009 primeiro** — sem export/import confiável, traduzir o russo
perde trabalho, e as 64 entradas `_few`/`_many` da SPEC-008 são exatamente as que o
export atual descarta.

## 11. Follow-ups

> Status em 2026-07-30: **todos fechados.** O item 1 não precisou de TMS: o
> índice de uso construído para a higiene de chaves órfãs (SPEC-008 §9.4) já
> tinha a origem de cada chave.

1. ~~**Coluna de contexto para o tradutor**~~ ✅ — coluna `context`, somente-leitura,
   com até duas ocorrências `arquivo:linha` vindas de `scripts/i18nUsage.mjs`.
   Chave sem origem estática conhecida fica vazia em vez de apontar para o lugar
   errado. `--no-context` pula a varredura.
2. ~~**Marca de revisado** por célula~~ ✅ — coluna `status:<idioma>` por idioma
   editável, persistida em `src/locales/review-status.json` (fora dos
   dicionários: é metadado do processo, não conteúdo de UI). Segue a regra do
   import: célula vazia preserva a marca anterior, `-` apaga. O arquivo só é
   reescrito quando muda.
3. ~~**`normalizeLocale` por subtag BCP 47**~~ ✅ — ver SPEC-008 §9.6.
