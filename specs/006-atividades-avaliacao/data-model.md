# Data Model: Atividades, entregas, presença e avaliação

Todas as tabelas ficam no schema `public`, com RLS habilitada e sem INSERT, UPDATE ou DELETE para
`authenticated` (a escrita é só por RPC). Todas têm gatilho de auditoria.

Na coluna "Leitura (RLS)" das tabelas abaixo:

- **gestão da turma**: coordenação da edição, docente e mentor da turma.
- **equipe**: integrantes ativos da equipe.

## Tabelas

### desafios

| Coluna                                     | Tipo e regra                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                       | uuid, chave primária                                                                                                                    |
| `edicao_id`, `encontro_id`                 | chaves estrangeiras; o encontro pertence à edição                                                                                       |
| `titulo`                                   | texto de 3 a 160 caracteres                                                                                                             |
| `enunciado`                                | texto de 1 a 8000 caracteres                                                                                                            |
| `recursos_permitidos`, `politica_ia`       | texto de até 2000 caracteres; obrigatório                                                                                               |
| `prazo`                                    | timestamptz                                                                                                                             |
| `aceita_arquivo`, `aceita_link`            | booleanos; pelo menos um verdadeiro                                                                                                     |
| `estado`                                   | `rascunho` → `publicado` → `encerrado` (manual); a situação encerrada também vale quando `now() > prazo + limiteAtrasoMinutos` (FR-027) |
| `criado_por`, `criado_em`, `atualizado_em` | autoria e datas                                                                                                                         |

- Leitura: a gestão das turmas do desafio. O aluno lê só desafios `publicado`/`encerrado` das
  próprias turmas.
- Alterações: só antes da primeira entrega.

### desafio_turmas

- Colunas: `desafio_id` e `turma_id`, que formam a chave primária.
- A turma pertence à edição do desafio, e o autor é docente dessa turma.

### entregas

| Coluna                   | Tipo e regra                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `id`                     | uuid, chave primária                                                                        |
| `desafio_id`, `dupla_id` | chaves estrangeiras                                                                         |
| `versao`                 | inteiro a partir de 1; único por `(desafio, dupla)`                                         |
| `autor_id`               | integrante que enviou                                                                       |
| `protocolo`              | texto único, por exemplo `ENT-20261105-8F3A2C`                                              |
| `recebida_em`            | horário do servidor                                                                         |
| `arquivo_path`           | caminho no Storage, ou nulo; único quando informado (o mesmo arquivo não vira duas versões) |
| `chave_envio`            | uuid gerado pelo navegador; único por `(desafio, dupla)` (repetição segura)                 |
| `arquivo_nome`           | nome original, ou nulo                                                                      |
| `link`                   | `http(s)`, ou nulo                                                                          |
| `atraso_minutos`         | inteiro ≥ 0                                                                                 |
| `desconto_previsto`      | inteiro ≥ 0                                                                                 |

- Restrição: exatamente um entre arquivo e link.
- Leitura: a equipe e a gestão da turma da equipe.

### prorrogacoes

- Colunas: `id`, `desafio_id`, `dupla_id`, `novo_prazo` (timestamptz), `justificativa` (pelo
  menos 10 caracteres), `autor_id` e `criado_em`.
- Vale a mais recente.
- Leitura: a equipe e a gestão.

### presencas

- Colunas: `encontro_id`, `estudante_id` (que formam a chave primária), `turma_id`, `presente`
  (boolean), `observacao` (até 300 caracteres, opcional), `autor_id` e `registrado_em`.
- Leitura: o próprio aluno, os colegas de equipe e a gestão da turma.

### participacoes

- Colunas: `encontro_id`, `dupla_id` (que formam a chave primária), `notas` (jsonb com os
  critérios de `regras.participacao`), `autor_id` e `registrado_em`.
- Leitura: a equipe e a gestão.

### avaliacoes

| Coluna                       | Tipo e regra                                                           |
| ---------------------------- | ---------------------------------------------------------------------- |
| `desafio_id`, `dupla_id`     | chave primária                                                         |
| `entrega_id`                 | última versão no momento do registro, ou nulo quando não houve entrega |
| `notas_entrega`              | jsonb, ou nulo quando não houve entrega                                |
| `notas_apresentacao`         | jsonb, ou nulo                                                         |
| `apresentacao_nao_avaliavel` | boolean                                                                |
| `feedback`                   | texto de até 4000 caracteres; obrigatório quando há entrega            |
| `autor_id`, `registrado_em`  | autoria e horário                                                      |

- Leitura: a equipe e a gestão.

### listas_questoes

- Colunas: `id`, `edicao_id`, `encontro_id`, `titulo` (3 a 160 caracteres), `prazo`, `estado`
  (`rascunho`, `publicado` ou `encerrado`; a situação encerrada também vale quando `now() > prazo`), `versao` (inteiro ≥ 1, incrementado a cada edição
  antes da primeira submissão), `criado_por`, `criado_em` e `atualizado_em`.
- O encontro precisa ter `avaliacao_objetiva = 'questoes'`.
- Leitura direta: só a gestão. O aluno lê pela RPC.

### lista_turmas

- Colunas: `lista_id` e `turma_id`, que formam a chave primária.

### questoes

- Colunas: `id`, `lista_id`, `ordem`, `enunciado` (1 a 4000 caracteres), `justificativa` (até
  4000 caracteres) e `capacidade` (até 300 caracteres).
- Leitura direta: só a gestão.

### alternativas

- Colunas: `id`, `questao_id`, `ordem`, `texto` (1 a 1000 caracteres) e `correta` (boolean).
- Exatamente uma alternativa correta por questão, verificada na RPC.
- Leitura direta: só a gestão.

### submissoes_questoes

- Colunas: `id`, `lista_id`, `dupla_id` (o par é único), `versao_lista`, `autor_id`,
  `enviada_em`, `chave_envio` (uuid, única; repetição segura), `respostas` (jsonb `{questaoId: alternativaId}`), `acertos` e `total`.
- `acertos` e `total` são calculados no servidor.
- Leitura direta: só a gestão. A equipe lê pela RPC.

## Bucket do Storage

- Nome: `entregas`.
- Privado, com limite de 50 MB por arquivo (decidido em 2026-10-30).
- Tipos aceitos: `application/pdf`, `application/zip`, `application/x-zip-compressed`,
  `image/png` e `image/jpeg`.

## Tipos TS (domínio `atividades`)

- `Desafio`, `EntregaVersao`, `Comprovante`, `ListaQuestoes`, `QuestaoParaEquipe`,
  `ResultadoLista`, `RegistroPresencaTurma`, `Participacao`, `Avaliacao` e
  `LancamentosDaEquipe`.
- `montarLancamentos(encontro, dados, regras)` devolve `{ lancamentos: LancamentosDoEncontro,
aguardando: Componente[] }`.
