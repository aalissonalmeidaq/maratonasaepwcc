# Pesquisa: integração contínua

## R1 — Plataforma e forma do fluxo

- **Decisão**: GitHub Actions, um único arquivo `.github/workflows/ci.yml` com quatro jobs sem
  dependência entre si.
- **Racional**: o repositório já está no GitHub; Actions oferece Docker nos executores Linux
  (exigido pelo Supabase local), cancelamento por concorrência, artefatos e verificações
  obrigatórias por nome de job.
- **Alternativas**: vários arquivos (um por grupo) — mais difícil de manter nomes e gatilhos
  alinhados; um job sequencial — tempo somado e uma falha esconde as demais.

## R2 — Gatilhos

- **Decisão**: `pull_request` com `branches: [main]` (tipos padrão: aberta, nova versão,
  reaberta; e também `ready_for_review` para rascunhos que viram prontos), `push` em `main`
  e `workflow_dispatch`.
- **Racional**: cobre FR-001 e FR-010. Propostas em rascunho também rodam (a spec diz "toda
  proposta"); o custo é aceitável.
- **Alternativas**: `pull_request_target` — descartado: executa com privilégios do repositório
  sobre código de forks (risco, vai contra FR-005/FR-013).

## R3 — Cancelamento e tempo

- **Decisão**: `concurrency` com grupo `ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}`
  e `cancel-in-progress: true` apenas para propostas (no `main` cada execução termina);
  `timeout-minutes` por job (qualidade 15, banco 15, jornadas-demo 20, jornadas-supabase 25).
- **Racional**: FR-007 e FR-008. No `main` não se cancela para preservar o histórico de cada
  mesclagem.

## R4 — Node, dependências e cache

- **Decisão**: `actions/setup-node` com Node 22 e `cache: npm`; instalação por `npm ci`. Browsers do
  Playwright em `actions/cache` pela versão do `@playwright/test` (chave com o hash do
  `package-lock.json`); `npx playwright install --with-deps chromium` (só Chromium: os projetos
  usam Desktop Chrome e Pixel 7).
- **Racional**: FR-009. O cache só guarda downloads; o resultado não depende dele.
- **Alternativas**: instalar todos os navegadores — mais lento, desnecessário.

## R5 — Supabase local no pipeline

- **Decisão**: `supabase/setup-cli` fixando a versão 2.118.0 (a usada localmente);
  `supabase start` (migrations e `seed.sql` são aplicados no start); `supabase test db` para o
  pgTAP. O `config.toml` do projeto já fixa portas 5442x e `project_id = "maratona"`, então o
  nome do contêiner do Mailpit (`supabase_inbucket_maratona`) coincide com `.env.example`.
  Serviços dispensáveis (por exemplo, Studio) podem ser excluídos com `-x` se a medição mostrar
  ganho, sem alterar a cobertura.
- **Racional**: FR-004. O banco nasce limpo em cada job (VM efêmera).
- **Alternativas**: contêiner Postgres puro — perde Auth, Storage e funções; reimplementar
  seria divergir do que valida o desenvolvedor.
- **Cache de imagens Docker**: o download das imagens é o maior custo fixo. Decisão inicial: sem
  cache de imagens (simples e correto); medir e só então decidir cache (registrado em tasks como
  medição, não como requisito).

## R6 — Jornadas contra o banco local

- **Decisão**: o job copia `supabase/functions/.env.example` para `supabase/functions/.env`
  (valores locais, sem segredo), inicia `supabase functions serve` em segundo plano, aguarda a
  porta responder, lê as chaves locais com `supabase status -o env` (nome `PUBLISHABLE_KEY`) e
  exporta `E2E_SUPABASE_URL=http://127.0.0.1:54421` e `E2E_SUPABASE_ANON_KEY` para o
  `npm run test:e2e:supabase`. Mailpit local em `127.0.0.1:54424` (padrão do `mailpit.ts`).
- **Racional**: reproduz o roteiro do README, passo a passo. Só a `PUBLISHABLE_KEY` é lida da saída de `supabase status -o env` (a saída também traz
  `SERVICE_ROLE_KEY`, `SECRET_KEY` e `JWT_SECRET`, que nunca são exportadas nem impressas); ela
  é gerada pelo banco local efêmero, não é segredo do projeto (FR-005) e é mascarada no log.
- **Riscos**: prontidão das funções (aguardar com laço e tempo limite); instabilidade pontual
  — o job pode ser reexecutado manualmente (FR-010).

## R7 — Artefatos de falha

- **Decisão**: `actions/upload-artifact` com `if: failure()` (ou `!cancelled()` combinado com falha
  do passo de testes), `retention-days: 7`, enviando `playwright-report/`, `test-results/` e
  `test-results-supabase/`; nada é enviado quando passa.
- **Racional**: FR-006 e SC-004. O Playwright da demonstração já usa `trace: on-first-retry` e
  `retries: 2` em CI (`process.env.CI`); o de Supabase fixa `trace: retain-on-failure`.

## R8 — Verificações obrigatórias e permissões

- **Decisão**: `permissions: contents: read` no nível do fluxo; os nomes dos jobs (`name:`) são os
  contextos a exigir: `qualidade`, `banco`, `jornadas-demo`, `jornadas-supabase`. Bloqueio de
  mesclagem fica na documentação: passos pela interface e, como alternativa, comando `gh api` do
  dono. O pipeline não toca em configurações (FR-011).
- **Racional**: a proteção de branch exige administrador; mantê-la fora do código evita conceder
  permissão de escrita ao fluxo.
- **Ações de terceiros**: apenas ações oficiais do GitHub e a oficial da Supabase, por tag de
  versão principal, sem acesso a segredos.

## R9 — Guarda do fluxo por teste

- **Decisão**: um teste Vitest (`scripts/ci/fluxo.test.ts`), escrito antes do arquivo, lê o YAML
  (`yaml`) e confere: gatilhos, os quatro nomes de job, ausência de `needs`, `permissions`
  mínimas, `timeout-minutes` em todo job, `concurrency` com cancelamento, ausência de
  `secrets.`, `service_role`, `pull_request_target`, `db push`, `supabase link`, e que os
  comandos executados são os do `package.json`.
- **Racional**: FR-003, FR-011, FR-013 e SC-007 viram regressão automática; a constituição exige
  teste antes da implementação (RED → GREEN).
- **Alternativas**: `actionlint` — útil, mas exige binário extra; pode ser acrescentado depois
  sem mudar este desenho.

## R10 — Prova de FR-014

- **Decisão**: depois do fluxo no ar, uma branch descartável injeta uma falha em cada um dos
  quatro grupos, **numa única proposta** (um teste de unidade quebrado, uma asserção pgTAP
  falsa, uma asserção falsa numa jornada de demonstração e outra numa jornada Supabase). Os quatro
  jobs devem ficar vermelhos, cada um pelo seu motivo. Para SC-002 (3 de 3), a proposta é
  reenviada duas vezes (novo commit), totalizando 3 execuções; o resultado é registrado em
  `quickstart.md`.
- **Racional**: só a execução real prova que cada job pega o seu grupo; reunir as quatro falhas
  numa proposta limita o custo a 3 execuções.
