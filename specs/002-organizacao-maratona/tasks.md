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

- [x] T030 Coordenação: cursos e turmas (criar e remover) — US1
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

## Phase 7: Pendências da spec (2026-10-30)

- [x] T060 RED/GREEN edição de curso e turma nos formulários (preenchidos, foco no primeiro campo, confirmação só após o servidor, Cancelar/Concluir) — FR-001
- [x] T061 Botão "Editar" nas tabelas de cursos e turmas; foco volta à linha ao sair da edição — FR-001
- [x] T062 E2E contra Supabase local: editar curso e recarregar; nome de turma repetido recusado — FR-001
- [ ] T063 Editar e remover ambientes pela interface (repositório já suporta)
- [ ] T064 Formar dupla em até 4 interações (SC-003; hoje são 5)
- [ ] T065 Instruções de acesso e troca da senha provisória — depende da unidade (US6)

## Resultado da verificação (2026-10-30, após T060–T062)

| Verificação                        | Resultado                       |
| ---------------------------------- | ------------------------------- |
| `npm run typecheck` / `lint`       | sem erros nem avisos            |
| `npm run test`                     | 30 arquivos, 315 testes         |
| `npm run test:db` (pgTAP)          | 56/56                           |
| `npm run test:e2e:supabase` (real) | 15 passando (2 novos de edição) |

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
