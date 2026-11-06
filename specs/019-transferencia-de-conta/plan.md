# Implementation Plan: Transferência de conta entre unidades

**Branch**: `019-transferencia-de-conta` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/019-transferencia-de-conta/spec.md`

## Summary

O master transfere uma conta de equipe de uma unidade para outra por uma RPC atômica e idempotente
(`transferir_conta`). Num único passo, no servidor: trava a conta, valida as recusas, inativa todas
as funções e vínculos da origem (nada é apagado), muda `perfis.unidade_id` por um caminho único e
protegido, e grava um registro imutável da transferência (que também entra na auditoria geral).
O master escolhe a conta numa lista de equipe por unidade (nova RPC de leitura, sem estudantes) e
confirma numa tela da área de rede. A gestão do destino passa a ver a conta (sem funções) e define as
funções pelo fluxo da spec 016.

## Technical Context

**Language/Version**: TypeScript estrito (React 19, Vite), SQL (PostgreSQL/Supabase), pgTAP

**Primary Dependencies**: as existentes (React Router, TanStack Query, Supabase); nenhuma nova

**Storage**: PostgreSQL; 1 tabela nova (`transferencias_de_conta`), 2 RPCs novas e 1 função de
gatilho substituída (tudo em migration nova, sem editar as antigas)

**Testing**: pgTAP (recusas, isolamento, auditoria, idempotência), Vitest (validação e telas),
Playwright (demonstração e Supabase local)

**Target Platform**: web/PWA

**Project Type**: aplicação web monolítica modular (módulo `rede`)

**Performance Goals**: transferência concluída em uma chamada ao servidor; lista de equipe por
unidade sem paginação (equipes pequenas)

**Constraints**: só master; só equipe; atômica e idempotente; nada apagado; sem acesso à origem
depois; isolamento por RLS intacto; nenhuma migration antiga editada

**Scale/Scope**: 1 migration, 1 arquivo pgTAP novo, ~8 arquivos no módulo `rede`, 1 tela,
demonstração e E2E

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                    | Avaliação                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Spec Kit                  | Spec 019 própria. Passa.                                                                                                                                         |
| II. TDD                      | Testes de recusa, isolamento, auditoria e idempotência (pgTAP) e de tela escritos antes e vistos falhar. Passa.                                                  |
| III. Monólito modular        | Código no módulo `rede` (API em `index.ts`); validação em `domain/` TS puro. Passa.                                                                              |
| IV. TypeScript estrito       | Tipos e Zod para pedido e respostas. Passa.                                                                                                                      |
| V. Segurança (inegociável)   | Regra no servidor (RPC `security definer`, `search_path = ''`, guarda de conta ativa, `exigir_master`); sem segredos; RLS na tabela nova com teste pgTAP. Passa. |
| VI. Dados de estudantes      | Estudantes excluídos; o master só lista equipe; nenhum dado de estudante exposto. Passa.                                                                         |
| VII. Confirmação do servidor | A tela só mostra sucesso depois da resposta do servidor. Passa.                                                                                                  |
| VIII. Acessibilidade         | Diálogo acessível com foco devolvido; axe em desktop e celular. Passa.                                                                                           |
| IX. Mudanças pequenas        | Uma RPC de escrita, uma de leitura, uma tela. Passa.                                                                                                             |
| X. Nada inventado, pt-BR     | Mensagens e textos em português; regras vêm das decisões do usuário. Passa.                                                                                      |
| Restrições                   | Migration nova; tabela com RLS e teste; nada executado em produção. Passa.                                                                                       |

Sem violações; reavaliação após o desenho: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/019-transferencia-de-conta/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── transferencia.md   # RPCs e tela
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
supabase/migrations/20261115120000_transferencia_de_conta.sql   # NOVO
supabase/tests/018_transferencia_de_conta.test.sql              # NOVO
src/modules/rede/domain/{tipos.ts,validacao.ts}(+test)          # tipos e validação
src/modules/rede/data/repositorioSupabase.ts(+test)             # transferirConta, equipeDaUnidadeDaRede
src/modules/rede/ui/TransferirConta.tsx(+test)                  # lista de equipe e diálogo
src/modules/rede/ui/Unidades.tsx                                # ponto de entrada por unidade
src/modules/rede/index.ts                                       # exporta a nova API
src/modules/demo/rede.ts(+test)                                 # transferência fictícia
src/app/dados/{consultas.ts,repositorios.tsx,useRepositorios.ts}  # liga as novas chamadas
src/app/paginas/master.tsx(+test)                               # tela
e2e/transferencia.spec.ts, e2e-supabase/transferencia.spec.ts   # jornadas
e2e/acessibilidade.spec.ts                                      # axe da tela
docs/adr/0013-multiunidade.md, docs/decisoes-e-pendencias.md, docs/operacao-e-homologacao.md
```

**Structure Decision**: tudo no módulo `rede`; a regra mora no banco; o front só orquestra e mostra
a recusa do servidor.

## Complexity Tracking

Sem violações a justificar.
