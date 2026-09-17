# Runbook — migração dos exames para caminhos opacos (produção)

> ✅ **Executado em produção em 14/08/2026**, pela rota B (§B abaixo): as 301
> linhas apontam para `assets/<hh>/<sha256><ext>` e os binários de nome falante
> foram apagados do bucket. A URL antiga responde 400. O documento fica como
> referência para reexecução (outro ambiente, ou acervo novo).

**Por que existe**: o `storage_path` dos exames espelhava a origem
(`assets/radiografia/rx_pneumo_001.webp`). O bucket é público e esse caminho
aparece inteiro no `src` da `<img>` que o aluno vê — ou seja, o nome do arquivo
entregava o diagnóstico com um clique direito. A correção compõe o caminho a
partir do `sha256` do binário (`assets/<hh>/<sha256><ext>`) e tirou o `id` do
acervo (`RX-PNEUMO-001`, igualmente falante) da resposta da API do aluno.

Ver `docs/specs/SPEC-014-exames-complementares.md` §4.1 (revisão de 2026-08-14).

> ⏱️ ~20 min, sendo a maior parte upload de ~37 MB. Nenhum passo exige janela de
> manutenção: enquanto a ingestão roda, os binários antigos continuam no ar.

---

Há **duas rotas**. A A parte do pacote curado em disco; a B parte do próprio
bucket e foi a usada em produção, porque o pacote não estava na máquina.

| | Rota A — `ingest_medical_assets.py` | Rota B — `rehash_storage_paths.py` |
|---|---|---|
| Fonte da verdade | pacote em disco (`registry.json` + `assets/`) | o que já está no bucket e na tabela |
| Precisa do pacote? | sim | não |
| Tráfego | sobe ~37 MB | nenhum: `storage.copy` é server-side |
| Também insere assets novos | sim | não — só renomeia o que existe |

Use A quando o acervo mudou (exame novo, binário corrigido); B quando é só a
migração de caminho.

---

# Rota A — a partir do pacote curado

## 0. Pré-requisitos

- Pasta do pacote curado (`BIBLIOTECA_EXAMES_REUTILIZAVEIS/medical-assets`),
  com `registry.json` e `assets/`.
- `backend/.env` apontando para o **projeto de produção**, com a `SUPABASE_KEY`
  sendo a **service key** — o catálogo não tem policy de escrita para
  `authenticated`, de propósito.
- Código já implantado (backend no Render + front na Vercel, via push em
  `master`). A ordem entre deploy e ingestão não é crítica — os dois lados
  degradam sem quebrar —, mas fazer o deploy primeiro evita ver a tela num
  estado intermediário.

Confirme para onde a chave aponta antes de qualquer escrita:

```bash
cd backend
python -c "from app.config import SUPABASE_URL; print(SUPABASE_URL)"
```

## 1. Inventário para rollback

Antes de qualquer escrita, guarde o mapa `id → storage_path` atual. É o que
permite voltar atrás sem depender de backup do Supabase:

```sql
-- SQL Editor do Supabase (produção), salve o resultado como CSV
select id, storage_path, sha256 from medical_assets order by id;
```

## 2. Dry-run da ingestão

```bash
cd backend
python scripts/ingest_medical_assets.py --source <pasta>/medical-assets --dry-run
```

Espere: **316 assets processados**, nenhum `[aviso] binário do registry não
existe em disco` e nenhuma divergência de `coverage.json`. Se aparecer binário
faltando, pare — o pacote em disco está incompleto e a ingestão gravaria linhas
apontando para objetos que não subiram.

## 3. Ingestão real

```bash
python scripts/ingest_medical_assets.py --source <pasta>/medical-assets
```

Sobe os ~301 binários nos caminhos novos e faz upsert das linhas. Deve relatar
~301 upload(s) e 0 inalterado(s) — o "inalterado" só aparece em reexecuções.

> O script compara **hash e caminho**: como o caminho muda, ele reenvia mesmo
> com o `sha256` idêntico. Se relatar "0 upload", algo está errado — as linhas
> apontariam para objetos inexistentes.

## 4. Conferir na aplicação (antes de apagar nada)

Entre como aluno num caso que tenha exames e verifique, no DevTools:

- **Network** → `GET /api/attempts/<id>/exams`: a resposta **não** tem campo
  `id`, e nenhum valor contém o diagnóstico.
