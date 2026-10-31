# Arquitetura — monólito modular

Um único repositório e uma única aplicação implantável (SPA Vite/React + PWA), com o Supabase
como backend gerenciado (Auth, PostgreSQL com RLS, Storage, funções). Não há microsserviços.

```text
Navegador (React)                       Supabase (ambiente confiável)
┌───────────────────────────┐           ┌──────────────────────────────────┐
│ app/  rotas, layouts       │           │ Auth (contas criadas pela coord.) │
│ modules/<m>/ui   (React)   │  HTTPS    │ PostgreSQL + RLS por perfil/vínculo│
│ modules/<m>/data (repos.)  │ ───────►  │ funções/RPC transacionais (Inc. 3+)│
│ modules/<m>/domain (TS puro)│ chave     │ Storage privado (Inc. 3)           │
│ shared/ ui, pwa, lib       │ pública   │ auditoria por gatilhos             │
└───────────────────────────┘           └──────────────────────────────────┘
```

**A interface nunca é barreira de segurança.** `RotaProtegida` só evita mostrar telas; quem
decide o que cada pessoa lê ou altera é a RLS (testada em `supabase/tests/`).

## Camadas de um módulo

| Pasta      | Conteúdo                                          | Pode depender de                                                    |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| `domain/`  | Tipos e regras puras (ex.: cálculo de pontos)     | Nada além de TypeScript e `domain` de outros módulos via `index.ts` |
| `data/`    | Repositórios/adaptadores (Supabase, demonstração) | `domain`, `shared/lib`                                              |
| `ui/`      | Componentes e hooks React                         | `domain`, `data`, `shared/ui`, `shared/pwa`                         |
| `index.ts` | API pública do módulo                             | —                                                                   |

Regras automatizadas no ESLint (`eslint.config.js`):

- importar `@/modules/x/qualquer/coisa` é proibido — só `@/modules/x` (API pública);
- arquivos em `modules/*/domain/` não podem importar React, Supabase ou UI.

As regras de pontuação existem hoje no domínio TypeScript (para exibição e simulação). No
Incremento 4 serão reproduzidas em função SQL transacional, que será a fonte oficial de pontos
gravados; os mesmos casos de teste (contrato em `specs/001-.../contracts/regras-pontuacao.md`)
valem para os dois lados.

## Mapa de módulos

| #   | Módulo                              | Pasta                                    | Situação no ciclo 1                                                  |
| --- | ----------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| 1   | Autenticação e usuários             | `modules/auth`                           | Adaptadores Supabase (real) e demonstração, sessão, rotas protegidas |
| 2   | Perfis, permissões e vínculos       | `modules/acesso` + tabela `atribuicoes`  | Papéis, áreas, RLS e testes pgTAP                                    |
| 3   | Edições, cursos e turmas            | `modules/organizacao` + tabelas          | Cursos, turmas, vínculos e contas com Supabase (spec 002)            |
| 4   | Equipes (duplas e trios)            | `modules/duplas`                         | Convites, trio, nome e gestão por RPC; histórico (specs 002 e 003)   |
| 5   | Encontros e ambientes               | `modules/encontros`                      | Cadastro com validação no servidor (spec 002)                        |
| 6   | Questões preparatórias              | `modules/atividades`                     | Listas, gabarito protegido e submissão única por RPC (spec 006)      |
| 7   | Desafios, projetos e entregas       | `modules/atividades` + bucket `entregas` | Entrega em duas etapas (Storage + RPC), comprovante do servidor      |
| 8   | Presença e participação             | `modules/atividades`                     | Registro em lote e participação por RPC idempotente (spec 006)       |
| 9   | Avaliação e rubricas                | `modules/atividades`                     | Rubrica com feedback, correção justificada e prorrogação (spec 006)  |
| 10  | Prova oficial (registro)            | `modules/prova-oficial`                  | Regra pendente/confirmada pronta; registro no Inc. 4                 |
| 11  | Pontuação e classificação           | `modules/pontuacao`                      | Núcleo de cálculo e desempate com TDD                                |
| 12  | Ocorrências, penalidades e recursos | `modules/ocorrencias`                    | Deduplicação e teto prontos; fluxo no Inc. 4                         |
| 13  | Comunicados e regulamento           | `modules/comunicados`                    | Resumo das regras; publicação no Inc. 2                              |
| 14  | Relatórios e acompanhamento         | `modules/relatorios`                     | Inc. 5                                                               |
| 15  | Componentes compartilhados          | `shared/ui`, `shared/pwa`                | Prontos (botões, campos, tabela, diálogo, badges…)                   |
| 16  | Auditoria e histórico               | tabela `auditoria` + gatilhos            | Gatilhos ativos em edições, cursos, turmas, atribuições              |
| 17  | Painel da turma                     | `modules/painel-turma`                   | Leitura por RPC com acesso no servidor (spec 004)                    |
| —   | Dados fictícios                     | `modules/demo`                           | Somente modo demonstração                                            |

Módulos ainda sem código têm apenas `README.md` descrevendo responsabilidade e incremento.

## Acesso a dados

Repositórios por módulo (contrato em `domain/`, Supabase em `data/`, demonstração em
`modules/demo`) servidos por `src/app/dados` e consumidos com TanStack Query (ADR 0007).
Escrita de duplas somente por RPC; criação de contas somente pela Edge Function (ADR 0008).

## Composição

`src/app/App.tsx` escolhe o adaptador de autenticação conforme `src/shared/lib/env.ts`:

- `supabase`: URL e chave pública configuradas → login real;
- `demo`: `VITE_DEMO_MODE=true`, ou `npm run dev` sem Supabase → perfis fictícios, faixa de
  aviso em todas as telas;
- `nao-configurado`: build de produção sem Supabase → tela explica a configuração.
