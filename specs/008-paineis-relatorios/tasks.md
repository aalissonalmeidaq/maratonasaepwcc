# Tasks: Painéis com dados reais e relatórios CSV

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `008-paineis-relatorios` | **Criação**: 2026-11-02.
**Testes**: obrigatórios pela Constituição II e pela spec (SC-001 a SC-006). Em cada história, escreva e rode o teste antes do código e confirme que ele falha porque o comportamento ainda não existe (RED). Só então implemente até passar (GREEN).

**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`.

**Convenções**:

- Toda RPC é `security definer` com `search_path = ''` e não pode ser executada por `anon`.
- Os códigos de erro são `42501` (sem papel ou vínculo) e `23514` (regra violada), com mensagens em português.
- Nenhuma resposta de painel ou relatório contém a chave `nota`, e-mail ou identificador interno de pessoa (FR-006, FR-011, FR-011a).
- Pendências dos painéis: só encontros realizados, por `app.encontro_realizado` (R2, FR-004a).
- Os testes pgTAP ficam em `supabase/tests/009_paineis_relatorios.test.sql`, com seções no marcador `-- @@secoes`.
  - Fixtures: as mesmas do arquivo 008 (edição E, categorias "Cat 1" e "Cat 2", turmas TA, TB e TC, equipes A1, A2, B1 e C1, mais a equipe C2 em TC, sem lançamentos).
  - Encontro 1 no passado e realizado; encontro 2 no futuro; encontro 3 cancelado no passado.

## Fase 1: Preparação

- [x] T001 Conferir o ambiente e registrar o estado inicial em `specs/008-paineis-relatorios/quickstart.md` (seção "Estado inicial"):
  - pgTAP 001–008 passando;
  - `npm run verify` passando.
- [x] T002 [P] Criar o esqueleto de `src/modules/relatorios/`:
  - `index.ts`;
  - atualizar `README.md` com a situação "spec 008";
  - criar `domain/tipos.ts` com `PainelDoAluno`, `PainelDaGestao`, `PainelDaCoordenacao`, `ColunaRelatorio` (`tipo: 'texto' | 'numero' | 'data_hora' | 'sim_nao'`), `Relatorio`, `TipoRelatorio` (`'pontos' | 'presenca' | 'entregas' | 'ocorrencias' | 'revisoes'`) e a interface `RepositorioPaineis`, conforme o [data-model.md](data-model.md).

## Fase 2: Fundação

- [x] T003 RED: criar `supabase/tests/009_paineis_relatorios.test.sql` com as fixtures. Testar:
  - a existência de `exportacoes_relatorio`, com RLS e sem INSERT, UPDATE ou DELETE para `authenticated`;
  - `tipo` restrito aos cinco valores e `linhas >= 0`;
  - `app.encontro_realizado`: verdadeiro para estado `realizado`, verdadeiro para data passada não cancelada, falso para encontro futuro e falso para encontro cancelado.
- [x] T004 GREEN: criar `supabase/migrations/20261102120000_paineis_relatorios.sql` com:
  - a tabela `exportacoes_relatorio`, com as colunas do data-model, gatilho de auditoria e RLS de leitura (`app.e_coordenacao(edicao_id) or autor_id = auth.uid()`);
  - `app.encontro_realizado(encontro)`, usando `(now() at time zone 'America/Sao_Paulo')::date`;
  - `app.pendencias_realizadas_da_categoria(edicao, categoria)`, igual a `app.pendencias_da_categoria` mas filtrando os componentes por encontro realizado.

  Rodar até T003 passar.

- [x] T005 [P] RED+GREEN: `src/modules/relatorios/domain/csv.ts` (+ `.test.ts`) com `gerarCsv(relatorio): string` (R5). Testar:
  - BOM `﻿` no início;
  - separador `;` e linhas com CRLF;
  - cabeçalho com os rótulos;
  - campos com `;`, aspas ou quebra de linha entre aspas, com as aspas duplicadas;
  - número com vírgula decimal (`88,33`);
  - `data_hora` como `DD/MM/AAAA HH:MM` em `America/Sao_Paulo`;
  - `sim_nao` como "Sim" ou "Não";
  - nulo vira célula vazia;
  - texto que começa com `=`, `+`, `-` ou `@` recebe o prefixo `'`;
  - relatório sem linhas devolve só o cabeçalho.

  Criar também `nomeDoArquivo(tipo, data)` no formato `maratona-<tipo>-<AAAA-MM-DD>.csv`.

- [x] T006 [P] Criar o repositório:
  - `src/modules/relatorios/data/repositorioSupabase.ts` (+ teste com cliente simulado), com os métodos `painelDoAluno`, `painelDaGestao`, `painelDaCoordenacao` e `relatorio`;
  - `src/modules/demo/paineis.ts`, que monta os mesmos formatos com os dados fictícios e recusa `relatorio`.

  Ligar os dois em `src/app/dados/` (`Repositorios.paineis` e hooks de consulta).

## Fase 3: US1, painel do aluno (P1) 🎯 MVP

