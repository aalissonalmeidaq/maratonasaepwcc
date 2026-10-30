# Implementation Plan: Painel da turma

**Branch**: `004-painel-da-turma` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-painel-da-turma/spec.md`. Ela era a spec 007 e
foi renumerada para 004 a pedido do usuário em 2026-10-30. As referências à antiga spec 006
apontam agora para a spec 003.

## Summary

Cada turma ganha um painel próprio. Uma nova RPC de leitura, `painel_da_turma(p_turma)`
(`security definer`, `search_path = ''`), confere o acesso no servidor e devolve, num único JSON:

- a identificação da turma;
- os alunos ativos, com a indicação de quem tem equipe;
- as equipes ativas e seus integrantes;
- os convites pendentes, só para a equipe docente e a coordenação;
- os encontros da edição.

Têm acesso a coordenação da edição, docente e mentor vinculados à turma e os alunos ativos da
turma. Os indicadores (alunos ativos, com equipe, sem equipe, equipes) **não** vêm prontos do
servidor: são derivados das listas por funções puras do domínio. Assim, eles batem por
construção com as listas exibidas (SC-003).

O novo módulo `src/modules/painel-turma` reúne:

- `domain`: tipos, indicadores e agrupamento de encontros (TS puro, com TDD);
- `data`: repositório Supabase e mapeamento de erros;
- `ui`: o componente `PainelTurma`.

As rotas são estas:

- `/docente/turmas/:turmaId`, a partir de "Minhas turmas";
- `/coordenacao/turmas/:turmaId`, a partir de "Organização → Turmas";
- `/aluno/turma`, pelo novo item de menu "Minha turma".

A pontuação e o ranking (US3) ainda não têm dados reais: os Incrementos 3 e 4 não foram
implementados. Por isso, a RPC devolve `pontuacao: null`, e o bloco mostra só o aviso "Pontuação
disponível a partir dos lançamentos de avaliação". Na demonstração (esclarecimento de
2026-10-30, opção B), o repositório de demonstração preenche `pontuacao` com o ranking fictício
que já existe em `modules/demo`. O bloco mostra uma tabela com o total e a posição na categoria
de cada equipe da turma, o estado da classificação e o selo "Dados fictícios". Para o aluno, vale
a regra de publicação (FR-005): com o ranking `parcial`, o bloco mostra "Classificação ainda não
publicada", sem números. Com a classificação publicada (`provisorio` ou `definitivo`), o aluno vê a
tabela só com o total de cada equipe, sem notas individuais.

O painel é somente leitura (FR-007). Para a gestão, o bloco de equipes tem o link "Alterar
equipes".

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: React 19, React Router, Tailwind, @tanstack/react-query 5 e
  supabase-js 2. Nenhuma dependência nova.
- **Storage**: Supabase PostgreSQL local (portas 5442x). Nenhuma tabela nova.
- **Testing**:
  - Vitest + Testing Library + axe, para domínio e componente;
  - pgTAP, em `supabase/tests/006_painel_da_turma.test.sql`;
  - Playwright: demo em `e2e/` e Supabase local em `e2e-supabase/`.
- **Target Platform**: PWA responsiva, de 320 px ao desktop.
- **Project Type**: aplicação web (monólito modular) com banco Supabase.
- **Performance Goals**: não há meta aprovada. Uma chamada RPC por painel, com volume limitado
  a uma turma.
- **Constraints**:
  - autorização só no servidor;
  - o aluno recebe apenas dados coletivos;
  - nada autenticado vai para o cache do SW (o React Query guarda só em memória);
  - nenhum número fictício fora da demonstração.
- **Scale/Scope**: uma turma por consulta. O volume de produção não foi informado.

## Constitution Check

| Princípio           | Atendimento                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 004 com esclarecimentos; tarefas ligadas a US/FR/SC                                                                           |
| II TDD              | pgTAP de acesso e conteúdo, e testes de domínio e componente escritos e vistos falhando antes do código                            |
| III Modular         | Novo módulo `painel-turma` com `index.ts`; o domínio não importa React nem outros módulos; as páginas importam só pelos índices    |
| IV Estrito          | Sem `any`; JSON da RPC tipado e mapeado no repositório                                                                             |
| V Servidor          | Acesso decidido na RPC (`42501`/`P0002`); `anon` sem `execute`; nenhuma tabela nova, então nenhuma RLS nova                        |
| VI Dados            | Aluno recebe só nome e "tem equipe" dos colegas, as equipes da própria turma e os encontros; sem convites, contatos ou notas       |
| VII Confirmação     | Painel somente leitura; as alterações de equipe continuam nas telas da spec 003                                                    |
| VIII A11y           | Componentes compartilhados (`Card`, `StatCard`, `EmptyState`, `ResponsiveTable`); axe no componente; E2E em Pixel 7                |
| X Nada inventado    | Números só na demonstração, marcados como fictícios; sem dados reais, só o aviso. A lacuna fica em `docs/decisoes-e-pendencias.md` |

Resultado (pré e pós-design): aprovado, sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/004-painel-da-turma/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rpc.md
│   └── telas.md
└── tasks.md
```

### Source Code (repository root)

```text
supabase/migrations/20261030150000_painel_da_turma.sql   # RPC painel_da_turma
supabase/tests/006_painel_da_turma.test.sql              # pgTAP de acesso e conteúdo
src/modules/painel-turma/
├── index.ts
├── README.md
├── domain/tipos.ts            # PainelTurma, RepositorioPainelTurma
├── domain/painel.ts (+ .test) # indicadores, alunosSemEquipe, agruparEncontros
├── data/repositorioSupabase.ts (+ .test)
└── ui/PainelTurma.tsx (+ .test)
src/modules/demo/repositorios.ts   # painelTurma da demonstração
src/app/dados/{useRepositorios.ts,repositorios.tsx,consultas.ts}  # usePainelTurma
src/app/paginas/painelTurma.tsx    # páginas por área
src/app/paginas/organizacao.tsx    # links "Abrir painel da turma" / "Painel"
src/app/rotas.tsx, src/app/navegacao.ts
e2e/jornadas.spec.ts, e2e-supabase/painel-turma.spec.ts
```

**Structure Decision**: o painel ganha um módulo próprio, porque cruza organização, equipes e
encontros. O domínio dele não depende de nenhum outro módulo. A situação dos encontros
(realizado/agendado) segue a mesma regra de `situacaoEncontro` e é replicada no domínio do
painel, já que o índice de `encontros` exporta componentes React.

## Complexity Tracking

Sem violações a justificar.
