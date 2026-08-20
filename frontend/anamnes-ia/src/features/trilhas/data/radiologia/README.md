# Trilha de Radiologia

## Estado: MVP fechado

4 blocos, 10 módulos, 22 lições, 268 questões — 158 com radiografia real.

| Bloco | Módulos | Lições | Questões | Imagem |
|---|---|---|---|---|
| Tórax | m1–m5 | 10 | 90 | esquema didático |
| Fraturas | m7 | 6 | 60 | GRAZPEDWRI-DX + FracAtlas |
| Abdome | m8 | 2 | 16 | KUB-StoneX |
| Cervical e crânio/face | m9–m10 | 4 | 36 | conceitual |

A ordem no mapa é a ordem de aprendizado: tórax conceitual primeiro (técnica,
anatomia, ABCDE), depois os blocos com imagem, e por fim cervical e crânio.

## Como o conteúdo ensina quem nunca viu radiografia

Os exercícios gerados a partir de imagem não se limitam à mecânica. Cada
subárea tem, em `didatica.py`:

* **onde olhar** — o trajeto que o olho percorre naquela região;
* **o sinal** — como o achado se apresenta;
* **o erro comum** — o imitador que engana quem está começando (fise confundida
  com fratura, flebólito confundido com cálculo, sutura confundida com traço).

Esse texto vira a dica antes de responder e a explicação depois de errar. A
sequência dentro da lição também é didática: reconhecer que há alteração →
localizar na imagem → nomear o achado.

## O aviso ao aluno

Lições com imagem carregam `aviso`, renderizado como faixa antes de começar e
como selo no mapa. A limitação aparece para quem está aprendendo, em vez de
ficar só no repositório:

> Imagens de bases públicas ainda sem revisão clínica da equipe. Use para
> treinar o olhar; não use como referência diagnóstica.

Quando a revisão for feita, remova o campo `aviso` das lições daquele módulo e
troque `reviewer` pelo nome de quem revisou.

## Blocos com imagem real já no app

| Bloco | Módulo | Base | Imagens | Lições |
|---|---|---|---|---|
| 1 — Fraturas | `rx-frat-m7` | GRAZPEDWRI-DX + FracAtlas | 110 | 6 |
| 2 — Abdome | `rx-abd-m8` | KUB-StoneX | 48 | 4 |
| 3 — Tórax | `rx-torax-m1..m5` | conceitual (sem imagem) | — | 10 |
| 4 — Cervical/cabeça | — | pendente | — | — |

Todas as imagens estão marcadas `DEMONSTRAÇÃO TÉCNICA — NÃO REVISADO
CLINICAMENTE`. `revisar.py publicar` recusa o lote enquanto essa marca existir.

### Leitura remota de ZIP

`zip_remoto.py` lê o diretório central por HTTP range e busca só as entradas
escolhidas. Foi o que tornou os blocos 1 e 2 viáveis:

| Base | Tamanho | Baixado |
|---|---|---|
| GRAZPEDWRI-DX | 15,2 GB em 4 zips | 50 imagens, 248 kB, 46 s |
| KUB-StoneX | 20,8 GB em ZIP64 | 48 imagens, 2,3 MB |

Suporta ZIP64 (acima de 4 GB) e os métodos de compressão STORED, DEFLATE, LZMA,
BZIP2 e ZSTD — o KUB-StoneX usa LZMA, que o `zipfile` padrão não lê por range.

## O que falta: as bases de tórax e cervical

O pipeline está pronto e testado, em `radiologia-pipeline/`:

```
bases.py       registro das 7 bases, licenças e regras de mapeamento
ingestao.py    normalizar → gerar → validar
```

```bash
python3 ingestao.py normalizar grazpedwri-dx manifesto.json > biblioteca.json
python3 ingestao.py validar biblioteca.json
python3 ingestao.py gerar biblioteca.json exercicios.json
```

O adaptador de cada base produz um manifesto simples (`sourceImageId`, `width`,
`height`, `boxes`, `finding`…) e o resto do pipeline não precisa conhecer o
formato original — YOLO, COCO ou CSV de rótulos.

`biblioteca.ts` traduz o schema para TypeScript, com `apta()` e `caixasValidas()`
como última barreira antes do banco de questões.

### Três regras que o pipeline aplica sozinho

1. **Base com rótulo automático entra sempre como `pendente`**, mesmo que o
   manifesto traga um achado. O NIH está marcado `rotulo_confiavel: False` —
   seus rótulos vêm de NLP sobre laudo e não são gabarito.
2. **`imageId` determinístico** (hash de base + id de origem). Reprocessar a base
   não muda o id, então o progresso de repetição espaçada do aluno sobrevive.
3. **Divisão por paciente, não por imagem** (`separar_por_paciente`). Duas
   incidências do mesmo exame em lições diferentes fazem o aluno reconhecer a
   imagem em vez de reconhecer o achado.

### O validador bloqueia publicação quando

- falta campo obrigatório ou o `imageId` se repete;
- caixa cai fora do quadro;
- procedência incompleta, ou licença ainda marcada `CONFERIR`;
- imagem `aprovado` sem revisor identificado;
- imagem `alterado` sem achado principal.

## Licenciamento — pendência que bloqueia tudo

Todas as 7 bases estão com campos `CONFERIR` em `bases.py`: versão, autores,
DOI, licença e link. Preenchi a estrutura, **não os dados** — licença é o único
erro deste pipeline que não dá para corrigir depois de publicar.

```bash
python3 bases.py    # lista as pendências por base
```

Confira na página oficial de cada base antes de qualquer uso comercial,
sobretudo NIH ChestX-ray14 e KUB-StoneX, cujos termos de redistribuição são os
menos diretos.

## Ordem sugerida daqui

1. Fechar o licenciamento das bases de tórax (NIH e Kermany).
2. Escrever o adaptador de uma base só, ponta a ponta, e curar ~50 casos.
3. Rodar a revisão médica desses 50 e publicá-los como módulo 6 da trilha de tórax.
4. Só então partir para fraturas, onde GRAZPEDWRI-DX e FracAtlas já trazem caixas
   e o hotspot rende mais.