**Teste independente**: com lançamentos e uma publicação, o painel da aluna mostra prévia, posição, próximo encontro e prazo iguais aos das páginas de origem, e nada de outra equipe.

- [x] T007 RED [US1]: seção "painel do aluno" no pgTAP. Testar:
  - `painel_do_aluno(E)` como a1:
    - `previa.total` igual a `app.totais_da_equipe(A1)`;
    - `ranking` nulo sem publicação; depois de publicar, posição e estado iguais aos de `ranking_publicado`;
    - `proximoEncontro` é o encontro futuro;
    - `proximoPrazo` é o desafio ou a lista aberta mais próxima da turma;
    - `acoes` inclui a manifestação pendente de uma ocorrência registrada;
    - `avisosNaoLidos` é igual a `meus_avisos`;
  - aluno sem equipe: `equipe`, `previa` e `ranking` nulos;
  - nenhuma resposta tem a chave `nota`;
  - na edição encerrada (fixture G), o painel continua respondendo, só para leitura (FR-014);
  - docente ou coordenação chamando: `42501`.
- [x] T008 GREEN [US1]: implementar `public.painel_do_aluno(p_edicao)` na migration. Rodar até T007 passar.
- [x] T009 [P] [US1] RED+GREEN: `src/modules/relatorios/ui/PainelAluno.tsx` (+ teste com axe):
  - cartões de pontos (selo "Prévia — não oficial"), posição (ou "Ranking ainda não publicado"), próximo encontro, próximo prazo, ações pendentes com link e avisos;
  - sem equipe: convite para formar equipe;
  - na demonstração: selo "Dados fictícios".
- [x] T010 [US1] Trocar `AlunoInicioPage` em `src/app/paginas/aluno.tsx` para usar o repositório (`usePainelDoAluno`), deixando de depender de `ComDadosDemo` e `painelAluno`. Manter os atalhos e ajustar `src/app/paginas/AlunoInicioPage.test.tsx`.

## Fase 4: US2, painel da equipe docente (P1)

**Teste independente**: com uma presença não registrada e uma entrega sem avaliação no encontro realizado, as duas pendências aparecem e somem depois do registro; o docente de TB não vê TA.

- [x] T011 RED [US2]: seção "painel da gestão" no pgTAP. Testar:
  - como docente de TA: pendência de presença do encontro 1 (realizado); nenhuma do encontro 2 (futuro) nem do encontro 3 (cancelado);
  - pendência de participação por equipe;
  - entrega recebida sem avaliação, que some depois de `registrar_avaliacao`;
  - ocorrência sem decisão listada;
  - `equipesPendentes` igual à contagem de equipes com `totais.pendente`;
  - registrar a presença remove a pendência;
  - docente de TB não vê TA;
  - mentor de TA vê TA;
  - a resposta não tem a chave `nota` (FR-006, SC-002);
  - na edição encerrada (fixture G), o painel continua respondendo, só para leitura (FR-014);
  - aluno e coordenação sem vínculo de docente: `42501`.
- [x] T012 GREEN [US2]: implementar `public.painel_da_gestao(p_edicao)`. Rodar até T011 passar.
- [x] T013 [P] [US2] RED+GREEN: `src/modules/relatorios/ui/PainelGestao.tsx` (+ teste com axe):
  - próximo encontro;
  - por turma, equipes com pendência e a lista de pendências com links (`/docente/presenca`, `/docente/avaliacoes`, `/docente/ocorrencias`);
  - estado vazio "Nenhuma pendência nos encontros realizados";
  - atalho para `/docente/relatorios`.
- [x] T014 [US2] Trocar `DocenteInicioPage` em `src/app/paginas/docente.tsx` para usar o repositório.

## Fase 5: US3, painel da coordenação (P1)

**Teste independente**: os contadores do painel batem com as páginas de ocorrências, revisões, prova e ranking.

- [x] T015 RED [US3]: seção "painel da coordenação" no pgTAP. Testar:
  - indicadores (cursos, turmas, equipes, estudantes ativos, encontros realizados e total);
  - por categoria:
    - `componentesPendentes` igual ao tamanho de `app.pendencias_realizadas_da_categoria(...).componentes`;
    - `ocorrenciasSemDecisao` e `revisoesAbertas` iguais às pendências da spec 007;
    - `provasPendentes` igual aos resultados de prova pendentes, mais os integrantes sem resultado em encontros de prova realizados;
  - `publicacao` nula sem publicação e preenchida depois;
  - a resposta não tem a chave `nota` (FR-006, SC-002);
  - na edição encerrada (fixture G), o painel continua respondendo, só para leitura (FR-014);
  - docente e aluno: `42501`.
- [x] T016 GREEN [US3]: implementar `public.painel_da_coordenacao(p_edicao)`. Rodar até T015 passar.
- [x] T017 [P] [US3] RED+GREEN: `src/modules/relatorios/ui/PainelCoordenacao.tsx` (+ teste com axe):
  - indicadores;
  - cartão por categoria com pendências, que linkam para ranking, ocorrências, revisões e prova oficial;
  - última publicação ou "Ranking ainda não publicado";
  - atalho para os relatórios.
