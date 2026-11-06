---
description: 'Tarefas da spec 015 — Premissas em validação'
---

# Tasks: Premissas em validação

**Input**: `specs/015-premissas-em-validacao/` (plan.md, spec.md, research.md, data-model.md,
contracts/rpc.md, contracts/telas.md, quickstart.md)

**Tests**: obrigatórios (constituição II, TDD): cada teste é escrito e visto **falhando** antes do
código que o satisfaz.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3 (spec.md)

---

## Phase 1: Setup

- [X] T001 Criar o esqueleto do módulo `src/modules/premissas/` (`index.ts`, `domain/`, `data/`, `ui/`, `README.md` com a responsabilidade do módulo) no padrão dos demais módulos (importado só via `@/modules/premissas`)

---

## Phase 2: Foundational (bloqueia US1 e US2)

- [X] T002 Escrever pgTAP `supabase/tests/016_premissas.test.sql` (falhando) para a estrutura: tabelas `public.premissas` e `public.respostas_premissas` existem com RLS ligada; enum `public.decisao_premissa` = (`confirmada`, `precisa_mudar`); catálogo com exatamente os códigos P01–P32, nenhum com `resolvida_por`, temas e códigos conforme o Apêndice A da spec; `anon` e `authenticated` sem `select`, `insert`, `update`, `delete` nas duas tabelas
- [X] T003 Criar a migration `supabase/migrations/20261109120000_premissas_em_validacao.sql` (parte 1): enum `decisao_premissa`; tabela `premissas` (`codigo text primary key check (codigo ~ '^P[0-9]{2,3}$')`, `tema text not null` em um de "Identidade visual", "Pontuação", "Equipes e atividades", "Acesso e edições", "Comunicados e relatórios", "Operação", `ordem int not null`, `pergunta` 10–300 caracteres, `premissa_em_uso` 10–500, `onde_afeta` 10–500, `opcoes text[] not null default '{}'`, `referencia text not null`, `resolvida_por text`); tabela `respostas_premissas` (`id uuid pk default gen_random_uuid()`, `premissa text not null references premissas(codigo)`, `decisao decisao_premissa not null`, `justificativa text not null check (char_length(btrim(justificativa)) between 10 and 2000)`, `autor_id uuid not null references perfis(id)`, `autor_nome text not null`, `registrado_em timestamptz not null default clock_timestamp()`); RLS ligada nas duas, sem políticas; `revoke all` de `anon`/`authenticated`; gatilho que recusa `update`/`delete` em `respostas_premissas`; gatilho `auditoria_respostas_premissas` com `app.registrar_auditoria`; `insert` das 32 premissas com o texto da spec (Apêndice A) e de `docs/decisoes-e-pendencias.md` (pergunta, premissa em uso, onde afeta, referência), sem regra nova
- [X] T004 [P] Definir os tipos do domínio em `src/modules/premissas/domain/tipos.ts` conforme data-model.md (`Decisao`, `Situacao`, `Resposta`, `Premissa`, `CatalogoDePremissas`, `RepositorioPremissas`, `TEMAS` na ordem do Apêndice A) e exportar em `src/modules/premissas/index.ts`
- [X] T005 [P] Escrever o catálogo da demonstração em `src/modules/demo/premissas.ts` com o mesmo texto da migration e um teste `src/modules/demo/premissas.test.ts` (falhando antes do arquivo) que confere os 32 códigos P01–P32 e os temas do Apêndice A

**Checkpoint**: `npm run test:db` passa as asserções de estrutura de T002.

---

## Phase 3: User Story 1 - Ver as premissas que aguardam a unidade (Priority: P1) 🎯 MVP

**Goal**: coordenação, docentes e mentores leem o catálogo com situação, filtros, total, CSV e
impressão; o início da coordenação mostra quantas aguardam resposta.

**Independent Test**: entrar como coordenação e como docente, abrir "Premissas em validação" e
ver as 32 premissas "Aguardando resposta"; estudante sem menu e recusado no servidor.

### Testes (escrever e ver falhar primeiro)

