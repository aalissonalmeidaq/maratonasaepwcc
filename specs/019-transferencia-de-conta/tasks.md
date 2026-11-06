---
description: 'Tarefas da spec 019 — Transferência de conta entre unidades'
---

# Tasks: Transferência de conta entre unidades

**Input**: `specs/019-transferencia-de-conta/` (plan.md, spec.md, research.md, data-model.md,
contracts/transferencia.md, quickstart.md)

**Tests**: obrigatórios (constituição II, TDD): cada teste é escrito e visto **falhando** antes do
código que o satisfaz. A regra mora no banco; o pgTAP é a prova principal.

**Convenções**: uma migration nova (`20261115120000_transferencia_de_conta.sql`), sem editar as
antigas; fixtures do pgTAP com sufixos de uuid em **hexadecimal**; toda RPC nova começa por
`perform app.exigir_conta_ativa();` e `app.exigir_master()` (a varredura do 017 falha se faltar).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Registrar a linha de base: `npm run verify` (arquivos/testes de unidade), `npx supabase db reset --local && npm run test:db` (arquivos/testes pgTAP) e anotar em `specs/019-transferencia-de-conta/quickstart.md` (seção de resultado)

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T002 Criar `supabase/tests/018_transferencia_de_conta.test.sql` (RED) com o cenário fictício (Unidade I e Unidade B ativas, gestão `g1` e `g2`, coordenação `c1` coordenando uma edição ativa junto com `c2`, docente `d1` com vínculo de turma, mentora `m1` com vínculo de curso e derivados, analista `a1`, estudante `s1`, master `ma`, tudo com funções em `funcoes_unidade`) e a verificação estrutural: tabela `transferencias_de_conta` existe com RLS ligada e sem privilégio direto a `anon`/`authenticated`; `update public.perfis set unidade_id = …` como `authenticated` e como `postgres` sem o marcador continua recusado com `23514` "A unidade da conta não muda."; ver falhar
- [X] T003 Migration `supabase/migrations/20261115120000_transferencia_de_conta.sql` (parte 1): tabela `public.transferencias_de_conta` (campos e regras de `data-model.md`: `chave_envio` único, `unidade_destino <> unidade_origem`, `justificativa` com `char_length` entre 10 e 2000, `funcoes_anteriores jsonb not null`, `vinculos_encerrados integer not null check (>= 0)`, `autor_id default auth.uid()`, `criado_em default now()`; índice `(usuario_id, criado_em)`), RLS ligada com política de leitura só para `app.e_master()`, `revoke all` de `anon`/`authenticated`, gatilho de imutabilidade (sem update/delete), gatilho `app.registrar_auditoria`, política restritiva `conta_ativa` como as demais tabelas; e as funções `app.proteger_unidade_do_perfil()` (aceita a mudança de `unidade_id` só com `current_setting('app.transferencia_em_curso', true) = 'on'`) e `app.garantir_coordenacao_ativa()` (ignora a regra quando esse marcador está ligado, pois a RPC já validou as edições não encerradas) substituídas por `create or replace`; rodar `db reset` e o T002 até passar

**Checkpoint**: estrutura pronta; histórias liberadas.

---

## Phase 3: User Story 1 - O master transfere uma conta de equipe (Priority: P1) 🎯 MVP

**Goal**: a conta muda de unidade, chega sem funções e não acessa a origem.

**Independent Test**: transferir uma docente da Unidade I para a B; ela pertence à B, sem funções, sem acesso a nada, e a gestão da B a vê.

