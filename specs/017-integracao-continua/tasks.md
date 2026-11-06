---
description: 'Tarefas da spec 017 — Integração contínua das verificações'
---

# Tasks: Integração contínua das verificações

**Input**: `specs/017-integracao-continua/` (plan.md, spec.md, research.md, data-model.md,
contracts/fluxo-ci.md, quickstart.md)

**Tests**: obrigatórios (constituição II, TDD). O teste da estrutura do fluxo
(`scripts/ci/fluxo.test.ts`) é escrito e visto **falhando** antes de existir o `ci.yml`. A prova
de ponta a ponta (FR-014) usa falhas injetadas numa proposta descartável.

**Limites**: nenhuma alteração no aplicativo; nenhum segredo; nenhuma configuração do repositório
é alterada pelo pipeline (a regra de proteção é passo manual do dono).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Adicionar `yaml` como `devDependency` em `package.json` e `package-lock.json` (`npm install -D yaml`), usada só pelo teste do fluxo. O working tree tem mudanças soltas alheias à spec em `package.json` (script `dev:host`): commitar só o hunk de `yaml` com `git add -p`
- [x] T002 [P] Incluir `scripts/ci/**/*.test.ts` na lista `test.include` de `vite.config.ts` (sem alterar mais nada do arquivo; o ajuste solto `server.host` do working tree fica fora do commit: `git add -p`)

---

## Phase 2: Foundational (bloqueia as histórias)

- [x] T003 Escrever `scripts/ci/fluxo.test.ts` (RED) conforme `contracts/fluxo-ci.md`, lendo `.github/workflows/ci.yml` com `yaml`: gatilhos (`pull_request` em `main`, `push` em `main`, `workflow_dispatch`; sem `pull_request_target`/`schedule`); os quatro nomes de job exatos e únicos (`qualidade`, `banco`, `jornadas-demo`, `jornadas-supabase`) sem `needs`; `runs-on: ubuntu-24.04` e `timeout-minutes` em todo job (15, 15, 20, 25); `permissions` global só `contents: read`; `concurrency` com `cancel-in-progress` condicionado a `pull_request`; comandos `npm run verify`, `supabase test db`, `npm run test:e2e`, `npm run test:e2e:supabase` presentes e iguais aos scripts do `package.json`; ausência de `secrets.`, `service_role`, `supabase link`, `db push` e `--db-url`; ações de terceiros só `actions/*` e `supabase/setup-cli`; nenhum passo faz `eval`/`export` da saída inteira de `supabase status` nem imprime `SERVICE_ROLE_KEY`, `SECRET_KEY` ou `JWT_SECRET` (só `PUBLISHABLE_KEY` é lida). Rodar `npm run test -- scripts/ci/fluxo.test.ts` e ver falhar (arquivo inexistente)

**Checkpoint**: teste vermelho pelo motivo esperado.

---

## Phase 3: User Story 1 - Todo PR mostra o resultado das verificações (Priority: P1) 🎯 MVP

**Goal**: as quatro verificações rodam sozinhas em cada proposta e aparecem na proposta.

**Independent Test**: abrir uma proposta e ver os quatro contextos iniciarem e terminarem; o
teste de estrutura passa.