- [X] T006 [US1] Acrescentar a `supabase/tests/016_premissas.test.sql` as asserções de leitura: `premissas_em_validacao()` para coordenação (inclusive quem só coordena edição encerrada) devolve `podeResponder = true` e 32 premissas na ordem tema/ordem/código; para docente e mentor com vínculo ativo, `podeResponder = false`; estudante e `anon` → `42501`; chaves de cada premissa exatamente as do contrato (`codigo`, `tema`, `ordem`, `pergunta`, `premissaEmUso`, `ondeAfeta`, `opcoes`, `referencia`, `resolvidaPor`, `situacao`, `atual`, `historico`); sem `autor_id` nem e-mail; premissa com `resolvida_por` vem no fim
- [X] T007 [P] [US1] Testes do domínio em `src/modules/premissas/domain/situacao.test.ts`: contagem por situação, filtro por situação e por tema (total por situação não muda com o filtro de situação), agrupamento por tema na ordem de `TEMAS`, resolvidas separadas
- [X] T008 [P] [US1] Testes das linhas do CSV em `src/modules/premissas/domain/linhasCsv.test.ts` (TypeScript puro, sem importar outro módulo): colunas Código; Tema; Pergunta; Em uso hoje; Situação; Última decisão; Justificativa; Registrada por; Registrada em, respeitando os filtros; e, em `src/modules/premissas/ui/PremissasPage.test.tsx`, o download com proteção contra fórmula (justificativa iniciada por `=`) e nome `maratona-premissas-AAAA-MM-DD.csv`; a coluna "Registrada em" é conferida só pelo formato DD/MM/AAAA HH:MM (o fuso muda na T033, US3, sem mudar a hora em 2026)
- [X] T009 [P] [US1] Testes do repositório em `src/modules/premissas/data/repositorioSupabase.test.ts`: chama `premissas_em_validacao`, devolve a resposta do servidor e converte erro em `ErroDeDados` (padrão `verificar` dos demais repositórios)
- [X] T010 [P] [US1] Testes da página em `src/modules/premissas/ui/PremissasPage.test.tsx`: título e texto de apoio, resumo por situação, filtros (situação e tema), `EmptyState` "Nenhuma premissa com esses filtros.", cartão com código, pergunta, `StatusBadge`, "Em uso hoje", "Onde afeta", opções, referência, "Ver histórico (N)" com `aria-expanded`, seção "Resolvidas por especificações", sem botão "Responder" quando `podeResponder = false`, botões "Baixar lista (CSV)" e "Imprimir lista"; axe sem violações
- [X] T011 [P] [US1] Teste do cartão do início em `src/app/paginas/coordenacao.test.tsx` (arquivo novo, no padrão de `AlunoInicioPage.test.tsx`): "Premissas aguardando resposta" com o número e link para `/coordenacao/premissas` quando > 0; ausente quando 0

### Implementação

- [X] T012 [US1] Na migration de T003 (parte 2), criar `app.atua_como_docente_em_alguma()` (vínculo ativo `docente` ou `mentor` em alguma edição) e `public.premissas_em_validacao()` (`security definer`, `stable`, `search_path = ''`, `revoke` de `public`/`anon`, `grant` a `authenticated`) conforme contracts/rpc.md, até T006 passar
- [X] T013 [P] [US1] Implementar `src/modules/premissas/domain/situacao.ts` (contagem, filtros, agrupamento) até T007 passar
- [X] T014 [P] [US1] Implementar `src/modules/premissas/domain/linhasCsv.ts` (colunas e linhas, TS puro) até T008 passar; a geração do arquivo fica na UI (`PremissasPage`), com `gerarCsv` e `nomeDoArquivo` de `@/modules/relatorios`; em `src/modules/relatorios/domain/csv.ts` e `tipos.ts`, aceitar o tipo `'premissas'` em `nomeDoArquivo` (constituição III: `domain/` sem React)
- [X] T015 [P] [US1] Implementar `src/modules/premissas/data/repositorioSupabase.ts` (`criarRepositorioPremissasSupabase`) com `verificar` até T009 passar
- [X] T016 [US1] Implementar `src/modules/premissas/ui/PremissasPage.tsx` e `CartaoPremissa.tsx` conforme contracts/telas.md (sem o formulário ainda), com estilos de impressão (`@media print`: esconde menu, cabeçalho, aviso de demonstração, filtros e botões; `break-inside: avoid`; histórico aberto) e "Imprimir lista" limpando filtros antes de `window.print()`; até T010 passar
- [X] T017 [US1] Ligar o repositório: `premissas` em `src/app/dados/useRepositorios.ts` e `src/app/dados/repositorios.tsx` (Supabase) e em `src/modules/demo/repositorios.ts` (leitura do catálogo fictício com uma "Confirmada" e uma "Precisa mudar" com duas respostas); consulta em `src/app/dados/consultas.ts`
- [X] T018 [US1] Rotas `/coordenacao/premissas` e `/docente/premissas` em `src/app/rotas.tsx` com página `src/app/paginas/premissas.tsx`; item "Premissas em validação" em `src/app/navegacao.ts` — coordenação no grupo "Preparação" (junto de Edições), docente/mentor no grupo "Comunicação"; nada para aluno — e teste em `src/app/navegacao.test.ts`
- [X] T019 [US1] Cartão "Premissas aguardando resposta" no início da coordenação (`src/app/paginas/coordenacao.tsx`) até T011 passar
- [X] T020 [US1] E2E de demonstração `e2e/premissas.spec.ts`: coordenação e docente abrem a tela pelo menu, filtram por tema e situação, baixam o CSV (nome e cabeçalho), docente sem "Responder", aluno sem item no menu; incluir `/coordenacao/premissas` e `/docente/premissas` em `e2e/suporte/telasPrincipais.ts` (axe da spec 014)

