# Implementation Plan: Resultado oficial, ocorrências e ranking

**Branch**: `007-resultado-oficial-ranking` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-resultado-oficial-ranking/spec.md`, com cinco
esclarecimentos registrados em 2026-11-01 e duas respostas da especificação.

## Summary

Esta spec implementa o Incremento 4:

- registro da prova oficial pela coordenação;
- ocorrências com manifestação, decisão e penalidade;
- cálculo oficial dos pontos no servidor;
- publicação versionada e imutável do ranking por categoria;
- pedidos de revisão em até 24 h;
- avisos no aplicativo.

Uma nova migration cria oito tabelas: `resultados_prova`, `ocorrencias`, `manifestacoes`,
`excecoes_prazo`, `publicacoes_ranking`, `publicacao_posicoes`, `pedidos_revisao` e `avisos`.
Também cria o bucket privado `evidencias` e a coluna `auditoria.pedido_revisao_id`.

Todas as tabelas novas têm RLS, e nenhuma aceita escrita direta. Toda escrita passa por RPC
`security definer` atômica, idempotente e auditada (Constituição V).

O cálculo oficial é reimplementado em PL/pgSQL (R1):

- `app.calcular_encontro(jsonb, jsonb)` é pura e usa o mesmo formato JSON de
  `LancamentosDoEncontro`;
- `app.lancamentos_oficiais` monta os lançamentos a partir das tabelas da spec 006 e desta spec.

A paridade com o núcleo TS é garantida por um arquivo de casos de contrato compartilhado (R2).
O Vitest testa o TS contra esses casos, e um script testa o SQL contra os mesmos casos.

As regras ganham `penalidades.tipos` e `prazos` em `edicoes.regras` (R3). Nenhum valor de
regra fica fixo no SQL ou na interface.

O novo módulo `src/modules/resultado` reúne:

- `domain`: tipos, prazos e rótulos;
- `data`: repositório Supabase, com o upload de evidências;
- `ui`: prova oficial, ocorrências, decisão, publicação, ranking, revisão, avisos e prévia.

O módulo `pontuacao` recebe:

- o estado `indisponivel` da nota da prova (R4);
- os campos novos das regras;
- os casos de contrato em JSON.

As páginas do aluno ("Pontuação" e "Ranking") e da coordenação ("Ranking") passam a usar dados
reais. Surgem as páginas novas de ocorrências, revisões, prova oficial, pontos da turma e
avisos. A demonstração continua só leitura.

### Decisões dos esclarecimentos refletidas no desenho

| Decisão                                                                          | Requisito | Onde está no desenho                                                 |
| -------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| Revisão sobre decisão de ocorrência e sobre componente publicado                 | FR-020    | `pedidos_revisao.objeto` (R7)                                        |
| Só a publicação provisória abre prazo; a parcial não abre e a definitiva é final | FR-020    | `publicacoes_ranking.revisao_ate` e recusa em `pedir_revisao`        |
| Revisão aceita corrige a origem, sem ajuste manual de pontos                     | FR-022    | `p_pedido` nas RPCs de correção e `auditoria.pedido_revisao_id` (R7) |
| Decisão só depois da manifestação ou do fim do prazo                             | FR-009    | Checagem em `decidir_ocorrencia` (R5)                                |
| Aluno vê a prévia da própria equipe, e o ranking só depois de publicado          | FR-019    | `pontos_da_minha_equipe` e `ranking_publicado` (R10)                 |
| Equipe docente vê a prévia da turma, sem nota individual                         | FR-019a   | `pontos_da_turma` (R10)                                              |
| Avisos só no aplicativo, sem e-mail                                              | FR-026    | Tabela `avisos` (R8)                                                 |
| Desempate "questões/prova" pela soma do componente objetivo                      | FR-016    | `app.classificar`, igual a `classificar` (R2)                        |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: React 19, React Router, Tailwind, @tanstack/react-query 5,
  supabase-js 2 (incluindo Storage), react-hook-form e zod. Nenhuma dependência nova.
- **Storage**: Supabase PostgreSQL e Storage local (portas 5442x), com o bucket privado
  `evidencias`.
- **Testing**:
  - Vitest + Testing Library + axe;
  - pgTAP em `supabase/tests/008_resultado_oficial_ranking.test.sql`;
  - script de paridade entre TS e SQL (`scripts/testar-paridade-calculo.mjs`);
  - script de concorrência da publicação (`scripts/testar-concorrencia-publicacao.mjs`);
  - Playwright: demonstração em `e2e/` e Supabase real em `e2e-supabase/resultado.spec.ts`.
- **Target Platform**: PWA responsiva, de 320 px ao desktop.
- **Project Type**: aplicação web (monólito modular) com banco Supabase.
- **Performance Goals**:
  - SC-004: publicar em até 3 interações;
  - o cálculo de uma categoria do piloto (dezenas de equipes, 4 encontros) roda numa única
    chamada.
- **Constraints**:
  - autorização só no servidor;
  - prazos pelo horário do servidor;
  - nenhum sucesso simulado;
  - nada autenticado no cache do SW;
  - nota individual da prova só para a coordenação;
  - publicações imutáveis;
  - regras sempre lidas de `edicoes.regras`.
- **Scale/Scope**: uma edição, quatro encontros e algumas turmas por categoria. O volume de
  produção não foi informado.

## Constitution Check

| Princípio           | Atendimento                                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 007 com esclarecimentos; tarefas ligadas a US, FR e SC; ADR `0011-calculo-oficial-no-servidor.md`                                                                                                                                          |
| II TDD              | Casos de contrato em JSON (TS e SQL), pgTAP por tabela, RPC e política, e testes de domínio e de componentes. Todos escritos e vistos falhando antes do código                                                                                  |
| III Modular         | Novo módulo `resultado` com `index.ts`; domínio TS puro; usa `@/modules/pontuacao` e `@/modules/atividades` só pelas APIs públicas                                                                                                              |
| IV Estrito          | Sem `any`; os JSON das RPCs são tipados e validados no repositório                                                                                                                                                                              |
| V Servidor          | RLS em todas as tabelas novas e nenhuma escrita direta. O cálculo e a publicação rodam no servidor, na mesma transação. Trava por categoria, idempotência, auditoria com pedido ligado e publicações imutáveis                                  |
| VI Dados            | A nota da prova só sai em `resultados_prova`, para a coordenação. Ocorrências são restritas à equipe, à equipe docente e à coordenação. O ranking só tem totais, e o detalhe vai só à própria equipe. Os avisos não carregam dados de terceiros |
| VII Confirmação     | Publicação, decisão, manifestação e pedido só aparecem como concluídos depois da resposta do servidor. Ações desabilitadas sem conexão. A demonstração não grava                                                                                |
| VIII A11y           | Componentes compartilhados; contador com rótulo acessível; selo de estado em texto; axe nas telas novas; E2E em 412 px                                                                                                                          |
| X Nada inventado    | Tipos e pontos das ocorrências e prazos vêm do PRD e ficam nas regras versionadas. Desempate e premissas seguem `decisoes-e-pendencias.md` §3. As lacunas (correção de questões e escala diferente de 0–100) ficam como pendências              |

Resultado antes e depois do desenho: **aprovado**, sem violações. As lacunas registradas não
violam princípios: o sistema recusa ou deixa a pendência visível, em vez de inventar
comportamento.

## Project Structure

### Documentation

```text
specs/007-resultado-oficial-ranking/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── checklists/requirements.md
└── contracts/{rpc.md, telas.md}
docs/adr/0011-calculo-oficial-no-servidor.md
```

### Source Code

```text
supabase/migrations/20261101120000_resultado_oficial_ranking.sql
supabase/tests/008_resultado_oficial_ranking.test.sql
supabase/seed.sql                                  # regras novas; prova, ocorrência e publicação fictícias
scripts/testar-paridade-calculo.mjs                # SC-001: casos de contrato contra o SQL
scripts/testar-concorrencia-publicacao.mjs         # versões sem corrida
src/modules/pontuacao/domain/
├── tipos.ts                                       # nota 'indisponivel'; penalidades.tipos; prazos
├── calculo.ts                                     # bônus só com nota confirmada
├── regras-piloto.ts                               # valores do PRD para tipos e prazos
├── casos-contrato.json, casos-ranking.json        # fonte única dos esperados (R2)
└── casos-contrato.test.ts
src/modules/resultado/
├── index.ts, README.md
├── domain/tipos.ts
├── domain/prazos.ts (+ .test)                     # prazo aberto, rótulos de estado, pode pedir revisão
├── data/repositorioSupabase.ts (+ .test)
└── ui/
    ├── FormResultadosProva.tsx                    # coordenação
    ├── FormOcorrencia.tsx, ListaOcorrencias.tsx   # docente, aluno e coordenação
    ├── FormManifestacao.tsx, FormDecisao.tsx, FormExcecaoPrazo.tsx
    ├── PainelPublicacao.tsx, HistoricoPublicacoes.tsx
    ├── TabelaRanking.tsx                          # vinda de app/paginas/aluno.tsx
    ├── PreviaPontos.tsx                           # aluno (equipe) e docente (turma)
    ├── FormPedidoRevisao.tsx, ListaRevisoes.tsx, FormRespostaRevisao.tsx
    └── ListaAvisos.tsx, ContadorAvisos.tsx
