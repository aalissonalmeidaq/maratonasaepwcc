# Modelo de dados: integração contínua

Esta funcionalidade não cria tabelas nem altera o banco. As "entidades" da spec existem no
GitHub; esta página fixa seus atributos e regras.

## Verificação

| Campo           | Regra                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nome            | Estável e exato: `qualidade`, `banco`, `jornadas-demo`, `jornadas-supabase`. Renomear exige atualizar a regra de proteção e a documentação.                                   |
| Comandos        | `qualidade`: `npm run verify`; `banco`: `supabase test db`; `jornadas-demo`: `npm run test:e2e`; `jornadas-supabase`: `npm run test:e2e:supabase` (mesmos do `package.json`). |
| Resultado       | verde, vermelho ou cancelada; estouro de tempo conta como vermelho.                                                                                                           |
| Limite de tempo | qualidade 15 min, banco 15 min, jornadas-demo 20 min, jornadas-supabase 25 min.                                                                                               |
| Dependência     | Nenhuma entre verificações (rodam em paralelo).                                                                                                                               |

## Execução

| Campo        | Regra                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Origem       | proposta para o `main`, push no `main` ou disparo manual.                                 |
| Cancelamento | nova execução da mesma proposta cancela a anterior em andamento; no `main` não cancela.   |
| Ambiente     | uma máquina virtual nova por job; banco local criado do zero; sem estado entre execuções. |

## Artefato de falha

| Campo    | Regra                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------- |
| Conteúdo | `playwright-report/`, `test-results/` e `test-results-supabase/` (relatório, traços, capturas). |
| Quando   | apenas se o job falhar.                                                                         |
| Retenção | 7 dias.                                                                                         |
| Dados    | só dados fictícios do seed local.                                                               |

## Regra de proteção (fora do código)

| Campo                 | Regra                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| Quem configura        | dono do repositório (permissão de administrador).                                      |
| Conteúdo              | exigir as quatro verificações verdes e a branch atualizada antes de mesclar no `main`. |
| Onde está documentada | `docs/operacao-e-homologacao.md`.                                                      |
