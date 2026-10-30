# Implementation Plan: Formação de equipes por convite entre alunos

**Branch**: `003-equipes-por-convite` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-equipes-por-convite/spec.md` (antes numerada
006; renumerada para 003 a pedido do usuário em 2026-10-30).

## Summary

Os alunos formam a própria equipe (dupla, ou um trio por turma ímpar) por convites. Uma nova
migration cria `convites_equipe` e `convite_equipe_convidados` (RLS, auditoria, sem escrita
direta) e funções RPC transacionais para enviar, responder e cancelar convites, nomear a equipe
e — para coordenação, docente e mentor — incluir, remover, substituir e desfazer. Somente
docente/mentor da turma renomeia; somente integrantes escolhem o primeiro nome. A
formação acontece dentro da RPC de resposta, com bloqueio da turma para serializar formações e
o índice único já existente (um aluno por equipe ativa na edição) como última garantia. A RPC
`formar_dupla` (coordenação) é removida. O termo de domínio passa a ser **equipe**; as tabelas
`duplas`/`dupla_integrantes` são mantidas (sem renomear) e `duplas.nome` passa a aceitar nulo
até a equipe escolher. Regras puras (elegibilidade de convite, trio permitido, nome de exibição)
ficam no domínio TS com TDD. Telas: "Minha equipe" do aluno (colegas, convites enviados e
recebidos, nome da equipe); "Equipes" da coordenação sem o formulário de formação; ações de
alteração também na tela de turmas do docente/mentor.

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (strict), SQL PostgreSQL 17 (PL/pgSQL)
**Primary Dependencies**: React 19, Vite, Tailwind, @tanstack/react-query 5, supabase-js 2 (sem
dependência nova)
**Storage**: Supabase PostgreSQL local (portas 5442x); nenhum arquivo
**Testing**: Vitest + Testing Library (domínio e componentes), pgTAP (`supabase/tests/005_*`),
Playwright (demo em `e2e/`, Supabase local em `e2e-supabase/`)
**Target Platform**: PWA responsiva (celular a desktop)
**Project Type**: aplicação web (monólito modular) + banco Supabase
**Performance Goals**: sem SLA numérico aprovado; consultas limitadas à turma e índices para
convites pendentes. Validar SC-001 (envio em até 3 interações).
**Constraints**: autorização só no servidor; nada exibido como formado sem resposta do servidor;
escrita offline proibida
**Scale/Scope**: uma edição com turmas e equipes; volume de produção não informado. Não criar
limite funcional de alunos ou convites sem nova especificação.

## Constitution Check

| Princípio           | Atendimento                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| I/IX SDD e rastreio | Spec 003 com esclarecimentos; tarefas ligadas a US/FR                                                        |
| II TDD              | pgTAP de convites/alterações e testes de domínio escritos e vistos falhando antes do código                  |
| III Modular         | Regras em `modules/duplas/domain` (TS puro); páginas importam só `@/modules/duplas`                          |
| IV Estrito          | Sem `any`; tipos de repositório atualizados                                                                  |
| V Servidor          | Tabelas novas com RLS e sem INSERT/UPDATE/DELETE para `authenticated`; escrita só por RPC `security definer` |
| VI Dados            | Aluno vê só nome e "tem equipe" dos colegas da própria turma; nada de outras turmas                          |
| VII Confirmação     | Telas usam `useEnvio`/`useGravar`; sucesso só após a RPC; bloqueio offline já existente                      |
| VIII A11y           | Componentes compartilhados (rótulos, foco, estado por texto); E2E em 412 px                                  |
| X Nada inventado    | Formação por docente/mentor já aprovada em FR-010; sem regras adicionais de competição ou limites inventados |

Resultado (pré e pós-design): aprovado, sem violações.

## Decisões após esclarecimentos

- FR-010: adicionar RPC de formação por docente/mentor vinculado, apenas com alunos ativos
  sem equipe da turma, justificativa e histórico; coordenação não pode chamá-la.
- FR-011/013: desativação preserva integrantes; projeção de gestão informa integrante inativo
  e trio em turma que passou a ser par, sem bloquear cadastro nem desfazer automaticamente.
  A leitura é a RPC `equipes_da_turma_gestao(p_turma uuid)`, com retorno e permissões definidos
  em `contracts/rpc.md`; o repositório expõe `equipesGestao(turmaId)`.
- Paridade: verificada sob bloqueio da turma somente nas RPCs de equipe (envio, aceite,
  formação docente, inclusão). Cadastro, importação e ativação de alunos (spec 002) não mudam:
  uma alteração concorrente com a formação equivale ao FR-013 (trio preservado + aviso).
  Cancelamento de convites por desativação é um gatilho AFTER UPDATE em `atribuicoes` que não
  bloqueia a turma (só encerra convites pendentes daquele aluno).
- FR-012/015: remover só de trio; substituição exige aluno ativo da mesma turma sem equipe.
- FR-014: retirada de aceite cancela o convite inteiro enquanto pendente, preservando os outros
  convites. Disputa com o último aceite é decidida pela primeira transação confirmada.
- FR-008: primeiro nome só por integrante; renomeação só por docente/mentor vinculado, com
  justificativa. Equipes existentes nomeadas são preservadas e consideradas já nomeadas.
- FR-016: contador derivado de `meus_convites_equipe` (convites em que a pessoa é convidada com
  resposta `pendente` e situação `pendente`), via `useConvites`; reaproveitado no menu e no
  painel do aluno. Nenhuma Edge Function ou e-mail.
- FR-017: helper `app.exigir_edicao_aberta(p_edicao)` chamado por todas as RPCs de escrita de
  equipe/convite após o bloqueio da turma; só `encerrada` bloqueia. Telas em modo leitura com
  aviso, derivado de `edicao.estado` já carregado por `useEdicaoAtual`.
- Invalidar consultas de convites, colegas, equipe e histórico após resposta confirmada;
  após falha de rede, reler o servidor antes de oferecer repetição. Sem formação otimista.
- TDD: pgTAP para todas as permissões, escrita direta negada e transições; duas sessões reais
  para concorrência, além de sequências equivalentes. Vitest de regras e componentes; E2E
  local de convite/aceite, trio, nomeação e operações de docente/mentor.
- Portões na implementação: `npm run verify`, `npm run test:e2e`, `npm run test:db` e
  `npm run test:e2e:supabase`. Este plano não declara esses testes executados.

## Project Structure

### Documentation (this feature)

```text
specs/003-equipes-por-convite/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rpc.md
│   └── telas.md
└── tasks.md
```

### Source Code (repository root)

```text
supabase/migrations/20261030140000_equipes_por_convite.sql   # tabelas, RPCs, RLS, auditoria
supabase/tests/005_equipes_por_convite.test.sql              # novo
supabase/tests/002_organizacao.test.sql                      # adaptado (sem formar_dupla)
supabase/tests/003_regras_organizacao.test.sql               # adaptado (equipe via convite)
supabase/seed.sql                                            # nada muda (duplas inseridas como admin)
src/modules/duplas/domain/{equipes.ts,equipes.test.ts,tipos.ts,composicao.ts}
src/modules/duplas/data/repositorioSupabase.ts
src/modules/duplas/ui/{ConvitesEquipe.tsx,NomeEquipe.tsx,AcoesDupla.tsx(+testes)}
src/modules/duplas/index.ts
src/modules/demo/repositorios.ts                             # leitura de colegas/convites
src/app/dados/consultas.ts                                   # useColegas, useConvites
src/app/paginas/organizacao.tsx                              # Minha equipe, Equipes, Turmas
src/app/navegacao.ts
e2e-supabase/equipes.spec.ts                                 # convite → aceite
e2e-supabase/organizacao.spec.ts                             # remove "coordenação forma dupla"
docs/adr/0010-equipes-por-convite.md                         # T002: tabelas legadas e bloqueio por turma
scripts/testar-concorrencia-equipes.mjs                      # T037: duas conexões reais, só banco local
```

**Structure Decision**: mantém o módulo `duplas` (pasta e API pública) para não espalhar
renomeações; o conceito exposto passa a ser `Equipe` com alias `Dupla` mantido onde já é usado.
`nome` passa a `string | null` no contrato TS; remover `formar()` de coordenação e expor
formação docente com justificativa, retirada de aceite e projeções de gestão.

## Sequência de implementação e validação

1. Registrar RED em domínio e pgTAP para FR-001–015, inclusive renomeação negada à coordenação,
   primeiro nome negado à gestão, retirada de aceite e preservação de equipe com inativo.
2. Migration incremental: convites/RLS/auditoria, nomes opcionais e RPCs. Corrigir ordem de
   bloqueios das operações existentes (turma → convite/equipe → integrantes).
3. Repositórios TS e demonstração, consultas e ações existentes; preservar API pública modular.
4. Interfaces usando componentes/tokens existentes, seguidas de testes de componente e E2E.
5. Testar duas sessões disputando aceite, retirada versus formação, segundo trio e mudança
   de equipe; comprovar invariantes após ambas terminarem. Executar os portões da constituição. Não confundir sequência de RPCs com prova
   suficiente de concorrência real.

Sem novas dependências nem serviços externos.

## Complexity Tracking

Sem violações.