- [x] T004 [US1] Criar `.github/workflows/ci.yml` com nome `CI`, gatilhos, `permissions: contents: read`, `concurrency` (grupo `ci-${{ github.event.pull_request.number || github.ref }}`, `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`), `env.CI: true` e o job `qualidade` (checkout, `actions/setup-node` Node 22 com `cache: npm`, `npm ci`, `npm run verify`, `timeout-minutes: 15`)
- [x] T005 [US1] No mesmo arquivo, adicionar o job `banco` (checkout, `supabase/setup-cli` com `version: 2.118.0`, `supabase start`, `supabase test db`, `timeout-minutes: 15`); sem `link`, sem `db push`, sem `--db-url`
- [x] T006 [US1] No mesmo arquivo, adicionar o job `jornadas-demo` (checkout, Node 22 com cache, `npm ci`, cache de `~/.cache/ms-playwright` com chave do `package-lock.json`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, `timeout-minutes: 20`)
- [x] T007 [US1] No mesmo arquivo, adicionar o job `jornadas-supabase` (como `jornadas-demo` mais CLI Supabase 2.118.0 e `supabase start`; copiar `supabase/functions/.env.example` para `supabase/functions/.env`; `supabase functions serve` em segundo plano com espera de prontidão e limite de tempo; chaves locais por `supabase status -o env`, extraindo **somente** `PUBLISHABLE_KEY` (por `grep`/`sed`, sem `eval` e sem exportar nem imprimir `SERVICE_ROLE_KEY`, `SECRET_KEY` ou `JWT_SECRET`), mascarada com `::add-mask::` e exportada como `E2E_SUPABASE_ANON_KEY`, mais `E2E_SUPABASE_URL=http://127.0.0.1:54421`; `npm run test:e2e:supabase`; `timeout-minutes: 25`)
- [x] T008 [US1] Em cada job, acrescentar passo final que escreve em `$GITHUB_STEP_SUMMARY` o comando executado e como reproduzir localmente (texto em português do Brasil)
- [x] T009 [US1] Rodar `npm run test -- scripts/ci/fluxo.test.ts` até ficar verde (GREEN); corrigir o YAML, não o teste, salvo erro de leitura do contrato
- [x] T010 [US1] Publicar a branch, abrir a proposta e conferir a primeira execução: quatro contextos aparecem; registrar duração de cada job. Medir cada job em execução fria e em segunda execução com cache (FR-009: mesmo resultado, menos tempo). Se o total passar de 20 min (80% de SC-003), decidir cache de imagens Docker ou `supabase start -x studio` (apenas serviços sem uso nos testes), registrando a decisão em `research.md` (R5)

**Checkpoint**: US1 entregue; MVP.

---

## Phase 4: User Story 2 - Falha deixa evidência para diagnóstico (Priority: P2)

**Goal**: relatório e traços baixáveis só quando uma verificação de jornadas falha.

**Independent Test**: falha injetada em jornada gera artefato com traço; execução verde não gera.

- [x] T011 [US2] Acrescentar a `scripts/ci/fluxo.test.ts` (RED) a invariante 6: nos jobs de jornadas existe passo `actions/upload-artifact` condicionado a falha (`if: failure()`), com `retention-days: 7`, nomes `jornadas-demo-falha` e `jornadas-supabase-falha` e caminhos `playwright-report/`, `test-results/`, `test-results-supabase/`; os jobs `qualidade` e `banco` não enviam artefatos
- [x] T012 [US2] No `ci.yml`, adicionar o passo de upload de artefatos de falha aos jobs `jornadas-demo` (`playwright-report/`, `test-results/`) e `jornadas-supabase` (`playwright-report/`, `test-results-supabase/`), com `if: failure()`, `retention-days: 7` e `if-no-files-found: ignore`; ver T011 passar
- [x] T013 [US2] Em `jornadas-supabase`, também enviar o registro das funções servidas (saída do `supabase functions serve`, redirecionada a arquivo) junto do artefato de falha, para diagnosticar erros de Edge Function

**Checkpoint**: falhas de jornada deixam evidência (conferido em T019).

---

## Phase 5: User Story 3 - Mesclagem só com tudo verde (Priority: P2)

**Goal**: o dono consegue exigir as quatro verificações, seguindo só a documentação.

**Independent Test**: seguir o passo a passo e comprovar o bloqueio com verificação vermelha.

- [x] T014 [US3] Em `docs/operacao-e-homologacao.md`, criar a seção "Integração contínua" em português do Brasil (na primeira menção, "proposta de mudança (PR)"; depois, um só termo): o que cada verificação cobre, como reproduzi-la localmente, onde baixar os artefatos de falha, como reexecutar; passo a passo pela interface (Settings → Branches/Rulesets → exigir os contextos `qualidade`, `banco`, `jornadas-demo` e `jornadas-supabase` e branch atualizada) e, como alternativa, o comando `gh api` do dono; declarar que o pipeline não altera configurações
- [x] T015 [P] [US3] Em `README.md`, acrescentar o selo de status do fluxo `CI` e um parágrafo curto "Integração contínua" apontando para `docs/operacao-e-homologacao.md`
- [x] T016 [P] [US3] Em `CLAUDE.md`, acrescentar uma linha: a CI roda os mesmos portões em toda proposta para o `main`; os nomes das verificações obrigatórias estão em `docs/operacao-e-homologacao.md`

