# Plano de implementação: PWA, regulamento público offline e acessibilidade

**Branch**: `014-pwa-acessibilidade` | **Data**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Entrada**: `specs/014-pwa-acessibilidade/spec.md` — RF18, HU07, RNF01–RNF04.

## Summary

Completar o PWA existente com `/regulamento`, sem login, contendo edições ativas publicadas
explicitamente pela respectiva coordenação. Publicação autorizada e auditada no PostgreSQL;
RPC de leitura com campos públicos selecionados no servidor; cliente anônimo sem sessão;
cópia pública validada e datada em localStorage. O service worker mantém somente o precache
estático, sem cache de respostas Supabase. Completar os estados offline e a instalação iOS,
auditar as telas principais com axe/Playwright e teclado, e entregar roteiro NVDA/TalkBack.

FR-006a: falha ao gravar a cópia não bloqueia a leitura online. A página mostra o aviso
“Não foi possível salvar o regulamento para leitura offline.” e não confirma gravação.

Os artefatos de pesquisa e design já presentes foram revisados e complementados. Esta execução
termina na Fase 1; `tasks.md` e implementação pertencem às próximas etapas.

## Technical Context

**Language/Version**: TypeScript ~6.0.3 estrito; Node >=22.12; SQL do PostgreSQL/Supabase local.

**Primary Dependencies**: React ^19.3.1, Vite ^8.3.5, React Router ^8.5.1, Tailwind ^4.3.3,
Supabase JS ^2.118.0, TanStack Query ^5.105.0, Zod ^4.6.7, vite-plugin-pwa ^2.0.0,
Workbox ^7.4.1. Versões declaradas no package.json; sem atualização de stack planejada.

**Storage**: PostgreSQL para publicação/auditoria; localStorage para cópia pública isolada por
ambiente/projeto; Cache Storage para shell. React Query autenticado permanece só em memória.
A sessão Auth existente segue a política da ADR 0005, separada do conteúdo de negócio offline.

**Testing**: Vitest/Testing Library; pgTAP no Supabase local; Playwright ^1.64.1 e axe-core
^4.14.0 já instalado; build PWA em preview; roteiro NVDA/TalkBack executado pela unidade.

**Target Platform**: navegadores desktop/celular; PWA quando suportado; orientação Safari
iPhone/iPad; funcionamento online preservado sem service worker.

**Project Type**: aplicação web/PWA em monólito modular com backend Supabase.

**Performance Goals**: SC-001 exige reabertura offline com cópia previamente salva disponível
e suporte offline; em todos os testes de falta de espaço ou armazenamento bloqueado, leitura
online preservada e aviso FR-006a, sem falsa confirmação. SC-002 exige zero respostas
autenticadas persistidas como conteúdo offline. Sem novo orçamento numérico de latência.

**Constraints**: sem escrita offline; sem SELECT anônimo nas tabelas; projeção fechada inclusive
dentro do JSON de regras; atualizações por escolha da pessoa; dados fictícios identificados;
sem migrations em banco remoto. Erros de armazenamento não impedem leitura online.

**Scale/Scope**: piloto existente, quatro histórias; todas as edições ativas publicadas;
telas FR-013 nos três perfis em desktop/celular e testes do build PWA. Sem volume presumido.

## Constitution Check

Portão antes da Fase 0 e reavaliado após a Fase 1:

| Princípio              | Aplicação no desenho                                                   | Antes / depois |
| ---------------------- | ---------------------------------------------------------------------- | -------------- |
| I — especificações     | Spec 014, plano e contratos; tarefas em etapa posterior                | PASS / PASS    |
| II — TDD               | RED para autorização, publicação, privacidade, rotas e offline         | PASS / PASS    |
| III — monólito modular | Módulo publico com index.ts; comunicados via API pública; domínio puro | PASS / PASS    |
| IV — tipos estritos    | Tipagem, Zod e portões typecheck/lint/test/build                       | PASS / PASS    |
| V — menor privilégio   | RPC fechada; vínculo da edição, bloqueio de linha e auditoria          | PASS / PASS    |
| VI — proteção de dados | Sem respostas privadas ou JSON arbitrário no armazenamento público     | PASS / PASS    |
| VII — offline honesto  | Cópia datada, aviso FR-006a, retomada de leitura e escrita bloqueada   | PASS / PASS    |
| VIII — acessibilidade  | Tokens existentes, axe real, teclado, zoom e leitores de tela          | PASS / PASS    |
| IX — rastreabilidade   | R1–R13 e contratos; documentar extensão da ADR 0005 na implementação   | PASS / PASS    |
| X — português e fontes | Ausências como “a definir”; sem resultados de homologação inventados   | PASS / PASS    |

Sem violações. PASS indica adequação do desenho, não certificação do código ainda não
implementado. Homologação manual fica pendente até a unidade registrar evidências.

## Project Structure

### Documentation (this feature)

```text
specs/014-pwa-acessibilidade/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── rpc.md
    └── telas.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── rotas.tsx
│   ├── dados/Consulta.tsx
│   ├── layout/LimiteCarregamento.tsx
│   └── paginas/                    # entrada, página pública e edições
├── modules/
│   ├── publico/                   # novo: domain/, data/, ui/, index.ts
│   ├── organizacao/               # publicação e estado da edição
│   ├── comunicados/               # resumo via index.ts
│   └── demo/                      # adaptador público fictício
└── shared/
    ├── lib/supabasePublico.ts      # novo cliente sem sessão
    ├── pwa/                       # instalação, conexão e atualização
    └── ui/                        # correções de acessibilidade
supabase/
├── migrations/                    # migration posterior às existentes
└── tests/015_regulamento_publico.test.sql
e2e/                               # axe, teclado e build PWA
e2e-supabase/                       # publicação/retirada locais
docs/acessibilidade/                # roteiro e registro previstos
```

**Structure Decision**: manter limites atuais. O módulo publico não depende do provider de
repositórios autenticado. Infraestrutura PWA permanece compartilhada; a cópia específica fica
em publico/data. Não criar serviço ou deploy adicional.

## Fase 0 — pesquisa consolidada

[research.md](research.md) resolve publicação, leitura anônima, cache, reconexão, instalação,
automação e homologação. R12 fecha isolamento por ambiente, seleção do JSON, concorrência de
publicação/encerramento e preservação dos dados em memória. R13 incorpora a decisão confirmada
na clarificação sobre falha de armazenamento. Sem decisões técnicas em aberto.

## Fase 1 — desenho e validação

- [data-model.md](data-model.md): persistência, projeção e cópia pública.
- [contracts/rpc.md](contracts/rpc.md): leitura, autorização e auditoria.
- [contracts/telas.md](contracts/telas.md): estados observáveis e acessibilidade.
- [quickstart.md](quickstart.md): validação local e resultados esperados após implementar.

Sequência a detalhar nas tarefas: testes RED de segurança → migration/RPC/adaptadores → rota
pública/cópia → conexão/instalação → auditoria/correções de acessibilidade → E2E e documentação.

## Complexity Tracking

Sem violações ou complexidade excepcional. localStorage mantém o desenho já pesquisado e evita
introduzir cache genérico de respostas no service worker.
