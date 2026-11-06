# Guia de validação: integração contínua

## Pré-requisitos

- Branch `017-integracao-continua` publicada e uma proposta aberta para o `main`.
- Para reproduzir localmente: Node 22, Docker e Supabase CLI 2.118.0 (como no README).

## 1. Teste da estrutura do fluxo (local, sem rede)

```bash
npm run test -- scripts/ci/fluxo.test.ts
```

Esperado: aprovado; falha se alguém remover um job, um limite de tempo, trocar um comando ou
introduzir segredo/`pull_request_target`.

## 2. Cada verificação, na máquina de quem desenvolve

| Verificação         | Comando                                                                              | Observação                |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| `qualidade`         | `npm run verify`                                                                     |                           |
| `banco`             | `supabase start && supabase test db`                                                 |                           |
| `jornadas-demo`     | `npm run test:e2e`                                                                   |                           |
| `jornadas-supabase` | ver README (`supabase functions serve` + `E2E_SUPABASE_URL`/`E2E_SUPABASE_ANON_KEY`) | exige as funções servidas |

## 3. Primeira execução na proposta (US1)

1. Abrir a proposta; as quatro verificações aparecem sozinhas.
2. Esperado: todas verdes em até 25 minutos; nenhum artefato de falha.
3. Enviar um commit novo enquanto roda: a execução anterior é cancelada (US1-3).

## 4. Prova de que cada grupo pega a sua falha (FR-014, SC-002)

Numa branch descartável, quebrar de propósito (um por grupo):

- `qualidade`: uma asserção falsa num teste de unidade;
- `banco`: um `select ok(false, ...)` num pgTAP;
- `jornadas-demo`: uma asserção falsa em `e2e/`;
- `jornadas-supabase`: uma asserção falsa em `e2e-supabase/`.

Esperado: os quatro jobs vermelhos, cada um pelo seu motivo; nos dois de jornadas, o artefato
de falha traz o relatório e o traço (US2). Repetir com novo commit duas vezes (3 de 3) e
descartar a branch.

## 5. Bloqueio de mesclagem (US3)

Seguir o passo a passo de `docs/operacao-e-homologacao.md` (seção "Integração contínua"):
exigir os contextos `qualidade`, `banco`, `jornadas-demo` e `jornadas-supabase`. Com uma
verificação vermelha ou pendente, o botão de mesclar fica bloqueado; com as quatro verdes,
liberado.

## 6. Verificação do `main` e execução manual (US4)

Após mesclar, conferir a execução do `main` em Actions; disparar `Run workflow` manualmente e
conferir o resultado.

## Resultado da validação

_(preenchido na implementação)_
