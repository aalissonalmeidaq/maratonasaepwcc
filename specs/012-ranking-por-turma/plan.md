# Implementation Plan: Ranking por turma

**Branch**: `012-ranking-por-turma` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-ranking-por-turma/spec.md`, com as decisões
herdadas da spec 011 e os esclarecimentos de 2026-11-03 (premiação por turma, histórico por
categoria só para a coordenação, empate premiado decidido pela coordenação, publicação em lote,
premiação visível à gestão da turma).

## Summary

- **Publicação por turma (R1–R5):** `publicacoes_ranking` ganha `turma_id` e `lote_id`; as
  publicações antigas (sem turma) viram "por categoria (anterior)" sem nenhuma alteração.
  `publicar_ranking_turmas` publica várias turmas de uma vez, cada uma em subtransação própria
  (versão, pendências e concorrência por turma); a publicação por categoria passa a ser recusada.
- **Leitura por perfil (R6, R7):** `ranking_da_turma` para aluno, gestão da turma e coordenação;
  `ranking_da_edicao` para a lista da coordenação; histórico anterior só para a coordenação, com
  gatilho que recusa revisão nova sobre ele.
- **Premiação (R8):** `premiacao_da_edicao` calcula, por turma, a situação a partir da última
  publicação; `decisoes_premiacao` guarda a decisão da coordenação nos empates premiados.
- **Telas que liam por categoria (R9, R10):** painel do aluno, painel da turma, painel da
  coordenação e relatório de pontos passam a ler a publicação da turma; avisos só para a turma.
- **Frontend:** `@/modules/resultado` com lista de turmas, publicação em lote, resultado por turma,
  premiação por turma e decisão de empate; demonstração com publicações fictícias por turma.

### Decisões dos esclarecimentos refletidas no desenho

| Decisão                                       | Requisito      | Onde está no desenho                                                                    |
| --------------------------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| Ranking por turma, substitui o por categoria  | FR-001, FR-002 | `turma_id` em `publicacoes_ranking`, `publicar_ranking_turmas` (R1, R2)                 |
| Aluno vê só a própria turma                   | FR-008         | `ranking_da_turma` (R6)                                                                 |
| Histórico por categoria só para a coordenação | FR-017         | `ranking_publicado`/`historico_publicacoes` só coordenação; gatilho de revisão (R6, R7) |
| Publicação em lote, independente por turma    | FR-007a        | subtransação por turma, `ResultadoLote` (R2)                                            |
| Concorrência com recarregar                   | FR-006         | `versaoBase` por turma (R3)                                                             |
| Premiação por turma pela definitiva           | FR-018         | `premiacao_da_edicao` (R8)                                                              |
| Empate premiado: coordenação decide           | FR-018b        | `decisoes_premiacao`, `decidir_premiacao_empate` (R8)                                   |
| Gestão vê premiação provisória                | FR-018a        | situação `provisorio` só para coordenação, docente e mentor (R8)                        |
| Aviso só para a turma publicada               | FR-012a        | `app.avisar` por atribuição da turma (R10)                                              |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: as mesmas das specs anteriores; nenhuma dependência nova.
- **Storage**: Supabase local. Migration `20261106120000_ranking_por_turma.sql`: colunas
  `turma_id` e `lote_id` em `publicacoes_ranking` (índices únicos parciais), tabela nova
  `decisoes_premiacao`, gatilhos de recusa (publicação sem turma, revisão sobre publicação
  anterior), funções novas e recriadas listadas em [data-model.md](./data-model.md).
- **Testing**:
  - Vitest: `premiacaoDaTurma` (domínio puro: posições, empate, posição pulada, situação),
    repositório Supabase, componentes (`ListaTurmasRanking`, `PainelPublicacao`,
    `ResultadoDoLote`, `PremiacaoPorTurma`, `FormDecisaoEmpate`) com axe, painéis;
  - pgTAP: `supabase/tests/013_ranking_turma.test.sql` (publicação por turma, lote com recusa
    parcial, concorrência por versão base, pendências por turma, leitura por perfil, histórico
    anterior, gatilho de revisão, avisos por turma, premiação e decisão de empate, RLS da tabela
    nova); `008` e `009` migrados para a publicação por turma;
  - Playwright: demonstração em `e2e/jornadas.spec.ts`; real em `e2e-supabase/resultado.spec.ts`
    e `e2e-supabase/paineis.spec.ts` (publicação por turma) e `e2e-supabase/ranking-turma.spec.ts`
    (lote, aluno, premiação);
  - scripts: `testar-concorrencia-publicacao.mjs` migrado para a turma; paridade sem mudança.
- **Target Platform**: PWA responsiva.
- **Project Type**: aplicação web (monólito modular) com banco Supabase.
- **Performance Goals**: leitura por índice `(turma_id, versao desc)`; `ranking_da_edicao` calcula
  pendências turma a turma (dezenas de turmas por edição). Sem metas numéricas presumidas (RNF08).
- **Constraints**: escrita só por RPC; nada concluído antes da resposta; publicações imutáveis;
  edição encerrada só leitura; nenhuma nota individual da prova nem dado pessoal no ranking.
- **Scale/Scope**: poucas edições, dezenas de turmas, poucas publicações por turma.

## Constitution Check

| Princípio           | Atendimento                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 012 com esclarecimentos; divergência com o PRD registrada; tarefas ligadas a US, FR e SC                          |
| II TDD              | pgTAP e domínio vistos falhando antes do código; testes 008/009 migrados sem perder asserções                          |
| III Modular         | Ranking e premiação em `@/modules/resultado` (domínio TS puro para a premiação); páginas em `src/app`                  |
| IV Estrito          | Tipos novos (`TurmaNoRanking`, `ResultadoLote`, `PremiacaoDaTurma`); sem `any`                                         |
| V Servidor          | RLS na tabela nova; escrita só por RPC; leitura por perfil e vínculo no servidor; publicação e decisão auditadas       |
| VI Dados            | Ranking e premiação só com nome e id da equipe; nenhuma nota individual; histórico anterior fora do alcance dos alunos |
| VII Confirmação     | Publicação e decisão confirmadas só após a resposta; resultado do lote por turma vindo do servidor                     |
| VIII A11y           | axe em todos os componentes; lista de turmas operável por teclado; estados por texto                                   |
| X Nada inventado    | Prêmios continuam configuração a validar; empate decidido pela coordenação, sem regra presumida                        |

Resultado antes e depois do desenho: **aprovado**. Ponto de atenção: a recusa de
`publicar_ranking` por categoria quebra os testes da spec 007/008 que publicam; eles migram para a
publicação por turma na mesma entrega (R11).

## Project Structure

### Documentation (this feature)

```text
specs/012-ranking-por-turma/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/rpc.md, contracts/telas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
supabase/migrations/20261106120000_ranking_por_turma.sql
supabase/tests/013_ranking_turma.test.sql (novo); 008_resultado_oficial_ranking.test.sql e
  009_paineis_relatorios.test.sql (migrados)
