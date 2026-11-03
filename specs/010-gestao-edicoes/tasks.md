# Tasks: Gestão de edições, turmas e vínculos

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `010-gestao-edicoes` | **Criação**: 2026-11-03.
**Testes**: obrigatórios pela Constituição II (autorização, rotas protegidas, dados de estudantes) e pela spec (SC-001 a SC-007). Em cada história, escreva e rode o teste antes do código e confirme que ele falha porque o comportamento ainda não existe (RED). Só então implemente até passar (GREEN).

**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`.

**Convenções**:

- Uma só migration: `supabase/migrations/20261104120000_gestao_edicoes.sql`, escrita em partes (fundação e uma parte por história), sempre acrescentando ao fim.
- Toda RPC é `security definer` com `search_path = ''`, não executável por `anon`. Erros: `42501` (sem permissão), `23514` (regra violada, mensagem em português), `P0002` (não encontrado). Justificativa por `app.registrar_justificativa` (mínimo de 10 caracteres).
- Nenhuma resposta contém e-mail. Escrita só confirmada após a resposta do servidor.
- pgTAP novo em `supabase/tests/011_edicoes.test.sql`, com seções no marcador `-- @@secoes`.
  - Fixtures: coordenação `c` da edição E (ativa, do seed de teste) e `c2` da edição F (rascunho); docente `d`; contas `p1` e `p2` sem vínculo; aluno `a1` em E; cadastro com curso K (turmas KA, KB, KC) e curso L (turma LA); edição G encerrada.
- Os testes pgTAP 001–010 são a rede de segurança da migração: devem continuar passando, só com os ajustes de fixture descritos aqui, sem remover asserções.
- Toda tela nova passa no axe (`src/test/a11y.ts`), funciona a partir de 360 px e é operável por teclado.

## Fase 1: Preparação

- [x] T001 Conferir o ambiente e registrar o estado inicial em `specs/010-gestao-edicoes/quickstart.md` (seção nova "Resultados" → "Estado inicial"): pgTAP 001–010, `npm run verify`, `npm run test:e2e` e o script de paridade passando.
- [x] T002 [P] Criar os tipos em `src/modules/organizacao/domain/edicoes.ts` e `src/modules/organizacao/domain/cadastro.ts`: `EstadoEdicao`, `EdicaoGerida`, `EntradaEdicao`, `PendenciasDaEdicao`, `CursoDoCadastro`, `TurmaDoCadastro`, `PessoaParaVincular`; estender `RepositorioOrganizacao` em `src/modules/organizacao/domain/tipos.ts` com um método por RPC de [contracts/rpc.md](contracts/rpc.md); exportar por `src/modules/organizacao/index.ts`.

## Fase 2: Fundação (bloqueia todas as histórias)

- [x] T003 RED: criar `supabase/tests/011_edicoes.test.sql` com as fixtures e a seção "fundação". Testar:
  - `cadastro_cursos` e `cadastro_turmas` existem com RLS, sem escrita direta para `authenticated`; checks: curso "nome 2 a 160 caracteres; único (sem caixa)", "categoria 1 a 120 caracteres"; turma "nome 1 a 120 caracteres; único no curso (sem caixa)", `ano_letivo` "2000 a 2100" ou nulo;
  - `cursos.cadastro_curso_id` e `turmas.cadastro_turma_id` não nulos, únicos por edição (uma turma do cadastro no máximo uma vez por edição);
  - inserir curso e turma direto (como superusuário, sem id de cadastro) liga ao item de mesmo nome do cadastro ou cria o item (gatilho de compatibilidade);
  - migração: cada curso e turma existente ficou ligado a um item do cadastro; nomes iguais dentro do curso viram um só item;
  - `edicoes`: colunas `chave_envio` (única, nula), `ativada_em`, `encerrada_em`, `justificativa_encerramento`, `pendencias_no_encerramento`; check "justificativa obrigatória quando `estado = 'encerrada'`"; edições já encerradas receberam "Encerrada antes da spec 010.";
  - `atribuicoes`: colunas `curso_id` e `origem_id`; a unicidade inclui `curso_id`.
- [x] T004 GREEN: escrever a parte "fundação" da migration:
  - tabelas `cadastro_cursos` e `cadastro_turmas` (índices únicos em `lower(nome)`), RLS de leitura por `app.coordena_alguma_edicao()`, `revoke` das escritas, gatilhos de auditoria;
  - `app.coordena_alguma_edicao()`;
  - colunas novas de `cursos`, `turmas`, `edicoes` e `atribuicoes` conforme o [data-model.md](data-model.md);
  - gatilho `app.ligar_ao_cadastro()` (`before insert` em `cursos` e `turmas`): sem id de cadastro, liga por nome ou cria o item (mantém seed, fixtures e scripts funcionando);
  - migração dos dados (R12): preencher o cadastro e os ids; justificativa padrão das encerradas; `not null` depois do preenchimento.

  Rodar até T003 passar e confirmar que pgTAP 001–010 continuam passando.

- [x] T005 [P] RED+GREEN: domínio em `src/modules/organizacao/domain/edicoes.ts` e `cadastro.ts` (+ `.test.ts`):
  - `validarEdicao(entrada)`: nome com menos de 3 ou mais de 160 caracteres, fim antes do início; mensagens por campo;
  - `validarItemDoCadastro(tipo, entrada)`: limites de nome e categoria do [data-model.md](data-model.md);
  - `edicaoPadrao(edicoes)`: ativa de maior início; sem ativa, a de maior início; lista vazia → `null`; início nulo fica por último.
- [x] T006 Repositórios: métodos novos em `src/modules/organizacao/data/repositorioSupabase.ts` (+ teste com cliente simulado; RPCs `void` com `verificarGravacao`) e demonstração em `src/modules/demo/edicoes.ts` (+ `.test.ts`): duas edições fictícias (uma ativa, uma em preparação), cadastro com dois cursos e turmas, escritas recusadas com "Indisponível no modo demonstração."; ligar em `src/modules/demo/repositorios.ts`. Hooks em `src/app/dados/consultas.ts`: `useEdicoesQueCoordeno`, `useCadastro`, `usePendenciasDaEdicao`.

## Fase 3: US1, criar a edição (P1) 🎯 MVP

**Teste independente**: a coordenação cria "Maratona 2027 (fictícia)" com as regras do piloto; a edição aparece em preparação, a criadora é coordenação dela e uma conta sem vínculo não a vê.

- [x] T007 [US1] RED: seção "US1" no pgTAP. Testar:
  - `criar_edicao` como `c`, base nula: edição em `rascunho` com `regras = app.regras_piloto()` e `regras_versao = 'piloto-2026.0-a-confirmar'`; atribuição `coordenacao` ativa de `c`; mesma chave → mesmo id, sem segunda linha;
  - base = E (coordenada por `c`): copia `regras` e `regras_versao` de E; base = F (não coordenada por `c`): `42501`;
  - como `d`, `a1` ou `p1` (sem coordenação em nenhuma edição): `42501`;
  - `p1` (sem vínculo) não lê a edição nova em `edicoes` nem a recebe em nenhuma leitura; `c` a lê;
  - nome curto ou longo, fim antes do início: `23514`;
  - `alterar_edicao`: `c` altera nome e período de E e da nova; `c2` em E: `42501`; edição ativa sem início ou fim: `23514`; mesmos valores não geram linha nova em `auditoria`;
  - UPDATE direto em `edicoes` por `authenticated`: recusado (política removida);
  - `edicoes_que_coordeno()` de `c`: E e a nova, na ordem ativa → rascunho → encerrada, início desc;
  - `apagar_edicao`: a nova (vazia) é apagada; E: `23514`; por `c2`: `42501`;
  - `app.regras_piloto()` é igual ao JSON de `REGRAS_PILOTO` do seed (mesmo conteúdo do `supabase/seed.sql`).
- [x] T008 [US1] GREEN: parte "US1" da migration: `app.regras_piloto()`, `criar_edicao`, `alterar_edicao`, `apagar_edicao` (FR-016), `edicoes_que_coordeno`; remover a política `edicoes_atualizar` e revogar `insert`, `update`, `delete` de `edicoes` para `authenticated` (R1). Rodar até T007 passar.
- [x] T009 [P] [US1] Paridade de `app.regras_piloto()` com `REGRAS_PILOTO`: acrescentar a comparação em `scripts/testar-paridade-calculo.mjs` (lê `src/modules/pontuacao/domain/regras-piloto.ts` compilado e o JSON da função; zero diferenças).
- [x] T010 [P] [US1] RED+GREEN: `ListaEdicoes.tsx` e `FormEdicao.tsx` em `src/modules/organizacao/ui/` (+ testes com axe): lista com selo de estado (Em preparação, Ativa, Encerrada), período e versão das regras; formulário com nome, início, fim e base ("Regras do piloto (a confirmar)" ou "Copiar de uma edição que coordeno"); mensagens de `validarEdicao`; botão só conclui após a resposta; chave de envio mantida entre reenvios.
- [x] T011 [US1] Página `src/app/paginas/edicoes.tsx` (`CoordenacaoEdicoesPage`): lista, "Nova edição", detalhe com dados editáveis e os passos do fluxo ([telas](contracts/telas.md)); rota `/coordenacao/edicoes` em `src/app/rotas.tsx`; item "Edições" em `src/app/navegacao.ts`. Ao criar, a edição nova passa a ser a escolhida (integra com US7 quando existir; até lá, recarrega a lista).

## Fase 4: US2, cadastro permanente e vínculo das turmas (P1)

**Teste independente**: cadastrar o curso "Técnico em Informática (fictício)" com as turmas A e B, vincular só a A à edição nova; a B fica só no cadastro; a mesma turma em duas edições não mistura dados.

- [x] T012 [US2] RED: seção "US2" no pgTAP. Testar:
  - `salvar_curso_do_cadastro` e `salvar_turma_do_cadastro` como `c`: criam e corrigem; nome repetido (sem caixa): `23514` com "Já existe um curso com esse nome no cadastro." ou "Já existe uma turma com esse nome neste curso."; como `d` ou `p1`: `42501`;
  - correção de nome/categoria chega sozinha aos cursos e turmas na edição de F (rascunho) e **não** aos de E (ativa) nem de G (encerrada);
  - `atualizar_do_cadastro(E)` por `c`: aplica as correções pendentes e devolve as contagens; sem diferença: zeros e nenhuma linha nova de auditoria; por `c2`: `42501`; em G: `23514`;
  - `apagar_do_cadastro`: item nunca vinculado é apagado; item ligado a alguma edição: `23514`; curso com turmas: `23514`;
  - `vincular_turmas(F, [KA])`: cria curso K e turma KA na edição F; repetir não cria nada; `vincular_turmas(E, [KA])`: KA passa a existir em E e F com ids diferentes;
  - isolamento: aluno vinculado a KA em E não aparece nas atribuições de KA em F; equipes e presenças de KA em E não aparecem nas consultas de F;
  - `desvincular_turma`: turma sem atribuições de aluno ou docente nem registros sai da edição (curso sem turmas e sem mentores sai junto); com atribuição de aluno ou docente ou com registro: `23514` com o que impede;
  - escrita direta em `cursos` e `turmas` por `authenticated`: recusada (políticas `cursos_gerenciar` e `turmas_gerenciar` removidas).
- [x] T013 [US2] GREEN: parte "US2" da migration: `cadastro()`, `salvar_curso_do_cadastro`, `salvar_turma_do_cadastro`, `apagar_do_cadastro`, gatilho `app.sincronizar_cadastro()` (só edições em `rascunho`), `atualizar_do_cadastro`, `vincular_turmas`, `desvincular_turma`; remover `cursos_gerenciar` e `turmas_gerenciar`. Rodar até T012 passar.
- [x] T014 [US2] Ajustar os testes existentes que esperavam a coordenação criar cursos e turmas por RLS (`supabase/tests/002_organizacao.test.sql`, linhas 49–67, criação de cursos e turmas pela coordenação; `supabase/tests/003_regras_organizacao.test.sql`, linhas 57–78, mudança de curso e nome de turma; `001_rls_acesso.test.sql`, linha 82, continua esperando recusa) e os métodos de escrita direta de cursos e turmas em `src/modules/organizacao/data/repositorioSupabase.ts`: trocar pela RPC equivalente ou pela asserção de recusa, sem remover a regra testada.
- [x] T015 [P] [US2] RED+GREEN: `CadastroCursosTurmas.tsx` e `VincularTurmas.tsx` em `src/modules/organizacao/ui/` (+ testes com axe): cadastro com cursos, categoria e turmas, edições de cada turma, "Apagar" só quando permitido; vínculo com caixas de seleção agrupadas por curso, "Vincular selecionadas" (até 3 interações, SC-002), lista das vinculadas com contagens, "Gerir turma" e "Desvincular"; alerta de correções pendentes com "Atualizar a partir do cadastro" em edição ativa.
- [x] T016 [US2] Páginas: `/coordenacao/cadastro` ("Cursos e turmas") em `src/app/paginas/edicoes.tsx`, rota e item de navegação; em `src/app/paginas/organizacao.tsx`, trocar os cards "Cursos e categorias" e "Turmas" por `VincularTurmas` (manter "Pessoas e vínculos" para apoio, analista e coordenação).

## Fase 5: US3, gestão por turma (P1)

**Teste independente**: na turma A da edição nova, cadastrar uma aluna, importar três alunos, vincular um aluno que já tinha conta e um docente; o docente vê só essa turma e não vê as ações de gestão.

- [x] T017 [US3] RED: seção "US3" no pgTAP. Testar:
  - `pessoas_para_vincular(F, 'busca')` por `c2`: contas ativas que participam ou participaram de edições que `c2` coordena, filtradas por nome, no máximo 20, sem e-mail; por `d`: `42501`;
  - `c` vincula `p1` como aluno em KA de E (insert em `atribuicoes`); aluno já ativo em outra turma de E: recusado com "O estudante já está ativo em outra turma desta edição"; `d` (docente da turma) tentando vincular aluno: recusado;
  - desvincular aluno: vínculo `ativo = false`, equipe inalterada (spec 003, FR-011).
- [x] T018 [US3] GREEN: parte "US3" da migration: `pessoas_para_vincular`. Conferir que as políticas de `atribuicoes` (spec 001) já cobrem T017; ajustar só o necessário. Rodar até T017 passar.
- [x] T019 [P] [US3] Edge Function `supabase/functions/criar-conta/index.ts` (+ teste): com `turmaId`, exige coordenação da edição da turma (já existente: conferir); mensagem e validação sem mudança para aluno e docente.
- [x] T020 [P] [US3] RED+GREEN: `GestaoDaTurma.tsx` em `src/modules/organizacao/ui/` (+ teste com axe): listas de alunos, docentes e mentores ("pelo curso") com situação de acesso; "Cadastrar aluno" (`FormConta` com a turma fixa), "Importar alunos (CSV)" (`ImportarAlunos` com a turma fixa), "Vincular pessoa com conta" (busca; papel aluno ou docente), "Desvincular"; nada disso aparece sem `podeGerir`.
- [x] T021 [US3] Seção "Alunos e docentes" em `src/app/paginas/painelTurma.tsx` (+ ajuste de `painelTurma.test.tsx`): visível só para a coordenação da edição; docentes e mentores continuam com a lista atual.

## Fase 6: US4, mentor vinculado ao curso (P1)

**Teste independente**: vincular um mentor ao curso com as turmas A e B; ele atua nas duas; vincular a turma C do curso e ele passa a atuar nela; desvinculado do curso, deixa de atuar nas três.

- [x] T022 [US4] RED: seção "US4" no pgTAP. Testar:
  - checks de `atribuicoes`: mentor com `curso_id` e sem `turma_id`, ou com `turma_id` e `origem_id`; outros papéis sem `curso_id` nem `origem_id`;
  - `vincular_mentor_ao_curso(K em E, p2)`: cria o vínculo ao curso e uma derivada ativa por turma de K em E; `app.atua_na_turma` verdadeiro para `p2` nessas turmas; repetir não cria nada;
  - `vincular_turmas(E, [KC])` depois: a derivada de `p2` em KC aparece;
  - `vincular_mentor_ao_curso` num curso sem turma na edição (depois de desvincular a última): `23514` "Vincule uma turma deste curso antes de vincular mentores.";
  - `desvincular_mentor_do_curso`: vínculo e derivadas `ativo = false`; `p2` deixa de atuar;
  - insert direto de mentor com `turma_id` e sem `origem_id`: recusado com a orientação de vincular ao curso; escrita direta numa derivada: recusada;
  - mentor também docente numa turma do curso: desvincular do curso não mexe no vínculo de docente;
  - `desvincular_turma` de uma turma do curso com mentor ativo: permitido; a derivada sai junto; ao desvincular a última turma do curso, o vínculo do mentor ao curso fica `ativo = false` e o curso sai da edição; vincular a turma de novo não reativa o mentor;
  - migração: mentor que atuava por turma ficou vinculado ao curso e atua em todas as turmas dele (FR-009).
- [x] T023 [US4] GREEN: parte "US4" da migration: checks e unicidade novos de `atribuicoes`, gatilhos `app.sincronizar_mentor_do_curso()` (em `atribuicoes` e em `turmas`) e `app.proteger_derivadas()` (liberando as escritas dos gatilhos de sincronia e de `desvincular_turma` por configuração local da transação), `vincular_mentor_ao_curso`, `desvincular_mentor_do_curso`, conversão dos vínculos existentes. Rodar até T022 passar.
- [x] T024 [US4] Ajustar as fixtures de mentor por turma em `supabase/tests/005`–`010` para o vínculo ao curso (as asserções de acesso do mentor continuam iguais) e acrescentar `mentor@exemplo.invalid` vinculado ao curso da edição fictícia em `supabase/seed.sql`. pgTAP 001–011 passando.
- [x] T025 [P] [US4] Edge Function `criar-conta` (+ teste): `papel = 'mentor'` exige `cursoId` e recusa `turmaId`; cria o vínculo ao curso (as derivadas vêm do gatilho). `FormConta` em `src/modules/organizacao/ui/Formularios.tsx` (+ teste): mentor escolhe curso, não turma.
- [x] T026 [P] [US4] RED+GREEN: `MentoresDoCurso.tsx` em `src/modules/organizacao/ui/` (+ teste com axe) e uso em `src/app/paginas/organizacao.tsx`: por curso na edição, mentores, "Vincular mentor" (busca), "Desvincular", texto "O mentor atua em todas as turmas deste curso nesta edição."

## Fase 7: US5, ativar e encerrar a edição (P1)

**Teste independente**: ativar a edição com uma turma; encerrá-la com justificativa; criar curso, lançar presença ou publicar comunicado nela é recusado e a leitura continua.

- [x] T027 [US5] RED: seção "US5" no pgTAP. Testar:
  - `ativar_edicao(F)`: sem início/fim ou sem turma: `23514` com o que falta; com tudo: `ativa`, `ativada_em` preenchido, com E continuando ativa (duas edições ativas, FR-020); repetir: mesma resposta, sem auditoria nova; por `c`: `42501`;
  - com E e F ativas, `c2` (coordenação só de F) recebe `42501` em `alterar_edicao(E)`, `vincular_turmas(E, …)` e `encerrar_edicao(E)`, e `c` recebe `42501` nas mesmas operações em F;
  - `pendencias_da_edicao(E)`: quantidades de ocorrências sem decisão, revisões abertas e categorias sem ranking (fixtures com uma de cada);
  - `encerrar_edicao(E)`: justificativa curta: `23514`; válida: `encerrada`, `encerrada_em`, `justificativa_encerramento` e `pendencias_no_encerramento` gravados; repetir: sem mudança;
  - edição encerrada não volta (`ativar_edicao`, `alterar_edicao`: `23514`);
  - bloqueio central: para cada tabela da lista do [data-model.md](data-model.md), um insert/update/delete numa linha de G é recusado com "A edição está encerrada; os dados só podem ser lidos." (ou a mensagem própria das specs 003, 007 e 009); `avisos` (marcar como lido) e `exportacoes_relatorio` continuam permitidos; leitura de G continua.
- [x] T028 [US5] GREEN: parte "US5" da migration: `ativar_edicao`, `pendencias_da_edicao`, `encerrar_edicao`, `app.bloquear_edicao_encerrada()` e os gatilhos `before insert or update or delete` em cada tabela (conferindo a coluna que leva à edição). Rodar até T027 passar.
- [x] T029 [US5] Ajustar as fixtures que escrevem em edição já encerrada (`supabase/tests/005`, `007`–`010`) e o `supabase/seed.sql`: criar os dados antes de encerrar a edição; as asserções continuam iguais. pgTAP 001–011 passando.
- [x] T030 [P] [US5] RED+GREEN: `DialogoEncerrar.tsx` em `src/modules/organizacao/ui/` (+ teste com axe): pendências com quantidade por tipo, justificativa obrigatória, texto "Depois de encerrada, a edição só pode ser lida."; "Ativar edição" com a lista do que falta; alerta de edição encerrada com data e justificativa; tudo só leitura em edição encerrada. Ligar em `src/app/paginas/edicoes.tsx`.

## Fase 8: US6, coordenação da edição (P2)

**Teste independente**: atribuir uma segunda coordenação; ela gere a edição; desativar a última coordenação ativa é recusado.

- [x] T031 [US6] RED: seção "US6" no pgTAP: `atribuir_coordenacao(E, p1)` por `c` e `p1` passa a gerir; repetir conclui sem erro e sem linha nova em `atribuicoes` nem em `auditoria`; `atribuir_coordenacao` ou `desativar_coordenacao` para si mesma: `42501`; `desativar_coordenacao` repetida: sem mudança; desativar ou apagar a última coordenação ativa (por RPC ou escrita direta): recusado com "A edição precisa de pelo menos uma coordenação ativa."
- [x] T032 [US6] GREEN: parte "US6" da migration: gatilho `app.garantir_coordenacao_ativa()`, RPCs `atribuir_coordenacao` e `desativar_coordenacao`. Rodar até T031 passar.
- [x] T033 [P] [US6] RED+GREEN: `CoordenacaoDaEdicao.tsx` em `src/modules/organizacao/ui/` (+ teste com axe): lista, "Adicionar coordenação" (busca de `pessoas_para_vincular`, grava por `atribuir_coordenacao`), "Desativar" sem o botão para si mesma e para a última ativa. Ligar em `src/app/paginas/edicoes.tsx`.

## Fase 9: US7, escolher a edição em uso (P2)

**Teste independente**: a coordenação em duas edições troca no seletor e as telas mostram a escolhida; com uma só edição, o seletor não aparece.

- [x] T034 [US7] RED+GREEN: `src/app/dados/EdicaoEmUso.tsx` (+ `.test.tsx`): `EdicaoEmUsoProvider` guarda o id por usuário em `localStorage` (`maratona:edicao:<usuarioId>`, leitura e escrita em `try/catch`); `useEdicaoAtual` (mesma assinatura) devolve a escolhida quando visível, senão `edicaoPadrao`; escolha que deixou de ser visível é descartada; `localStorage` indisponível não quebra.
- [x] T035 [P] [US7] RED+GREEN: `SeletorEdicao.tsx` em `src/modules/organizacao/ui/` (+ teste com axe): `select` nativo "Edição em uso", opções "Nome — Estado", só com duas ou mais edições visíveis na área; selo "Em preparação" para edição em rascunho (FR-015).
- [x] T036 [US7] Ligar o provider em `src/app/dados/repositorios.tsx` (ou na raiz da aplicação) e o seletor em `src/app/layout/AppShell.tsx`; a edição criada em US1 passa a ser escolhida; conferir que `ComEdicao` e as 48 telas seguem funcionando (`npm run verify`).

## Fase 10: Acabamento

- [x] T037 [P] E2E de demonstração em `e2e/jornadas.spec.ts` (describe "gestão de edições (spec 010, demonstração)"): página Edições com as duas edições fictícias e escrita desabilitada; cadastro; gestão por turma visível; seletor trocando a edição em até 2 interações (SC-007, contadas no teste). No E2E real (T038), vincular a turma em até 3 interações (SC-002, contadas).
- [x] T038 [P] E2E real em `e2e-supabase/edicoes.spec.ts` (serial, timeout 180 s): criar edição → cadastrar curso e turma → vincular → cadastrar aluno na turma → vincular `mentor@` ao curso → ativar → encerrar com pendências → escrita recusada; seletor com as duas edições.
- [x] T039 [P] Script `scripts/testar-concorrencia-edicoes.mjs` (duas conexões ao Supabase local, fixtures fictícias apagadas ao fim): duas `criar_edicao` com a mesma chave → uma edição; dois `vincular_turmas` simultâneos da mesma turma → uma turma na edição; dois `ativar_edicao` e dois `encerrar_edicao` simultâneos → uma transição e um registro de auditoria cada; `vincular_mentor_ao_curso` simultâneo a `vincular_turmas` → derivada criada.
- [x] T040 [P] Documentação: `docs/decisoes-e-pendencias.md` (seção 6.8 com as decisões da spec 010, as premissas [validar] e a nota de que as regras seguem para a spec 011), `docs/requisitos-e-referencias.md` (RF01, RF02 e RF03 atualizados), `docs/arquitetura.md` (módulo 3), `src/modules/organizacao/README.md`.
- [x] T041 Portões finais e registro em `specs/010-gestao-edicoes/quickstart.md` ("Resultados"): `npm run verify`, `npm run test:db`, `npm run test:e2e`, `npm run test:e2e:supabase`, os scripts de concorrência (todos) e de paridade; `npx supabase db reset` ao fim; desvios registrados.

## Dependências

- Fase 1 → Fase 2 → histórias. A Fase 2 (cadastro, colunas, gatilho de compatibilidade e migração) bloqueia todas.
- US1 primeiro (MVP). US2 depende de US1 (vincula turmas a uma edição criada). US3 e US4 dependem de US2 (turma na edição). US5 depende de US2 (ativar exige turma vinculada). US6 depende só de US1. US7 depende só da Fase 2 e pode correr em paralelo a US2–US6.
- Dentro de cada história: RED → GREEN da migration → ajustes de fixtures → UI → página.
- Partes da migration são sequenciais (mesmo arquivo); tarefas de UI [P] correm em paralelo com a parte SQL da mesma história depois do RED.

## Paralelismo por história

- **US1:** T009 e T010 em paralelo depois de T008.
- **US2:** T015 em paralelo com T014 depois de T013.
- **US3:** T019 e T020 em paralelo depois de T018.
- **US4:** T025 e T026 em paralelo depois de T024.
- **US5:** T030 em paralelo com T029 depois de T028.
- **US7:** T035 em paralelo com T034.
- **Acabamento:** T037–T040 em paralelo; T041 por último.

## Estratégia

1. **MVP:** Fases 1–3 (edição criada pelo app, sem acesso ao banco).
2. **Fluxo completo:** US2 → US3 → US4 → US5 (criar → vincular turmas → enturmar → mentor → ativar/encerrar), cada uma testável sozinha.
3. **Continuidade:** US6 e US7.
4. Acabamento e portões. As regras (versões, ajustes por turma, versão por encontro) ficam para a spec 011.
