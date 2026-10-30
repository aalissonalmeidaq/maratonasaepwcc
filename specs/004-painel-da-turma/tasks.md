# Tasks: Painel da turma

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `004-painel-da-turma` | **Atualização**: 2026-10-30. A lista foi regenerada depois do esclarecimento que escolheu a opção B: pontuação fictícia na demonstração.
**Testes**: obrigatórios (SC-002, SC-003 e Constituição II). Em cada história, escrever e executar os testes RED antes da implementação GREEN.
**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`. As tarefas `[x]` foram concluídas na primeira rodada de implementação. As tarefas `[ ]` foram abertas pela opção B ou ainda estão pendentes.

## Fase 1: Preparação

- [x] T001 Conferir o ambiente local: contêiner `supabase_db_maratona` ativo (portas 5442x) e pgTAP base verde (001–005, 268 asserções) antes da migration desta spec; registrar em `specs/004-painel-da-turma/quickstart.md`. O `npm run verify` completo fica na T018.

## Fase 2: Fundação (servidor e contratos)

- [x] T002 RED: escrever `supabase/tests/006_painel_da_turma.test.sql` com:
  - os cenários de acesso: coordenação, docente, mentor, docente de outra turma, aluno da turma, aluno de outra turma, aluno desativado, coordenação de outra edição, turma inexistente e `anon`;
  - o conteúdo devolvido para cada perfil.

  Executar `npm run test:db` e ver as falhas (FR-001–003, SC-002).

- [x] T003 GREEN: criar `supabase/migrations/20261030150000_painel_da_turma.sql` com `public.painel_da_turma(uuid)` (`security definer`, `search_path = ''`, `execute` só para `authenticated`).
- [x] T004 [P] Definir os tipos `PainelTurma` e `RepositorioPainelTurma` em `src/modules/painel-turma/domain/tipos.ts` e exportar em `src/modules/painel-turma/index.ts`, com o README do módulo.

## Fase 3: US1 — Equipe docente acompanha a turma (P1, MVP)

Objetivo: a gestão vê os indicadores, as equipes, os alunos sem equipe e os encontros, e tem o link "Alterar equipes" (FR-007).
Teste independente: a docente da turma A abre o painel da turma A em até duas interações. O painel da turma B é recusado pelo servidor.

- [x] T005 [P] [US1] RED em `src/modules/painel-turma/domain/painel.test.ts` para `indicadores`, `alunosSemEquipe` e `agruparEncontros` (SC-003).
- [x] T006 [US1] GREEN em `src/modules/painel-turma/domain/painel.ts`.
- [x] T007 [P] [US1] RED em `src/modules/painel-turma/data/repositorioSupabase.test.ts` para o mapeamento dos erros: `42501` vira "Você não tem acesso a esta turma.", e `P0002`/`22P02` viram "Turma não encontrada.".
- [x] T008 [US1] GREEN em `src/modules/painel-turma/data/repositorioSupabase.ts`.
- [x] T009 [P] [US1] RED em `src/modules/painel-turma/ui/PainelTurma.test.tsx` para indicadores, listas, estados vazios, o link "Alterar equipes" e axe.
- [x] T010 [US1] GREEN em `src/modules/painel-turma/ui/PainelTurma.tsx`. `Card` passa a nomear a seção pelo título em `src/shared/ui/Card.tsx`.
- [x] T011 [US1] Integrar `painelTurma` em `src/app/dados/useRepositorios.ts`, `src/app/dados/repositorios.tsx` e `src/app/dados/consultas.ts`, e na demonstração em `src/modules/demo/repositorios.ts`, com teste.
- [x] T012 [US1] Criar as páginas e rotas em `src/app/paginas/painelTurma.tsx` e `src/app/rotas.tsx`, com o seletor "Trocar de turma" e os links de entrada em `src/app/paginas/organizacao.tsx` (FR-006, SC-001).

- [x] T029 [US1] RED + GREEN em `src/modules/painel-turma/ui/PainelTurma.test.tsx` e `src/modules/painel-turma/ui/PainelTurma.tsx`: com 11 equipes ou mais, a lista mostra 10 por página e a busca por nome (`ListaPaginada`/`useListagem` de `@/shared/ui`); o mesmo vale para "Alunos sem equipe". Os indicadores continuam contando a lista inteira (SC-003).

## Fase 4: US2 — Aluno vê o painel da própria turma (P1)

Objetivo: o aluno vê só dados coletivos da própria turma.
Teste independente: a aluna abre "Minha turma" e não vê convites pendentes, "Alterar equipes" nem situação individual. O painel de outra turma é recusado.

- [x] T013 [US2] Criar a visão do aluno no componente, a página `/aluno/turma` e o item de menu "Minha turma" em `src/app/navegacao.ts` (FR-003, FR-006).

## Fase 5: US3 — Pontuação e classificação (P2)

Objetivo (opção B): a RPC real devolve `pontuacao: null` e o bloco mostra só o aviso. Na demonstração, o bloco mostra "pontuação e posição fictícias por equipe com o selo 'Dados fictícios'" (FR-005).
Teste independente: no modo demonstração, a docente vê a tabela "Pontuação das equipes da turma" com o selo. No Supabase local, vê só o aviso, sem números.

- [x] T014 [US3] Criar o bloco "Pontuação e classificação" com o aviso sem números (primeira rodada; o comportamento muda em T019–T026).
- [x] T019 [US3] RED: em `supabase/tests/006_painel_da_turma.test.sql`, afirmar que `painel_da_turma(...) -> 'pontuacao'` é `'null'::jsonb` para a gestão e para o aluno. Executar `npm run test:db` e ver a falha.
- [x] T020 [US3] GREEN: acrescentar `'pontuacao', null` ao `jsonb_build_object` em `supabase/migrations/20261030150000_painel_da_turma.sql`, com um comentário dizendo que não há lançamentos reais até os Incrementos 3/4. Aplicar com `npx supabase db reset`, porque a migration já está aplicada localmente.
- [x] T021 [P] [US3] Acrescentar `PontuacaoDoPainel` em `src/modules/painel-turma/domain/tipos.ts`:
  - `ficticia: boolean`;
  - `estado: 'parcial' | 'provisorio' | 'definitivo'`;
  - `publicada: boolean`: "`estado` diferente de `parcial`". Na visão do aluno, `equipes` fica vazio quando `publicada = false`;
  - `equipes: { equipeId, nome, total, posicao, compartilhada, pendente }[]`, "ordenadas pela posição na categoria", só com o total e sem componentes nem notas individuais.

  O campo fica `pontuacao: PontuacaoDoPainel | null` em `PainelTurma`. Exportar o tipo em `src/modules/painel-turma/index.ts`.

- [x] T022 [P] [US3] RED + GREEN em `src/modules/painel-turma/data/repositorioSupabase.test.ts` e `src/modules/painel-turma/data/repositorioSupabase.ts`: uma resposta sem o campo `pontuacao` vira `pontuacao: null`.
- [x] T023 [P] [US3] RED em `src/modules/painel-turma/ui/PainelTurma.test.tsx`:
  - com `pontuacao: null`, aparece o aviso, sem dígitos no bloco;
  - com pontuação fictícia, aparece a tabela "Pontuação das equipes da turma" (Equipe, Pontos, Posição na categoria), o selo "Dados fictícios" e o selo do estado. O empate aparece como "2º (empate)" e a equipe pendente recebe a nota "lançamentos pendentes";
  - axe sem violações;
  - a visão do aluno com `publicada: false` mostra "Classificação ainda não publicada" e nenhum dígito no bloco; com `publicada: true`, mostra a tabela, sem notas individuais.
- [x] T024 [US3] GREEN em `src/modules/painel-turma/ui/PainelTurma.tsx`, com `ResponsiveTable` e `StatusBadge`. O selo depende só de `pontuacao.ficticia`; o componente não importa `modules/demo`.
- [x] T025 [P] [US3] RED em `src/modules/demo/repositorios.test.ts`: `painelTurma.painel('t-a')` traz `pontuacao.ficticia === true`, só as equipes de `t-a`, ordenadas pela posição na categoria, e o `estado` igual a `edicao.estadoRanking`. Como aluno (`e01`) e com o estado `parcial`, `pontuacao.publicada === false` e `pontuacao.equipes` vazio.
- [x] T026 [US3] GREEN em `src/modules/demo/repositorios.ts`: preencher `pontuacao` a partir de `rankingPorCategoria()` (`src/modules/demo/consultas.ts`), filtrando pela categoria do curso da turma e pelas equipes da turma. Na visão do aluno com o ranking não publicado, devolver `equipes: []`.

## Fase 6: E2E e acabamento

- [x] T015 [P] Escrever o E2E da demonstração em `e2e/jornadas.spec.ts`: o docente chega ao painel em até duas interações, uma turma não vinculada é recusada e o aluno abre "Minha turma" (SC-001, 320–412 px).
- [x] T016 [P] Escrever o E2E real em `e2e-supabase/painel-turma.spec.ts`: docente, recusa, aluna e coordenação (o aviso sem números continua válido no Supabase).
- [x] T027 [US3] Atualizar o E2E da demonstração em `e2e/jornadas.spec.ts`:
  - no painel da docente, trocar a verificação do aviso pela tabela "Pontuação das equipes da turma" com o selo "Dados fictícios";
  - em "Minha turma" da aluna Ana (ranking da demonstração `parcial`), verificar "Classificação ainda não publicada" e a ausência dessa tabela (cenário 5 da US3).
- [x] T017 Atualizar a documentação: `docs/decisoes-e-pendencias.md` (§6.3), `docs/arquitetura.md` e `docs/requisitos-e-referencias.md`.
- [x] T028 Revisar `docs/decisoes-e-pendencias.md` §6.3: trocar "sem números, inclusive na demonstração" pela opção B, registrar a regra de publicação (`parcial` não é publicado) e a divergência da tela "Ranking" da demonstração, que ainda mostra o ranking parcial ao aluno.
- [x] T018 Executar os portões: `npm run verify`, `npm run test:db`, `npm run test:e2e` (com o servidor aquecido na porta 4173) e `npx supabase db reset`, seguido do E2E real. Registrar os resultados em `specs/004-painel-da-turma/quickstart.md`.

## Dependências

- T019 → T020.
- T021 → T022, T023 e T025.
- T023 → T024.
- T025 → T026.
- T024 → T029 (mesmos arquivos, `PainelTurma.tsx` e o teste dele: a paginação entra depois do bloco de pontuação).
- T024 e T026 → T027.
- T029 → T018.
- Tudo → T028 → T018.

O US2 está concluído. Falta ao US1 só a T029 (paginação), que vem depois da T024 porque mexe nos
mesmos arquivos. Em funcionalidade, nenhum dos dois depende do US3.

## Paralelo

- Depois de T021, as tarefas T022, T023 e T025 podem correr em paralelo (arquivos distintos).
- T019/T020 (SQL) correm em paralelo com toda a parte TS.

## Estratégia

O MVP (US1 + US2) está pronto. O incremento atual completa o US3 na demonstração sem tocar nos dados reais, e depois roda os portões completos.