- [ ] T004 [US1] Em `018_transferencia_de_conta.test.sql` (RED): `equipe_de_unidade_da_rede(unidade I)` como master devolve só contas de equipe com as chaves `usuarioId, nome, email, funcoes, situacaoAcesso, ativo`, sem a estudante `s1` e sem o master; como gestão/coordenação/docente é `42501`; `transferir_conta(chave, d1, I, B, 'Mudança de unidade da docente.')` como master devolve um uuid; depois `perfis.unidade_id` de `d1` é a B, nenhuma função ativa, nenhum vínculo ativo, contagens totais de `funcoes_unidade` e `atribuicoes` iguais às de antes e nenhum vínculo ativo (derivado ou não); `m1` (mentora com vínculos derivados) e uma coordenadora única de edição **encerrada** também são transferidas sem erro; `d1` não lê edições, turmas, cadastro nem perfis da I nem da B (matriz de leituras); `equipe_da_unidade()` da gestão da B lista `d1` com `funcoes = []`; a gestão da B atribui `docente` a `d1` com `definir_funcoes` e `d1` passa a ter função na B; a gestão e a coordenação da I seguem lendo o histórico (edição encerrada e atribuições inativas) com a mesma contagem de antes; ver falhar
- [ ] T005 [US1] Migration (parte 2): `public.equipe_de_unidade_da_rede(p_unidade uuid) returns jsonb` (security definer, `search_path = ''`, `perform app.exigir_conta_ativa()`, `app.exigir_master()`, só contas com função de equipe, sem estudantes) e `public.transferir_conta(p_chave uuid, p_usuario uuid, p_unidade_origem uuid, p_unidade_destino uuid, p_justificativa text) returns uuid` com o caminho feliz: guarda, `exigir_master`, idempotência por `chave_envio`, `select … for update` no perfil, `set_config('app.justificativa', …, true)`, inativa as `atribuicoes` **diretas** (`origem_id is null`; as derivadas de mentor acompanham pela trigger de sincronia, pois `proteger_derivadas` recusa alteração direta) e as `funcoes_unidade` (`ativa = false`, `desativada_com_conta = false`) da conta, grava `transferencias_de_conta` com `funcoes_anteriores` e `vinculos_encerrados`, liga `app.transferencia_em_curso = 'on'`, atualiza `perfis.unidade_id`, desliga o marcador e limpa `app.justificativa`; `revoke` de `public`/`anon` e `grant` a `authenticated`; rodar `db reset` e `npm run test:db` até o T004 passar e o 017 (varreduras) continuar verde
- [ ] T006 [P] [US1] `src/modules/rede/domain/tipos.ts` e `validacao.ts` (+ `validacao.test.ts` primeiro, RED): tipo `ContaDeEquipe` (`usuarioId, nome, email, funcoes[], situacaoAcesso, ativo`), `PedidoDeTransferencia` e esquema Zod com `justificativa` aparada de 10 a 2.000 caracteres e destino obrigatório diferente da origem, mensagens em português ("Justifique com 10 a 2.000 caracteres.", "A unidade de destino deve ser outra.")
- [ ] T007 [US1] `src/modules/rede/data/repositorioSupabase.ts` (+ teste primeiro): `equipeDaUnidadeDaRede(unidadeId)` (valida a resposta com Zod) e `transferirConta(pedido)` (gera a chave de idempotência no cliente; traduz recusas `42501`/`23514` na mensagem do servidor); exportar pelo `index.ts` do módulo
- [ ] T008 [P] [US1] `src/modules/demo/rede.ts` (+ `rede.test.ts` primeiro): equipe fictícia por unidade e `transferirConta` em memória (muda a conta de unidade, zera as funções, devolve o id; as recusas básicas — mesma unidade e justificativa curta — como o servidor)
- [ ] T009 [US1] `src/modules/rede/ui/TransferirConta.tsx` (+ `TransferirConta.test.tsx` primeiro, com axe): lista "Equipe da unidade" (nome, e-mail, funções, situação) com botão "Transferir…" por conta ativa; diálogo "Transferir <nome>" com `SelectField` "Unidade de destino" (unidades ativas exceto a de origem), `TextAreaField` "Justificativa" e botões "Transferir"/"Cancelar" reaproveitando `DialogoDeJustificativa`; foco devolvido; erro do servidor dentro do diálogo; sucesso só depois da resposta, com o aviso do contrato e a lista atualizada
- [ ] T010 [US1] Ligações do app: `src/app/dados/consultas.ts` (`useEquipeDaUnidadeDaRede(unidadeId)`), `repositorios.tsx` e `useRepositorios.ts` (novo método no repositório de rede), `src/modules/rede/ui/Unidades.tsx` (botão "Ver equipe" por unidade ativa que abre `TransferirConta`) e `src/app/paginas/master.tsx` (+ teste); invalidar as consultas de unidades e de equipe depois do sucesso
- [ ] T011 [US1] E2E de demonstração `e2e/transferencia.spec.ts`: master abre Rede › Unidades, vê a equipe, transfere uma docente com justificativa, vê o aviso e a docente sai da lista; adicionar a tela (com o diálogo aberto) ao axe de `e2e/acessibilidade.spec.ts` em desktop e celular
- [ ] T012 [US1] E2E Supabase `e2e-supabase/transferencia.spec.ts`: master cria uma unidade, transfere `docente@exemplo.invalid` da unidade inicial para ela (pela tela), a gestão da nova unidade (convidada na jornada) a vê sem funções e atribui "docente"; a docente entra antes disso e vê "aguardando permissão"; a conta transferida é criada pela própria jornada (função `contas-da-rede`, ação `equipe`, com a função docente), de modo que o seed não é alterado

