# Implementation Plan: Premissas fora do site

**Branch**: `018-premissas-fora-do-site` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-premissas-fora-do-site/spec.md`

## Summary

Retirar do aplicativo tudo o que sustenta a tela "Premissas em validação" e passar o registro das
32 premissas para um documento de desenvolvimento (`docs/premissas.md`). Passos: (1) gerar o
documento a partir do catálogo atual antes de apagá-lo; (2) uma migration só de remoção apaga as
duas tabelas, o tipo, as duas RPCs e as funções auxiliares exclusivas; (3) apagar o módulo
`src/modules/premissas`, a página, as consultas, a demonstração, as fixtures, as rotas, os itens de
menu (e os grupos "Sistema", que ficam vazios) e o aviso do início do master; (4) ajustar e
remover testes (pgTAP 016, E2E de premissas, varreduras e menus) e provar a remoção com testes
novos; (5) atualizar documentação e notas das specs 015 e 016. Nenhuma regra de negócio muda.

## Technical Context

**Language/Version**: TypeScript estrito (React 19, Vite), SQL (PostgreSQL/Supabase), Markdown

**Primary Dependencies**: as existentes (React Router, TanStack Query, Supabase); nenhuma nova

**Storage**: PostgreSQL local do Supabase; a migration só faz `drop ... if exists`

**Testing**: Vitest (unidade/componentes, inclusive menu e rotas), pgTAP (`supabase test db`),
Playwright (demonstração e Supabase local)

**Target Platform**: web/PWA

**Project Type**: aplicação web monolítica modular

**Performance Goals**: N/A (remoção)

**Constraints**: nenhuma migration antiga editada; migration nova só com remoções, idempotente;
nenhuma mudança em pontuação, permissões ou outras telas; dados de auditoria geral preservados

**Scale/Scope**: ~35 arquivos removidos ou ajustados no front, 1 migration, 1 teste de banco
removido e 1 ajustado, 2 specs E2E ajustadas, 1 documento novo

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                  | Avaliação                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Spec Kit                | Spec 018 própria. Passa.                                                                                                                      |
| II. TDD                    | Testes que provam a remoção (rotas "não encontrado", menu sem item, objetos inexistentes no banco) são escritos antes e vistos falhar. Passa. |
| III. Monólito modular      | Remove um módulo inteiro por sua API pública; ninguém o importa depois (verificado por typecheck e busca). Passa.                             |
| IV. TypeScript estrito     | Typecheck sem referências órfãs. Passa.                                                                                                       |
| V. Segurança (inegociável) | Reduz superfície: some uma tabela e duas RPCs. Varredura de RLS/guarda continua verde. Passa.                                                 |
| VI. Dados de estudantes    | Sem relação. Passa.                                                                                                                           |
| VII. Servidor/offline      | Sem relação; o service worker não guarda nada de premissas autenticadas. Passa.                                                               |
| VIII. Acessibilidade       | Menos telas; axe nas rotas restantes. Passa.                                                                                                  |
| IX. Mudanças pequenas      | Uma remoção coesa, sem mudar outras funcionalidades. Passa.                                                                                   |
| X. Nada inventado, pt-BR   | O documento preserva o texto existente do catálogo, sem acrescentar regra. Passa.                                                             |
| Restrições (migrations)    | Migrations versionadas, nenhuma antiga editada, nada executado em produção. Passa.                                                            |

Sem violações; reavaliação após o desenho: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/018-premissas-fora-do-site/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── remocao.md          # inventário do que sai e do que fica
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
docs/premissas.md                                   # NOVO: P01–P32 em texto (gerado do catálogo)
docs/decisoes-e-pendencias.md                       # ajuste: aponta para docs/premissas.md
docs/operacao-e-homologacao.md                      # ajuste: sem tela; lista de implantação mantida
README.md, CLAUDE.md                                # ajuste: sem menção à tela
specs/015-…/spec.md, specs/016-…/spec.md            # nota "retirada pela spec 018"
supabase/migrations/20261114120000_remover_premissas.sql   # NOVO (só drop)
supabase/tests/016_premissas.test.sql               # REMOVIDO
supabase/tests/017_unidades.test.sql                # ajuste (linha da P25) + teste de objetos removidos
src/modules/premissas/                              # REMOVIDO (módulo inteiro)
src/modules/demo/premissas.ts, premissas.test.ts    # REMOVIDOS; demo/repositorios.ts ajustado
src/test/fixtures/premissas.ts                      # REMOVIDO
src/app/paginas/premissas.tsx                       # REMOVIDO
src/app/paginas/master.tsx, master.test.tsx         # aviso removido; teste do aviso removido
src/app/rotas.tsx, navegacao.ts, navegacao.test.ts  # rotas, itens e grupos "Sistema" removidos
src/app/dados/{consultas.ts,repositorios.tsx,useRepositorios.ts}   # premissas removidas
src/modules/relatorios/domain/csv.ts                # tipo 'premissas' removido de nomeDoArquivo
src/modules/rede/ui/Masters.tsx                     # texto "e respondem às premissas" removido
src/shared/dados/erros.test.ts, erros.ts            # exemplo/comentário sem "premissa"
e2e/premissas.spec.ts, e2e-supabase/premissas.spec.ts   # REMOVIDOS; testes novos de rota inexistente
e2e/acessibilidade.spec.ts, e2e/suporte/telasPrincipais.ts  # rotas de premissas removidas
```

**Structure Decision**: remoção coesa por camadas (documento → banco → front → testes → docs),
cada uma verificável; o documento nasce primeiro para que nada do catálogo se perca.

## Complexity Tracking

Sem violações a justificar.
