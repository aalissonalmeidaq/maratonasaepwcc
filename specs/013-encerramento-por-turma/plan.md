# Implementation Plan: Encerramento da edição por turma

**Branch**: `013-encerramento-por-turma` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-encerramento-por-turma/spec.md`, com as decisões
de 2026-11-04 (turmas sem definitiva; pendências não impedem o encerramento; edição encerrada
mostra o registro das pendências).

## Summary

- **Pendências (R1):** `app.pendencias_json` (spec 010) troca `categoriasSemRanking` por
  `turmasSemDefinitiva`: turmas da edição com equipes ativas cuja última publicação (spec 012)
  não é a definitiva, com `{turmaId, turma, categoria, estado}`.
- **Encerramento (R2):** `encerrar_edicao` não muda; grava a lista nova no registro. Registros
  antigos não são migrados.
- **Registro na tela (R3):** `edicoes_que_coordeno` passa a devolver `pendenciasNoEncerramento`;
  `EstadoDaEdicao` mostra o registro da edição encerrada no formato gravado (turmas ou categorias).

| Decisão                                   | Requisito      | Onde está no desenho                          |
| ----------------------------------------- | -------------- | --------------------------------------------- |
| Turmas sem definitiva, com o estado atual | FR-001, FR-002 | `app.pendencias_json` (R1)                    |
| Não impede o encerramento                 | FR-004         | `encerrar_edicao` sem mudança (R2)            |
| Registros antigos como foram gravados     | FR-006         | sem migração de dados (R2)                    |
| Edição encerrada mostra o registro        | FR-006a        | `edicoes_que_coordeno`, `EstadoDaEdicao` (R3) |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: as mesmas; nenhuma dependência nova.
- **Storage**: migration `20261107120000_encerramento_por_turma.sql` recria `app.pendencias_json`
  e `public.edicoes_que_coordeno`. Nenhuma tabela nem coluna nova.
- **Testing**: pgTAP `supabase/tests/014_encerramento_turma.test.sql` (novo) e `011_edicoes`
  migrado (asserções de `categoriasSemRanking`); Vitest em `EstadoDaEdicao` (+ axe), no
  repositório e na demonstração; E2E de demonstração da gestão de edições.
- **Target Platform**: PWA responsiva. **Project Type**: aplicação web com Supabase.
- **Performance Goals**: uma leitura da última publicação por turma (dezenas). Sem metas
  presumidas (RNF08).
- **Constraints**: só a coordenação consulta e encerra; registro do encerramento imutável.
- **Scale/Scope**: duas funções SQL, um tipo e um componente.

## Constitution Check

| Princípio           | Atendimento                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 013 com esclarecimentos; tarefas ligadas a FR e SC                                      |
| II TDD              | pgTAP, componente e repositório vistos falhando antes do código                              |
| III Modular         | Tipo e tela em `@/modules/organizacao`; a regra fica no servidor                             |
| IV Estrito          | Registro tipado nos dois formatos; sem `any`                                                 |
| V Servidor          | Autorização de `pendencias_da_edicao`, `encerrar_edicao` e `edicoes_que_coordeno` (spec 010) |
| VI Dados            | Só turma, categoria, estado e contagens; nenhum dado de pessoa                               |
| VII Confirmação     | Encerramento só confirmado após a resposta (spec 010)                                        |
| VIII A11y           | axe no componente; estado por texto                                                          |
| X Nada inventado    | Regras decididas pelo usuário; nenhum valor novo                                             |

Resultado antes e depois do desenho: **aprovado**, sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/013-encerramento-por-turma/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/rpc.md, contracts/telas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
supabase/migrations/20261107120000_encerramento_por_turma.sql
supabase/tests/014_encerramento_turma.test.sql; supabase/tests/011_edicoes.test.sql (migrado)
src/modules/organizacao/domain/edicoes.ts, data/repositorioSupabase.ts (+ teste),
  ui/EstadoDaEdicao.tsx (+ teste)
src/modules/demo/edicoes.ts (+ teste)
e2e/jornadas.spec.ts (gestão de edições, demonstração)
docs/decisoes-e-pendencias.md
```

**Structure Decision**: a regra fica no servidor, onde a publicação é lida; o módulo
`organizacao` só exibe a lista recebida e o registro gravado.

## Complexity Tracking

Sem violações a justificar.