- **Elements** → a `<img>` do exame aponta para
  `.../medical-assets/assets/<2 chars>/<hash>.webp` e carrega (não é 404).

Se algo estiver quebrado aqui, **pare**: os binários antigos ainda existem, e
restaurar os `storage_path` do CSV do passo 1 desfaz tudo.

## 5. Ver o que a limpeza apagaria

```bash
python scripts/ingest_medical_assets.py --source <pasta>/medical-assets \
  --prune-legacy --dry-run
```

⚠️ **Leia a lista.** O prune apaga **todo** objeto sob `assets/` que o acervo
atual não referencia — inclusive algo que tenha sido subido no bucket por fora
do script. A lista esperada é só o layout antigo (`assets/<modalidade>/...`).

`--prune-legacy` é recusado junto de `--only-modality` (o recorte faria "o que
sobrou" ser o acervo inteiro).

## 6. Apagar o layout antigo

```bash
python scripts/ingest_medical_assets.py --source <pasta>/medical-assets --prune-legacy
```

**Este é o passo que fecha o vazamento.** Antes dele, quem já tivesse a URL
antiga (ou a adivinhasse a partir do padrão) continuaria lendo o gabarito pelo
nome do arquivo.

## 7. Verificação final

Recarregue a tela do aluno (F5 forçado) e confirme que os exames aparecem. Como
as URLs são novas, não há cache velho do CDN para confundir o teste.

---

# Rota B — a partir do próprio bucket

Foi a executada em 14/08/2026. Dispensa o pacote curado: o `sha256` já está em
`medical_assets` (a ingestão o gravou), então o caminho novo se calcula sem ler
o binário, e a cópia é server-side.

```bash
cd backend
python scripts/rehash_storage_paths.py --dry-run --verify 10   # 1. o que faria
python scripts/rehash_storage_paths.py --verify 5              # 2. copia + atualiza
python scripts/rehash_storage_paths.py --prune --dry-run       # 3. o que apagaria
python scripts/rehash_storage_paths.py --prune                 # 4. fecha o vazamento
```

`--verify N` baixa N binários e confere se o `sha256` da linha bate com o
conteúdo real — o hash veio do `registry.json`, não de uma leitura do bucket, e
uma divergência significaria que o caminho novo não é o hash do conteúdo.
Divergência vira falha e **cancela a limpeza**.

Depois do passo 2 as linhas já apontam para o caminho novo, então o `--verify`
do passo 3 em diante valida as cópias, não os originais. Entre 2 e 4 os dois
layouts coexistem: é a janela para conferir a tela do aluno com rollback barato.

> ⚠️ `--prune` compara o bucket inteiro com o que as linhas referenciam. Objeto
> subido por fora do script é órfão pela definição dele e some junto — leia o
> dry-run.

**Antes de qualquer escrita**, guarde o inventário. Em produção usamos uma
tabela, que é mais fiel que um CSV e não passa pelo terminal:

```sql
create table medical_assets_path_backup_20260814 as
  select id, storage_path, sha256 from medical_assets;

-- Ela guarda justamente os caminhos falantes: sem isto, o backup vira o
-- vazamento pela porta da Data API.
alter table medical_assets_path_backup_20260814 enable row level security;
revoke all on medical_assets_path_backup_20260814 from anon, authenticated;
```

---

## Rollback

| Situação | O que fazer |
|---|---|
| Antes de apagar (A6 / B4) | Restaure `storage_path` do inventário — os binários antigos ainda estão no bucket: `update medical_assets m set storage_path = b.storage_path from medical_assets_path_backup_20260814 b where b.id = m.id;` |
| Depois de apagar | Não há volta pelo bucket: os objetos antigos não existem mais. Reverter exige o pacote em disco e a versão anterior do script de ingestão, que recria o layout falante. Nada se perde, mas o vazamento volta. |

A tabela `medical_assets_path_backup_20260814` pode ser descartada quando a
migração estiver validada — ela só interessa enquanto o rollback fizer sentido.

## Fica em aberto

Os **15 assets remotos** (vídeos hospedados no Wikimedia) continuam com nomes
descritivos na URL — não controlamos esses arquivos, e o prune não os alcança.
Fechar isso exige baixá-los para o nosso bucket, o que a licença CC permite
desde que os `credits` continuem sendo exibidos (já são).
