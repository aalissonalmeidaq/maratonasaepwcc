# Pesquisa (Fase 0): ranking por turma

Base: `supabase/migrations/20261101120000_resultado_oficial_ranking.sql` (spec 007),
`20261102120000_paineis_relatorios.sql` (spec 008), `20261105120000_regras_edicao.sql` (spec 011)
e o módulo `src/modules/resultado`. Nenhum item ficou como NEEDS CLARIFICATION.

## R1. Onde guardar a publicação por turma

- **Decisão:** acrescentar `turma_id uuid null` em `public.publicacoes_ranking`. Publicação nova
  tem `turma_id` preenchido e `categoria` = categoria da turma no momento (informativa). Linhas
  existentes ficam com `turma_id` nulo e passam a ser "por categoria (anterior)". A unicidade
  `(edicao_id, categoria, versao)` vira dois índices únicos parciais: `(edicao_id, categoria,
versao) where turma_id is null` e `(turma_id, versao) where turma_id is not null`.
- **Motivo:** `pedidos_revisao.publicacao_id`, `excecoes_prazo.publicacao_id`,
  `app.prazo_revisao_efetivo`, `publicacao_posicoes`, o gatilho de imutabilidade e a auditoria já
  dependem desta tabela; uma tabela nova duplicaria todos esses vínculos. Publicações antigas não
  são alteradas (SC-005).
- **Alternativas:** tabela `publicacoes_ranking_turma` separada (duplicaria FKs, revisão e
  exceções); converter as antigas em publicações por turma (reescreveria posições congeladas,
  contra a imutabilidade).

## R2. Publicação em lote, independente por turma

- **Decisão:** `public.publicar_ranking_turmas(p_edicao, p_turmas jsonb, p_estado, p_justificativa)`
  com `p_turmas = [{turmaId, versaoBase}]`. Para cada turma, um bloco `begin … exception` (subtransação)
  que trava a turma (`pg_advisory_xact_lock`), confere a versão base, as pendências (definitiva) e
  grava a versão. A resposta lista, por turma, `{turmaId, publicada, versao?, motivo?}`. Uma turma
  recusada não desfaz as outras (FR-007a).
- **Motivo:** o lote é pedido do usuário; a subtransação por turma dá o "independente" sem
  orquestrar várias chamadas no navegador.
- **Alternativas:** uma chamada por turma a partir do navegador (resultado parcial se a conexão
  cair no meio; sem uma justificativa única registrada); tudo-ou-nada (rejeitado no esclarecimento).

## R3. Concorrência e reenvio

- **Decisão:** `versaoBase` = última versão da turma que a tela carregou (`null` quando não havia).
  Diferente da atual: recusa daquela turma com "O ranking desta turma mudou desde que você abriu a
  tela; recarregue." Reenvio idêntico (mesmo estado e mesmas posições da última versão) devolve a
  versão existente sem gravar, como na spec 007.
- **Motivo:** FR-006 (uma versão e uma recusa com recarregar); mesmo padrão da spec 011.

## R4. Pendências da turma

- **Decisão:** `app.pendencias_do_ranking_da_turma(p_turma)` com o mesmo formato de
  `app.pendencias_da_categoria` (componentes, ocorrências sem decisão, revisões abertas), limitado
  às equipes ativas da turma; componentes só dos encontros da turma (`app.encontro_da_turma`, spec 011) — já é o que `app.totais_da_equipe` devolve. Para o painel, uma versão "só encontros
  realizados", como na spec 008 (`app.pendencias_realizadas_da_turma`). A lista da tela de
  ranking (`ranking_da_edicao`) e o painel da coordenação usam a versão "realizados" — encontros
  futuros sempre têm componentes pendentes e inflariam a contagem; a recusa da definitiva usa a
  versão com todos os encontros e mostra a lista completa.
- **Motivo:** FR-004, FR-007, SC-004 e SC-006 (mesmos números nas duas telas).

## R5. Prazo de revisão da publicação provisória

- **Decisão:** `revisao_ate = now() + regras vigentes da turma agora (app.regras_vigentes(turma,
now())) → prazos.revisaoHoras`.
- **Motivo:** na spec 011 a coordenação pode ajustar os prazos da turma; o prazo da edição deixaria
  de valer para turmas ajustadas.

## R6. Leitura por perfil

- **Decisão:** `public.ranking_da_turma(p_turma uuid)` devolve a última publicação da turma com as
  mesmas regras de detalhe da spec 007 (detalhe só da própria equipe para o aluno; de todas para a
  gestão da turma e a coordenação). Quem lê: aluno da turma; docente/mentor com atribuição ativa na
  turma; coordenação da edição. `public.ranking_da_edicao(p_edicao)` (só coordenação) lista as
  turmas com estado, versão e contagem de pendências. `public.ranking_publicado` e
  `public.historico_publicacoes` passam a ser só da coordenação e só para as publicações por
  categoria (anteriores); `public.publicacoes_anteriores(p_edicao)` lista as categorias que têm
  histórico.
