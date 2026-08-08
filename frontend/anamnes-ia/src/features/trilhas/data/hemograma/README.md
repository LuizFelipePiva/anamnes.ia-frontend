# Conteúdo da trilha de Hemograma

144 questões, 8 módulos, 16 lições.

> **Conteúdo autoral, ainda não validado clinicamente.**
> Diferente das trilhas de ECG e Sinais Vitais — convertidas a partir de
> documentos revisados pelo autor do conteúdo — esta trilha foi redigida do zero
> a partir de conhecimento consolidado de hematologia. Passe por revisão de um
> hematologista ou clínico antes de publicar para alunos.

## Progressão

Os módulos são pensados para serem feitos em ordem: cada um pressupõe o anterior.

| # | Módulo | Lições | Depende de |
|---|---|---|---|
| 1 | Lendo o hemograma | 2 | — |
| 2 | Série vermelha e índices | 2 | M1 |
| 3 | Anemias microcíticas | 2 | M2 (VCM, RDW) |
| 4 | Macro e normocíticas | 2 | M2 (reticulócitos) |
| 5 | Leucograma normal | 2 | M1 |
| 6 | Alterações do leucograma | 2 | M5 |
| 7 | Série plaquetária | 2 | M1 |
| 8 | Integrando o hemograma | 2 | todos |

O XP cresce com o nível (`10 + nível × 2`, teto de 40), então as lições finais
valem quase o dobro das de abertura.

## Escolhas didáticas

- **Cada índice antes de cada doença.** VCM, HCM, CHCM e RDW são fixados no M2
  para que os módulos de anemia possam raciocinar em cima deles, em vez de
  apresentar sigla e doença ao mesmo tempo.
- **Reticulócito como divisor.** Aparece no M2 e volta no M4 como a pergunta que
  separa falha de produção de perda periférica.
- **Armadilhas têm lição própria** (M7-L2): pseudotrombocitopenia por EDTA,
  CHCM falsamente alto, coleta traumática. São a causa mais comum de conduta
  errada a partir de um hemograma.
- **Uso dos seis tipos de exercício.** Esta trilha é a primeira a usar bastante o
  tipo `numerico` — valores de referência funcionam melhor como slider do que
  como alternativa, porque forçam o aluno a produzir o número em vez de
  reconhecê-lo.

## Formato

- `meta.ts` — esqueleto (módulos, lições, XP, contagens). Vai no bundle principal.
- `m1.json` … `m8.json` — exercícios, carregados sob demanda.

Os dois precisam bater: `totalExercicios` é conferido no `trilhas.test.tsx`.

## Sem imagens

Nenhuma questão depende de imagem. O campo `imagemUrl` está disponível se você
quiser acrescentar fotos de lâmina — hemácias em alvo, esquizócitos,
hipersegmentação, rouleaux — que enriqueceriam bastante os módulos 3, 4 e 8.