- [x] T018 [US3] Trocar `CoordenacaoInicioPage` em `src/app/paginas/coordenacao.tsx` para usar o repositório.

## Fase 6: US4, relatórios CSV (P2)

**Teste independente**: a coordenação exporta os pontos da Categoria A e confere totais e acentos; o docente de TA exporta presença só de TA; o aluno é recusado; há registro em `exportacoes_relatorio`.

- [x] T019 RED [US4]: seção "relatórios" no pgTAP. Testar:
  - os cinco tipos, como coordenação: colunas esperadas (R6) e linhas iguais às fontes;
    - `pontos`: totais iguais a `app.pontos_do_encontro`;
    - `presenca`: uma linha por registro; estudante que saiu da equipe depois do encontro aparece com a equipe da época, e sem equipe como "Sem equipe" (U1);
    - `pontos`: a equipe C2, sem lançamentos, aparece em cada encontro com zeros e pendências preenchidas (C2);
  - filtros de categoria, turma e encontro;
  - tipo inválido: `23514`;
  - aluno: `42501`;
  - docente de TA:
    - sem filtro, só linhas de TA;
    - pedindo TB: `42501`;
  - nenhuma linha ou coluna com `nota`, `email` ou o id de pessoa (o texto da resposta não contém os uuids de estudantes);
  - cada chamada grava uma linha em `exportacoes_relatorio` com autor, tipo, filtros e quantidade de linhas;
  - edição encerrada continua exportando.
- [x] T020 GREEN [US4]: implementar `app.turmas_do_relatorio(edicao, turma)` e `public.relatorio(p_tipo, p_edicao, p_categoria, p_turma, p_encontro)`. Rodar até T019 passar.
- [x] T021 [P] [US4] RED+GREEN: `src/modules/relatorios/ui/FormRelatorio.tsx` (+ teste com axe):
  - escolha entre os 5 tipos;
  - filtros: categoria só para a coordenação, turma (lista das turmas permitidas) e encontro;
  - "Exportar CSV" gera o arquivo só depois da resposta do servidor (`onExportar` devolve o `Relatorio`; o componente chama `gerarCsv` e oferece o download por `URL.createObjectURL`);
  - mensagens "N linhas exportadas." ou "Nenhum registro para os filtros escolhidos";
  - desabilitado sem conexão e na demonstração;
  - nota sobre a ausência de nota individual e e-mail.
- [x] T022 [US4] Criar `src/app/paginas/relatorios.tsx` com `CoordenacaoRelatoriosPage` (substitui o placeholder em `coordenacao.tsx`) e `DocenteRelatoriosPage`, com a rota `/docente/relatorios` e os itens de navegação em `src/app/rotas.tsx` e `src/app/navegacao.ts`.

## Fase 7: Acabamento e verificação

- [x] T023 [P] E2E da demonstração em `e2e/jornadas.spec.ts`:
  - painéis com o selo "Dados fictícios";
  - exportação desabilitada;
  - ajustar asserções antigas dos painéis.
- [x] T024 E2E real em `e2e-supabase/paineis.spec.ts`, seguindo o [quickstart.md](quickstart.md):
  - pendência de presença que some;
  - painel da aluna antes e depois da publicação;
  - CSV da coordenação, com o download conferido (BOM e cabeçalho), em até 3 interações a partir do painel: atalho "Relatórios", escolher o tipo e "Exportar CSV" com os filtros padrão (SC-004);
  - CSV do docente só com a turma A.
- [x] T025 [P] Documentação:
  - `docs/decisoes-e-pendencias.md` §6.6 com:
    - formato do CSV;
    - fuso **[validar]**;
    - textos livres fora do CSV;
    - critério de encontro realizado;
  - `docs/requisitos-e-referencias.md` (RF17);
  - `docs/arquitetura.md` (módulo 14).
- [x] T026 Portões finais:
  - `npm run verify`;
  - `npm run test:db`;
  - paridade e scripts de concorrência;
  - `npm run test:e2e`, com o servidor aquecido;
  - `npm run test:e2e:supabase`, depois de `db reset`.

  Registrar os resultados no `quickstart.md` e resetar o banco local.

## Dependências

- A Fase 1 vem antes da Fase 2, e a Fase 2 bloqueia todas as histórias.
- US1, US2, US3 e US4 dependem só da Fundação e são independentes entre si.
- As tarefas de SQL alteram a mesma migration e o mesmo pgTAP, então são sequenciais: T004 → T008 → T012 → T016 → T020.
- As páginas (T010, T014, T018 e T022) dependem dos componentes das próprias histórias.

## Paralelismo

- **Fundação:** T005 e T006 rodam ao lado de T003 e T004.
- **Componentes:** T009, T013, T017 e T021 podem andar em paralelo com o SQL das respectivas histórias.
- **Acabamento:** T023 e T025 rodam em paralelo.

## Estratégia de implementação

1. **MVP:** Fundação e US1. O aluno passa a ver o próprio painel com dados reais.
2. **Segundo incremento:** US2 e US3. Painéis da gestão.
3. **Terceiro incremento:** US4 e o acabamento. Relatórios CSV e os portões completos.