- **Motivo:** FR-008, FR-009, FR-017; o aluno sem turma publicada recebe `null` e a tela mostra
  "Ranking da turma ainda não publicado".

## R7. Revisão sobre publicações anteriores

- **Decisão:** gatilho `before insert` em `pedidos_revisao` recusa pedido novo sobre publicação com
  `turma_id` nulo ("Esta publicação por categoria é anterior; peça revisão sobre o ranking da sua
  turma."). Pedidos já abertos seguem e são respondidos normalmente.
- **Motivo:** o aluno não vê mais essas publicações (esclarecimento); sem o gatilho, o servidor
  ainda aceitaria pedidos dentro do prazo. O gatilho evita recriar `pedir_revisao` inteira.

## R8. Premiação por turma

- **Decisão:** `public.premiacao_da_edicao(p_edicao)` devolve, por turma visível a quem chama, os
  itens de `edicoes.premiacao` e a situação calculada da última publicação da turma:
  `definitivo` → premiados finais; `provisorio` → premiados provisórios (só coordenação, docente e
  mentor); demais → "a definir". Premiados de uma posição = equipes com `posicao` igual ao número do
  prêmio. Empate (`compartilhada`) numa posição premiada da definitiva sem decisão →
  `empateADecidir`. O `rank()` da spec 007 pula posições (1, 1, 3): o prêmio de uma posição pulada
  aparece "sem equipe nesta posição (empate anterior)" e é tratado na decisão do empate.
  Tabela `decisoes_premiacao (publicacao_id, posicao, premiadas uuid[], decisao text,
justificativa, decidido_por, decidido_em)`, única por `(publicacao_id, posicao)`, imutável;
  `public.decidir_premiacao_empate(...)` só pela coordenação, só em publicação definitiva de turma
  e só em posição premiada com empate; `premiadas` ⊆ equipes empatadas.
- **Motivo:** FR-018, FR-018a, FR-018b; a decisão fica ligada à publicação, então nova definitiva
  da turma "anula" a anterior sem apagar nada (edge case da spec).
- **Alternativas:** regra automática de divisão (rejeitada no esclarecimento: a coordenação decide).

## R9. Telas que liam por categoria

- **Decisão:** recriar `painel_do_aluno` (posição e revisão pela publicação da turma),
  `painel_da_turma` (bloco `pontuacao` pela publicação da turma, sem filtrar categoria),
  `painel_da_coordenacao` (`turmas` no lugar de `categorias`, com `turmaId`, `turma`, `categoria`)
  e `relatorio('pontos')` (coluna `posicaoNaTurma` da última publicação da turma). A RPC
  `pendencias_da_categoria` sai das telas (fica para compatibilidade, só coordenação).
- **Motivo:** FR-013 a FR-016 e SC-006 (mesmos números na tela de ranking, no painel da turma e no
  início da coordenação: todos leem as mesmas funções).

## R10. Avisos de publicação

- **Decisão:** `app.avisar` para atribuições ativas com `turma_id` = turma publicada e papel aluno,
  docente ou mentor; título "Ranking parcial publicado — 3º ano A".
- **Motivo:** FR-012a.

## R11. Testes existentes da spec 007 e 008

- **Decisão:** `publicar_ranking(edicao, categoria, …)` passa a recusar com "A publicação por
  categoria foi substituída pela publicação por turma." Os testes pgTAP `008` e `009` e o script
  `testar-concorrencia-publicacao.mjs` que publicam por categoria migram para
  `publicar_ranking_turmas`, sem perder asserções; os casos de revisão sobre publicação antiga usam
  uma publicação por categoria inserida como fixture.
- **Motivo:** mantém a rede de segurança das specs 007 e 008 sobre o fluxo novo.

## R12. Demonstração

- **Decisão:** `src/modules/demo/resultado.ts` passa a ter publicações fictícias por turma (3º ano
  A parcial; 3º ano B sem publicação) e premiação calculada por uma função de domínio pura
  `premiacaoDaTurma` (em `@/modules/resultado/domain`), testada com Vitest; publicar e decidir
  continuam recusados na demonstração.
- **Motivo:** o modo demonstração não grava (spec 001); a função pura deixa os casos de empate e de
  posição pulada testáveis sem banco.

## R13. Desempenho

- **Decisão:** índice `publicacoes_ranking (turma_id, versao desc) where turma_id is not null`;
  `ranking_da_edicao` calcula pendências turma a turma (dezenas de turmas por edição).
- **Motivo:** mesma escala das specs anteriores; sem metas numéricas presumidas (RNF08).