**Checkpoint**: US1 entregue; MVP.

---

## Phase 4: User Story 2 - Transferências que deixariam a origem sem responsável são recusadas (Priority: P1)

**Goal**: toda recusa do contrato acontece, com mensagem clara e sem mudança.

**Independent Test**: tentar cada recusa e conferir mensagem e que nada mudou.

- [ ] T013 [US2] Em `018_transferencia_de_conta.test.sql` (RED): cada linha do contrato (`contracts/transferencia.md`) com `throws_ok`/mensagem exata e código: não-master (`g1`, `c1`, `d1`, `a1` e visitante) `42501`; conta fora da unidade de origem; origem = destino; origem ou destino desativada; conta desativada; master; estudante; conta sem função; última gestão ativa (`g1` sozinha na I); última coordenação ativa de edição não encerrada (`c1` sozinha); justificativa curta, só espaços e de 2.001 caracteres; para cada caso, conferir que `perfis`, `funcoes_unidade`, `atribuicoes` e `transferencias_de_conta` ficaram idênticos (contagens e estado); ver falhar nos casos ainda não implementados
- [ ] T014 [US2] Migration (parte 3): completar `transferir_conta` com todas as recusas e mensagens do contrato, na ordem do contrato, reaproveitando `app.e_ultima_coordenacao` e uma verificação nova de última gestão ativa; mensagens em português e `errcode` `42501`/`23514`; rodar até o T013 passar
- [ ] T015 [US2] Front: teste (primeiro) e ajuste em `TransferirConta` para exibir a mensagem de recusa do servidor dentro do diálogo e manter os dados digitados; teste de domínio para as validações locais (justificativa, destino); demonstração recusa os mesmos casos básicos; E2E de demonstração cobre uma recusa (justificativa curta) e uma do servidor simulada

**Checkpoint**: recusas completas.

---

## Phase 5: User Story 3 - A transferência é auditada e não perde nada (Priority: P2)

**Goal**: auditoria com os cinco dados, nada apagado, idempotência e concorrência.

**Independent Test**: transferir uma conta com vínculos e conferir auditoria, contagens e repetição.

