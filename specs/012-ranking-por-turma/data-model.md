# Modelo de dados: ranking por turma

Migration nova: `supabase/migrations/20261106120000_ranking_por_turma.sql`. Nada é apagado; as
publicações da spec 007 continuam como estão.

## `public.publicacoes_ranking` (alterada)

| Campo            | Mudança                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `turma_id uuid`  | **nova**, `null` = publicação por categoria (anterior); FK `turmas (id) on delete restrict` |
| `lote_id uuid`   | **nova**, `null` nas anteriores; mesmo valor nas turmas publicadas numa mesma chamada       |
| `categoria text` | mantida; nas novas, a categoria da turma no momento (informativa)                           |
| demais           | sem mudança (`versao`, `estado`, `justificativa`, `regras_versao`, `revisao_ate`, autoria)  |

Restrições:

- `publicacoes_versao_unica (edicao_id, categoria, versao)` é removida e substituída por:
  - índice único `publicacoes_versao_categoria` em `(edicao_id, categoria, versao) where turma_id is null`;
  - índice único `publicacoes_versao_turma` em `(turma_id, versao) where turma_id is not null`.
- `publicacoes_justificativa (versao = 1 or justificativa is not null)` mantida (vale por turma).
- `publicacoes_revisao_so_provisorio` mantida.
- Gatilho novo `before insert`: `turma_id` é obrigatório em linhas novas (publicação por categoria
  recusada) e a turma pertence à `edicao_id`.
- Imutabilidade (`app.impedir_alteracao_publicada`) e auditoria: sem mudança.
- Índice `publicacoes_turma_idx (turma_id, versao desc) where turma_id is not null`.
- RLS: `publicacoes_ler` continua só para a coordenação; leitura dos demais perfis só pelas RPCs.

## `public.publicacao_posicoes`

Sem mudança. Nas publicações por turma, só equipes ativas da turma.

## `public.pedidos_revisao`

Sem mudança de colunas. Gatilho novo `before insert`: recusa `objeto = 'publicacao'` quando a
publicação tem `turma_id` nulo (R7).

## `public.decisoes_premiacao` (nova)

| Campo           | Tipo          | Regra                                                                      |
| --------------- | ------------- | -------------------------------------------------------------------------- |
| `id`            | `uuid` PK     | `gen_random_uuid()`                                                        |
| `publicacao_id` | `uuid`        | FK `publicacoes_ranking`; publicação **definitiva** com `turma_id`         |
| `posicao`       | `integer`     | ≥ 1; posição premiada (existe item em `edicoes.premiacao`) com empate      |
| `premiadas`     | `uuid[]`      | não vazio; subconjunto das equipes empatadas naquela posição da publicação |
| `decisao`       | `text`        | 3 a 500 caracteres (ex.: como o prêmio é dividido)                         |
| `justificativa` | `text`        | 10 a 2000 caracteres (`app.registrar_justificativa`)                       |
| `decidido_por`  | `uuid`        | `auth.uid()`                                                               |
| `decidido_em`   | `timestamptz` | `now()`                                                                    |

- Única por `(publicacao_id, posicao)`; imutável (gatilho de imutabilidade) e auditada.
- RLS ligada; `select` só para a coordenação da edição; escrita só pela RPC.
- Teste pgTAP em `supabase/tests/013_ranking_turma.test.sql`.

## `public.edicoes.premiacao`

Sem mudança: lista `[{posicao, descricao, detalhes}]`, aplicada a cada turma (FR-018).

## Funções novas ou recriadas

| Função                                                                               | Tipo      | Resumo                                                                 |
| ------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------- |
| `app.equipes_da_turma(p_turma)`                                                      | nova      | equipes ativas da turma                                                |
| `app.pendencias_do_ranking_da_turma(p_turma)`                                        | nova      | formato de `pendencias_da_categoria`, só da turma (todos os encontros) |
| `app.pendencias_realizadas_da_turma(p_turma)`                                        | nova      | idem, componentes só de encontros realizados (painel)                  |
| `app.provas_pendentes_da_turma(p_turma)`                                             | nova      | como `provas_pendentes_da_categoria`, só da turma                      |
| `app.ultima_publicacao_da_turma(p_turma)`                                            | nova      | linha mais recente de `publicacoes_ranking` da turma                   |
| `public.publicar_ranking_turmas(...)`                                                | nova      | lote independente por turma (R2, R3)                                   |
| `public.ranking_da_edicao(p_edicao)`                                                 | nova      | coordenação: turmas, estado, versão, pendências                        |
| `public.pendencias_ranking_turma(p_turma)`                                           | nova      | coordenação: pendências detalhadas de uma turma                        |
| `public.ranking_da_turma(p_turma)`                                                   | nova      | última publicação da turma, por perfil (R6)                            |
| `public.historico_publicacoes_turma(p_turma)`                                        | nova      | coordenação: versões da turma                                          |
| `public.publicacoes_anteriores(p_edicao)`                                            | nova      | coordenação: categorias com publicações anteriores                     |
| `public.premiacao_da_edicao(p_edicao)`                                               | nova      | premiação por turma visível a quem chama (R8)                          |
| `public.decidir_premiacao_empate(...)`                                               | nova      | coordenação: decisão de empate em posição premiada                     |
| `public.publicar_ranking(...)`                                                       | recriada  | recusa: publicação por categoria substituída                           |
| `public.ranking_publicado(...)`                                                      | recriada  | só coordenação; só publicações por categoria (anteriores)              |
| `public.painel_do_aluno` / `painel_da_turma` / `painel_da_coordenacao` / `relatorio` | recriadas | leem a publicação da turma (R9)                                        |

## Estados

- Publicação: `parcial` → `provisorio` → `definitivo` (spec 007), agora por turma; qualquer nova
  versão exige justificativa a partir da 2ª.
- Premiação da turma: `a_definir` (sem publicação, ou última parcial) · `provisorio` (última
  provisória; visível só à gestão) · `final` (última definitiva sem empate premiado pendente) ·
  `empate_a_decidir` (definitiva com empate premiado sem decisão).

## Tipos do frontend (`@/modules/resultado`)

```text
TurmaNoRanking = { turmaId, turma, categoria, equipes: number,
                   ultima: { id, versao, estado, publicadoEm } | null,
                   pendencias: { componentes: number, ocorrencias: number, revisoes: number } }
PublicacaoRanking   += { turmaId: string | null, turma: string | null }   // null = anterior
ResultadoLote       = { turmaId, turma, publicada: boolean, versao?: number, motivo?: string }[]
PremiacaoDaTurma    = { turmaId, turma, situacao: 'a_definir'|'provisorio'|'final'|'empate_a_decidir',
                        publicacaoId: string | null,
                        itens: { posicao, descricao, detalhes, equipes: { id, nome }[],
                                 empate: boolean, decisao: { decisao, premiadas, justificativa,
                                 decididoEm } | null }[] }
```

`PendenciasDaCategoria` passa a se chamar `PendenciasDoRanking` (mesmo formato). No painel da
coordenação (`@/modules/relatorios`), `CategoriaDoPainel` vira `TurmaDoPainelCoordenacao`
`{ turmaId, turma, categoria, componentesPendentes, provasPendentes, ocorrenciasSemDecisao,
revisoesAbertas, publicacao }`.
