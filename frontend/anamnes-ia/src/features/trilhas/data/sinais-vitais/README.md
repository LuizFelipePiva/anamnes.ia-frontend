# Conteúdo da trilha de Sinais Vitais

187 questões, 3 módulos, 18 lições. Gerado a partir de três documentos Word
fornecidos pelo autor do conteúdo:

| Documento | Vira |
|---|---|
| `sinais_vitais_Fundamentos.docx` | M1 — Fundamentos e Medições |
| `sinais_vitais_Interpretação_Clínica_e_Alertas.docx` | M2 — Interpretação Clínica |
| `sinais_vitais_Variações_por_Idade_e_Condições_Especiais.docx` | M3 — Idade e Condições Especiais |

Cada "Nível" do documento virou uma lição. Sem imagens: nenhuma questão desta
trilha depende de traçado ou foto.

## Formato

- `meta.ts` — esqueleto (módulos, lições, XP, contagens). Vai no bundle principal.
- `m1.json` … `m3.json` — exercícios. Um chunk por módulo, carregado sob demanda.

Os dois **precisam** bater: `totalExercicios` em `meta.ts` é conferido contra o
JSON no teste `trilhas.test.tsx`.

## Decisões de conversão

- **Ordenação**: a ordem correta vem do gabarito marcado, não da ordem em que os
  itens aparecem no enunciado. As duas nem sempre coincidem — na aferição de PA
  em gestante, por exemplo, o gabarito é `2, 1, 3, 4, 5` (posicionar a paciente
  antes de colocar o manguito).
- **Associação**: quando duas chaves apontavam para o mesmo valor, foram fundidas
  numa só. Ocorreu uma vez, na tabela de FC por idade — "Adolescente/Adulto" e
  "Idoso" compartilham 60–100 bpm, o que é correto clinicamente, mas deixaria
  dois destinos idênticos na tela.
- **Nível 2 de Interpretação Clínica** ("Padrões Críticos") perdeu a marcação de
  título no documento e virou parágrafo solto. O parser trata o `##` como
  opcional; sem isso, as 11 questões seriam absorvidas pelo nível 1.
- **Uma questão reconstruída**: a associação de SpO₂ por classificação apontava
  para uma imagem inexistente, mas os quatro valores estavam escritos na própria
  explicação didática. Foi remontada a partir dela (`sv-t1-n6-q68`).

## Questões descartadas (15)

Todas do documento de Fundamentos, todas dependentes de imagem que o documento
nunca teve — trazem só o marcador "📸 Inserir imagem":

- **13 do tipo "Clique"** (identificar ponto na imagem).
- **2 associações** sem dado recuperável: "associe faixa etária à temperatura
  normal" e "à frequência cardíaca". O texto diz apenas que crianças são mais
  quentes e idosos mais frios, sem os números.

Se você fornecer as imagens e os gabaritos, essas 15 entram sem mexer no código:
o campo `imagemUrl` já existe em todo exercício e o componente já renderiza.
