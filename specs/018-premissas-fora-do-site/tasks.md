---
description: 'Tarefas da spec 018 — Premissas fora do site'
---

# Tasks: Premissas fora do site

**Input**: `specs/018-premissas-fora-do-site/` (plan.md, spec.md, research.md, data-model.md,
contracts/remocao.md, quickstart.md)

**Tests**: obrigatórios (constituição II). Para cada remoção, o teste que prova a ausência é
escrito e visto **falhando** antes da remoção. Testes que só existiam para as premissas são
removidos junto.

**Ordem**: o documento `docs/premissas.md` nasce **antes** de qualquer remoção (Fase 2) para nada
do catálogo se perder. Nenhuma migration antiga é editada; a nova só tem `drop`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Registrar a linha de base antes de mexer: `npm run verify` (testes de unidade e build), `npx supabase db reset --local && npm run test:db` (arquivos e testes pgTAP) e `git grep -c -i premissa` por pasta; anotar os números em `specs/018-premissas-fora-do-site/quickstart.md` (seção de resultado)

---

## Phase 2: Foundational — preservar o registro (bloqueia as remoções)

**Goal**: as 32 premissas ficam em texto no repositório antes de o catálogo sair do código.

- [X] T002 Escrever `scripts/premissas-documento.test.ts` (RED, ambiente `node`, incluído no Vitest trocando em `vite.config.ts` o padrão `scripts/ci/**/*.test.ts` por `scripts/**/*.test.ts`; o working tree tem o ajuste solto `server.host` nesse arquivo, então commitar só este hunk com `git apply --cached`, como na spec 017): lê `docs/premissas.md` e confere P01–P32 sem lacunas nem repetição, cada uma com os seis campos (tema, pergunta terminando em `?`, premissa em uso, onde afeta, referência, resolução), temas dentre os seis válidos e resolução `spec 016` para P25 e `decisão do projeto de 06/11/2026` para as outras 31; ver falhar (arquivo inexistente)
- [X] T003 Gerar `docs/premissas.md` com um script descartável **não commitado** (por exemplo `node --experimental-strip-types` ou um teste temporário) que lê `CATALOGO_PREMISSAS` de `src/modules/demo/premissas.ts` (espelho da migration `20261109120000`) e escreve uma seção por tema, uma linha por premissa com código, pergunta, premissa em uso, onde afeta, opções, referência e resolução; apagar o script; `npx prettier --write docs/premissas.md`
- [X] T004 Conferir `docs/premissas.md` por amostragem contra a migration `20261109120000_premissas_em_validacao.sql` (P01, P13, P25, P32 e duas escolhidas ao acaso) e rodar `npm run test -- scripts/premissas-documento.test.ts` até ficar verde (GREEN); este teste **permanece** depois da remoção do módulo (lê só o documento)

**Checkpoint**: registro preservado e guardado por teste; remoções liberadas.

---

## Phase 3: User Story 2 - O servidor deixa de guardar e expor premissas (Priority: P1) 🎯 MVP

**Goal**: sem tabelas, tipo nem funções de premissas no banco; segurança do resto intacta.

**Independent Test**: no banco local, os objetos não existem e todos os demais testes pgTAP passam.

- [ ] T005 [US2] Em `supabase/tests/017_unidades.test.sql` (RED): remover a verificação da P25 (`select is((select resolvida_por from public.premissas …)`, linha ~45) e acrescentar, antes do `finish()`, um bloco que prova a ausência: `to_regclass('public.premissas')` e `to_regclass('public.respostas_premissas')` nulos; `to_regtype('public.decisao_premissa')` nulo; nenhuma função de nome `premissas_em_validacao`, `responder_premissa`, `recusar_alteracao_de_resposta`, `resposta_json` ou `atua_como_docente_em_alguma` em `pg_proc` dos schemas `public` e `app`; chamar as duas RPCs como `authenticated` falha com `42883`; rodar e ver falhar contra o banco atual
- [ ] T006 [US2] Criar `supabase/migrations/20261114120000_remover_premissas.sql` só com remoções, **nesta ordem** (a função auxiliar de resposta tem parâmetro do tipo da tabela e precisa sair antes dela): (1) `drop function if exists public.premissas_em_validacao()`; (2) `drop function if exists public.responder_premissa(text, public.decisao_premissa, text, uuid)`; (3) `drop function if exists app.resposta_json(public.respostas_premissas)`; (4) `drop table if exists public.respostas_premissas` (os gatilhos caem com ela); (5) `drop table if exists public.premissas`; (6) `drop function if exists app.recusar_alteracao_de_resposta()`; (7) `drop function if exists app.atua_como_docente_em_alguma()`; (8) `drop type if exists public.decisao_premissa`; **sem `cascade`**; cabeçalho com a motivação e a decisão do usuário de 06/11/2026. Atenção à idempotência: se a tabela já não existir, a assinatura de (3) falha ao ser resolvida; envolver (3) em `do $$ … if to_regclass('public.respostas_premissas') is not null then drop function … end if; $$`
- [ ] T007 [US2] Remover `supabase/tests/016_premissas.test.sql` (testava só premissas)
- [ ] T008 [US2] `npx supabase db reset --local` e `npm run test:db` até passar (16 arquivos); conferir que o `db reset` também funciona partindo do zero e que reaplicar a migration não falha (`drop … if exists`); se alguma dependência inesperada aparecer, tratar o objeto pelo nome (nunca `cascade` genérico)

