# Conteúdo da trilha de ECG

375 questões, 8 módulos, 38 lições. Gerado a partir de quatro documentos Word
fornecidos pelo autor do conteúdo:

| Documento | Vira |
|---|---|
| `Trilha_1_ECG_Fundamentos.docx` | M1 — Fundamentos do ECG |
| `Trilha_2_ECG_NORMAL.docx` | M2 — ECG Normal |
| `Trilha_3_ECG.docx` | M3 — Sobrecargas |
| `Rythmia_pt2.docx` | M4–M8 — BAV, Bloqueios de Ramo, Arritmias, SCA I e II |

## Formato

- `meta.ts` — esqueleto (módulos, lições, XP, contagens). Vai no bundle principal.
- `m1.json` … `m8.json` — exercícios. Um chunk por módulo, carregado sob demanda.

Os dois **precisam** bater: `totalExercicios` em `meta.ts` é conferido contra o
JSON no teste `trilhas.test.tsx`.

## Imagens

43 traçados em `public/trilhas/ecg/*.webp` (nome = hash do arquivo original),
redimensionados para 1200 px de largura. 47 questões referenciam imagem.

## Decisões de conversão

- Questões de "relacionamento" que no documento eram múltipla escolha disfarçada
  ("1-B, 2-C, 3-A") viraram exercícios de **associação** reais, quando o
  mapeamento é 1:1. Quando o mesmo destino serve a mais de um item, viram
  **classificação** por categoria.
- Seis questões estavam sem gabarito marcado no documento; a resposta foi
  deduzida da justificativa e está registrada como `OVERRIDES` no script de
  conversão.
- Três questões do tipo "clique no local da onda X no traçado" foram
  **descartadas**: o documento traz cinco miniaturas e um "X" solto, sem indicar
  qual é a correta.
- **30 questões estão sem explicação** porque o documento original não trazia
  nenhuma (concentradas em M1-L2, M1-L3 e M1-L4). A UI omite o bloco quando o
  campo está ausente. A lista está em `SEM_EXPLICACAO.md`.

## Para atualizar o conteúdo

Editar o JSON do módulo e ajustar `totalExercicios` no `meta.ts` da lição
correspondente. O teste avisa se os dois saírem de sincronia.
