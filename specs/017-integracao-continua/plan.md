# Implementation Plan: Integração contínua das verificações

**Branch**: `017-integracao-continua` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-integracao-continua/spec.md`

## Summary

Um único fluxo de trabalho do GitHub Actions (`.github/workflows/ci.yml`) roda, em cada proposta
para o `main`, em cada push no `main` e sob demanda, quatro verificações independentes e em
paralelo — `qualidade`, `banco`, `jornadas-demo` e `jornadas-supabase` — que executam **os mesmos
comandos** de `CLAUDE.md`/`package.json`. O banco é o Supabase local efêmero (Docker) criado em
cada job que precisa dele; nenhum segredo é usado. Em falha de jornadas, relatórios e traços do
Playwright são enviados como artefatos por 7 dias. O bloqueio de mesclagem é configuração manual
do dono, documentada com os nomes exatos das verificações. Um teste Vitest guarda os requisitos
do fluxo (nomes, permissões, limites de tempo, ausência de segredos) para o arquivo não regredir.

## Technical Context

**Language/Version**: YAML (GitHub Actions); Node.js 22 (`engines >=22.12`); TypeScript no teste do fluxo

**Primary Dependencies**: GitHub Actions (`actions/checkout`, `actions/setup-node`, `actions/cache`,
`actions/upload-artifact`, `supabase/setup-cli`), Supabase CLI 2.118.0 (mesma versão do projeto),
Playwright (Chromium), `yaml` (nova devDependency, só para o teste do fluxo)

**Storage**: N/A (banco local efêmero dentro de cada job)

**Testing**: Vitest (estrutura do fluxo, sem rede); prova de ponta a ponta numa proposta descartável
com falha injetada por grupo (FR-014)

**Target Platform**: executores Linux hospedados pelo GitHub (`ubuntu-24.04`, com Docker)

**Project Type**: infraestrutura de repositório (nenhuma mudança no aplicativo)

**Performance Goals**: resultado de todas as verificações em até 25 min (SC-003), com os quatro
grupos em paralelo

**Constraints**: sem segredos; sem banco remoto; permissões `contents: read`; limite de tempo por
job; execução anterior cancelada ao chegar commit novo na mesma proposta

**Scale/Scope**: 1 arquivo de fluxo, 1 teste, 1 devDependency, documentação (`docs/operacao-e-homologacao.md`,
`README.md`, `CLAUDE.md`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                  | Avaliação                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Spec Kit                | Spec 017 própria, em `specs/017-integracao-continua/`. Passa.                                                                                                            |
| II. TDD                    | O fluxo é guardado por teste Vitest escrito antes (RED) do arquivo; a prova de ponta a ponta usa falhas injetadas. Passa.                                                |
| III. Monólito modular      | Nenhum código de módulo muda. Passa.                                                                                                                                     |
| IV. TypeScript estrito     | O teste é TypeScript estrito; `yaml` tipado. Passa.                                                                                                                      |
| V. Segurança (inegociável) | Sem segredos e sem `service_role`; chaves locais efêmeras do `supabase status`, só na VM do job; permissões mínimas; sem ação de terceiros com acesso a segredos. Passa. |
| VI. Dados de estudantes    | Só dados fictícios do seed local; artefatos de falha não contêm dados reais. Passa.                                                                                      |
| VII. Servidor/offline      | Não se aplica.                                                                                                                                                           |
| VIII. Acessibilidade       | As verificações de acessibilidade (axe) passam a rodar a cada proposta. Passa.                                                                                           |
| IX. Mudanças pequenas      | Um fluxo, um teste, documentação. Passa.                                                                                                                                 |
| X. Nada inventado, pt-BR   | Nomes de jobs e documentação em português do Brasil; limites assumidos registrados. Passa.                                                                               |
| Restrições (banco remoto)  | O pipeline nunca conecta banco remoto nem faz `db push`/`link`. Passa.                                                                                                   |
| Portões de qualidade       | A CI automatiza exatamente os portões da constituição e de `CLAUDE.md`. Passa.                                                                                           |

Sem violações; reavaliação após o desenho (Phase 1): sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/017-integracao-continua/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── fluxo-ci.md      # contrato do fluxo: gatilhos, jobs, nomes, saídas
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml                      # o fluxo (novo)
scripts/
└── ci/
    └── fluxo.test.ts               # teste da estrutura do fluxo (novo)
vite.config.ts                       # inclui scripts/ci/**/*.test.ts no Vitest
package.json                         # devDependency `yaml`
docs/operacao-e-homologacao.md       # seção "Integração contínua" + bloqueio de mesclagem
README.md                            # selo/resumo e como reproduzir localmente
CLAUDE.md                            # uma linha: a CI roda os mesmos portões
```

**Structure Decision**: infraestrutura sem código de aplicativo; fluxo único com quatro jobs
independentes (sem `needs` entre eles) para que o tempo total seja o do mais lento e cada falha
seja atribuída a um grupo.

## Complexity Tracking

Sem violações a justificar. A única dependência nova (`yaml`) serve apenas ao teste do fluxo e é
`devDependency`.
