# Tasks: Ranking por turma

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `012-ranking-por-turma` | **Criação**: 2026-11-03.
**Testes**: obrigatórios pela Constituição II e pela spec (SC-001 a SC-007). Em cada história, escreva e rode o teste antes do código e confirme que ele falha porque o comportamento ainda não existe (RED); só então implemente (GREEN).

**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`.

**Convenções**:

- Uma só migration: `supabase/migrations/20261106120000_ranking_por_turma.sql`, escrita em partes, sempre acrescentando ao fim.
- Toda RPC é `security definer` com `search_path = ''`, não executável por `anon`. Erros: `42501` (sem permissão), `23514` (regra violada, em português), `P0002` (não encontrado). Justificativa por `app.registrar_justificativa` (10 a 2000 caracteres).
- pgTAP novo em `supabase/tests/013_ranking_turma.test.sql`, com seções no marcador `-- @@secoes`.
  - Fixtures: edição E (ativa) com curso K (categoria "Categoria K", turmas KA e KB) e curso L (categoria "Categoria L", turma LA); KA com equipes QA1, QA2 e QA3; KB com QB1 e QB2; LA sem equipes; encontros 1 (passado) e 2 (futuro); coordenação `c`; docente `d` em KA; mentor `m` do curso K; alunos `a1` (QA1) e `b1` (QB1); edição G encerrada com uma turma GA.
  - Publicação por categoria (anterior) como fixture: inserida com `set local session_replication_role = replica` (sem gatilhos), com `turma_id` nulo, para a "Categoria K".
- Os testes pgTAP 001–012, o E2E e o script de paridade são a rede de segurança; os testes 008 e 009 migram para a publicação por turma sem perder asserções (R11).
- Toda tela nova passa no axe (`src/test/a11y.ts`), funciona a partir de 360 px e é operável por teclado.

## Fase 1: Preparação

- [x] T001 Conferir o ambiente e registrar o estado inicial em `specs/012-ranking-por-turma/quickstart.md` (seção "Resultados"): pgTAP 001–012, `npm run verify`, `npm run test:e2e` e `node scripts/testar-paridade-calculo.mjs`.
- [x] T002 [P] Tipos em `src/modules/resultado/domain/tipos.ts` conforme o [data-model.md](data-model.md): `TurmaNoRanking`, `ResultadoLote`, `PremiacaoDaTurma` (situação `'a_definir' | 'provisorio' | 'final' | 'empate_a_decidir'`), `PendenciasDaCategoria` renomeado para `PendenciasDoRanking` (mesmo formato), `PublicacaoRanking` com `turmaId: string | null` e `turma: string | null` (`null` = por categoria anterior); `RepositorioResultado` com um método por RPC nova de [contracts/rpc.md](contracts/rpc.md) (`rankingDaEdicao`, `pendenciasRankingTurma`, `publicarRankingTurmas`, `rankingDaTurma`, `historicoPublicacoesTurma`, `publicacoesAnteriores`, `premiacaoDaEdicao`, `decidirPremiacaoEmpate`), mantendo `rankingPublicado` e `historicoPublicacoes` para as anteriores; `publicarRanking` e `pendenciasDaCategoria` ficam marcados `@deprecated` até T020 (a demonstração do painel da coordenação ainda os usa) e são removidos lá; exportar por `src/modules/resultado/index.ts` e corrigir os usos pelo `tsc`.

## Fase 2: Fundação (bloqueia as histórias)

- [x] T003 RED: criar `supabase/tests/013_ranking_turma.test.sql` com as fixtures e a seção "fundação": `publicacoes_ranking` tem `turma_id` (FK `turmas`, `on delete restrict`) e `lote_id`; índice único `(turma_id, versao) where turma_id is not null` e `(edicao_id, categoria, versao) where turma_id is null`; a restrição antiga `publicacoes_versao_unica` não existe; inserir linha nova com `turma_id` nulo: `23514`; turma de outra edição: `23514`; a fixture anterior continua com posições, totais e estado originais; `publicar_ranking(E, 'Categoria K', 'parcial', null)`: `23514` "A publicação por categoria foi substituída pela publicação por turma."; `app.equipes_da_turma(KA)` = QA1, QA2, QA3 (só ativas); `app.pendencias_do_ranking_da_turma(KA)` só com equipes de KA, no formato `{componentes, ocorrencias, revisoes}`; `app.pendencias_realizadas_da_turma` só com componentes de encontros realizados; `app.provas_pendentes_da_turma`; `app.ultima_publicacao_da_turma`.
- [x] T004 GREEN: parte "fundação" da migration: colunas, índices e gatilho de recusa (publicação nova sem turma; turma de outra edição); remoção de `publicacoes_versao_unica`; índice `publicacoes_turma_idx (turma_id, versao desc) where turma_id is not null`; `public.publicar_ranking` recriada só com a recusa; funções `app.equipes_da_turma`, `app.pendencias_do_ranking_da_turma`, `app.pendencias_realizadas_da_turma`, `app.provas_pendentes_da_turma`, `app.ultima_publicacao_da_turma` (com `revoke`/`grant` como na spec 007). Rodar até T003 passar e confirmar que 001–012 continuam verdes, exceto as asserções de publicação por categoria de 008 e 009, que migram em T009 e T019.
- [x] T005 Repositório e demonstração: `src/modules/resultado/data/repositorioSupabase.ts` (+ teste com cliente simulado; escritas com `verificarGravacao`) com os métodos de T002; `src/modules/demo/resultado.ts` (+ teste) com publicações fictícias por turma (3º ano A **definitiva** com empate no 1º lugar, sem decisão de premiação; 3º ano B sem publicação), uma publicação por categoria anterior e escritas recusadas na demonstração; hooks em `src/app/dados/consultas.ts`: `useRankingDaEdicao`, `usePendenciasRankingTurma`, `useRankingDaTurma`, `useHistoricoPublicacoesTurma`, `usePublicacoesAnteriores`, `usePremiacaoDaEdicao` (`usePendenciasDaCategoria` sai em T020).

## Fase 3: US1, coordenação publica o ranking de cada turma (P1) 🎯 MVP

**Teste independente**: publicar o 3º ano A como parcial e ver só equipes dele; definitiva do 3º ano A recusada por pendência dele enquanto o 3º ano B é publicado no mesmo lote.

- [x] T006 [US1] RED: seção "US1" no pgTAP: `publicar_ranking_turmas(E, [{KA, null}], 'parcial', null)` por `c` cria a versão 1 de KA com posições só de QA1–QA3, desempate da spec 007 e posição compartilhada, `categoria` = "Categoria K", autoria e horário; lote `[{KA, 1}, {KB, null}]` definitivo com pendência só em KA: KA recusada com a lista e KB publicada, ambas na resposta (`publicada`, `versao`, `motivo`) e KB com `lote_id`; `versaoBase` desatualizada: recusa da turma com "O ranking desta turma mudou desde que você abriu a tela; recarregue."; 2ª versão sem justificativa: recusa; LA (sem equipes): recusa "A turma não tem equipes ativas."; reenvio idêntico: mesma versão, nenhuma linha nova; turmas repetidas, mais de 100 ou de outra edição: `23514`; estado desconhecido: `23514`; provisória com `revisao_ate` pelas regras vigentes da turma (ajustar `prazos.revisaoHoras` de KA por `gravar_ajustes_turma` e conferir); avisos `ranking_publicado` só para atribuições ativas de KA (aluno, docente, mentor), nenhum para `b1`; por `d`, `m`, `a1`: `42501`; em G: `23514`; `ranking_da_edicao(E)` lista KA, KB e LA com estado, versão e pendências **dos encontros realizados** (pendência só no encontro 2, futuro, não conta; a definitiva de KA ainda é recusada por ela); `pendencias_ranking_turma(KA)`; `historico_publicacoes_turma(KA)` com autor e justificativa; auditoria das linhas novas; equipe movida de KA para KB depois da publicação: a versão publicada de KA não muda e a próxima publicação usa a composição atual.
- [x] T007 [US1] GREEN: parte "US1" da migration: `public.publicar_ranking_turmas` (subtransação por turma com `begin … exception`, `pg_advisory_xact_lock` por turma, `lote_id` comum, reenvio idêntico, `app.avisar` por turma — [research.md](research.md) R2, R3, R5, R10), `public.ranking_da_edicao`, `public.pendencias_ranking_turma`, `public.historico_publicacoes_turma`. Rodar até T006 passar.
- [x] T008 [P] [US1] Migrar `scripts/testar-concorrencia-publicacao.mjs` para `publicar_ranking_turmas` na mesma turma e mesma `versaoBase`: uma versão e uma recusa; fixtures apagadas ao fim.
- [x] T009 [US1] Migrar `supabase/tests/008_resultado_oficial_ranking.test.sql`: chamadas a `publicar_ranking` por categoria passam a `publicar_ranking_turmas` com a turma das equipes do teste, mantendo cada asserção (estados, desempate, recusa da definitiva, justificativa, revisão sobre a provisória, imutabilidade); registrar em `quickstart.md` qualquer asserção reescrita.
- [x] T010 [P] [US1] RED+GREEN: `src/modules/resultado/ui/ListaTurmasRanking.tsx` (+ teste com axe): tabela responsiva conforme o [contrato de telas](contracts/telas.md) — seleção por turma e "Selecionar todas", turma, categoria, equipes, última publicação (`StatusBadge` + versão e data, ou "Não publicado"), pendências ("Nenhuma" quando zero), nome que abre o detalhe.
- [x] T011 [P] [US1] RED+GREEN: `src/modules/resultado/ui/PainelPublicacao.tsx` (adaptado, + teste) e `ResultadoDoLote.tsx` (novo, + teste com axe): estado, justificativa obrigatória quando alguma turma marcada já tem publicação, "Publicar N turmas" desabilitado sem seleção; conclui só após a resposta; resultado com "Publicadas" (turma, versão) e "Recusadas" (turma, motivo, "Recarregar" quando a versão mudou).
- [x] T012 [US1] Tela `/coordenacao/ranking` em `src/app/paginas/resultado.tsx`: `RankingDaCoordenacao` passa a usar `ListaTurmasRanking`, `PainelPublicacao` com as `versaoBase` carregadas, `ResultadoDoLote` e o detalhe da turma (pendências, última versão com `TabelaRanking`, histórico); remove o seletor de categoria.

## Fase 4: US2, aluno vê o ranking da própria turma (P1)

**Teste independente**: com a parcial do 3º ano A, `aluna@` vê só equipes dele, com o estado e o detalhe da própria equipe; o painel inicial mostra a mesma posição; ninguém do 3º ano B aparece.

- [x] T013 [US2] RED: seção "US2" no pgTAP: `ranking_da_turma(KA)` por `a1` traz posições de KA com `detalhe` só de QA1 e `minha` verdadeiro nela; por `b1`: `42501`; por `d` (docente de KA) e `m` (mentor do curso K): `detalhe` de todas; docente sem atribuição em KA: `42501`; por `c`: completo; KB sem publicação: `null`; sem nota individual nem e-mail em nenhum campo; `painel_do_aluno(E)` por `a1` com `ranking` da publicação de KA e, com provisória de KA no prazo, a ação `revisao_publicacao`; `pedir_revisao` de `a1` sobre a provisória de KA aceita; `b1` sobre a mesma: `23514` "A publicação não inclui a sua equipe.".
- [x] T014 [US2] GREEN: parte "US2" da migration: `public.ranking_da_turma` ([research.md](research.md) R6) e `public.painel_do_aluno` recriada (publicação da turma em `ranking` e na ação de revisão). Rodar até T013 passar.
- [x] T015 [P] [US2] RED+GREEN: `src/modules/resultado/ui/TabelaRanking.tsx` (+ `ranking.test.tsx`): título "Ranking da turma", turma no cabeçalho, sem publicação "Ranking da turma ainda não publicado"; estado e detalhe só da própria equipe, como antes.
- [x] T016 [US2] Páginas do aluno em `src/app/paginas/resultado.tsx`: `RankingDaEquipe` lê `useRankingDaTurma` (aviso "Classificação da sua turma" com o desempate) e `PedirRevisaoDosPontos` usa a publicação provisória da turma; indicador "Posição" em `src/modules/relatorios/ui/PainelAluno.tsx` com "na turma" (+ teste) e `src/modules/demo/paineis.ts` pela publicação fictícia da turma.

## Fase 5: US3, painéis e turma mostram o ranking da turma (P2)

**Teste independente**: `docente@` vê o ranking do 3º ano A no painel da turma e em "Pontos da turma"; no início da coordenação, pendências e estado por turma batem com a tela de ranking; o relatório de pontos traz a posição na turma.

- [x] T017 [US3] RED: seção "US3" no pgTAP: `painel_da_turma(KA)` com `pontuacao` da última publicação de KA (estado e equipes de KA), sem depender da categoria; `painel_da_coordenacao(E)` com `turmas` (KA, KB, LA: `turmaId`, `turma`, `categoria`, contadores de encontros realizados, `publicacao`) e sem a chave `categorias`; contadores iguais aos de `ranking_da_edicao` (ambos só de encontros realizados, SC-006); `relatorio('pontos', E)` com a coluna `posicaoNaTurma` (vazia em KB sem publicação); por `d`, `relatorio` só com KA.
- [x] T018 [US3] GREEN: parte "US3" da migration: `public.painel_da_turma`, `public.painel_da_coordenacao` e `public.relatorio` recriadas ([research.md](research.md) R9). Rodar até T017 passar.
- [x] T019 [US3] Migrar `supabase/tests/009_paineis_relatorios.test.sql` para a publicação por turma e para `turmas` no painel da coordenação, mantendo cada asserção; registrar em `quickstart.md` as reescritas.
- [x] T020 [P] [US3] RED+GREEN: `src/modules/relatorios/domain/tipos.ts` (`CategoriaDoPainel` → `TurmaDoPainelCoordenacao`) e `src/modules/relatorios/ui/PainelCoordenacao.tsx` (+ teste): seção "Pendências dos encontros realizados" com um cartão por turma (categoria abaixo do nome, estado da última publicação); indicador "Pendências abertas" soma as turmas e "Em N turmas"; demonstração em `src/modules/demo/paineis.ts`; remover `pendenciasDaCategoria`, `publicarRanking` e `usePendenciasDaCategoria` marcados em T002/T005.
- [x] T021 [P] [US3] "Pontos da turma" em `src/app/paginas/resultado.tsx` (`PontosDaGestao`): para a turma escolhida, prévia (spec 007) e ranking publicado da turma com `useRankingDaTurma`.

## Fase 6: US4, histórico por categoria preservado (P3)

**Teste independente**: a publicação por categoria anterior aparece só para a coordenação, com os valores originais; não é possível criar uma nova; um pedido de revisão aberto sobre ela é respondido.

- [x] T022 [US4] RED: seção "US4" no pgTAP: `publicacoes_anteriores(E)` por `c` lista "Categoria K" com versões e última; `ranking_publicado(E, 'Categoria K')` e `historico_publicacoes(E, 'Categoria K')` por `c` com os valores da fixture; por `a1`, `d`, `m`: `42501`; `pedir_revisao` novo sobre a anterior: `23514` "Esta publicação por categoria é anterior; peça revisão sobre o ranking da sua turma."; pedido aberto pré-existente (fixture) respondido por `responder_revisao` normalmente e visível para `a1` em `pedidos_revisao`.
- [x] T023 [US4] GREEN: parte "US4" da migration: `public.publicacoes_anteriores`; `public.ranking_publicado` e `public.historico_publicacoes` recriadas só para a coordenação e só com `turma_id` nulo; gatilho `before insert` em `pedidos_revisao` ([research.md](research.md) R7). Rodar até T022 passar.
- [x] T024 [US4] Seção recolhida "Publicações por categoria (anteriores)" em `RankingDaCoordenacao` (`src/app/paginas/resultado.tsx`): categorias com histórico; ao abrir, última versão (`TabelaRanking`) e `HistoricoPublicacoes`, só leitura.

## Fase 7: premiação por turma (FR-018, FR-018a, FR-018b — complementa US1 e US2)

**Teste independente**: com a definitiva do 3º ano A, premiados finais por turma; com empate em posição premiada, "Empate a decidir" até a coordenação registrar a decisão; `docente@` vê a provisória, `aluna@` só a final.

- [x] T025 [P] [US1] RED+GREEN: `src/modules/resultado/domain/premiacao.ts` (+ `.test.ts`): `premiacaoDaTurma(publicacao | null, itens, decisoes, perfil)` → `PremiacaoDaTurma`: sem publicação ou última parcial → `a_definir`; provisória → `provisorio` para coordenação/docente/mentor e `a_definir` sem equipes para aluno; definitiva → `final`, ou `empate_a_decidir` quando uma posição premiada tem `compartilhada` sem decisão; equipes por posição igual ao número do prêmio; posição pulada por empate (1, 1, 3) → item sem equipe com `semEquipePorEmpate`; decisão aplicada substitui as equipes do item pelas `premiadas`.
- [x] T026 [US1] RED: seção "premiação" no pgTAP: `decisoes_premiacao` existe com RLS (`select` só coordenação; sem escrita direta), checks "`decisao` 3 a 500 caracteres", "`premiadas` não vazio", única por `(publicacao_id, posicao)`, imutável e auditada; `premiacao_da_edicao(E)` por `c` (todas as turmas), `d`/`m` (só KA, com provisória) e `a1` (só KA, final só após a definitiva) com as situações de T025; `decidir_premiacao_empate` por `c` sobre a definitiva de KA com empate no 1º: grava e a situação vira `final`; sobre publicação parcial, posição sem prêmio, posição sem empate, `premiadas` com equipe fora do empate, publicação que não é a mais recente da turma ou já decidida: `23514`; por `d`, `a1`: `42501`; nova definitiva de KA volta a `empate_a_decidir` e a decisão anterior continua na tabela.
- [x] T027 [US1] GREEN: parte "premiação" da migration: tabela `decisoes_premiacao` conforme o [data-model.md](data-model.md) (RLS, imutabilidade, auditoria), `public.premiacao_da_edicao`, `public.decidir_premiacao_empate` ([research.md](research.md) R8). Rodar até T026 passar.
- [x] T028 [P] [US1] RED+GREEN: `src/modules/resultado/ui/PremiacaoPorTurma.tsx` e `FormDecisaoEmpate.tsx` (+ testes com axe): cartão por turma com a situação em texto ("A definir", "Provisório — não final", "Final", "Empate a decidir"), prêmios com posição, descrição e equipes, "Sem equipe nesta posição (empate na posição anterior)"; formulário só no empate, com as empatadas como opções, decisão e justificativa; conclui só após a resposta; aviso permanente de valores e condições a confirmar.
- [x] T029 [US1] `/coordenacao/premiacao` em `src/app/paginas/coordenacao.tsx` com dados reais (`usePremiacaoDaEdicao` e `PremiacaoPorTurma`), substituindo a versão só de demonstração; a demonstração usa `premiacaoDaTurma` em `src/modules/demo/resultado.ts`.
- [x] T030 [US2] "Premiação da turma" no ranking do aluno e em "Pontos da turma" (`src/app/paginas/resultado.tsx`): aluno só a final da própria turma; docente/mentor também a provisória, marcada "Provisório — não final".

## Fase 8: Acabamento

- [x] T031 [P] E2E de demonstração em `e2e/jornadas.spec.ts` (describe "ranking por turma (spec 012, demonstração)"): coordenação vê a lista de turmas e a publicação desabilitada; aluna vê "Ranking da turma" só do 3º ano A; premiação mostra "Empate a decidir" no 3º ano A; ajustar os testes existentes que liam "categoria".
- [x] T032 [P] E2E real: migrar `e2e-supabase/resultado.spec.ts` e `e2e-supabase/paineis.spec.ts` para a publicação por turma; criar `e2e-supabase/ranking-turma.spec.ts` (serial, timeout 180 s): coordenação publica 3º ano A e 3º ano B em lote como parcial; `aluna@` vê só o 3º ano A e a posição no painel; `iris@` vê só o 3º ano B; definitiva com recusa parcial mostrada no resultado do lote; conferir o SC-003 contando as interações a partir de `/coordenacao/ranking` (escolher o estado, publicar; marcar turmas não conta), no máximo 3.
- [x] T033 [P] Documentação: `docs/decisoes-e-pendencias.md` (§6.10 com o que foi implementado e desvios), `docs/requisitos-e-referencias.md` (RF14, RF16, HU05 por turma), `docs/arquitetura.md` (módulo `resultado` com premiação), `src/modules/resultado/README.md` e ADR curta `docs/adr/0012-ranking-por-turma.md` (contexto e divergência com o PRD, decisão de coluna `turma_id` na tabela existente, alternativa de tabela nova rejeitada, publicações anteriores preservadas e só para a coordenação).
- [x] T034 Portões finais e registro em `specs/012-ranking-por-turma/quickstart.md`: `npm run verify`, `npm run test:db`, `npm run test:e2e`, `npm run test:e2e:supabase`, `node scripts/testar-concorrencia-publicacao.mjs` e os demais scripts de concorrência, paridade; `npx supabase db reset` ao fim; desvios registrados.

## Dependências

- Fase 1 → Fase 2 (colunas, funções de turma, repositório) → histórias.
- US1 primeiro (MVP): sem publicação por turma, as demais histórias não têm o que ler.
- US2 depende de US1 (lê a publicação da turma). US3 depende de US1 e US2 (painéis e testes 009). US4 depende só da Fundação. A premiação depende de US1 (definitiva) e T030 de US2.
- Partes da migration são sequenciais (mesmo arquivo); tarefas de UI [P] correm em paralelo com a parte SQL da mesma história depois do RED.

## Paralelismo por história

- **Fundação:** T002 em paralelo com T003; T005 depois de T004.
- **US1:** T008, T010 e T011 em paralelo depois de T007; T009 depois de T007; T012 depois de T010 e T011.
- **US2:** T015 em paralelo com T014; T016 depois de ambos.
- **US3:** T020 e T021 em paralelo depois de T018; T019 depois de T018.
- **US4:** T024 depois de T023.
- **Premiação:** T025 a qualquer momento depois de T002; T028 em paralelo com T027; T029 e T030 depois de T027 e T028.
- **Acabamento:** T031–T033 em paralelo; T034 por último.

## Estratégia

1. **MVP:** Fases 1–3 (publicação por turma, em lote, com a lista da coordenação).
2. **Leitura:** US2 (aluno) e US3 (painéis e relatório).
3. **Histórico e premiação:** US4 e Fase 7.
4. Acabamento e portões.
