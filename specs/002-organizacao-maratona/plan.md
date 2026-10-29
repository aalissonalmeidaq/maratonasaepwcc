# Implementation Plan: Organização da maratona

**Branch**: `002-organizacao-maratona` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

## Summary

Migration com ambientes, encontros, duplas e integrantes (com histórico), funções RPC
transacionais para duplas, gatilhos de validação/auditoria e RLS; testes pgTAP escritos antes.
Regras puras de composição de dupla e de encontro no domínio TypeScript (TDD) para validar
formulários antes de enviar (o servidor continua sendo a autoridade). Camada de repositórios
por módulo com implementação Supabase e de demonstração, servida por contexto e consumida com
TanStack Query. Telas de coordenação passam a gravar no servidor; docente e aluno passam a ler.
Edge Function `criar-conta` para RF03 (P3).

## Technical Context

Mesma stack da spec 001, acrescida de **@tanstack/react-query 5** (cache de consultas e
invalidação após gravações; não persiste nada em disco). Edge Function em Deno (runtime do
Supabase). Testes: Vitest/Testing Library, pgTAP, Playwright (projeto opcional contra Supabase
local).

## Constitution Check

| Princípio           | Atendimento                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 002, tarefas com FR/US                                                              |
| II TDD              | pgTAP e testes de domínio escritos e executados antes da implementação                   |
| III Modular         | `modules/organizacao`, `duplas`, `encontros` com `domain/data/ui/index.ts`               |
| V Servidor          | Escrita de duplas só por RPC `security definer` com checagem de coordenação; RLS em tudo |
| VI Dados            | Aluno vê só a própria dupla; seed fictício                                               |
| VII Confirmação     | Sucesso exibido só após resposta; demo sem escrita                                       |
| X Nada inventado    | Trios/duplas mistas fora até decisão                                                     |

Resultado: aprovado.

## Project Structure

```text
supabase/migrations/20261029130000_organizacao_duplas_encontros.sql
supabase/tests/002_organizacao.test.sql
supabase/functions/criar-conta/index.ts
src/shared/dados/                 # QueryClient, provedor de repositórios, erros do Supabase
src/modules/organizacao/{domain,data,ui}
src/modules/duplas/{domain,data,ui}
src/modules/encontros/{domain,data,ui}
src/modules/demo/repositorios.ts  # implementação de leitura com dados fictícios
```

## Complexity Tracking

Nenhuma violação.
