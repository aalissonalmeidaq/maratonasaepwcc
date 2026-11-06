---
description: 'Tarefas da spec 016 — Unidades, usuário master e gestão da unidade'
---

# Tasks: Unidades, usuário master e gestão da unidade

**Input**: `specs/016-unidades-e-master/` (plan.md, spec.md, research.md, data-model.md,
contracts/rpc.md, contracts/telas.md, quickstart.md)

**Tests**: obrigatórios (constituição II, TDD): cada teste é escrito e visto **falhando** antes do
código que o satisfaz.

**Compatibilidade das suítes antigas**: as fixtures pgTAP inserem edições e contas direto. Para
não reescrever 16 arquivos, (a) `edicoes.unidade_id` e `cadastro_cursos.unidade_id` têm como
padrão a unidade inicial (`app.unidade_inicial()`), e (b) uma conta sem unidade recebe a unidade
da edição na primeira atribuição (gatilho). As RPCs de produção sempre informam a unidade.
**Salvaguarda (S1):** `app.unidade_inicial()` só devolve a unidade quando a instalação tem uma
única unidade; com duas ou mais, recusa com erro — esquecer a unidade vira erro, nunca
vazamento silencioso.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Criar o esqueleto do módulo `src/modules/rede/` (`index.ts`, `README.md`, `domain/`, `data/`, `ui/`) importado só via `@/modules/rede`
- [X] T002 [P] Criar `docs/adr/0013-multiunidade.md` com as decisões R1–R4 e R8 de research.md (modelo, isolamento, master, funções × atribuições)

---

## Phase 2: Foundational (bloqueia todas as histórias)

- [X] T003 Escrever `supabase/tests/017_unidades.test.sql` (falhando) — estrutura e migração: tabelas `unidades`, `masters`, `funcoes_unidade` com RLS e sem `select/insert/update/delete` para `anon`/`authenticated`; enum `funcao_unidade` = (`gestao`, `coordenacao`, `docente`, `mentor`, `analista`); colunas `perfis.unidade_id`, `edicoes.unidade_id` (`not null`), `cadastro_cursos.unidade_id` (`not null`); unidade "SENAI Juazeiro do Norte" existe, ativa; edições, cursos do cadastro e perfis do seed pertencem a ela; funções criadas das atribuições ativas (coordenação, docente, mentor); nenhuma linha em `masters` nem função `gestao` vindas da migração; premissa P25 com `resolvida_por = 'spec 016'`
- [X] T004 Criar `supabase/migrations/20261110120000_unidades.sql` (parte 1, modelo e migração): `unidades` (`nome` 2–120 caracteres, único por `lower(btrim(nome))`; `ativa not null default true`; `desativada_em`; `justificativa_desativacao`; `criado_em`); `masters` (`usuario_id` PK → `perfis`, `ativo not null default true`); `funcoes_unidade` (PK `usuario_id, funcao`; `ativa not null default true`); `app.unidade_inicial()`; colunas novas com padrão `app.unidade_inicial()` em `edicoes`/`cadastro_cursos`; unicidade do curso do cadastro por (`unidade_id`, `lower(btrim(nome))`); migração dos dados (research R3); P25 resolvida; RLS ligada sem políticas, `revoke all`; gatilhos `registrar_auditoria`; até T003 passar; `app.unidade_inicial()` recusa (`23514` "Informe a unidade.") quando houver mais de uma unidade (S1); índices em `perfis.unidade_id` e `edicoes.unidade_id`
- [X] T005 Acrescentar a `017_unidades.test.sql` (falhando) a integridade: atribuição de conta de outra unidade recusada (`23514`); atribuição `coordenacao`/`docente`/`mentor` sem a função na unidade recusada; conta sem unidade recebe a unidade da edição na primeira atribuição; `perfis.unidade_id` não muda depois de definida; master não tem unidade; vínculo de turma do cadastro de outra unidade recusado; com duas unidades, inserir edição ou curso do cadastro sem `unidade_id` é recusado (S1); atribuição para conta que é master é recusada (S3)
- [X] T006 Na migration (parte 2), gatilhos de integridade em `atribuicoes`, `perfis`, `masters` e no vínculo do cadastro (`vincular_turmas`), e `app.criar_perfil_do_usuario` gravando `raw_user_meta_data ->> 'unidade_id'`; até T005 passar; recusar atribuição de conta master (S3)
- [X] T007 Acrescentar a `017_unidades.test.sql` (falhando) os auxiliares: `app.e_master()`, `app.unidade_do_usuario()`, `app.tem_funcao(funcao_unidade)` (só com unidade ativa); `app.tem_papel`, `app.participa_da_edicao`, `app.e_coordenacao`, `app.e_coordenacao_em_alguma`, `app.coordena_alguma_edicao` devolvem falso com a unidade desativada; `minha_conta()` devolve `nome`, `master`, `unidade {id, nome, ativa}`, `funcoes`, `papeis` (e `unidade` nula para master)
- [X] T008 Na migration (parte 3), auxiliares novos, auxiliares centrais com unidade ativa e `public.minha_conta()`; até T007 passar; rodar `npm run test:db` inteiro (suítes 001–016 verdes)
- [X] T009 [P] Testes de `src/modules/acesso/domain/permissoes.test.ts` (falhando): áreas `master`, `gestao`, `analista`; prioridade master → gestão → coordenação → docente → analista → aluno; `areasDaSessao` com funções acumuladas (gestão + coordenação → as duas áreas); analista por função; conta de unidade desativada → destino `unidade-desativada`
- [X] T010 Implementar as áreas em `src/modules/acesso/domain/permissoes.ts` (tipos `Area`, `FuncaoUnidade`, `areasDaSessao`, `areaInicial`) até T009 passar
- [X] T011 Testes do adaptador em `src/modules/auth/data/adaptadorSupabase.test.ts` (falhando): sessão montada por `minha_conta()` com `master`, `unidade`, `funcoes`, `papeis`; implementar em `adaptadorSupabase.ts` e no tipo `Sessao` (`src/modules/auth/domain/sessao.ts`)
- [X] T012 Rotas e proteção das áreas novas em `src/app/rotas.tsx` e `src/modules/auth` (`RotaProtegida` aceita `master`, `gestao`, `analista`; página "Unidade desativada. Procure a gestão da rede."); menu "Trocar de área" e nome da unidade no cabeçalho em `src/app/layout/AppShell.tsx`/`Menu.tsx`, com testes em `src/app/layout/Menu.test.tsx`
- [X] T013 [P] Demonstração: contas "Master (fictício)", "Gestão da unidade (fictícia)", "Analista (fictício)" e unidades fictícias em `src/modules/demo/dados.ts` e `src/modules/auth/data/adaptadorDemo.ts`, com teste em `src/modules/demo`

