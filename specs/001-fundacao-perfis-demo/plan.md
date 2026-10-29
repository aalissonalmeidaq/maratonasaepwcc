# Implementation Plan: Fundação e experiência navegável por perfil

**Branch**: `001-fundacao-perfis-demo` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fundacao-perfis-demo/spec.md`

## Summary

Criar a fundação do monólito modular (Vite + React + TypeScript + Tailwind), o núcleo de regras
de pontuação do piloto como configuração versionada testada por TDD, a camada de autenticação
com dois adaptadores (Supabase real e demonstração explícita), rotas protegidas por perfil,
painéis navegáveis de coordenação, docente e aluno sobre dados fictícios, componentes
compartilhados com a identidade visual dos arquivos reais, base PWA com política de cache
restritiva e a primeira migration do Supabase (perfis, vínculos, organização e auditoria) com RLS
e testes pgTAP.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), Node.js ≥ 22.12 (testado com 24.21)
**Primary Dependencies**: React 19, React Router 8 (modo declarativo), Vite 8, Tailwind CSS 4,
vite-plugin-pwa 2 (Workbox 7), @supabase/supabase-js 2, react-hook-form 7 + zod 4,
lucide-react (ícones provisórios)
**Storage**: Supabase PostgreSQL 17 (local via Supabase CLI/Docker); Storage privado (próximos
incrementos)
**Testing**: Vitest 5 + Testing Library + jsdom + axe-core (unidade/componentes);
Playwright 1.64 (E2E); pgTAP via `supabase test db` (RLS)
**Target Platform**: navegadores modernos em celular, tablet e desktop; PWA onde suportado
**Project Type**: aplicação web (SPA) + backend gerenciado Supabase
**Performance Goals**: a definir com a unidade (PRD RNF08) — sem número presumido
**Constraints**: nenhuma escrita offline; nenhum dado autenticado em cache; sem segredos no
frontend
**Scale/Scope**: piloto, volume de usuários a confirmar (PRD §19)

## Constitution Check

| Princípio                | Atendimento neste plano                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| I. SDD                   | Spec 001 + plano + tasks rastreáveis; incrementos seguintes em specs próprias                  |
| II. TDD                  | Domínio de pontuação, acesso, rotas, indicadores PWA e confirmação de envio com teste primeiro |
| III. Monólito modular    | `src/modules/*` com `index.ts`; regra ESLint bloqueia import interno e React no domínio        |
| IV. TS estrito           | `strict` + `noUncheckedIndexedAccess`; `npm run typecheck`                                     |
| V. Segurança no servidor | RLS + funções `security definer` com `search_path` fixo; demo sem Supabase e sinalizado        |
| VI. Dados de estudantes  | Seed/demo fictícios; ranking sem notas individuais; nada sensível no cache                     |
| VII. Offline honesto     | Sem runtimeCaching; ações de escrita bloqueadas offline; confirmação só com resposta           |
| VIII. A11y/identidade    | Tokens oficiais, SVGs da marca de `docs/referencias`, axe nos testes                           |
| IX. Rastreabilidade      | Tarefas com IDs de HU/FR; ADRs em `docs/adr`                                                   |
| X. Nada inventado        | Premiação "a confirmar"; marca SENAI Ceará como área provisória                                |

Resultado: **aprovado**, sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-fundacao-perfis-demo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── regras-pontuacao.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/                 # composição: rotas, provedores, layouts por perfil
├── shared/
│   ├── ui/              # módulo 15 — componentes compartilhados
│   ├── lib/             # env, cliente Supabase, utilidades
│   ├── pwa/             # indicador de conexão, atualização e instalação
│   └── styles/          # tokens e Tailwind
├── modules/
│   ├── auth/            # 1  autenticação e usuários
│   ├── acesso/          # 2  perfis, permissões e vínculos
│   ├── organizacao/     # 3  edições, cursos e turmas
│   ├── duplas/          # 4
│   ├── encontros/       # 5  encontros e ambientes
│   ├── questoes/        # 6
│   ├── desafios/        # 7  desafios, projetos e entregas
│   ├── presenca/        # 8  presença e participação
│   ├── avaliacao/       # 9  avaliação e rubricas
│   ├── prova-oficial/   # 10
│   ├── pontuacao/       # 11 pontuação e classificação
│   ├── ocorrencias/     # 12 ocorrências, penalidades e recursos
│   ├── comunicados/     # 13 comunicados e regulamento
│   ├── relatorios/      # 14
│   ├── auditoria/       # 16
│   └── demo/            # dados fictícios (somente modo demonstração)
└── test/                # setup e utilitários de teste
supabase/
├── config.toml
├── migrations/
├── tests/               # pgTAP (RLS)
└── seed.sql             # apenas dados fictícios
e2e/                     # Playwright
```

**Structure Decision**: monólito modular de projeto único (Option 1). Cada módulo segue
`domain/` (TS puro) → `data/` (repositórios: Supabase ou demo) → `ui/` (React) e expõe
`index.ts`. Ver `docs/arquitetura.md`.

## Complexity Tracking

Nenhuma violação constitucional a justificar.