src/modules/resultado/
├── domain/tipos.ts, domain/premiacao.ts (+ .test)
├── data/repositorioSupabase.ts (+ .test)
└── ui/ListaTurmasRanking.tsx, PainelPublicacao.tsx, ResultadoDoLote.tsx, PremiacaoPorTurma.tsx,
       FormDecisaoEmpate.tsx, TabelaRanking.tsx, HistoricoPublicacoes.tsx (+ testes)
src/modules/relatorios/ (painel da coordenação por turma; relatório com posição na turma)
src/modules/demo/resultado.ts, paineis.ts (publicações fictícias por turma)
src/app/dados/consultas.ts, src/app/paginas/resultado.tsx, coordenacao.tsx (premiação real)
scripts/testar-concorrencia-publicacao.mjs
e2e/jornadas.spec.ts, e2e-supabase/resultado.spec.ts, paineis.spec.ts, ranking-turma.spec.ts
docs/decisoes-e-pendencias.md, docs/requisitos-e-referencias.md, docs/arquitetura.md
```

**Structure Decision**: o módulo `resultado` (spec 007) continua dono da publicação, da revisão e
passa a ser dono da premiação; `relatorios` (spec 008) só lê. A premiação ganha uma função de
domínio pura usada pela demonstração e coberta por testes, enquanto o servidor é a fonte oficial.

## Complexity Tracking

| Ponto                                 | Por que é necessário                               | Alternativa mais simples rejeitada porque                                                            |
| ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Subtransação por turma no lote        | FR-007a: recusa de uma turma não impede as outras  | Uma chamada por turma do navegador deixaria lote parcial se a conexão cair e sem justificativa única |
| Coluna `turma_id` na tabela existente | Revisões, exceções e auditoria já apontam para ela | Tabela nova duplicaria FKs e o fluxo de revisão                                                      |
| Tabela `decisoes_premiacao`           | FR-018b: decisão auditada ligada à definitiva      | Texto livre na publicação violaria a imutabilidade das publicações                                   |