**Checkpoint**: modelo, migração, integridade, sessão e áreas prontos; suítes antigas verdes.

---

## Phase 3: User Story 1 - Master cadastra unidades e a gestão (Priority: P1) 🎯 MVP

**Goal**: master gere unidades, contas de gestão e masters.

**Independent Test**: como master, cadastrar a "Unidade C" com gestão; entrar com a gestão e ver
só a Unidade C.

- [X] T014 [US1] Acrescentar a `017_unidades.test.sql` (falhando): `unidades_da_rede`, `cadastrar_unidade` (chave idempotente; nome repetido → `23514` "Já existe uma unidade com esse nome."), `renomear_unidade`, `definir_situacao_unidade` (justificativa obrigatória ao desativar), `definir_gestao` (recusa desativar a última gestão ativa), `masters_da_rede`, `definir_master` (recusa a si mesmo e o último master); todas recusam não master (`42501`); `app.promover_master` sem `execute` para `authenticated`; master recusado em RPCs de edição (`painel_da_coordenacao`, `ranking_da_turma`, `relatorio`) e sem leitura de `duplas`, `notas`… (FR-004, SC-004); auditoria de cada mudança
- [X] T015 [US1] Na migration (parte 4), RPCs de master e `app.promover_master` conforme contracts/rpc.md, até T014 passar
- [X] T016 [P] [US1] Testes da Edge Function em `supabase/functions/_shared/contasDaRede.test.ts` (falhando): validação do pedido (`acao` master/gestao/equipe, nome, e-mail, `unidadeId`, `funcoes` sem `gestao`), autorização por ação, compensação quando a gravação das funções falha; o reenvio é a ação `reenviar` da própria `contas-da-rede` (master para gestão e masters; gestão para a equipe; demais recusados) — a `reenviar-convite` existente continua só da coordenação da edição (C1)
- [X] T017 [US1] Implementar `supabase/functions/contas-da-rede/index.ts` e a lógica em `supabase/functions/_shared/contasDaRede.ts` (convite ADR 0009; `unidade_id` no `raw_user_meta_data`; funções/master gravados por RPC como quem chama) até T016 passar; `reenviar-convite` aceita master (gestão e masters) e gestão (equipe)
- [X] T018 [P] [US1] Domínio e repositório em `src/modules/rede/domain/` (tipos, validação: nome da unidade 2–120, e-mail) e `src/modules/rede/data/repositorioSupabase.ts` (+ testes)
- [X] T019 [US1] Telas `src/modules/rede/ui/Unidades.tsx` e `Masters.tsx` (+ testes com axe) conforme contracts/telas.md: lista, cadastrar unidade com gestão opcional, renomear, desativar/reativar com `ConfirmDialog` e justificativa, acrescentar/desativar gestão, reenviar convite, convidar/desativar master; confirmação só após o servidor
- [X] T020 [US1] Área do master em `src/app/paginas/master.tsx` (início com "Unidades sem gestão"), menu em `src/app/navegacao.ts` (+ teste) e rotas `/master`, `/master/unidades`, `/master/masters`; repositório ligado em `src/app/dados/` e na demonstração (escritas recusadas)

