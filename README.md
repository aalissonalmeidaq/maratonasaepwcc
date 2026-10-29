# Maratona de Competências SAEP — aplicação web/PWA

Aplicação para organizar a Maratona de Competências SAEP dos 3º anos do ensino médio dos
cursos técnicos do SENAI Juazeiro do Norte: duplas, encontros, atividades, entregas, presença,
avaliação por rubricas, pontuação, ocorrências e classificação — para coordenação, docentes,
mentor SAEP e estudantes, no computador, tablet ou celular.

> **Situação: piloto em desenvolvimento (ciclo 1).** Não está pronta para produção nem para dados
> reais. Regras de pontuação aguardam o regulamento aprovado. Veja
> [docs/decisoes-e-pendencias.md](docs/decisoes-e-pendencias.md).

## Sumário

- [Arquitetura](#arquitetura) · [Pré-requisitos](#pré-requisitos) · [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente) · [Executar](#executar-a-aplicação)
- [Demonstração](#telas-de-demonstração-dados-fictícios) · [Supabase local](#supabase-local)
- [Qualidade e testes](#qualidade-e-testes) · [Fluxo SDD](#fluxo-sdd-com-spec-kit)
- [PWA e offline](#pwa-e-offline) · [Homologação](#homologação) · [Pendências](#pendências-e-riscos)

## Arquitetura

Monólito modular: uma SPA (Vite + React + TypeScript + Tailwind) com o Supabase como backend
confiável (Auth, PostgreSQL com RLS, Storage). Detalhes em [docs/arquitetura.md](docs/arquitetura.md).

```text
src/
  app/            rotas, layouts e telas por perfil
  modules/<m>/    domain/ (TS puro) · data/ (repositórios) · ui/ (React) · index.ts (API pública)
  shared/         ui/ (componentes) · pwa/ · lib/ (env, Supabase, formatação) · styles/ (tokens)
supabase/         config.toml · migrations/ · tests/ (pgTAP) · seed.sql (fictício)
specs/            especificações Spec Kit (spec, plano, tarefas)
e2e/              testes Playwright
docs/             referências, arquitetura, ADRs, decisões e propostas operacionais
```

Módulos: auth, acesso, organizacao, duplas, encontros, questoes, desafios, presenca, avaliacao,
prova-oficial, pontuacao, ocorrencias, comunicados, relatorios, auditoria (+ `shared/ui` e
`demo`). **Segurança é aplicada no banco (RLS), não na interface.**

## Pré-requisitos

- Node.js ≥ 22.12 (testado com 24.21) e npm (ver [ADR 0002](docs/adr/0002-gerenciador-de-pacotes.md))
- Git
- Para o banco local: Docker em execução e [Supabase CLI](https://supabase.com/docs/guides/cli) (testado com 2.118)
- Opcional: [Spec Kit](https://github.com/github/spec-kit) (`specify` 1.0.12) e Claude Code

## Instalação

```bash
npm install
npx playwright install chromium   # apenas para testes E2E
```

## Variáveis de ambiente

Copie [.env.example](.env.example) para `.env.local` (ignorado pelo git).

| Variável                 | Uso                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL da API Supabase (local: `http://127.0.0.1:54421`)                                   |
| `VITE_SUPABASE_ANON_KEY` | Chave **pública** (anon/publishable). A aplicação recusa chaves `service_role`/secretas |
| `VITE_DEMO_MODE`         | `true` força o modo demonstração. Nunca usar com dados reais                            |

Tudo com prefixo `VITE_` é público no navegador. Não há segredos no frontend.

## Executar a aplicação

```bash
npm run dev        # http://localhost:5173
npm run build      # build de produção em dist/ (inclui service worker)
npm run preview    # serve o build localmente
```

Sem `.env.local`, `npm run dev` abre em **modo demonstração**.

## Telas de demonstração (dados fictícios)

1. `npm run dev` (sem variáveis) ou `VITE_DEMO_MODE=true npm run dev`.
2. Em `/entrar`, escolha um perfil fictício: **Coordenação**, **Profa. Lúcia Exemplo (docente)**
   ou **Ana Exemplo (aluna)**.
3. Uma faixa amarela indica "Modo demonstração — dados fictícios, acesso não seguro".

| Perfil      | Telas                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aluno       | início (pontuação da dupla até 400, próximo encontro, comunicados), minha dupla, desafios e entregas, pontuação por encontro, ranking da categoria, regulamento |
| Docente     | início (pendências), minhas turmas, presença, avaliações/rubricas, ocorrências (em construção)                                                                  |
| Coordenação | visão geral e pendências, organização, duplas, encontros, ranking por categoria, premiação (a confirmar), ocorrências/comunicados/relatórios (em construção)    |

As pontuações exibidas são calculadas pelo núcleo de regras a partir de lançamentos fictícios
(`src/modules/demo/dados.ts`). O envio de entregas fica desabilitado na demo: sem servidor não
há confirmação, e o sistema não simula sucesso.

## Supabase local

Este projeto usa as portas **5442x** (para não conflitar com outros projetos Supabase locais).

```bash
supabase start                 # sobe Postgres, Auth, REST etc. e aplica migrations + seed
supabase status                # mostra URL e PUBLISHABLE_KEY (chave pública)
supabase db reset              # recria o banco: migrations + seed.sql (somente local!)
supabase migration new <nome>  # nova migration versionada
supabase test db               # testes pgTAP de RLS
supabase stop
```

Para usar o login real localmente, crie `.env.local` com `VITE_SUPABASE_URL=http://127.0.0.1:54421`
e a `PUBLISHABLE_KEY` de `supabase status`. Contas fictícias do seed (senha `senha-local-123`,
**somente local**): `coordenacao@exemplo.invalid`, `docente@exemplo.invalid`,
`aluna@exemplo.invalid`, `aluno@exemplo.invalid`. Nesta versão as telas fora da demo mostram
"integração em desenvolvimento" (repositórios Supabase dos módulos chegam no Incremento 2).

O projeto **não** se conecta a bancos remotos. Nunca rode `seed.sql` fora do ambiente local.

## Qualidade e testes

```bash
npm run typecheck      # TypeScript estrito
npm run lint           # ESLint (inclui acessibilidade jsx-a11y e limites entre módulos)
npm run format:check   # Prettier
npm run test           # Vitest: domínio, componentes, acessibilidade (axe)
npm run test:e2e       # Playwright: jornadas em desktop e celular (modo demonstração)
npm run test:db        # pgTAP: RLS no Supabase local (requer `supabase start`)
npm run verify         # typecheck + lint + testes + build
```

Organização: testes de domínio em `src/modules/*/domain/*.test.ts`; componentes em
`*.test.tsx`; autorização em `supabase/tests/*.sql`; E2E em `e2e/`.

## Fluxo SDD com Spec Kit

Spec Kit 1.0.12 inicializado com integração Claude Code (skills em `.claude/skills/speckit-*`,
scripts e templates em `.specify/`). Constituição: [.specify/memory/constitution.md](.specify/memory/constitution.md).

Para cada incremento, no Claude Code:

1. `/speckit-specify <descrição>` → cria `specs/NNN-nome/spec.md` (histórias e critérios de aceite)
2. `/speckit-clarify` (opcional) → resolve ambiguidades
3. `/speckit-plan` → plano técnico, modelo de dados e contratos
4. `/speckit-tasks` → tarefas rastreáveis
5. `/speckit-analyze` (opcional) → consistência entre artefatos
6. `/speckit-implement` → implementação com TDD (RED → GREEN → REFACTOR)

Especificação atual: [specs/001-fundacao-perfis-demo](specs/001-fundacao-perfis-demo/).
Toda nova tabela vem com políticas RLS **e** testes pgTAP na mesma mudança.

## PWA e offline

- Instalável quando o navegador oferece (botão "Instalar aplicativo"); no iOS use "Adicionar à
  Tela de Início". O uso no navegador continua completo.
- Cache apenas do shell estático; **nenhum** dado do Supabase é armazenado pelo service worker.
- Sem conexão: aviso "Você está sem conexão"; envios e registros ficam indisponíveis.
- Nova versão: aviso "Atualizar agora" — nunca recarrega sozinho.
- Fora do MVP: escrita offline com sincronização. Ver [ADR 0005](docs/adr/0005-pwa-politica-de-cache.md).
- O service worker só é ativado no build (`npm run build && npm run preview`).

## Homologação

Ver [docs/operacao-e-homologacao.md](docs/operacao-e-homologacao.md) (projeto Supabase separado,
`supabase db push`, HTTPS, variáveis, backup e teste de restauração) e a proposta de
[política de dados](docs/politica-de-dados-proposta.md).

## Pendências e riscos

Lista completa em [docs/decisoes-e-pendencias.md](docs/decisoes-e-pendencias.md). Principais:

- Regulamento/projeto pedagógico **não fornecido**: regras em `piloto-2026.0-a-confirmar`.
- Marca SENAI Ceará e ícones SVG do projeto **ausentes** (áreas e ícones provisórios).
- Telas ainda não leem o Supabase (exceto login/papéis); cadastros, registros e publicação nos
  próximos incrementos.
- Autenticação de demonstração **não é segura**.
- Detalhes da premiação, escala e acesso à nota oficial a confirmar.
