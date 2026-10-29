---
description: 'Tarefas da spec 002 — Organização da maratona'
---

# Tasks: Organização da maratona

**Input**: `specs/002-organizacao-maratona/` · **Tests**: obrigatórios (constituição II).

## Phase 1: Banco (TDD com pgTAP)

- [x] T001 RED `supabase/tests/002_organizacao.test.sql`: cursos/turmas (US1), vínculos (US2), duplas (US3), encontros (US4), leitura por perfil (FR-008)
- [x] T002 GREEN migration `20261029130000_organizacao_duplas_encontros.sql`: ambientes, encontros, duplas, dupla_integrantes, RPCs, gatilhos, RLS
- [x] T003 Seed fictício ampliado (estudantes, duplas, encontros)

## Phase 2: Domínio (TDD)

- [x] T010 RED/GREEN `duplas/domain/composicao` — FR-004, Edge Cases
- [x] T011 RED/GREEN `encontros/domain/encontro` — FR-007
- [x] T012 RED/GREEN tradução de erros do Supabase para mensagens em português

## Phase 3: Acesso a dados

- [x] T020 Contratos de repositório (organização, duplas, encontros)
- [x] T021 Implementações Supabase
- [x] T022 Implementações de demonstração (somente leitura)
- [x] T023 Provedor de repositórios + QueryClient

## Phase 4: Telas

- [x] T030 Coordenação: cursos e turmas (criar e remover; edição de nome pela interface pendente — o repositório já suporta) — US1
- [x] T031 Coordenação: vínculos de pessoas — US2
- [x] T032 Coordenação: duplas (formar, substituir, desfazer, histórico) — US3
- [x] T033 Coordenação: encontros e ambientes — US4
- [x] T034 Docente: turmas e duplas reais; aluno: dupla e encontros reais — US5
- [x] T035 Testes de componentes dos formulários (validação, sucesso só após servidor)

## Phase 5: Contas (P3)

- [x] T040 Edge Function `criar-conta` com verificação de coordenação — US6
- [x] T041 Tela de criação de conta

## Phase 6: Verificação

- [x] T050 E2E demo (regressão) e E2E contra Supabase local (formar dupla → aluno vê)
- [x] T051 `npm run verify`, `test:e2e`, `test:db`; atualizar docs e pendências

## Resultado da verificação (2026-10-29)

| Verificação                        | Resultado                                           |
| ---------------------------------- | --------------------------------------------------- |
| `npm run typecheck` / `lint`       | sem erros nem avisos                                |
| `npm run test`                     | 18 arquivos, 124 testes                             |
| `npm run build`                    | ok (aviso de chunk > 500 kB segue como pendência)   |
| `npm run test:e2e` (demonstração)  | 14 passando                                         |
| `npm run test:db` (pgTAP)          | 56/56 (22 da spec 001 + 34 da spec 002)             |
| `npm run test:e2e:supabase` (real) | 13 passando (duplas, encontros, cursos, contas/API) |

Notas de TDD: testes pgTAP, de domínio e dos formulários foram executados em RED antes da
implementação. Os testes de `modules/demo/repositorios` foram escritos junto com a
implementação. Falhas encontradas na verificação foram de seletores dos próprios testes
(corrigidos), e um defeito real de interface: o formulário de novo encontro sugeria número 1
antes de a lista carregar (corrigido; com todos os encontros cadastrados o formulário não é
oferecido).