**Checkpoint**: US1 funciona sozinha (leitura, filtros, CSV, impressão, início).

---

## Phase 4: User Story 2 - Registrar a resposta da unidade (Priority: P1)

**Goal**: a coordenação registra "Confirmada" ou "Precisa mudar" com justificativa; histórico,
auditoria, concorrência e offline.

**Independent Test**: registrar "Confirmada" numa premissa e "Precisa mudar" em outra; ver
situação, histórico com autor e data, e auditoria; segunda resposta concorrente recebe o aviso.

### Testes (escrever e ver falhar primeiro)

- [X] T021 [US2] Acrescentar a `supabase/tests/016_premissas.test.sql` as asserções de `responder_premissa`: coordenação registra (devolve `id`, `decisao`, `justificativa`, `autorNome`, `registradoEm`); coordenação só de edição encerrada registra; docente, mentor e estudante → `42501`; premissa inexistente ou resolvida → `23514`; `p_decisao` nula → `23514`; justificativa com menos de 10 ou mais de 2.000 caracteres (após `btrim`) → `23514`; `p_resposta_base` desatualizada → `40001` sem inserir; resposta nova vira a atual e o histórico fica em ordem; `autor_nome` = `perfis.nome` no registro; linha de auditoria com a justificativa; `update`/`delete` direto recusados
- [X] T022 [P] [US2] Testes da validação em `src/modules/premissas/domain/validacao.test.ts`: justificativa 10–2.000 após remover espaços das pontas, decisão obrigatória, mensagens em português
- [X] T023 [P] [US2] Testes do formulário em `src/modules/premissas/ui/FormResposta.test.tsx` e da página: "Responder" abre o formulário no cartão; rádio "Confirmada"/"Precisa mudar"; rótulo muda para "O que precisa mudar e por quê"; contador 0/2.000; erro ligado ao campo; situação muda só após o servidor; recusa `40001` mostra "Esta premissa foi respondida por outra pessoa…" com foco no aviso e recarrega; offline desabilita o envio com o motivo; aviso "O sistema segue a premissa em uso até a mudança ser feita." em "Precisa mudar"; axe
- [X] T024 [P] [US2] Teste do repositório para `responder` em `src/modules/premissas/data/repositorioSupabase.test.ts` (parâmetros `p_codigo`, `p_decisao`, `p_justificativa`, `p_resposta_base`; resposta validada) e da demonstração recusando a escrita em `src/modules/demo/premissas.test.ts`

### Implementação

- [X] T025 [US2] Na migration de T003 (parte 3), criar `public.responder_premissa(p_codigo text, p_decisao public.decisao_premissa, p_justificativa text, p_resposta_base uuid)` conforme contracts/rpc.md (ordem das verificações, trava da linha da premissa, `app.justificativa` para a auditoria, `revoke`/`grant`) até T021 passar
- [X] T026 [P] [US2] Implementar `src/modules/premissas/domain/validacao.ts` até T022 passar
- [X] T027 [US2] Implementar `responder` em `src/modules/premissas/data/repositorioSupabase.ts` e a recusa na demonstração (`src/modules/demo/repositorios.ts`) até T024 passar
- [X] T028 [US2] Implementar `src/modules/premissas/ui/FormResposta.tsx` e integrar em `CartaoPremissa.tsx`/`PremissasPage.tsx` com `useEnvio`, `useOnline`, invalidação da consulta e tratamento de `40001`, até T023 passar
- [X] T029 [US2] E2E Supabase `e2e-supabase/premissas.spec.ts`: coordenação registra "Confirmada" e "Precisa mudar" (histórico com autor e data); docente vê a resposta sem formulário; estudante sem menu; duas abas da coordenação respondendo a mesma premissa — a segunda recebe o aviso

**Checkpoint**: US1 + US2 entregam a tela completa.

---

## Phase 5: User Story 3 - Limpar o que já foi decidido e ajustar o que é técnico (Priority: P2)

**Goal**: fuso `America/Fortaleza` e documentação sem marcas em aberto fora do catálogo.

**Independent Test**: `rg "\[(validar|decidir|pendência)\]" docs src supabase/tests` e as migrations desta spec
sem marcas em aberto; nenhuma função com `America/Sao_Paulo`; resultados dos testes 009 e 012 iguais.

### Testes (escrever e ver falhar primeiro)