**Checkpoint**: servidor limpo; MVP.

---

## Phase 4: User Story 1 - O site deixa de tratar premissas (Priority: P1)

**Goal**: nenhum perfil vê tela, item de menu, aviso ou rota de premissas.

**Independent Test**: com cada perfil, o menu não tem o item e as quatro rotas antigas mostram "não encontrado".

- [ ] T009 [US1] Testes primeiro (RED): em `src/app/navegacao.test.ts` exigir ausência de "Premissas em validação" e do grupo "Sistema" para master e gestão (e ausência dos caminhos `/docente/premissas` e `/coordenacao/premissas`); criar `e2e/premissas-removidas.spec.ts` (demonstração) que, para master, gestão, coordenação e docente, entra e abre as quatro rotas antigas verificando o heading `Página não encontrada` (h1 de `NaoEncontradaPage` em `src/app/paginas/comum.tsx`) e que o menu não tem o item; rodar e ver falhar (analista, mentor e estudante nunca tiveram o item; já cobertos pelos testes de menu existentes)
- [ ] T010 [US1] Remover rotas, menu e aviso: em `src/app/rotas.tsx` apagar o lazy import `PremissasEmValidacaoPage` e as quatro `<Route path="premissas" …>`; em `src/app/navegacao.ts` apagar os quatro itens e os dois grupos "Sistema"; em `src/app/paginas/master.tsx` apagar `AvisoDePremissas` e seus imports (`contarPorSituacao`, `Alert` se ficar sem uso, `usePremissas`); em `src/app/paginas/master.test.tsx` apagar o teste do aviso (e o arquivo se ficar vazio, mantendo o que testar do início do master)
- [ ] T011 [US1] Remover o módulo e as ligações: apagar `src/modules/premissas/` inteiro, `src/app/paginas/premissas.tsx`, `src/modules/demo/premissas.ts`, `src/modules/demo/premissas.test.ts`, `src/test/fixtures/premissas.ts`; em `src/modules/demo/repositorios.ts` tirar `premissas: criarPremissasDemo(…)` e o import; em `src/app/dados/consultas.ts`, `repositorios.tsx` e `useRepositorios.ts` tirar `usePremissas`, `criarRepositorioPremissasSupabase`, `RepositorioPremissas` e o campo `premissas`
- [ ] T012 [P] [US1] Resíduos de texto (plano R5): em `src/modules/relatorios/domain/csv.ts` tirar `'premissas'` do tipo de `nomeDoArquivo`; em `src/modules/rede/ui/Masters.tsx` tirar "e respondem às premissas" da descrição (e ajustar `Masters.test.tsx` se testar o texto); em `src/shared/dados/erros.ts` trocar o exemplo do comentário do erro 40001 por conflito genérico e em `src/shared/dados/erros.test.ts` trocar a mensagem de exemplo por uma sem "premissa"; em `src/modules/comunicados/domain/validacao.ts` trocar o comentário para citar `docs/premissas.md` (P30)
- [ ] T013 [US1] E2E: apagar `e2e/premissas.spec.ts` e `e2e-supabase/premissas.spec.ts`; tirar as quatro rotas de premissas de `e2e/acessibilidade.spec.ts` e de `e2e/suporte/telasPrincipais.ts`
- [ ] T014 [US1] Criar `e2e-supabase/premissas-removidas.spec.ts`: com o master (`master@exemplo.invalid`) chamar `rpc('premissas_em_validacao')` e `rpc('responder_premissa', …)` e esperar erro de função inexistente (`PGRST202` ou HTTP 404); abrir `/master/premissas` e ver "não encontrado"
- [ ] T015 [US1] `npm run verify` (typecheck, lint, testes, build) até passar sem importações órfãs; `npm run test:e2e` até passar, inclusive `e2e/premissas-removidas.spec.ts` (GREEN do T009)

