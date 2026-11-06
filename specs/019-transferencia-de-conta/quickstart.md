# Guia de validação: transferência de conta entre unidades

## Pré-requisitos

- Branch `019-transferencia-de-conta`; Docker e Supabase CLI como no README.
- `npx supabase db reset --local` para recomeçar do zero.

## 1. Banco

```bash
npx supabase db reset --local && npm run test:db
```

Esperado: `018_transferencia_de_conta.test.sql` aprovado, cobrindo:

- transferência feliz: unidade nova, nenhuma função ativa, nenhum vínculo ativo, contagens de
  `funcoes_unidade` e `atribuicoes` iguais antes e depois, 1 registro em `transferencias_de_conta`
  e 1 linha de auditoria;
- cada recusa do contrato (`contracts/transferencia.md`), com a mensagem e sem nenhuma mudança;
- idempotência (mesma chave) e concorrência (conta que já mudou);
- `update` direto de `perfis.unidade_id` continua recusado;
- isolamento: a conta transferida não lê nada da origem nem do destino; a gestão e as contas da
  origem leem o histórico como antes; a gestão do destino a vê sem funções e pode atribuir funções;
- estudante e master nunca aparecem na lista de equipe do master.

## 2. Front

```bash
npm run verify
```

Esperado: testes do domínio (validação), do repositório, da lista de equipe e do diálogo.

## 3. Jornadas

```bash
npm run test:e2e                # demonstração
npm run test:e2e:supabase       # com Supabase local e funções servidas (README)
```

Esperado (demonstração): master abre a unidade, vê a equipe, transfere uma docente; recusas aparecem
no diálogo; axe sem violações (desktop e celular). Esperado (Supabase): transferir uma conta da
unidade inicial para uma unidade criada na jornada; a gestão do destino a vê e atribui a função;
a conta transferida entra e vê "aguardando permissão" até então.

## Resultado da validação (2026-11-06)

| Item                                 | Antes                     | Depois                                                                                                                                                                        |
| ------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify` (testes de unidade) | 133 arquivos, 968 testes  | 134 arquivos, 979 testes                                                                                                                                                      |
| `npm run test:db`                    | 16 arquivos, 1.861 testes | 17 arquivos, 1.952 testes (`018_transferencia_de_conta`: 89)                                                                                                                  |
| `npm run test:e2e` (demonstração)    | 173 aprovados, 1 ignorado | 175 aprovados, 1 ignorado                                                                                                                                                     |
| `npm run test:e2e:supabase`          | 74 aprovados              | 76 aprovados, em banco recém-reiniciado (`db reset`)                                                                                                                          |
| Descobertas durante a implementação  | —                         | edições encerradas bloqueiam alteração de vínculos (exceção controlada na transferência); `garantir_coordenacao_ativa` e `proteger_derivadas` tratadas (ver `research.md` R2) |

Observação: as jornadas contra o Supabase não são reexecutáveis sobre o mesmo banco sem `db reset`
(gravam dados); a CI sempre começa de um banco novo.