- [X] T030 [US3] Acrescentar a `supabase/tests/016_premissas.test.sql` a asserção de que nenhuma função dos esquemas `app` e `public` contém `America/Sao_Paulo` em `pg_proc.prosrc`; trocar o fuso em `supabase/tests/009_paineis_relatorios.test.sql` e `supabase/tests/012_regras.test.sql` para `America/Fortaleza`
- [X] T031 [P] [US3] Ajustar `src/modules/relatorios/domain/csv.test.ts` para o horário de Juazeiro do Norte (`America/Fortaleza`) nos títulos e casos

### Implementação

- [X] T032 [US3] Criar `supabase/migrations/20261109121000_fuso_fortaleza.sql` recriando, a partir da **última** versão de cada uma (conferir migrations posteriores), `app.encontro_realizado`, `app.proximo_encontro_json`, `app.inicio_do_encontro` e `public.relatorio` com `America/Fortaleza` no lugar de `America/Sao_Paulo`, mantendo assinatura, `security definer`, `search_path` e grants; até T030 passar
- [X] T033 [P] [US3] Trocar `FUSO` para `America/Fortaleza` em `src/modules/relatorios/domain/csv.ts` (comentários "Brasília" → "Juazeiro do Norte") até T031 passar
- [X] T034 [US3] Em `docs/decisoes-e-pendencias.md`, trocar cada marca em aberto por "**[Pnn — em validação]**" (código do catálogo) ou "resolvido por …" conforme o Apêndice B (spec 011, 012, 013, 014 e fuso desta spec); atualizar o cabeçalho que explica as marcas e acrescentar a seção 6.13 da spec 015
- [X] T035 [P] [US3] Trocar os comentários `[validar]` em `src/modules/pontuacao/domain/validacaoRegras.ts`, `src/modules/comunicados/domain/validacao.ts`, `docs/operacao-e-homologacao.md` e `docs/adr/0009-convites-de-acesso.md` pela referência ao código da premissa (P18, P30, P32). **Não** editar migrations já existentes: os dois comentários de `20261104120000_gestao_edicoes.sql` ficam registrados em `docs/decisoes-e-pendencias.md` como cobertos por P26 e P27, e a busca do SC-003 ignora migrations anteriores a esta spec

**Checkpoint**: busca SC-003 sem marcas em aberto; pgTAP e CSV verdes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T036 [P] Atualizar `README.md` (sumário e seção da coordenação) e `docs/operacao-e-homologacao.md` com a tela de premissas e o fuso
- [X] T037 Rodar `npx supabase db reset --local` e `npm run test:db`; `npm run verify`; `npm run test:e2e`; `npm run test:e2e:supabase` (com `E2E_SUPABASE_URL`/`E2E_SUPABASE_ANON_KEY` do Supabase local); registrar as contagens em `quickstart.md`
- [X] T038 Conferir a impressão da tela no navegador (sem menu e botões, uma premissa por bloco) e o CSV aberto numa planilha; registrar em `quickstart.md`

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T005) → US1 (T006–T020) → US2 (T021–T029).
- US3 (T030–T035) não depende de US1/US2 (exceto o arquivo pgTAP 016 de T002) e pode correr em
  paralelo a elas; T034 usa os códigos do catálogo (T003).
- Polish (T036–T038) por último.
- Dentro de cada história: testes → domínio → dados → UI → E2E.

## Parallel Example

```text
US1: T007, T008, T009, T010, T011 juntos; depois T013, T014, T015 juntos.
US2: T022, T023, T024 juntos.
US3: T031 e T035 em paralelo com T030/T032.
```

## Implementation Strategy

1. MVP: Setup + Foundational + US1 (leitura completa, CSV, impressão, início) — já útil para a
   reunião com a coordenação.
2. US2: registro das respostas (o aceite do PRD §16).
3. US3: fuso e limpeza da documentação.
4. Polish e portões.

## Rastreabilidade

| Requisito              | Tarefas                            |
| ---------------------- | ---------------------------------- |
| FR-001, FR-002         | T002, T003, T005                   |
| FR-003                 | T007, T010, T013, T016             |
| FR-004, SC-004         | T006, T012, T018, T020, T021, T029 |
| FR-004a                | T008, T014, T016, T020, T038       |
| FR-005                 | T011, T019                         |
| FR-006, FR-007, SC-002 | T021, T022, T025, T026, T028, T029 |
| FR-008                 | T021, T023, T025, T028, T029       |
| FR-009                 | T023, T028                         |
| FR-010                 | T003, T021, T025                   |
| FR-011                 | T023, T028                         |
| FR-012, FR-014, SC-003 | T034, T035                         |
| FR-013                 | T030–T033                          |
| SC-001                 | T010, T016, T020                   |
