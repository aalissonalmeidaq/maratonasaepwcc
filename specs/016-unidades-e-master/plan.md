# Implementation Plan: Unidades, usuário master e gestão da unidade

**Branch**: `016-unidades-e-master` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-unidades-e-master/spec.md`, com as decisões de
2026-11-05 (master só gere unidades e premissas; mesmo banco por unidade; primeiro master por
comando; gestão cria a equipe; analista lê painéis e relatórios; uma conta, uma unidade, várias
funções; gestão e coordenação criam edições; gestão troca coordenação; unidade inicial sem
gestão).

## Summary

- **Modelo (R1, R3):** `unidades`, `masters`, `funcoes_unidade`; `unidade_id` em `perfis`,
  `edicoes` e `cadastro_cursos`; migração de tudo para "SENAI Juazeiro do Norte".
- **Isolamento (R2):** gatilhos de integridade (nada cruza unidades) + auxiliares centrais de
  permissão exigindo unidade ativa.
- **Master e gestão (R4–R6):** RPCs de rede e de unidade; Edge Function `contas-da-rede` para
  criar masters, gestão e equipe por convite.
- **Analista (R7), sessão e áreas (R8):** `minha_conta()`; áreas `master`, `gestao`, `analista`.
- **Premissas (R9) e regulamento público (R10):** só o master responde; nome da unidade no
  regulamento.

| Decisão                              | Requisito              | Onde está no desenho                                        |
| ------------------------------------ | ---------------------- | ----------------------------------------------------------- |
| Master de rede, primeiro por comando | FR-001, FR-002         | `masters`, `app.promover_master`, `contas-da-rede` (R4, R6) |
| Unidades e gestão                    | FR-003                 | RPCs de master (R6), `funcoes_unidade` (R1)                 |
| Master sem dados de edição           | FR-004, SC-004         | sem atribuição; RPCs de edição não o aceitam (R4)           |
| Gestão cria a equipe                 | FR-005                 | `contas-da-rede` ação `equipe`, `definir_funcoes` (R6)      |
| Edições e coordenação                | FR-006, FR-006c        | `criar_edicao`, `definir_coordenacao_da_edicao` (R5)        |
| Analista                             | FR-006a                | painel/relatório + área `analista` (R7)                     |
| Uma unidade, várias funções          | FR-006b                | `perfis.unidade_id`, `funcoes_unidade` (R1)                 |
| Vínculo só da unidade                | FR-007                 | gatilho em `atribuicoes`, `pessoas_para_vincular` (R2)      |
| Isolamento e unidade desativada      | FR-008, FR-009, SC-001 | integridade + auxiliares (R2)                               |
| Unidade inicial                      | FR-010, SC-003         | migração (R3)                                               |
| Regulamento público com a unidade    | FR-011                 | `regulamento_publico` (R10)                                 |
| Premissas só pelo master             | FR-012, FR-013         | `responder_premissa`, início do master (R9)                 |
| Auditoria                            | FR-014                 | gatilhos `registrar_auditoria` nas tabelas novas            |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict), SQL do PostgreSQL 17 (PL/pgSQL), Deno nas
  Edge Functions (como as existentes).
- **Primary Dependencies**: as mesmas; nenhuma dependência nova.
- **Storage**: migrations `20261110120000_unidades.sql` (modelo, migração, integridade,
  auxiliares, RPCs de rede e de unidade, premissas, regulamento) e ajustes de RPCs existentes
  (`criar_edicao`, `pessoas_para_vincular`, cadastro, painel, relatório). Seed local com master,
  gestão e analista, numa única unidade (a segunda unidade nasce nos testes).
- **Testing**: pgTAP `017_unidades.test.sql` (modelo, migração, isolamento, master, gestão,
  analista, unidade desativada) e `016_premissas` ajustado (só master responde); fixtures das
  suítes antigas criam a unidade. Vitest: permissões/áreas, sessão, telas novas (+ axe),
  demonstração. E2E demonstração (áreas novas, axe) e Supabase (fluxo completo e isolamento).
- **Target Platform**: PWA responsiva. **Project Type**: aplicação web com Supabase.
- **Performance Goals**: dezenas de unidades; os auxiliares ganham um `join` com `unidades`
  (índices em `edicoes.unidade_id` e `perfis.unidade_id`). Sem metas presumidas (RNF08).
- **Constraints**: nenhum segredo no front; nenhuma conexão a banco remoto; nada é atribuído
  automaticamente como gestão ou master.
- **Scale/Scope**: grande — três tabelas, três colunas, ~15 RPCs novas, ~8 alteradas, uma Edge
  Function, três áreas novas no front.

## Constitution Check

| Princípio           | Atendimento                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 016 com 10 esclarecimentos; tarefas ligadas a FR e SC                                         |
| II TDD              | pgTAP de isolamento e permissões, domínio de áreas e telas vistos falhando antes do código         |
| III Modular         | Módulo novo `@/modules/rede` (master e gestão); `acesso` ganha as áreas; nada importa internos     |
| IV Estrito          | Tipos de sessão, unidade e funções; sem `any`                                                      |
| V Servidor          | Isolamento e permissões no banco; chave secreta só na Edge Function; RLS + pgTAP nas tabelas novas |
| VI Dados            | Master e gestão sem dados de estudantes; e-mails só para quem gere as contas                       |
| VII Confirmação     | Cadastros e convites confirmados só após o servidor                                                |
| VIII A11y           | Telas novas no axe (desktop e celular); formulários acessíveis                                     |
| X Nada inventado    | Unidade só com nome e situação; nome inicial já usado no app; analista definido pelo usuário       |

Resultado antes e depois do desenho: **aprovado**, sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/016-unidades-e-master/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/rpc.md, contracts/telas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
supabase/migrations/20261110120000_unidades.sql
supabase/seed.sql (master, gestão, analista; uma única unidade)
supabase/functions/contas-da-rede/index.ts; _shared (autorização, convite); criar-conta e
  importar-alunos (unidade da edição)
supabase/tests/017_unidades.test.sql; 016_premissas (master); fixtures das suítes antigas
src/modules/acesso/domain/permissoes.ts (+ teste): áreas master, gestao, analista
src/modules/auth: sessão por `minha_conta()`, demonstração com master/gestão/analista
src/modules/rede/{index.ts, domain, data/repositorioSupabase.ts, ui/(Unidades, Masters,
  EquipeDaUnidade, EdicoesDaUnidade)} (+ testes)
src/modules/premissas (sem mudança de UI; `podeResponder` vem do servidor)
src/modules/publico (nome da unidade)
src/modules/demo (unidades, contas e respostas fictícias)
src/app/{rotas.tsx, navegacao.ts, layout (Trocar de área, unidade no cabeçalho), paginas/(master,
  gestao, analista).tsx}
e2e/unidades.spec.ts; e2e-supabase/unidades.spec.ts; e2e/suporte/telasPrincipais.ts
docs/adr/0013-multiunidade.md; docs/decisoes-e-pendencias.md; docs/operacao-e-homologacao.md;
  README.md
```

**Structure Decision**: isolamento e permissões no banco; um módulo `rede` para as telas de
master e gestão (não pertencem a nenhuma edição); as áreas do front só refletem o que o servidor
devolve em `minha_conta()`.

## Complexity Tracking

| Item                                | Por que é necessário                                                                                                                                 | Alternativa mais simples rejeitada                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Spec grande (4 histórias, ~23 RPCs) | O usuário pediu master, unidades, gestão e isolamento juntos; separar deixaria o sistema num estado intermediário inseguro (unidades sem isolamento) | Dividir em duas specs: a primeira entregaria unidades sem a gestão, sem caminho para a coordenação de uma unidade nova |
