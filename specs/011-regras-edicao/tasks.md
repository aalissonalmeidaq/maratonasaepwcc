# Tasks: Regras da edição e das turmas

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `011-regras-edicao` | **Criação**: 2026-11-03.
**Testes**: obrigatórios pela Constituição II e pela spec (SC-001 a SC-007). Em cada história, escreva e rode o teste antes do código e confirme que ele falha porque o comportamento ainda não existe (RED); só então implemente (GREEN).

**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`.

**Convenções**:

- Uma só migration: `supabase/migrations/20261105120000_regras_edicao.sql`, escrita em partes, sempre acrescentando ao fim.
- Toda RPC é `security definer` com `search_path = ''`, não executável por `anon`. Erros: `42501` (sem permissão), `23514` (regra violada, em português), `P0002` (não encontrado). Justificativa por `app.registrar_justificativa` (10 a 2000 caracteres).
- pgTAP novo em `supabase/tests/012_regras.test.sql`, com seções no marcador `-- @@secoes`.
  - Fixtures: edição E (ativa) com curso K (turmas KA e KB) e curso L (turma LA); encontros 1 (passado, com horário), 2 (futuro, sem horário) e 3 (futuro); coordenação `c`; mentor `m` vinculado ao curso K; mentor `ml` vinculado ao curso L; docente `d` em KA; aluno `a` em KA com equipe; edição G encerrada.
- Os testes pgTAP 001–011, o E2E e o script de paridade são a rede de segurança das trocas de `app.regras_da_edicao` por `app.regras_do_encontro`.
- Toda tela nova passa no axe (`src/test/a11y.ts`), funciona a partir de 360 px e é operável por teclado.

## Fase 1: Preparação

- [x] T001 Conferir o ambiente e registrar o estado inicial em `specs/011-regras-edicao/quickstart.md` (seção "Resultados"): pgTAP 001–011, `npm run verify`, `npm run test:e2e` e o script de paridade.
- [x] T002 [P] Tipos em `src/modules/pontuacao/domain/regrasTipos.ts`: `GrupoDeRegras` (`'presenca' | 'participacao' | 'questoes' | 'entrega' | 'apresentacao' | 'penalidades' | 'prazos'`), `GRUPOS_DO_MENTOR`, `AjustesDaTurma` (`Partial<Pick<RegrasDaEdicao, GrupoDeRegras>>`), `RegrasDaTurma`, `ItemHistorico`, `RepositorioRegras` (um método por RPC de [contracts/rpc.md](contracts/rpc.md)); exportar por `src/modules/pontuacao/index.ts`.

## Fase 2: Fundação (bloqueia as histórias)

- [x] T003 [P] RED+GREEN: domínio em `src/modules/pontuacao/domain/validacaoRegras.ts` (+ `.test.ts`): `validarRegras(regras, escopo: 'edicao' | 'turma')` com as regras do [research.md](research.md) R4 — rubricas com 1 a 20 critérios, `id` único, `rotulo` "1 a 80 caracteres e único na rubrica", `maximo > 0`; `criterioDeAtraso` existente na entrega; faixas crescentes, `desconto >= 0`, última `<= limiteAtrasoMinutos`; tipos de penalidade com `id` único, `rotulo` 1 a 80, `pontos >= 0` ou `zeraEntrega`; números não negativos; `quantidadeEncontros` "1 a 20"; `casasDecimais` "0 a 4"; prazos > 0; `provaOficial` igual à de `REGRAS_PILOTO`. Mensagens por campo (caminho do campo → mensagem). Também `idDoCriterio(rotulo, existentes)` e `sugerirRotulo(rotulo)` ("2027.1" → "2027.2"; sem número no fim → sufixo ".1").
- [x] T004 [P] RED+GREEN: `src/modules/pontuacao/domain/regrasVigentes.ts` (+ `.test.ts`): `combinarRegras(edicao, ajustes)` (grupo da turma substitui o grupo inteiro da edição) e `pontuacaoMaximaDoEncontro(regras, avaliacaoObjetiva)` (presença `maximoPorDupla` + soma da participação + `questoes.maximo` ou `provaOficial.maximoPorDupla` + soma da entrega + soma da apresentação).
- [x] T005 RED: criar `supabase/tests/012_regras.test.sql` com as fixtures e a seção "fundação": `versoes_regras` existe com RLS e sem escrita direta; checks "rotulo 1 a 60 caracteres; único por edição", "`vale_desde` único por edição", "justificativa 10 a 2000 caracteres nas seguintes; nula só na inicial"; cada edição existente (inclusive a do seed) tem a versão inicial com `vale_desde = '-infinity'` e o rótulo de `edicoes.regras_versao`; `criar_edicao` cria a versão inicial; `app.inicio_do_encontro` (com horário; sem horário = 00:00 em `America/Sao_Paulo`); `app.regras_vigentes(turma, instante)` sem ajustes devolve a versão da edição vigente no instante; `app.validar_regras` recusa cada caso de T003 (paridade de mensagens não é exigida, só o código `23514`) e aceita `REGRAS_PILOTO`.
- [x] T006 GREEN: parte "fundação" da migration: tabela `versoes_regras` conforme o [data-model.md](data-model.md) (RLS de leitura por `app.participa_da_edicao`, `revoke` das escritas, auditoria, gatilho `bloquear_edicao_encerrada('edicao_id')`); migração das versões iniciais; `criar_edicao` passa a inserir a versão inicial; `app.inicio_do_encontro`, `app.regras_vigentes` (só edição por enquanto), `app.validar_regras(jsonb, text)`, `app.sugerir_rotulo(text)`. Rodar até T005 passar e confirmar 001–011.
- [x] T007 Repositório `src/modules/pontuacao/data/repositorioRegrasSupabase.ts` (+ teste com cliente simulado; RPCs `void` com `verificarGravacao`), demonstração `src/modules/demo/regras.ts` (+ `.test.ts`: regras fictícias da edição, um ajuste fictício na turma A, histórico; escritas recusadas) e ligação em `src/app/dados/useRepositorios.ts`, `repositorios.tsx`, `src/modules/demo/repositorios.ts` (`Repositorios.regras`). Hooks em `src/app/dados/consultas.ts`: `useRegrasDaTurma`, `useRegrasDaEdicaoVigentes`, `useHistoricoRegras`.

## Fase 3: US1, regras da edição com versões (P1) 🎯 MVP

**Teste independente**: numa edição em preparação, acrescentar um critério à entrega e mudar pontos de outro, com justificativa; versão nova no histórico, anterior preservada, regulamento com o critério novo.

- [x] T008 [US1] RED: seção "US1" no pgTAP: `gravar_regras` por `c` grava versão nova com rótulo, `vale_desde`, autor e justificativa, e atualiza `edicoes.regras` e `regras_versao`; critério novo com `id` gerado; remover o critério de atraso: `23514`; prova oficial diferente do piloto: `23514`; rótulo repetido: `23514`; base desatualizada: `23514` "As regras mudaram desde que você abriu a tela; recarregue."; reenvio idêntico: `nova = false` e nenhuma linha nova; `quantidadeEncontros` menor que os encontros cadastrados: `23514`; justificativa curta: `23514`; por `m`, `d`, `a`: `42501`; em G: `23514`; `regras_da_edicao_vigentes` devolve regras, rótulo e sugestão; auditoria com o antes.
- [x] T009 [US1] GREEN: parte "US1" da migration: `gravar_regras`, `regras_da_edicao_vigentes`. Rodar até T008 passar.
- [x] T010 [P] [US1] RED+GREEN: `src/modules/pontuacao/ui/EditorDeCriterios.tsx` e `FormRegras.tsx` (+ testes com axe): grupos do [contrato de telas](contracts/telas.md); prova oficial só leitura "valores do PRD (HU04)"; adicionar, renomear e remover critérios, faixas e tipos (remover o critério de atraso desabilitado com a explicação); mensagens de `validarRegras` por campo; rótulo sugerido editável; justificativa; "Gravar versão" só conclui após a resposta; recusa por desatualização com "Recarregar".
- [x] T011 [P] [US1] RED+GREEN: `src/modules/pontuacao/ui/HistoricoRegras.tsx` (+ teste com axe): itens com nome ou tipo, a partir de quando valem, autor e justificativa.
- [x] T012 [US1] Seção "Regras da edição" em `src/app/paginas/edicoes.tsx` (detalhe da edição escolhida, só leitura em edição encerrada) com `FormRegras` e `HistoricoRegras`.

## Fase 4: US2, regras próprias da turma (P1)

**Teste independente**: como mentor do curso, definir a apresentação da turma A com um critério próprio; A usa a própria, B a da edição; mudança posterior da entrega na edição chega à A.

- [x] T013 [US2] RED: seção "US2" no pgTAP: `ajustes_regras_turma` existe com RLS, sem escrita direta, checks do [data-model.md](data-model.md) ("justificativa 10 a 2000 caracteres", `papel_autor` em `coordenacao`/`mentor`, `vale_desde` único por turma); `gravar_ajustes_turma` por `m` em KA (grupo apresentação) grava; por `ml` em KA: `42501`; por `m` com `penalidades` ou `prazos`: `42501`; por `c` com `penalidades`: grava; grupo `provaOficial`, `casasDecimais` ou `quantidadeEncontros`: `23514`; grupo inválido: `23514`; base desatualizada: `23514`; conjunto igual: `novo = false`; `{}` desfaz; `app.regras_vigentes(KA, agora)` = edição `||` grupos da turma; mudança posterior da edição em grupo não ajustado chega à turma; mentor desvinculado do curso: `42501`; em G: `23514`.
- [x] T014 [US2] GREEN: parte "US2" da migration: tabela `ajustes_regras_turma` (RLS de leitura por quem participa da turma ou coordena a edição, auditoria, bloqueio com `turma_id`), `app.pode_ajustar_turma(turma, grupos)`, `gravar_ajustes_turma`, `app.regras_vigentes` completa (com ajustes). Rodar até T013 passar.
- [x] T015 [P] [US2] RED+GREEN: `src/modules/pontuacao/ui/FormAjustesTurma.tsx` (+ teste com axe): por grupo "Herdar da edição" ou "Definir para a turma" (editor da edição com os valores atuais como ponto de partida); mentor vê só os grupos de avaliação; justificativa; conclui só após a resposta.
- [x] T016 [US2] Seção "Regras da turma" em `src/app/paginas/painelTurma.tsx` para coordenação e mentor (também na área docente): a seção aparece quando `regras_da_turma.podeAjustar` não está vazio, e o formulário mostra só os grupos de `podeAjustar`, com `FormAjustesTurma` e o histórico da turma.

## Fase 5: US4, cada encontro com as regras do seu início (P1)

**Teste independente**: com o encontro 1 realizado e o 2 por começar, acrescentar critério à entrega da turma A; avaliação do 1 com os critérios antigos e do 2 com os novos; servidor igual ao parcial do aplicativo.

- [x] T017 [US4] RED: seção "US4" no pgTAP: `app.regras_do_encontro(encontro, turma)` usa a versão e os ajustes vigentes no início do encontro; depois de gravar versão nova, `app.pontos_do_encontro` do encontro 1 não muda e o do encontro 2 usa a nova; `painel_avaliacao` e a validação de notas do encontro 2 aceitam o critério novo e recusam no encontro 1; `registrar_ocorrencia` usa os tipos e o teto do encontro da ocorrência para a turma; prazos de manifestação pela turma da equipe; `lancamentos_da_minha_equipe`, `atividades_da_turma`, `presencas_da_turma` e `painel_avaliacao` devolvem `regras` por encontro. Casos de borda: depois de remover ou renomear um critério numa versão nova, a avaliação já lançada no encontro 1 continua válida e com o nome antigo; tipo de penalidade removido mantém tipo e pontos das ocorrências do encontro 1; mudar a data do encontro 3 para antes da versão nova faz ele usar a versão anterior.
- [x] T018 [US4] GREEN: parte "US4" da migration: `app.regras_do_encontro`; trocar `app.regras_da_edicao` por `app.regras_do_encontro` nas funções listadas no [research.md](research.md) R3 (recriando-as com `create or replace` na migration nova, mesma assinatura); acrescentar `regras` por encontro nas quatro RPCs de leitura (R9). Rodar até T017 e 001–011 passarem.
- [x] T019 [P] [US4] Front: `PontuacaoDoEncontro` (`src/modules/atividades/ui/PontuacaoDoEncontro.tsx`) e os formulários de avaliação, presença e participação (`src/modules/atividades/ui/`) usam as regras do encontro vindas do servidor (+ ajuste dos testes); tipos de payload em `src/modules/atividades/domain/tipos.ts`.
- [x] T020 [US4] Paridade: em `scripts/testar-paridade-calculo.mjs`, cenários com duas versões, critério novo e ajuste de turma (o cálculo do servidor com `app.regras_do_encontro` igual ao `calcularEncontro` com as mesmas regras); zero divergências.

## Fase 6: US3, encontros da turma e pontuação máxima (P1)

**Teste independente**: tirar o encontro 3 da turma KB; KB com máximo de 2 encontros e KA de 3; encontro com lançamentos não sai.

- [x] T021 [US3] RED: seção "US3" no pgTAP: `encontros_fora_da_turma` com RLS e sem escrita direta; `definir_encontros_da_turma(KB, [enc3])` por `c` grava; por `m`: `42501`; encontro de outra edição: `23514`; encontro com presença, participação, avaliação, submissão, resultado de prova ou ocorrência da turma: `23514` com o que impede; `app.encontro_da_turma`; `app.totais_da_equipe` ignora o encontro fora; `app.maximo_da_turma(KA)` e `(KB)` conferem a soma; `pontos_da_minha_equipe` e `pontos_da_turma` trazem `maximo`; encontro criado depois entra em todas as turmas. Turma de G (encerrada): `23514`.
- [x] T022 [US3] GREEN: parte "US3" da migration: tabela `encontros_fora_da_turma` (RLS, auditoria, bloqueio com `turma_id`), `app.encontro_da_turma`, `definir_encontros_da_turma`, `app.maximo_do_encontro`, `app.maximo_da_turma`, filtro nos totais, nas listas de encontros e atividades da turma, na presença da turma e no painel da turma; `maximo` nas RPCs de pontos. Rodar até T021 e 001–011 passarem.
- [x] T023 [P] [US3] RED+GREEN: `src/modules/pontuacao/ui/EncontrosDaTurma.tsx` e `PontuacaoMaxima.tsx` (+ testes com axe): caixas marcadas por padrão, encontro com lançamentos marcado e bloqueado com o motivo; "Pontuação máxima da turma: N pontos (M encontros)".
- [x] T024 [US3] Ligar: seção "Encontros da turma" (coordenação) e `PontuacaoMaxima` no topo do painel da turma em `src/app/paginas/painelTurma.tsx`; "X de N pontos" na pontuação da equipe (`src/app/paginas/atividades.tsx` ou a página de pontuação do aluno) e no painel do docente.

## Fase 7: US5, ver regras vigentes e histórico (P2)

**Teste independente**: aluna da turma com ajuste vê os critérios da turma marcados "definido para a sua turma" e a pontuação máxima; coordenação vê o histórico.

- [x] T025 [US5] RED: seção "US5" no pgTAP: `regras_da_turma(KA)` por `a` devolve regras vigentes, `gruposAjustados`, `maximo` e `encontrosExcluidos`; `podeAjustar` vazio para `a` e `d`, só grupos de avaliação para `m` e todos os ajustáveis para `c`; por aluno de KB para KA: `42501`; `historico_regras(E, KA)` por `c` e `m` traz versões da edição e ajustes da turma; por `d` ou `a`: `42501`; conta sem vínculo: nada.
- [x] T026 [US5] GREEN: parte "US5" da migration: `regras_da_turma`, `historico_regras`. Rodar até T025 passar.
- [x] T027 [P] [US5] `ResumoRegulamento` (`src/modules/comunicados/ui/ResumoRegulamento.tsx` e `domain/regulamento.ts`, + testes): recebe as regras vigentes da turma, mostra critérios dinâmicos, os grupos marcados "definido para a sua turma" e a pontuação máxima; páginas de regulamento do aluno e do docente (`src/app/paginas/aluno.tsx`, `comunicados.tsx`) passam a usar `useRegrasDaTurma`.

## Fase 8: US6, menu em categorias (P2)

**Teste independente**: em cada área, categorias com título, "Início" no topo, item atual destacado e navegação por teclado; atalhos com os mesmos grupos.

- [x] T028 [P] [US6] RED+GREEN: `src/app/navegacao.ts` (+ `navegacao.test.ts`): `MENUS[area] = { inicio, grupos: { titulo, itens }[] }` com as categorias da spec (coordenação por fluxo: Preparação, Durante os encontros, Resultado, Comunicação); `itensDoMenu(area)` plano na ordem dos grupos. Teste: cada item atual aparece em exatamente um grupo (ou é o Início), os caminhos e a quantidade de itens não mudam (SC-007).
- [x] T029 [US6] RED+GREEN: `src/app/layout/AppShell.tsx` (barra lateral e menu do celular) e `src/app/layout/Atalhos.tsx` (+ `Atalhos.test.tsx` e teste do menu com axe): cada grupo como lista com título (`aria-labelledby`), Início no topo, `aria-current="page"` mantido; atalhos com títulos de grupo. Conferir `npm run test:e2e` (os E2E que clicam itens do menu continuam passando).

## Fase 9: Acabamento

- [x] T030 [P] Script `scripts/testar-concorrencia-regras.mjs`: duas `gravar_regras` sobre a mesma versão → uma versão e uma recusa; dois `gravar_ajustes_turma` (coordenação e mentor) sobre o mesmo ajuste → um ajuste e uma recusa; fixtures apagadas ao fim.
- [x] T031 [P] E2E de demonstração em `e2e/jornadas.spec.ts` (describe "regras e menu (spec 011, demonstração)"): regras da edição com a escrita desabilitada, ajuste fictício da turma no painel, menu com categorias na coordenação (desktop e celular).
- [x] T032 [P] E2E real em `e2e-supabase/regras.spec.ts` (serial, timeout 180 s): coordenação acrescenta critério e grava versão; `mentor@` define a apresentação do 3º ano A; coordenação tira um encontro do 3º ano B; `aluna@` vê no regulamento as regras do 3º ano A e a pontuação máxima.
- [x] T033 [P] Documentação: `docs/decisoes-e-pendencias.md` (seção 6.9 com as decisões, as premissas [validar] e as decisões da spec 012), `docs/requisitos-e-referencias.md`, `docs/arquitetura.md` (módulo 11), `src/modules/pontuacao/README.md` (criar se faltar).
- [x] T033a Ajustes visuais pedidos no incremento: categorias do menu com ícone, recolhíveis (uma aberta por vez; abre a da página atual; contador visível quando recolhida) em `src/app/layout/Menu.tsx` (+ `Menu.test.tsx`), larguras do menu (`--sidebar-width` 17,5rem e menu do celular), barras de rolagem no estilo da aplicação (`src/index.css`) e tela Entrar sem rolagem (`src/app/paginas/comum.tsx`); E2E ajustados para abrir a categoria antes do item.
- [x] T034 Portões finais e registro em `specs/011-regras-edicao/quickstart.md`: `npm run verify`, `npm run test:db`, `npm run test:e2e`, `npm run test:e2e:supabase`, todos os scripts de concorrência e o de paridade; `npx supabase db reset` ao fim; desvios registrados.

## Dependências

- Fase 1 → Fase 2 (versões e validação) → histórias.
- US1 primeiro (MVP). US2 depende da Fundação. US4 depende de US1 e US2 (regras vigentes completas). US3 depende de US4 (máximo pelas regras do encontro). US5 depende de US2 e US3. US6 é independente e pode correr em paralelo a qualquer história depois da Fase 1.
- Partes da migration são sequenciais (mesmo arquivo); tarefas de UI [P] correm em paralelo com a parte SQL da mesma história depois do RED.

## Paralelismo por história

- **Fundação:** T003 e T004 em paralelo com T005.
- **US1:** T010 e T011 em paralelo depois de T009.
- **US2:** T015 depois de T014.
- **US4:** T019 em paralelo com T020 depois de T018.
- **US3:** T023 depois de T022.
- **US6:** T028 a qualquer momento; T029 depois de T028.
- **Acabamento:** T030–T033 em paralelo; T034 por último.

## Estratégia

1. **MVP:** Fases 1–3 (regras da edição com versões e histórico).
2. **Regras por turma e por encontro:** US2 → US4 → US3.
3. **Consulta e navegação:** US5 e US6.
4. Acabamento e portões. O ranking por turma é a spec 012.