src/modules/demo/resultado.ts                      # dados fictícios, só leitura
src/app/paginas/resultado.tsx                      # páginas do aluno, docente e coordenação
src/app/{rotas.tsx, navegacao.ts, layout/*, dados/consultas.ts}
e2e/jornadas.spec.ts, e2e-supabase/resultado.spec.ts
```

**Structure Decision**: o novo módulo `resultado` concentra a prova oficial, as ocorrências, a
publicação, a revisão e os avisos. Todos compartilham o ciclo "registro → decisão → publicação"
e as mesmas RPCs.

O módulo `pontuacao` continua sendo só o núcleo de cálculo puro, usado pelo SQL via casos de
contrato e pela demonstração.

A página do aluno troca `calcularParcial`, que calculava no navegador, pela prévia vinda do
servidor. `calcularParcial` continua no módulo `atividades`, usado pela demonstração.

## Complexity Tracking

| Item                                          | Por que é necessário                                                                                                               | Alternativa mais simples rejeitada                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Cálculo duplicado em TS e PL/pgSQL            | O servidor precisa ser a fonte oficial, na mesma transação da publicação. O TS continua na demonstração e é a referência dos casos | Edge Function com o núcleo TS: exige segredo, outra implantação e uma chamada fora da transação |
| Recriar três RPCs da spec 006 com `p_pedido`  | Ligar a correção ao pedido na mesma transação (FR-022)                                                                             | Ligar depois, escolhendo linhas de auditoria: frágil e sem atomicidade                          |
| Oito tabelas e um bucket numa única migration | Tudo pertence ao mesmo incremento e às mesmas RPCs                                                                                 | Uma migration por história: aumentaria as dependências cruzadas                                 |
