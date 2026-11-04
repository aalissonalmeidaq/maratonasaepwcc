# Pesquisa (Fase 0): encerramento da edição por turma

Base: `app.pendencias_json`, `public.pendencias_da_edicao`, `public.encerrar_edicao` e
`public.edicoes_que_coordeno` (`20261104120000_gestao_edicoes.sql`, spec 010) e
`app.ultima_publicacao_da_turma`, `app.equipes_da_turma` (`20261106120000_ranking_por_turma.sql`,
spec 012). Nenhum item ficou como NEEDS CLARIFICATION.

## R1. Turmas sem definitiva

- **Decisão:** em `app.pendencias_json`, `turmasSemDefinitiva` = turmas da edição com ao menos
  uma equipe ativa cuja última publicação não existe ou não está em `definitivo`, ordenadas por
  categoria e nome, com `estado` em `sem_publicacao`, `parcial` ou `provisorio`. A chave
  `categoriasSemRanking` sai das pendências novas.
- **Motivo:** FR-001 a FR-003; é a mesma "última publicação da turma" do ranking, do painel e da
  premiação (spec 012). Publicações por categoria anteriores têm `turma_id` nulo e não contam.
- **Alternativas:** manter as duas chaves (a categoria continuaria enganando, contra FR-003).

## R2. Encerramento e registros antigos

- **Decisão:** `encerrar_edicao` não muda: grava `app.pendencias_json` em
  `pendencias_no_encerramento`. Os registros já gravados (com `categoriasSemRanking`) ficam como
  estão.
- **Motivo:** FR-004 a FR-006; o registro é a foto do que a coordenação viu.

## R3. Registro na tela da edição encerrada

- **Decisão:** `edicoes_que_coordeno` acrescenta `pendenciasNoEncerramento` (o JSON gravado, ou
  `null`). `EstadoDaEdicao`, na edição encerrada, mostra o registro: contagens de ocorrências e
  revisões e, conforme a chave presente, "Turmas sem ranking definitivo" ou "Categorias sem
  ranking publicado"; sem registro, "Pendências do encerramento não registradas". O tipo aceita os
  dois formatos.
- **Motivo:** FR-006a; a mesma lista (`ListaDePendencias`) serve antes e depois de encerrar.
- **Alternativas:** RPC só para o registro (uma chamada a mais por edição, sem ganho).

## R4. Demonstração

- **Decisão:** `pendenciasDaEdicao` da demonstração calcula `turmasSemDefinitiva` pelas versões
  fictícias por turma (3º ano A definitiva; 3º ano B sem publicação); edições encerradas
  fictícias, se houver, mostram o registro fictício.
- **Motivo:** o modo demonstração não grava; a tela precisa mostrar a regra.