**Checkpoint**: master opera sozinho; nenhum dado de edição exposto a ele.

---

## Phase 4: User Story 2 - Gestão da unidade cria a equipe (Priority: P1)

**Goal**: gestão cria contas da equipe, edições e designa coordenação; coordenação vincula só
pessoas da unidade; analista lê painéis e relatórios.

**Independent Test**: como gestão, criar coordenação e docente, criar edição com a coordenação;
entrar como a coordenação e ver só a edição da unidade.

- [X] T021 [US2] Acrescentar a `017_unidades.test.sql` (falhando): `equipe_da_unidade` (sem estudantes), `definir_funcoes` (sem `gestao`; recusa tirar `coordenacao` da última coordenação ativa de edição não encerrada), `desativar_membro`/`reativar_membro` (mesma regra, mensagem "Indique outra coordenação antes."), `criar_edicao` por gestão (com `p_coordenacao` obrigatória e com a função `coordenacao`) e por coordenação (ela mesma), edição na unidade de quem chama; `definir_coordenacao_da_edicao` (gestão ou coordenação da edição; mantém uma ativa); `edicoes_da_unidade`; `pessoas_para_vincular` só da unidade; gestão sem leitura de dados de estudantes; analista lê `painel_da_coordenacao` e `relatorio` da sua unidade e nada mais (sem escrita)
- [X] T022 [US2] Na migration (parte 5), RPCs de gestão, `criar_edicao` e `pessoas_para_vincular` alterados, `definir_coordenacao_da_edicao`, `app.e_analista_da_edicao` nas RPCs de painel e relatório, até T021 passar
- [X] T023 [US2] `criar-conta` e `importar-alunos` (`supabase/functions/`) gravam a unidade da edição no `raw_user_meta_data`, com teste em `supabase/functions/_shared`
- [X] T024 [P] [US2] Telas `src/modules/rede/ui/EquipeDaUnidade.tsx` e `EdicoesDaUnidade.tsx` (+ testes com axe): cadastrar pessoa com funções, trocar funções, desativar/reativar, reenviar convite; criar edição escolhendo a coordenação; acrescentar/retirar coordenação
- [X] T025 [US2] Área da gestão em `src/app/paginas/gestao.tsx` (início com totais), menu e rotas `/gestao`, `/gestao/equipe`, `/gestao/edicoes`; coordenação: `FormEdicao`/criar edição continua; vínculo de docentes lista só pessoas da unidade (servidor); ajustar `src/modules/organizacao/data/repositorioSupabase.ts` (`criarEdicao` envia `p_coordenacao`, nulo quando quem cria é a coordenação) e o formulário de criação de edição, com teste do repositório (U1)
- [X] T026 [US2] Área do analista em `src/app/paginas/analista.tsx` (painel da edição sem links de ação — prop `somenteLeitura` em `PainelCoordenacao` — e relatórios), menu e rotas `/analista`, `/analista/relatorios`, com testes

**Checkpoint**: uma unidade nova fica pronta para a coordenação em até 4 cadastros (SC-002).

---

## Phase 5: User Story 3 - Cada unidade só vê o que é seu (Priority: P1)

**Goal**: isolamento verificado em profundidade; regulamento público com a unidade.

**Independent Test**: com duas unidades, cada perfil da Unidade A não lê nem altera nada da B.

- [X] T027 [US3] Acrescentar a `017_unidades.test.sql` (falhando onde faltar proteção) a matriz de isolamento com Unidade A e B completas: coordenação, docente, mentor, estudante e analista da A contra `edicoes`, `cursos`, `turmas`, `duplas`, `encontros`, notas/avaliações, `ocorrencias`, `comunicados`, `cadastro_cursos`/`cadastro_turmas`, `painel_da_coordenacao`, `relatorio`, `ranking_da_turma`, `pessoas_para_vincular`, `edicoes_que_coordeno`; escrita cruzada recusada; unidade B desativada → contas da B recusadas em leitura e escrita (FR-009); varrer as funções `public` que não usam os auxiliares centrais (perfil próprio, avisos, marcar comunicado lido, `minha_conta`, RPCs de master e gestão) e cobrir cada uma com teste de unidade desativada ou registrar por que não se aplica (S2)
- [X] T028 [US3] Corrigir na migration (parte 6) o que T027 apontar (políticas do cadastro permanente por unidade, RPCs de cadastro e qualquer outra) até T027 passar
- [X] T029 [P] [US3] Regulamento público com a unidade: pgTAP em `supabase/tests/015_regulamento_publico.test.sql` (chave `unidade`), RPC na migration (parte 7), tipos/validação em `src/modules/publico` e "Unidade: <nome>" na página (+ testes)
- [X] T030 [US3] Seed local em `supabase/seed.sql`: `master@exemplo.invalid` (master), `gestao@exemplo.invalid` (gestão da unidade inicial), `analista@exemplo.invalid`, mantendo **uma única unidade** no seed (a salvaguarda S1 recusa gravar sem unidade quando há duas; as fixtures antigas dependem do padrão). Segunda unidade só dentro dos testes: no pgTAP `017`, criada na transação com `unidade_id` explícito; no E2E, cadastrada pelo master na tela
- [X] T031 [US3] E2E Supabase `e2e-supabase/unidades.spec.ts`: master cadastra "Unidade C" com gestão (convite no Mailpit), gestão cria coordenação e edição, coordenação vê só a Unidade C; coordenação da C não vê a unidade inicial e a coordenação da unidade inicial não vê a C; analista vê painel e relatório

