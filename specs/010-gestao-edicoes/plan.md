# Implementation Plan: Gestão de edições, turmas e vínculos

**Branch**: `010-gestao-edicoes` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-gestao-edicoes/spec.md`, revisada em 2026-11-03
com o fluxo definido pelo usuário (criar edição → vincular turmas → gestão por turma → mentor por
curso) e dividida: as regras ficam para a spec 011.

## Summary

Esta spec completa o RF02 e fecha a lacuna da spec 001 (edições só pelo banco, estado e regras por
UPDATE direto).

- **Edições por RPC (R1, R2):** criar, alterar, ativar, encerrar e apagar só por RPC, com chave de
  envio e auditoria. Quem coordena alguma edição cria outra e já sai como coordenação dela; as
  regras vêm de uma base (piloto ou outra edição) e não mudam nesta spec.
- **Cadastro permanente (R3, R4, R5):** `cadastro_cursos` e `cadastro_turmas`; as tabelas atuais
  `cursos` e `turmas` passam a ser o curso e a turma **na edição**, criados ao vincular uma turma do
  cadastro. Nenhuma das ~135 referências a `turma_id` muda. Correções do cadastro chegam sozinhas
  só às edições em preparação; numa edição ativa, por `atualizar_do_cadastro`, a pedido da
  coordenação dela.
- **Gestão por turma (R7):** seção "Alunos e docentes" no painel da turma, reaproveitando criação de
  conta, importação CSV e vínculos da spec 002, com a turma fixa e a busca de pessoas com conta.
  Só a coordenação faz a gestão; docentes e mentores continuam vendo a lista da turma.
- **Mentor por curso (R6):** vínculo ao curso na edição com vínculos derivados por turma mantidos
  por gatilho; as verificações existentes continuam lendo `turma_id`. Os vínculos atuais são
  convertidos.
- **Encerramento (R8, R10):** pendências listadas sem impedir; bloqueio central de escrita em
  edição encerrada por gatilho nas tabelas da edição.
- **Coordenação (R9)** com pelo menos uma ativa, e **seletor de edição (R11)** sem mudar as 48
  telas que usam `useEdicaoAtual`.
- **Migração (R12)** dos dados existentes para o modelo novo.

### Decisões dos esclarecimentos refletidas no desenho

| Decisão                                                   | Requisito              | Onde está no desenho                                     |
| --------------------------------------------------------- | ---------------------- | -------------------------------------------------------- |
| Quem coordena alguma edição cria outra; sem administrador | FR-001, FR-002         | `criar_edicao`, `app.coordena_alguma_edicao` (R2)        |
| Cursos e turmas em cadastro permanente                    | FR-004, FR-005, FR-006 | `cadastro_*`, turma na edição, `vincular_turmas` (R3–R5) |
| Gestão por turma, sem estado próprio da turma             | FR-007                 | `GestaoDaTurma` no painel da turma (R7)                  |
| Gestão da turma só pela coordenação                       | FR-007                 | ações e RLS só para `app.e_coordenacao` (R7)             |
| Cadastro chega sozinho só às edições em preparação        | FR-004                 | gatilho de sincronia e `atualizar_do_cadastro` (R4)      |
| Mentor só por curso, inclusive turmas vinculadas depois   | FR-008, FR-009         | `curso_id`/`origem_id` e gatilhos de derivadas (R6)      |
| Encerrar com pendências, com aviso                        | FR-011                 | `pendencias_da_edicao`, `encerrar_edicao` (R10)          |
| Rascunho visível a quem tem vínculo, "Em preparação"      | FR-015                 | leitura inalterada; selo no topo                         |
| Várias edições ativas, com seletor                        | FR-019, FR-020         | `EdicaoEmUsoProvider`, `SeletorEdicao` (R11)             |
| Regras (versões, por turma, por encontro) na spec 011     | —                      | fora desta spec; turmas usam as regras da edição         |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL); Edge
  Function `criar-conta` em Deno/TypeScript.
- **Primary Dependencies**: as mesmas das specs anteriores; nenhuma dependência nova.
- **Storage**: Supabase local. Tabelas novas `cadastro_cursos` e `cadastro_turmas`; colunas novas em
  `cursos`, `turmas`, `edicoes` e `atribuicoes`; gatilhos de derivadas, coordenação e bloqueio de
  encerrada; migração dos dados existentes.
- **Testing**:
  - Vitest: domínio (`validarEdicao`, `edicaoPadrao`, `validarItemDoCadastro`), repositório,
    provider do seletor e componentes (axe); Edge Function `criar-conta` (mentor com curso);
  - pgTAP: `supabase/tests/011_edicoes.test.sql` (edições, cadastro, vínculo de turmas, isolamento
    entre edições, mentor por curso e derivadas, bloqueio de encerrada em cada tabela, coordenação,
    migração) e ajuste das fixtures que escrevem em edição encerrada ou criam cursos/turmas direto;
  - Playwright: demonstração em `e2e/jornadas.spec.ts` e `e2e-supabase/edicoes.spec.ts`;
  - scripts: `testar-concorrencia-edicoes.mjs` (novo) e `testar-paridade-calculo.mjs` (sem
    mudança esperada).
- **Target Platform**: PWA responsiva.
- **Project Type**: aplicação web (monólito modular) com banco Supabase.
- **Performance Goals**: derivadas de mentor são poucas linhas (mentores × turmas do curso). Sem
  metas numéricas presumidas (RNF08).
- **Constraints**:
  - toda escrita de edição e cadastro por RPC; nada concluído antes da resposta;
  - dados de uma edição nunca aparecem em outra;
  - edição encerrada só leitura em todo o banco;
  - escolha da edição guarda só o id, por usuário, no `localStorage`; nada autenticado em cache.
- **Scale/Scope**: uma unidade, poucas edições, dezenas de turmas no cadastro.

## Constitution Check

| Princípio           | Atendimento                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 010 revisada com o fluxo do usuário e dividida; tarefas ligadas a US, FR e SC                                |
| II TDD              | pgTAP, domínio e componentes escritos e vistos falhando antes do código; testes existentes como rede da migração  |
| III Modular         | Tudo em `@/modules/organizacao` (módulo 3); seletor em `src/app/dados`; domínio TS puro                           |
| IV Estrito          | Formatos tipados; sem `any`                                                                                       |
| V Servidor          | RLS no cadastro; UPDATE direto de edições e CRUD direto de cursos/turmas removidos; derivadas protegidas          |
| VI Dados            | Busca de pessoas sem e-mail e limitada às edições coordenadas; seletor guarda só o id; demonstração fictícia      |
| VII Confirmação     | Criação, vínculos e mudanças de estado só confirmados após a resposta; escrita desabilitada sem conexão e na demo |
| VIII A11y           | axe em todos os componentes; `select` nativo rotulado; caixas de seleção agrupadas por curso                      |
| X Nada inventado    | Premiação fora; unidade única, ampliação do mentor na migração e busca de pessoas marcadas **[validar]**          |

Resultado antes e depois do desenho: **aprovado**. Pontos de atenção: o bloqueio central (R8) e o
fim do CRUD direto de cursos/turmas mudam o comportamento das specs 002, 005 e 006, conforme exigido
pela spec; as fixtures afetadas são ajustadas sem enfraquecer as asserções.

## Project Structure

### Documentation (this feature)

```text
specs/010-gestao-edicoes/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/rpc.md, contracts/telas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
supabase/migrations/20261104120000_gestao_edicoes.sql
supabase/tests/011_edicoes.test.sql (+ ajustes de fixtures em testes existentes)
supabase/seed.sql                              (mentor@ por curso; dados antes de encerrar a edição fictícia)
supabase/functions/criar-conta/index.ts (+ teste)  (mentor com cursoId)
src/modules/organizacao/
├── domain/edicoes.ts, domain/cadastro.ts (+ .test)
├── data/repositorioSupabase.ts (+ .test)
└── ui/ListaEdicoes.tsx, FormEdicao.tsx, CadastroCursosTurmas.tsx, VincularTurmas.tsx,
       GestaoDaTurma.tsx, MentoresDoCurso.tsx, DialogoEncerrar.tsx, CoordenacaoDaEdicao.tsx,
       SeletorEdicao.tsx (+ testes)