- [ ] T016 [US3] Em `018_transferencia_de_conta.test.sql` (RED): após uma transferência, exatamente 1 linha em `transferencias_de_conta` com autor, origem, destino, justificativa, `funcoes_anteriores` e `vinculos_encerrados` corretos, e exatamente 1 linha nova em `auditoria` (`tabela = 'transferencias_de_conta'`) com a justificativa; a tabela é imutável (`update`/`delete` recusados); contagens de `funcoes_unidade` e `atribuicoes` idênticas antes e depois (inativas, nenhuma apagada), inclusive vínculos derivados de mentora e de edição encerrada; mesma `chave_envio` devolve o mesmo id e não cria registro nem muda nada; segunda transferência da mesma conta com a origem desatualizada é recusada ("Esta conta não é da unidade de origem."); transferência de volta à unidade original não reativa vínculos antigos; `reativar_membro` no destino não reativa funções da origem; conta com convite de primeiro acesso pendente é transferida e o convite segue valendo; só o master lê `transferencias_de_conta` (gestão, coordenação e docente leem 0 linhas)
- [ ] T017 [US3] Ajustar a migration (parte 4) até o T016 passar (por exemplo, garantir `desativada_com_conta = false` nas funções da origem, bloqueio `for update` e recusa da origem desatualizada); rodar `npm run test:db` completo
- [ ] T018 [P] [US3] Se a leitura do histórico de transferências for útil à tela, **não** incluir agora (fora de escopo); apenas registrar em `docs/decisoes-e-pendencias.md` que a consulta do histórico é possível via auditoria e `transferencias_de_conta`

**Checkpoint**: auditoria e preservação provadas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Documentação: `docs/adr/0013-multiunidade.md` (nota sobre a transferência e o caminho único de mudança de unidade), `docs/decisoes-e-pendencias.md` (nova seção 6.16 da spec 019 com as decisões do usuário), `docs/operacao-e-homologacao.md` (como o master transfere; efeito sobre funções e vínculos; lembrar que a gestão do destino define as funções) e `src/modules/rede/README.md`
- [ ] T020 [P] Conferir que a varredura do 017 cobre as RPCs novas (guarda de conta ativa e política restritiva na tabela nova) sem ajuste; se faltar, corrigir a migration, não o teste
- [ ] T021 Portões completos: `npx supabase db reset --local`; `npm run test:db`; `npm run verify`; `npm run test:e2e`; com `supabase functions serve` e `E2E_SUPABASE_*`, `npm run test:e2e:supabase`; registrar contagens em `quickstart.md`; `npx prettier --write` só nos arquivos tocados (não reformatar `src/modules/pontuacao/domain/tipos.ts`)
- [ ] T022 Commitar com `git add` explícito (sem `.specify/`, sem os ajustes soltos `dev:host`/`server.host` e sem a seção alheia de `docs/decisoes-e-pendencias.md` se ainda estiver só no working tree), abrir o PR para o `main` e aguardar as quatro verificações da CI verdes antes de pedir autorização para mesclar

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T003) → US1 (T004–T012) → US2 (T013–T015) → US3 (T016–T018) → Polish (T019–T022).
- T004 antes de T005; T006/T008 antes de T007/T009 (tipos e demonstração primeiro); T009 antes de T010; T010 antes de T011/T012.
- T013 antes de T014 (a migration cresce na mesma função); T016 antes de T017.
- As partes 2, 3 e 4 da migration são o **mesmo arquivo**: sequenciais, em ordem.

### Parallel Opportunities

- T006 e T008 (domínio e demonstração) em paralelo.
- T019 e T020 em paralelo depois de US3.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1 (T001–T012): o master transfere uma conta com o caminho feliz e isolamento provado.
2. US2 (todas as recusas) e US3 (auditoria, preservação, idempotência).
3. Polish: documentação, portões e PR com a CI verde.

## Coverage

| Requisito      | Tarefas                |
| -------------- | ---------------------- |
| FR-001         | T004, T013             |
| FR-002         | T004, T013             |
| FR-003         | T006, T013, T014       |
| FR-004         | T013, T014             |
| FR-005, FR-006 | T004, T005, T016, T017 |
| FR-007, FR-012 | T004, T016             |
| FR-008         | T004, T012             |
| FR-009         | T016, T017             |
| FR-010         | T016, T017             |
| FR-011         | T009–T012              |
| FR-013         | T021                   |
| SC-001         | T011, T012             |
| SC-002         | T013                   |
| SC-003         | T004, T012             |
| SC-004, SC-005 | T016                   |
| SC-006         | T004                   |