---

## Phase 6: User Story 4 - Master responde às premissas (Priority: P2)

**Goal**: só o master responde; demais leem; aviso no início do master.

**Independent Test**: master responde; coordenação lê sem formulário e é recusada ao responder.

- [X] T032 [US4] Ajustar `supabase/tests/016_premissas.test.sql` (falhando): só master responde (`42501` "Somente o master registra respostas às premissas." para coordenação); leitura por master (`podeResponder = true`), gestão, coordenação, docente, mentor (`false`); analista e estudante → `42501`
- [X] T033 [US4] Na migration (parte 8), `responder_premissa` e `premissas_em_validacao` conforme contracts/rpc.md, até T032 passar
- [X] T034 [US4] Front: rota `/master/premissas` e `/gestao/premissas`; `AvisoDePremissas` sai do início da coordenação e vai para o do master (`src/app/paginas/master.tsx`); testes de `coordenacao.test.tsx` e `e2e-supabase/premissas.spec.ts` ajustados (master responde; coordenação só lê); demonstração: `podeResponder` só para o master

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T035 [P] E2E de demonstração `e2e/unidades.spec.ts` (master, gestão e analista entram e navegam; escritas recusadas) e telas novas em `e2e/suporte/telasPrincipais.ts`/`e2e/acessibilidade.spec.ts` (axe desktop e celular)
- [X] T036 [P] Documentação: `docs/decisoes-e-pendencias.md` (seção 6.14; P25 resolvida), `docs/operacao-e-homologacao.md` (primeiro master: `select app.promover_master('<email>')`), `README.md`, `src/modules/rede/README.md`
- [X] T037 Portões: `npx supabase db reset --local`, `npm run test:db`, `npm run verify`, `npm run test:e2e`, `npm run test:e2e:supabase`; registrar contagens em `quickstart.md`

---

## Dependencies & Execution Order

- Setup → Foundational (T003–T013) → US1, US2, US3, US4.
- US1 (master) antes de US2 (a gestão nasce do master) e de US4 (o master responde).
- US3 depende de US1/US2 para a matriz completa e o seed; T029 (regulamento) pode correr em
  paralelo depois da Foundational.
- A migration é um arquivo único em partes: tarefas de banco são sequenciais entre si.

## Parallel Example

```text
Foundational: T009 (acesso) e T013 (demonstração) em paralelo com T003–T008 (banco).
US1: T016 (Edge Function) e T018 (domínio do front) em paralelo com T014/T015.
US2: T024 (telas) em paralelo com T021/T022.
Polish: T035 e T036 juntos.
```

## Implementation Strategy

1. Foundational + US1: master cadastra unidades e gestão (já resolve a P25).
2. US2: a gestão monta a equipe e as edições (uma unidade nova funciona sozinha).
3. US3: matriz de isolamento e regulamento com a unidade.
4. US4: premissas só pelo master.

## Rastreabilidade

| Requisito              | Tarefas                     |
| ---------------------- | --------------------------- |
| FR-001, FR-002         | T004, T014–T017, T020       |
| FR-003                 | T014, T015, T019, T020      |
| FR-004, SC-004         | T014, T021, T027            |
| FR-005                 | T016, T017, T021–T024       |
| FR-006, FR-006c        | T021, T022, T024, T025      |
| FR-006a                | T021, T022, T026            |
| FR-006b                | T003–T006, T009–T012        |
| FR-007                 | T005, T006, T021, T022      |
| FR-008, FR-009, SC-001 | T005–T008, T027, T028, T031 |
| FR-010, SC-003         | T003, T004, T008, T037      |
| FR-011                 | T029                        |
| FR-012, FR-013         | T032–T034                   |
| FR-014                 | T004, T014, T021            |
| SC-002                 | T031                        |