**Checkpoint**: site limpo nos dois modos.

---

## Phase 5: User Story 3 - O registro das premissas fica na documentação (Priority: P2)

**Goal**: a equipe lê as premissas e o que depende da unidade apenas em documentos.

**Independent Test**: os documentos apontam para `docs/premissas.md` e nenhum manda usar uma tela.

- [ ] T016 [P] [US3] `docs/decisoes-e-pendencias.md`: trocar os trechos que citam a tela "Premissas em validação" e o master respondendo por referência a `docs/premissas.md`; manter a seção 6.14 e o resumo do que depende da unidade na implantação (P13, P32, P01/P02/P06/P08); tags `[Pnn — …]` continuam, com link para o documento
- [ ] T017 [P] [US3] `docs/operacao-e-homologacao.md`: a seção "Premissas em validação (spec 015)" vira "Premissas (spec 018)": sem tela; aponta para `docs/premissas.md`; mantém a lista "Antes de usar dados reais, na implantação" (e-mail, premiação, conferência visual e institucional); atualizar contagem de arquivos pgTAP onde citada
- [ ] T018 [P] [US3] `README.md` e `CLAUDE.md`: retirar o parágrafo e as menções à tela "Premissas em validação" e à rota; apontar para `docs/premissas.md`
- [ ] T019 [P] [US3] Nota de uma linha no topo de `specs/015-premissas-em-validacao/spec.md` e de `specs/016-unidades-e-master/spec.md`: "Retirada do site pela spec 018; o registro das premissas vive em `docs/premissas.md`." (sem reescrever o histórico)

**Checkpoint**: documentação coerente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T020 Busca de resíduos (SC-006): `git grep -n -i "premissas_em_validacao\|responder_premissa\|modules/premissas\|usePremissas\|Premissas em validação" -- src e2e e2e-supabase supabase/functions supabase/tests` deve retornar 0 linhas; fora disso só migrations antigas, `specs/`, docs e o documento de premissas
- [ ] T021 Portões completos: `npx supabase db reset --local`; `npm run test:db`; `npm run verify`; `npm run test:e2e`; com `supabase functions serve` e as variáveis `E2E_SUPABASE_*`, `npm run test:e2e:supabase`; registrar contagens em `quickstart.md`; `npx prettier --write` só nos arquivos tocados (não reformatar `src/modules/pontuacao/domain/tipos.ts`)
- [ ] T022 Commitar com `git add` explícito (sem `.specify/`, sem os ajustes soltos `dev:host` e `server.host`), abrir o PR para o `main` e aguardar as quatro verificações da CI verdes antes de pedir autorização para mesclar

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T004) → US2 (T005–T008) → US1 (T009–T015) → US3 (T016–T019) → Polish (T020–T022).
- Nada é apagado antes de T004 verde (o catálogo ainda existe em `src/modules/demo/premissas.ts` para o gerador).
- US1 depende de US2 só por ordem de entrega; os arquivos são distintos (podem ser feitas em qualquer ordem depois da Fase 2, mas o plano mantém o servidor primeiro).
- T012 [P] e T016–T019 [P] tocam arquivos distintos.
- T010 e T011 mexem em arquivos em comum (`master.tsx`, `consultas.ts`): sequenciais.

### Parallel Opportunities

- T016, T017, T018 e T019 em paralelo.
- T012 em paralelo com T013.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US2 (servidor limpo e registro preservado).
2. US1 (site), depois US3 (documentação) e Polish.
3. Cada fase fecha com seus testes verdes antes da seguinte.

## Coverage

| Requisito      | Tarefas                           |
| -------------- | --------------------------------- |
| FR-001, FR-002 | T009, T010, T015                  |
| FR-003         | T011, T012, T020                  |
| FR-004, FR-005 | T005–T008                         |
| FR-006, SC-004 | T002–T004                         |
| FR-007         | T016, T017                        |
| FR-008         | T005, T007, T009, T013–T015, T021 |
| FR-009         | T015, T021                        |
| FR-010         | T019                              |
| SC-001, SC-002 | T009, T015                        |
| SC-003         | T005, T008                        |
| SC-005         | T021, T022                        |
| SC-006         | T020                              |
