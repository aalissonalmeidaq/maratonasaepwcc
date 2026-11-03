# Implementation Plan: Painéis com dados reais e relatórios CSV

**Branch**: `008-paineis-relatorios` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-paineis-relatorios/spec.md`, com quatro
esclarecimentos registrados em 2026-11-02.

## Summary

Esta spec implementa o Incremento 5 (RF17), em duas partes.

- **Painéis:** os painéis iniciais de aluno, docente/mentor e coordenação passam a usar dados
  reais por três RPCs de leitura (`painel_do_aluno`, `painel_da_gestao` e
  `painel_da_coordenacao`), que compõem as funções das specs 004, 006 e 007 (R1). As pendências
  consideram só encontros realizados (R2).
- **Relatórios:** cinco relatórios CSV, gerados e autorizados no servidor pela RPC `relatorio`.
  - A coordenação exporta a edição inteira; docente e mentor exportam só as turmas em que atuam.
  - Nenhum relatório traz nota individual da prova, e-mail ou identificador interno.
  - Cada exportação fica registrada em `exportacoes_relatorio`.
  - O navegador só serializa o arquivo, com a função pura `gerarCsv`: padrão pt-BR, BOM e
    proteção contra fórmulas (R4–R6).

O módulo `src/modules/relatorios` reúne:

- `domain`: tipos e `gerarCsv`;
- `data`: repositório Supabase;
- `ui`: painéis e formulário de exportação.

A demonstração ganha um repositório próprio com os mesmos formatos (R7). As páginas iniciais
deixam de depender de `ComDadosDemo`.

### Decisões dos esclarecimentos refletidas no desenho

| Decisão                                         | Requisito      | Onde está no desenho                    |
| ----------------------------------------------- | -------------- | --------------------------------------- |
| Nenhum CSV com a nota individual da prova       | FR-011         | Colunas de R6; pgTAP sem a chave `nota` |
| Docente e mentor exportam só as próprias turmas | FR-008, FR-013 | `app.turmas_do_relatorio` (R4)          |
| Pendências só de encontros realizados           | FR-004a        | `app.encontro_realizado` (R2)           |
| Estudante identificado só pelo nome             | FR-011a        | Colunas de R6                           |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: as mesmas das specs anteriores. Nenhuma dependência nova: o CSV é
  gerado em TS puro.
- **Storage**: Supabase local. Uma tabela nova, `exportacoes_relatorio`.
- **Testing**:
  - Vitest para `gerarCsv`, os componentes e o repositório;
  - pgTAP em `supabase/tests/009_paineis_relatorios.test.sql`;
  - Playwright: demonstração e `e2e-supabase/paineis.spec.ts`.
- **Target Platform**: PWA responsiva.
- **Project Type**: aplicação web (monólito modular) com banco Supabase.
- **Performance Goals**:
  - um painel por chamada;
  - exportação da edição do piloto feita na hora (SC-004 em até 3 interações).
- **Constraints**:
  - autorização só no servidor;
  - sem nota individual nem e-mail nos relatórios;
  - nada autenticado em cache;
  - exportação exige conexão.
- **Scale/Scope**: uma edição, quatro encontros e dezenas de equipes.

## Constitution Check

| Princípio           | Atendimento                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 008 com esclarecimentos; tarefas ligadas a US, FR e SC                                                             |
| II TDD              | Testes de `gerarCsv`, pgTAP de autorização e contagens, e componentes, todos escritos e vistos falhando antes do código |
| III Modular         | Módulo `relatorios` com `index.ts`; domínio TS puro                                                                     |
| IV Estrito          | Sem `any`; formatos tipados                                                                                             |
| V Servidor          | RPCs com checagem de papel e vínculo; RLS e auditoria em `exportacoes_relatorio`                                        |
| VI Dados            | Coleta mínima nos relatórios (só nome, sem nota individual nem e-mail); textos livres fora do CSV                       |
| VII Confirmação     | O arquivo só é gerado depois da resposta do servidor; exportação bloqueada sem conexão e na demonstração                |
| VIII A11y           | axe nos painéis e no formulário; contagens em texto                                                                     |
| X Nada inventado    | Só dados existentes; formato pt-BR explícito; fuso **[validar]**                                                        |

Resultado antes e depois do desenho: **aprovado**.

## Project Structure

```text
supabase/migrations/20261102120000_paineis_relatorios.sql
supabase/tests/009_paineis_relatorios.test.sql
src/modules/relatorios/
├── index.ts, README.md
├── domain/tipos.ts, domain/csv.ts (+ .test)
├── data/repositorioSupabase.ts (+ .test)
└── ui/PainelAluno.tsx, PainelGestao.tsx, PainelCoordenacao.tsx, FormRelatorio.tsx (+ testes)
src/modules/demo/paineis.ts
src/app/paginas/{aluno,docente,coordenacao,relatorios}.tsx, rotas.tsx, navegacao.ts, dados/*
e2e/jornadas.spec.ts, e2e-supabase/paineis.spec.ts
```

**Structure Decision**: o módulo `relatorios`, já previsto na arquitetura (módulo 14), reúne os
painéis e a exportação. Os dois são leituras agregadas filtradas por permissão.

## Complexity Tracking

Nenhuma violação a justificar.
