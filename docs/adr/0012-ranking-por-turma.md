# ADR 0012 — Ranking publicado por turma

- **Status:** aceita (2026-11-04)
- **Contexto:** o PRD descreve o ranking e o desempate "por categoria" (RF14, HU05, risco
  "múltiplos cursos incomparáveis"), e a spec 007 publicou a classificação por categoria. Com a
  spec 011, cada turma pode ter regras e encontros próprios, então equipes de turmas diferentes
  podem ter pontuações máximas diferentes e deixam de ser comparáveis. O usuário decidiu (spec
  011, 2026-11-03) que a classificação passa a ser por turma; pela governança da constituição,
  vale a instrução mais recente do usuário. As publicações por categoria já feitas são
  imutáveis e estão ligadas a pedidos de revisão, exceções de prazo e auditoria.
- **Decisão:**
  1. acrescentar `turma_id` (e `lote_id`) em `publicacoes_ranking`: publicação nova é sempre de
     uma turma; as linhas antigas, com `turma_id` nulo, passam a ser "por categoria (anterior)",
     sem nenhuma alteração. A unicidade da versão passa a ser por turma (índices parciais);
  2. publicar várias turmas numa chamada (`publicar_ranking_turmas`), cada uma em subtransação
     própria, com versão base para concorrência: a recusa de uma turma não desfaz as outras;
  3. as publicações anteriores ficam só para a coordenação; pedido de revisão novo sobre elas é
     recusado por gatilho, e os já abertos seguem o fluxo da spec 007;
  4. a premiação da edição vale para cada turma pela definitiva; empate numa posição premiada é
     decidido pela coordenação e guardado em `decisoes_premiacao`, ligado à publicação.
- **Alternativas rejeitadas:** tabela nova de publicações por turma (duplicaria as chaves de
  revisão, exceções e auditoria); converter as publicações antigas em publicações por turma
  (reescreveria posições congeladas, contra a imutabilidade); publicação tudo-ou-nada em lote
  (rejeitada no esclarecimento da spec 012); regra automática de divisão do prêmio em empate
  (inventaria regra de competição, contra a constituição X).
- **Consequências:** `publicar_ranking` por categoria passa a ser recusada; painéis, painel da
  turma e relatório de pontos leem a publicação da turma. A categoria continua como atributo da
  turma e da equipe (formação de equipes, filtros de relatório) e no encerramento da edição.