src/modules/demo/edicoes.ts (+ .test)
src/app/dados/EdicaoEmUso.tsx (+ .test), consultas.ts, repositorios.tsx, useRepositorios.ts
src/app/layout/AppShell.tsx
src/app/paginas/edicoes.tsx, organizacao.tsx, painelTurma (seção "Alunos e docentes"), rotas.tsx, navegacao.ts
scripts/testar-concorrencia-edicoes.mjs
e2e/jornadas.spec.ts, e2e-supabase/edicoes.spec.ts
docs/decisoes-e-pendencias.md, docs/requisitos-e-referencias.md, docs/arquitetura.md
```

**Structure Decision**: o módulo 3 (`organizacao`) é dono de edições, cursos e turmas; o cadastro
permanente e a turma na edição ficam nele. O seletor é infraestrutura da aplicação, porque toca
todas as áreas.

## Complexity Tracking

| Ponto                                    | Por que é necessário                                   | Alternativa mais simples rejeitada porque                                    |
| ---------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Cadastro permanente + turma na edição    | Turmas reaproveitadas entre edições sem misturar dados | Turma permanente com `edicao_id` em cada tabela reescreveria dezenas de RPCs |
| Vínculos derivados de mentor por gatilho | Mentor por curso sem mudar as verificações existentes  | Considerar o curso em cada verificação arrisca abrir ou fechar acesso        |
| Gatilho de bloqueio em ~30 tabelas       | SC-005 exige recusa em todas as funcionalidades        | Checagem por RPC deixa de fora escritas diretas permitidas pela RLS          |
