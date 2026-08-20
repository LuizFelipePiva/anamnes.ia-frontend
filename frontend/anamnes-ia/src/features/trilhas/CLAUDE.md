# features/trilhas — AI context

Trilhas gamificadas de exames complementares ("Duolingo de exames"), com
repetição espaçada. Feature isolada: só toca em `App.tsx` (rotas) e `MainMenu.tsx`
(aba). Progresso hoje é local (localStorage, chave `anamnesia:trilhas:v2`).

## Arquitetura em duas camadas

As trilhas somam ~800 questões (375 de ECG, 187 de Sinais Vitais, 144 de
Hemograma e 90 de Radiologia). Carregar
todos os enunciados de uma vez custaria ~230 kB à toa, então o conteúdo é
publicado assim:

1. **Metadados** (`data/index.ts` + `data/<trilha>/meta.ts`) — títulos, XP,
   contagens. Vão no bundle principal; o mapa renderiza sem esperar rede.
2. **Exercícios** (`data/<trilha>/m*.json`) — `import.meta.glob` com import
   dinâmico. Cada módulo vira um chunk de 4–8 kB gzip, buscado só quando o
   aluno abre uma lição daquele módulo.

Se as duas camadas divergirem (`totalExercicios` errado), o teste quebra.

## Arquivos

- `types/trilha.ts` — **fonte única** do modelo. Sete tipos de exercício:
  `escolha_unica`, `vf`, `ordenar`, `associar`, `classificar`, `numerico`, `hotspot`.
- `data/index.ts` — registro das trilhas + `carregarLicao` / `carregarLicoes`.
- `data/ecg/` — conteúdo de ECG: 8 módulos, 38 lições, 375 questões (ver `README.md` de lá).
- `data/sinais-vitais/` — 3 módulos, 18 lições, 187 questões (ver `README.md` de lá).
- `data/hemograma/` — 8 módulos, 16 lições, 144 questões. **Conteúdo autoral, pendente de revisão clínica** (ver `README.md` de lá).
- `data/radiologia/` — Tórax: 5 módulos, 10 lições, 90 questões. **Conteúdo autoral, pendente de revisão clínica.** Inclui `biblioteca.ts`, o schema da biblioteca clínica de imagens (ver `README.md` de lá).
- `utils/correcao.ts` — `corrigir`, `respostaCompleta`, embaralhamento com seed.
- `utils/srs.ts` — **motor SM-2**. Nota derivada do desempenho (acerto rápido = 5,
  hesitante = 3, com dica = 3, erro < 3), intervalos 1 → 3 → ×facilidade,
  piso de facilidade 1.3, teto de 365 dias.
- `services/progressoService.ts` — persistência. Trocar `carregarProgresso` e
  `salvar` por chamadas de API quando houver backend; migra o formato v1.
- `hooks/useProgresso.ts` — XP, ofensiva, cartões vencidos por trilha.
- `components/SessaoExercicios.tsx` — **motor da sessão**, compartilhado por lição
  e revisão. O que muda entre as duas é quem monta a lista e o que ocorre no fim.
- `components/TracadoProgresso.tsx` — barra de progresso desenhada como traçado
  PQRST; pulsa a cada acerto. É o elemento de identidade da feature.
- `components/ExercicioRenderer.tsx` — renderiza qualquer tipo de exercício.
- `components/Hotspot.tsx` — "marque a alteração na imagem". Coordenadas em fração
  do quadro (0–1), não em pixels: mapeia direto o `bounding_box` da biblioteca clínica.
- `components/ImagemExercicio.tsx` — traçado com lupa e lightbox (Esc fecha).
- `components/ResultadoSessaoView.tsx`, `Celebracao.tsx`, `Carregando.tsx`.
- `pages/` — `TrilhasPage` (hub), `TrilhaMapaPage` (mapa), `LicaoPage`, `RevisaoPage`.
- `styles/trilhas.css` — estilos da feature, sobre os tokens globais do app.

## Regras

- Correção é tudo-ou-nada por exercício.
- Uma lição libera a próxima com ≥ 60% de acerto e sem zerar as 5 vidas.
- A revisão **não** usa vidas nem trava sequência — o objetivo é frequência.
- Cada trilha injeta `--tr-cor` / `--tr-cor-escura` inline; o CSS é genérico.
- Nenhum texto visível passa pelo i18n ainda (mesmo padrão de `features/simulados`).
- `prefers-reduced-motion` desliga todas as animações.

## Como adicionar uma trilha

1. Criar `data/<slug>/` com um `meta.ts` (exporta `UnidadeMeta[]`) e um JSON por
   módulo, seguindo o formato de `ecg/` ou `sinais-vitais/`.
2. Em `data/index.ts`: acrescentar uma linha ao objeto `MODULOS` com o
   `import.meta.glob` da pasta nova (o Vite exige literal estático, por isso é
   um glob por trilha) e uma entrada em `TRILHAS`.

Nada mais precisa mudar: rotas, mapa, motor de sessão e revisão são genéricos, e
os testes de integridade passam a cobrir a trilha nova automaticamente.
