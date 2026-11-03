# Implementation Plan: Regras da edição e das turmas

**Branch**: `011-regras-edicao` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-regras-edicao/spec.md`, com as decisões herdadas da
spec 010 e os esclarecimentos de 2026-11-03 (critérios por coordenação e mentor, turma com
subconjunto de encontros, prova oficial fixa pelo PRD). O ranking por turma é a spec 012.

## Summary

- **Versões da edição (R1, R4, R5):** `versoes_regras` com todas as versões; `edicoes.regras` vira a
  cópia da vigente. Valores e estrutura (critérios, faixas, tipos) são editáveis com validação no
  servidor e no domínio TS; prova oficial fixa (PRD HU04); rótulo sugerido; concorrência otimista.
- **Ajustes da turma (R2, R8):** `ajustes_regras_turma` com só os grupos ajustados; regras vigentes
  = versão da edição `||` grupos da turma no mesmo instante. Mentor ajusta os grupos de avaliação
  das turmas do seu curso; coordenação ajusta também penalidades e prazos.
- **Regras por encontro (R3, R9):** `app.regras_do_encontro(encontro, turma)` usado no cálculo
  oficial, nos lançamentos, nas avaliações e nas ocorrências; o parcial do navegador recebe as
  regras de cada encontro, com paridade testada.
- **Encontros da turma e máximo (R6, R7):** exclusões por turma (padrão: todos); pontuação máxima =
  soma dos máximos dos encontros da turma, exibida na pontuação e nos painéis.
- **Telas (R10):** regras da edição em "Edições"; regras e encontros da turma no painel da turma;
  regulamento com as regras da turma.
- **Menu em categorias (R12):** itens de cada área agrupados com título na barra lateral, no menu do
  celular e nos atalhos da tela inicial, sem mudar rotas nem permissões.

### Decisões dos esclarecimentos refletidas no desenho

| Decisão                                                            | Requisito      | Onde está no desenho                                        |
| ------------------------------------------------------------------ | -------------- | ----------------------------------------------------------- |
| Regras mudam com a edição ativa, com versão e justificativa        | FR-001, FR-002 | `gravar_regras`, `versoes_regras` (R1)                      |
| Cada encontro usa as regras do seu início                          | FR-010, FR-011 | `app.regras_do_encontro` (R3)                               |
| Rótulo sugerido e editável, único                                  | FR-002         | `app.sugerir_rotulo`, índice único (R5)                     |
| Critérios criados, removidos e renomeados                          | FR-001, FR-007 | `app.validar_regras` (R4)                                   |
| Coordenação e mentor definem regras da turma                       | FR-004         | `gravar_ajustes_turma`, `app.pode_ajustar_turma` (R2, R8)   |
| Mentor só grupos de avaliação; penalidades e prazos só coordenação | FR-004         | R2, R8                                                      |
| Prova oficial fixa pelo PRD                                        | FR-016         | `app.validar_regras` compara com `app.regras_piloto()` (R4) |
| Turma com subconjunto de encontros                                 | FR-008         | `encontros_fora_da_turma` (R6)                              |
| Pontuação máxima da turma                                          | FR-009         | `app.maximo_da_turma` (R7)                                  |
| Ranking por turma na spec 012                                      | —              | fora; ranking da 007 continua (R11)                         |
| Menu em categorias (pedido do usuário)                             | FR-017, FR-018 | `MENUS` com grupos, `AppShell`, `Atalhos` (R12)             |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: as mesmas das specs anteriores; nenhuma dependência nova.
- **Storage**: Supabase local. Tabelas novas `versoes_regras`, `ajustes_regras_turma`,
  `encontros_fora_da_turma`; funções de regras vigentes; troca de `app.regras_da_edicao` por
  `app.regras_do_encontro` nas funções ligadas a encontro e turma.
- **Testing**:
  - Vitest: `validarRegras`, `sugerirRotulo`, `combinarRegras`, `pontuacaoMaximaDoEncontro`,
    repositório e componentes (axe);
  - pgTAP: `supabase/tests/012_regras.test.sql` (versões, validação, estrutura, prova oficial,
    concorrência, ajustes por papel, regras por encontro, encontros da turma, máximo);
  - Playwright: demonstração em `e2e/jornadas.spec.ts` e `e2e-supabase/regras.spec.ts`;
  - scripts: `testar-concorrencia-regras.mjs` (novo) e cenários novos em `testar-paridade-calculo.mjs`.
- **Target Platform**: PWA responsiva.
- **Project Type**: aplicação web (monólito modular) com banco Supabase.
- **Performance Goals**: `regras_do_encontro` é busca indexada por `(edicao_id, vale_desde)` e
  `(turma_id, vale_desde)`; poucas versões por edição. Sem metas numéricas presumidas (RNF08).
- **Constraints**: toda escrita de regras por RPC; nada concluído antes da resposta; encontro já
  começado não muda; prova oficial fixa; edição encerrada só leitura.
- **Scale/Scope**: poucas edições, dezenas de turmas, poucas versões e ajustes por turma.

## Constitution Check

| Princípio           | Atendimento                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 011 com esclarecimentos; tarefas ligadas a US, FR e SC                                  |
| II TDD              | pgTAP, domínio e componentes vistos falhando antes do código; paridade com versões e ajustes |
| III Modular         | Regras em `@/modules/pontuacao` (dono do contrato); páginas em `src/app`; domínio TS puro    |
| IV Estrito          | `RegrasDaEdicao` reaproveitado; ajustes tipados por grupo; sem `any`                         |
| V Servidor          | RLS nas três tabelas novas; escrita só por RPC; permissões por papel e curso no servidor     |
| VI Dados            | Regras não têm dados pessoais; histórico mostra só nome do autor                             |
| VII Confirmação     | Gravações só confirmadas após a resposta; recusa por desatualização com recarregar           |
| VIII A11y           | axe em todos os componentes; editor de critérios operável por teclado                        |
| X Nada inventado    | Prova oficial pelo PRD; limites de proteção e máximo com encontros diferentes **[validar]**  |

Resultado antes e depois do desenho: **aprovado**. Ponto de atenção: trocar `regras_da_edicao` por
`regras_do_encontro` mexe nas RPCs das specs 006 e 007; os testes existentes delas são a rede de
segurança e o script de paridade cobre o cálculo.

## Project Structure

### Documentation (this feature)

```text
specs/011-regras-edicao/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/rpc.md, contracts/telas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
supabase/migrations/20261105120000_regras_edicao.sql
supabase/tests/012_regras.test.sql
src/modules/pontuacao/
├── domain/regrasTipos.ts, domain/validacaoRegras.ts, domain/regrasVigentes.ts (+ .test)
├── data/repositorioRegrasSupabase.ts (+ .test)
└── ui/FormRegras.tsx, EditorDeCriterios.tsx, FormAjustesTurma.tsx, HistoricoRegras.tsx,
       EncontrosDaTurma.tsx, PontuacaoMaxima.tsx (+ testes)
