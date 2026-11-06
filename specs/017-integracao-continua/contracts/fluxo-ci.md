# Contrato do fluxo de CI

Arquivo: `.github/workflows/ci.yml` · nome do fluxo: `CI`.

## Gatilhos

| Gatilho             | Condição                                                                          |
| ------------------- | --------------------------------------------------------------------------------- |
| `pull_request`      | `branches: [main]`; tipos `opened`, `synchronize`, `reopened`, `ready_for_review` |
| `push`              | `branches: [main]`                                                                |
| `workflow_dispatch` | sem entradas                                                                      |

Proibido: `pull_request_target`, `schedule` e qualquer gatilho que rode código de fork com
privilégios.

## Configuração global

- `permissions: contents: read` (nada além disso).
- `concurrency.group`: `ci-${{ github.event.pull_request.number || github.ref }}`;
  `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- `env.CI: true`.
- Nenhum uso de `secrets.*` nem de variáveis de ambiente do repositório.

## Jobs (sem `needs` entre eles)

| `name:` (contexto a exigir) | `runs-on`      | `timeout-minutes` | Passos principais                                                                                                                                                                                                                                                             |
| --------------------------- | -------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qualidade`                 | `ubuntu-24.04` | 15                | checkout, Node 22 com cache npm, `npm ci`, `npm run verify`                                                                                                                                                                                                                   |
| `banco`                     | `ubuntu-24.04` | 15                | checkout, CLI Supabase 2.118.0, `supabase start`, `supabase test db`, `supabase stop`                                                                                                                                                                                         |
| `jornadas-demo`             | `ubuntu-24.04` | 20                | checkout, Node 22, `npm ci`, navegadores Playwright (cache), `npm run test:e2e`, artefatos se falhar                                                                                                                                                                          |
| `jornadas-supabase`         | `ubuntu-24.04` | 25                | checkout, Node 22, `npm ci`, navegadores, CLI Supabase, `supabase start`, `.env` das funções a partir de `.env.example`, `supabase functions serve` em segundo plano com espera, chaves locais via `supabase status -o env`, `npm run test:e2e:supabase`, artefatos se falhar |

## Saídas

- Resultado de cada job na proposta (contexto = `name`).
- Artefatos de falha: `jornadas-demo-falha` e `jornadas-supabase-falha` (7 dias), contendo os
  diretórios de relatório e de resultados do Playwright.
- Resumo curto do job (`$GITHUB_STEP_SUMMARY`) com o comando executado e como reproduzir.

## Invariantes (cobertas por `scripts/ci/fluxo.test.ts`)

1. Os quatro nomes existem, são únicos e não há `needs`.
2. Todo job tem `timeout-minutes` e `runs-on` fixo (sem `latest`).
3. Os comandos de teste são exatamente os do `package.json`.
4. Sem `secrets.`, `service_role`, `pull_request_target`, `supabase link`, `db push` nem `--db-url`.
5. `permissions` global mínima e `concurrency` com cancelamento só em propostas.
6. Upload de artefatos só em falha, com `retention-days: 7`.
7. Ações de terceiros limitadas a `actions/*` e `supabase/setup-cli`.
8. Da saída de `supabase status -o env` só a `PUBLISHABLE_KEY` é lida (sem `eval`, sem exportar nem imprimir as demais chaves).