**Checkpoint**: documentação completa; bloqueio comprovado depois de configurado pelo dono (T021).

---

## Phase 6: User Story 4 - Verificação do main e execução manual (Priority: P3)

**Goal**: execução após cada mesclagem e disparo manual.

**Independent Test**: mesclar e ver a execução do `main`; disparar manualmente e ver o resultado.

- [x] T017 [US4] Confirmar no `ci.yml` os gatilhos `push` em `main` e `workflow_dispatch` (já cobertos por T003) e que `cancel-in-progress` é falso fora de propostas; na seção de T014, documentar como reexecutar (botão "Re-run" e "Run workflow") e quando usar após falha de infraestrutura

**Checkpoint**: validado após a mesclagem (T022).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T018 Em branch descartável a partir desta, injetar uma falha em cada grupo (asserção falsa em um teste de unidade, um `select ok(false, 'falha injetada')` em um arquivo pgTAP, uma asserção falsa em `e2e/` e outra em `e2e-supabase/`), abrir proposta, ver os quatro jobs vermelhos cada um pelo seu motivo e reenviar commit duas vezes (3 de 3, FR-014/SC-002); descartar a branch e a proposta sem mesclar
- [x] T019 Na mesma execução de T018, baixar os artefatos de falha dos dois jobs de jornadas e confirmar relatório e traço (SC-004); conferir que a execução verde da proposta de entrega não gerou artefatos
- [x] T020 [P] Conferir SC-007 e a borda de fork: revisar o `ci.yml` final sem `secrets.*`, sem banco remoto, com permissões mínimas e sem nenhum passo que dependa de segredo (propostas de fork rodam igual); o teste de T003 já cobre, registrar a leitura manual em `quickstart.md`
- [X] T021 Pedir ao dono do repositório que configure a regra de proteção seguindo `docs/operacao-e-homologacao.md` e registrar o tempo gasto (SC-006) e a comprovação do bloqueio (US3); sem a permissão, registrar como pendência do dono em `docs/decisoes-e-pendencias.md`
- [x] T022 Depois da mesclagem, conferir a execução do `main` e disparar uma execução manual (US4); registrar os resultados
- [x] T023 Preencher "Resultado da validação" em `specs/017-integracao-continua/quickstart.md` (durações, execuções, número de testes) e rodar `npx prettier --write` apenas nos arquivos tocados
- [x] T024 Portões locais finais: `npm run verify` (inclui o teste do fluxo) e conferir que nada fora do escopo mudou (`git status`)

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003) → US1 (T004–T010) → US2 (T011–T013) → US3/US4 (docs) → Polish.
- T004–T008 editam o mesmo arquivo `ci.yml`: sequenciais.
- T011 antes de T012 (teste primeiro). T014 antes de T017 (mesma seção).
- T018 depende de T010 (fluxo funcionando) e T012 (artefatos); T019 usa a execução de T018.
- T021 e T022 dependem de intervenção externa (dono e mesclagem); não bloqueiam o restante.

### Parallel Opportunities

- T001 e T002 são independentes (T002 só toca `vite.config.ts`).
- T015 e T016 (README e CLAUDE.md) em paralelo com T014.
- T020 em paralelo com T018/T019.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1 (T001–T010): CI verde nas propostas.
2. US2 (evidência de falha), depois US3/US4 (documentação e bloqueio).
3. Polish: prova por falha injetada, bloqueio pelo dono, validação no `main`.

## Coverage

| Requisito              | Tarefas                |
| ---------------------- | ---------------------- |
| FR-001, FR-002, FR-003 | T003–T009              |
| FR-004, FR-005, FR-013 | T003, T005, T007, T020 |
| FR-006                 | T011–T013, T019        |
| FR-007, FR-008, FR-009 | T003, T004, T006, T010 |
| FR-010                 | T017, T022             |
| FR-011, FR-012         | T014–T016              |
| FR-014, SC-002         | T018                   |
| SC-001, SC-003         | T010                   |
| SC-004                 | T019                   |
| SC-005, SC-006         | T021                   |
| SC-007                 | T003, T020             |