src/modules/atividades/ui/PontuacaoDoEncontro.tsx e formulários de avaliação (regras do encontro)
src/modules/comunicados/ui/ResumoRegulamento.tsx (regras da turma, grupos ajustados, máximo)
src/modules/demo/regras.ts (+ .test)
src/app/dados/*, src/app/paginas/edicoes.tsx, painelTurma.tsx, aluno.tsx
src/app/navegacao.ts (+ teste), src/app/layout/AppShell.tsx, src/app/layout/Atalhos.tsx (+ testes)
scripts/testar-concorrencia-regras.mjs, scripts/testar-paridade-calculo.mjs
e2e/jornadas.spec.ts, e2e-supabase/regras.spec.ts
docs/decisoes-e-pendencias.md, docs/requisitos-e-referencias.md, docs/arquitetura.md
```

**Structure Decision**: o módulo 11 (`pontuacao`) é dono do contrato de regras e passa a ter
repositório e telas de regras; os módulos que lançam e calculam (atividades, resultado) só recebem
as regras do encontro já resolvidas pelo servidor.

## Complexity Tracking

| Ponto                            | Por que é necessário                                      | Alternativa mais simples rejeitada porque                           |
| -------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| Regras por encontro e turma      | FR-010/FR-011: encontro já começado não muda              | Regra única por edição recalcularia o passado                       |
| Estrutura editável               | Esclarecimento: critérios criados, removidos e renomeados | Só valores contraria a decisão do usuário                           |
| Exclusões de encontros por turma | FR-008 com padrão "todos"                                 | Tabela de participação exigiria uma linha por turma a cada encontro |
