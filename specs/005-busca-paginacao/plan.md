# Implementation Plan: Busca dinâmica e paginação nas listagens

**Branch**: `005-busca-paginacao` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

## Summary

Funções puras de busca (normalização sem acentos, todas as palavras) e paginação (limites e
ajuste de página) em `src/shared/lib/listagem.ts`, com TDD. Hook `useListagem` e componentes
`CampoBusca` e `Paginacao` em `src/shared/ui/Listagem.tsx`. O `ResponsiveTable` passa a usá-los
por padrão, extraindo o texto pesquisável das células (`textoDoNo`); colunas podem informar
`texto` próprio ou `buscavel: false`. Listas de cartões usam `ListaPaginada`.

## Technical Context

Sem dependências novas. Filtragem no navegador sobre dados já carregados (ver Fora do escopo).

## Constitution Check

| Princípio      | Atendimento                                                                |
| -------------- | -------------------------------------------------------------------------- |
| II TDD         | Testes de `listagem.ts` e dos componentes escritos e vistos falhando antes |
| III Modular    | Lógica pura em `shared/lib`; UI em `shared/ui`                             |
| V/VI Dados     | Nada novo é carregado; filtra apenas o que a RLS já entregou               |
| VIII Acessível | Rótulo por listagem, `role="status"` para contagem, foco preservado        |

Resultado: aprovado.

## Project Structure

```text
src/shared/lib/listagem.ts (+ .test.ts)
src/shared/ui/textoDoNo.ts
src/shared/ui/Listagem.tsx (+ listagem.test.tsx)
src/shared/ui/ResponsiveTable.tsx
src/app/paginas/organizacao.tsx   # colunas de ações fora da busca; duplas com ListaPaginada
```
