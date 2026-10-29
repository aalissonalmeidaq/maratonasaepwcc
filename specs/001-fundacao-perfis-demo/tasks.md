---
description: 'Tarefas da spec 001 — Fundação e experiência navegável por perfil'
---

# Tasks: Fundação e experiência navegável por perfil

**Input**: `specs/001-fundacao-perfis-demo/` (spec, plan, research, data-model, contracts)
**Tests**: obrigatórios (constituição, princípio II). Testes marcados ✅RED foram executados e
falharam antes da implementação.

Formato: `[ID] [P?] [História] Descrição — rastreio`

## Phase 1: Setup

- [x] T001 Inspecionar pasta, documentos e ferramentas; registrar em `docs/requisitos-e-referencias.md`
- [x] T002 Inicializar Spec Kit 1.0.12 com integração Claude (`specify init --here --integration claude --script sh`)
- [x] T003 Constituição em `.specify/memory/constitution.md`
- [x] T004 `package.json`, dependências e scripts (npm) — ADR 0002
- [x] T005 [P] `tsconfig*.json` estritos, `vite.config.ts`, `eslint.config.js`, Prettier, `.gitignore`
- [x] T006 [P] `supabase init`; endurecer `supabase/config.toml` (sem auto-cadastro, senha ≥ 10)
- [x] T007 [P] `playwright.config.ts` (desktop + celular, modo demonstração)

## Phase 2: Foundational

- [x] T010 Estrutura `src/modules/*` com `index.ts` e README por módulo — `docs/arquitetura.md`
- [x] T011 Tokens oficiais → `src/shared/styles/` + tema Tailwind — Design System §3–5
- [x] T012 Copiar SVGs oficiais da marca para `public/brand/` e gerar ícones PWA a partir do símbolo
- [x] T013 `src/shared/lib/env.ts` (variáveis públicas `VITE_*`, decisão do modo demonstração) com teste — FR-003
- [x] T014 Cliente Supabase sem segredos `src/shared/lib/supabase.ts`
- [x] T015 Migration inicial + RLS + gatilho de auditoria — FR-016, data-model.md
- [x] T016 Testes pgTAP de RLS `supabase/tests/` — FR-002
- [x] T017 `supabase/seed.sql` com dados fictícios

## Phase 3: US2 — núcleo de regras (P1, TDD) 🎯

- [x] T020 ✅RED `pontuacao/domain/*.test.ts`: questões, presença, rubricas, atraso, prova oficial, penalidades, encontro, ranking — FR-004..FR-013, Edge Cases
- [x] T021 GREEN `pontuacao/domain/` (regras-piloto, calculo, ranking)
- [x] T022 REFACTOR: tipos de lançamentos e mensagens de erro em português

## Phase 4: US1 — acesso por perfil (P1, TDD)

- [x] T030 ✅RED `acesso/domain/permissoes.test.ts` — área por papel, painel inicial — FR-001
- [x] T031 GREEN `acesso/domain/permissoes.ts`
- [x] T032 ✅RED `auth/ui/RotaProtegida.test.tsx` — não autenticado → entrada; papel errado → não autorizado — US1 cenários 1–2
- [x] T033 GREEN `AuthProvider`, adaptador demo e adaptador Supabase, `RotaProtegida`
- [x] T034 Tela de entrada (e-mail/senha com react-hook-form + zod; seleção de perfil no modo demo)
- [x] T035 Aviso permanente de modo demonstração — US1 cenário 4

## Phase 5: Componentes compartilhados (módulo 15)

- [x] T040 ✅RED testes de `Button`, `TextField`, `ConfirmDialog`, `StatusBadge`, `ResponsiveTable` (a11y + teclado)
- [x] T041 GREEN componentes: Button, TextField, SelectField, Card, StatCard, StatusBadge, ResponsiveTable, ConfirmDialog, Alert/Feedback, EmptyState, Spinner, Icon, Brand
- [x] T042 Layout com menu lateral (desktop) e menu recolhível (celular) por perfil — Design System §7

## Phase 6: US2/US3/US4 — painéis com dados fictícios

- [x] T050 Repositório demo `modules/demo` (dados fictícios identificados)
- [x] T051 Painel do aluno: dupla, próximo encontro, tarefa, pontuação calculada, ranking, regulamento — US2
- [x] T052 Painel docente: turmas vinculadas, presença a registrar, entregas a avaliar, rubrica — US3
- [x] T053 Painel coordenação: indicadores, pendências, ranking por categoria com estado, premiação "a confirmar" — US4
- [x] T054 Testes de consulta (`modules/demo/consultas.test.ts`): aluno não vê notas individuais; pontuação = núcleo de regras (teste escrito junto com a implementação, sem execução RED isolada)

## Phase 7: US5 — PWA (P3)

- [x] T060 ✅RED `pwa/StatusConexao.test.tsx` e `useOnline` — FR-014
- [x] T061 GREEN indicador offline, aviso de atualização (prompt) e botão instalar
- [x] T062 ✅RED/GREEN `desafios/ui/EnvioEntrega` — sem confirmação sem resposta do servidor; bloqueado offline — HU02/HU07, constituição VII

## Phase 8: Polish e verificação

- [x] T070 E2E Playwright: entrada nos três perfis, bloqueio de rota, celular
- [x] T071 README, ADRs, `docs/decisoes-e-pendencias.md`, `.env.example`, política de dados (proposta), backup (proposta)
- [x] T072 `npm run verify` (typecheck, lint, testes, build) e `npm run test:e2e`
- [x] T073 `supabase test db`: 22/22 pgTAP passando (2026-10-29); login real validado contra o Supabase local
- [ ] T074 Validação da coordenação: regras, premissas e identidade (fora do agente)

## Dependências

Setup → Foundational → (US2 domínio ∥ US1 acesso ∥ componentes) → painéis → PWA → polish.

## Resultado da verificação (2026-10-29)

| Verificação            | Resultado                                              |
| ---------------------- | ------------------------------------------------------ |
| `npm run typecheck`    | sem erros                                              |
| `npm run lint`         | sem erros nem avisos                                   |
| `npm run format:check` | ok                                                     |
| `npm run test`         | 11 arquivos, 83 testes passando                        |
| `npm run build`        | ok (aviso de chunk > 500 kB registrado como pendência) |
| `npm run test:e2e`     | 14 passando (7 jornadas × desktop e celular)           |
| `npm run test:db`      | 22/22 pgTAP passando                                   |

Desvios encontrados e corrigidos durante a verificação: `[auth.email] enable_signup = false`
desligava o login por e-mail (corrigido; auto-cadastro segue bloqueado em `[auth]`);
portas locais do Supabase movidas para 5442x por conflito com outro projeto.
