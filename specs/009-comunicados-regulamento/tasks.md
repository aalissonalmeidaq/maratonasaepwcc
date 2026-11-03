# Tasks: Comunicados e regulamento

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `009-comunicados-regulamento` | **Criação**: 2026-11-03.
**Testes**: obrigatórios pela Constituição II (autorização, rotas protegidas, submissão) e pela spec (SC-001 a SC-006). Em cada história, escreva e rode o teste antes do código e confirme que ele falha porque o comportamento ainda não existe (RED). Só então implemente até passar (GREEN).

**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`.

**Convenções**:

- Toda RPC é `security definer` com `search_path = ''` e não pode ser executada por `anon`.
- Códigos de erro: `42501` (sem papel, vínculo ou autoria), `23514` (regra violada, edição encerrada, justificativa curta) e `P0002` (não encontrado), com mensagens em português.
- Nenhuma resposta de leitura contém e-mail nem id de pessoa (FR-017); autor só como `{ nome, papel }`.
- Justificativa de correção e retirada por `app.registrar_justificativa` (mínimo de 10 caracteres).
- Os testes pgTAP ficam em `supabase/tests/010_comunicados.test.sql`, com seções no marcador `-- @@secoes`.
  - Fixtures: edição E aberta com turmas TA e TB; coordenação `c`; docente `dA` (TA); docente `dB` (TB); mentor `mA` (TA); `dm`, docente e mentor em TA (duas atribuições); um perfil com papel `apoio` em E; alunos `a1` e `a2` (TA) e `b1` (TB); edição G encerrada com coordenação `cG` e turma TG.
- Toda tela nova passa no axe (`src/test/a11y.ts`) e funciona a partir de 360 px.

## Fase 1: Preparação

- [x] T001 Conferir o ambiente e registrar o estado inicial em `specs/009-comunicados-regulamento/quickstart.md` (seção "Resultados" → "Estado inicial"): pgTAP 001–009 passando e `npm run verify` passando.
- [x] T002 [P] Criar o esqueleto de `src/modules/comunicados/`:
  - `index.ts`; atualizar `README.md` com a situação "spec 009";
  - `domain/tipos.ts` com `PublicoComunicado` (`'todos' | 'estudantes' | 'equipe_docente'`), `EstadoComunicado` (`'rascunho' | 'publicado' | 'retirado'`), `PapelAutor` (`'coordenacao' | 'docente' | 'mentor'`), `ComunicadoRecebido`, `ComunicadoGerido`, `EntradaComunicado` e a interface `RepositorioComunicados` (um método por RPC de [contracts/rpc.md](contracts/rpc.md)).

## Fase 2: Fundação

- [x] T003 RED: criar `supabase/tests/010_comunicados.test.sql` com as fixtures. Testar:
  - `comunicados` e `comunicado_turmas` existem, com RLS e sem INSERT, UPDATE ou DELETE para `authenticated`;
  - checks de `comunicados`: título "1–200 caracteres após `btrim`", texto "1–5.000 caracteres após `btrim`", `publico` em `todos`, `estudantes`, `equipe_docente`, `estado` em `rascunho`, `publicado`, `retirado` (default `rascunho`), `autor_papel` em `coordenacao`, `docente`, `mentor`, `publicado_em` obrigatório se `estado <> 'rascunho'`, `retirado_em` e `justificativa_retirada` obrigatórios se `estado = 'retirado'`, `chave_envio` única, `versao` começa em 1;
  - `avisos.tipo` aceita `comunicado_publicado` e `comunicado_atualizado` e continua recusando tipo desconhecido;
  - `app.pode_ler_comunicado` e `app.destinatarios_do_comunicado` (com comunicados inseridos como superusuário): estudantes+TA alcança `a1` e `a2`, não `b1`, `dA` nem `mA`; equipe docente+TA alcança `dA` e `mA`; todos sem turma alcança `a1`, `a2`, `b1`, `dA`, `dB`, `mA` e `dm` (uma vez), e não alcança `c`, o autor nem papéis de apoio ou analista; rascunho e retirado não são legíveis; atribuição inativa não lê.
- [x] T004 GREEN: criar `supabase/migrations/20261103120000_comunicados.sql` com:
  - as tabelas do [data-model.md](data-model.md), índices `(edicao_id, estado, publicado_em desc)` e `(autor_id)`, gatilhos `app.registrar_auditoria`, RLS de leitura (`app.e_coordenacao(edicao_id) or autor_id = auth.uid() or app.pode_ler_comunicado(id)`) e `revoke` das escritas;
  - o novo `check` de `public.avisos.tipo`;
  - `app.pode_ler_comunicado(p_id)`, `app.destinatarios_do_comunicado(p_id)` (R3, R4) e `app.exigir_edicao_aberta_para_comunicados(p_edicao)` com a mensagem "A edição está encerrada; os comunicados só podem ser lidos." (R6).

  Rodar até T003 passar.

- [x] T005 [P] RED+GREEN: `src/modules/comunicados/domain/validacao.ts` (+ `.test.ts`) com `validarComunicado(entrada, perfil)`. Testar: título vazio ou só espaços, título com 201 caracteres, texto vazio, texto com 5.001 caracteres, público ausente, docente/mentor sem turma; devolve mensagens por campo e nenhuma mensagem para entrada válida; coordenação sem turma é válida.
- [x] T006 [P] RED+GREEN: avisos de comunicado com caminho (FR-004, FR-008):
  - acrescentar `'comunicado_publicado' | 'comunicado_atualizado'` a `TipoAviso` em `src/modules/resultado/domain/tipos.ts`;
  - `ListaAvisos` (`src/modules/resultado/ui/ListaAvisos.tsx`, + teste) ganha a prop opcional `caminhoDoAviso?: (aviso) => string | null`; quando há caminho, o título vira link "Ler: <título>" (o módulo `resultado` não conhece as rotas);
  - `AvisosPage` (`src/app/paginas/resultado.tsx`) passa a função: avisos `comunicado_*` levam a `/aluno/regulamento`, `/docente/comunicados` ou `/coordenacao/comunicados`, conforme a área da pessoa;
  - o "Novo" some quando o aviso é marcado como lido em `/avisos`, porque deriva dele (R4); conferir que o demo de resultado compila.
- [x] T007 Criar o repositório:
  - `src/modules/comunicados/data/repositorioSupabase.ts` (+ teste com cliente simulado), convertendo os JSON das RPCs nos tipos de `domain/tipos.ts`;
  - `src/modules/demo/comunicados.ts` (+ `.test.ts`) com `criarComunicadosDemo(usuarioAtual)`: comunicados fictícios de `demo/dados.ts` como `ComunicadoRecebido`/`ComunicadoGerido`, escritas recusadas com "Indisponível no modo demonstração." (R9).

  Ligar os dois em `src/app/dados/useRepositorios.ts`, `repositorios.tsx` e `src/modules/demo/repositorios.ts` (`Repositorios.comunicados`), com hooks `useComunicadosParaMim` e `useComunicadosQueGerencio` em `src/app/dados/consultas.ts`.

## Fase 3: US1, publicar um comunicado (P1) 🎯 MVP

**Teste independente**: a coordenação publica para os estudantes do 3º ano A; Ana vê o comunicado e um aviso novo; Íris e o docente da turma A não veem. O docente publica só nas próprias turmas.

- [x] T008 RED [US1]: seção "publicação" no pgTAP. Testar:
  - `salvar_comunicado` como `c`: cria rascunho com `autor_papel = 'coordenacao'`; a mesma `p_chave` devolve o mesmo id e não cria outra linha; coordenação sem turmas é aceita;
  - como `dA`: estudantes+TA aceito (`autor_papel = 'docente'`); TB, sem turma ou turma de G: `42501`; como `mA` em TA: `autor_papel = 'mentor'`;
  - como `a1` ou sem papel em E: `42501`; título vazio ou com 201 caracteres: `23514`;
  - editar o rascunho (`p_id`): o autor e `c` podem; `dB` recebe `42501`; publicado não pode ser editado (`23514`);
  - `apagar_rascunho`: remove rascunho; publicado: `23514`;
  - `publicar_comunicado`: preenche `publicado_em`; gera exatamente um aviso `comunicado_publicado` por destinatário, com `referencia ->> 'comunicadoId'`, e nenhum para o autor; segunda chamada devolve `avisos = 0` e não duplica;
  - `dm` (docente e mentor em TA) recebe um só aviso de um comunicado para a equipe docente de TA;
  - na edição G, salvar e publicar como `cG`: `23514` com a mensagem de edição encerrada;
  - `comunicados_que_gerencio(E)`: `c` vê todos, inclusive rascunhos de `dA`, com autor; `dA` vê só os próprios; `a1`: `42501`.
- [x] T009 GREEN [US1]: implementar na migration `app.exigir_autoria_comunicado`, `app.exigir_gestor_do_comunicado`, `public.salvar_comunicado`, `public.apagar_rascunho`, `public.publicar_comunicado` (com `select … for update`) e `public.comunicados_que_gerencio`, conforme [contracts/rpc.md](contracts/rpc.md). Rodar até T008 passar.
- [x] T010 [P] [US1] RED+GREEN: `src/modules/comunicados/ui/FormComunicado.tsx` (+ teste com axe):
  - campos título, texto (contador "N de 5.000"), público (rádios Estudantes, Equipe docente, Todos) e turmas (caixas de seleção; para docente/mentor só as turmas recebidas e ao menos uma);
  - lembrete "Não inclua dados pessoais de estudantes no texto";
  - botões "Guardar rascunho" e "Publicar"; mensagens de campo de `validarComunicado`; sucesso só depois da promessa resolver; `bloqueio` desabilita os botões com o motivo.
- [x] T011 [P] [US1] RED+GREEN: `src/modules/comunicados/ui/GestaoComunicados.tsx` (+ teste com axe): lista de `ComunicadoGerido` com estado em texto, autor e papel, turmas, filtro por estado; em rascunho "Editar", "Publicar" e "Apagar" (quando `podeEditar`); botão "Novo comunicado" abre o `FormComunicado`.
- [x] T012 [US1] Criar `src/app/paginas/comunicados.tsx` com `CoordenacaoComunicadosPage` (substitui o placeholder em `src/app/paginas/coordenacao.tsx`; turmas da edição opcionais) e `DocenteComunicadosPage` (seção "Escritos por mim"; turmas só onde atua), com a rota `/docente/comunicados` em `src/app/rotas.tsx` e o item "Comunicados" do docente em `src/app/navegacao.ts`. Escrita bloqueada sem conexão e na demonstração.

## Fase 4: US2, ler os comunicados (P1)

**Teste independente**: Ana vê o comunicado no topo com "Novo", marca como lido e o contador de avisos diminui; quem está fora do público não vê.

- [x] T013 RED [US2]: seção "leitura" no pgTAP. Testar:
  - `comunicados_para_mim(E)` como `a1`: só os do público, ordem `publicado_em desc`, com `autor` `{ nome, papel }`, turmas e `novo = true`; sem chaves `email` nem `autorId`; como `b1`: não vê o de TA; rascunho e retirado ausentes;
  - `dA` com público equipe docente de TB não vê; `dB` vê;
  - `comunicados_para_mim(E)` como `dm` devolve o comunicado da equipe docente de TA uma só vez (caso de borda "pessoa com mais de um papel");
  - aluno que entra em TA depois da publicação vê o comunicado com `novo = false`; aluno desativado em TA não vê mais;
  - `marcar_comunicado_lido` como `a1`: zera `novo` e reduz `meus_avisos.naoLidos`; como `b1` não marca nada (devolve 0);
  - na edição G, leitura continua funcionando.
- [x] T014 GREEN [US2]: implementar `public.comunicados_para_mim` e `public.marcar_comunicado_lido` na migration. Rodar até T013 passar.
- [x] T015 [P] [US2] RED+GREEN: `src/modules/comunicados/ui/ListaComunicados.tsx` (+ teste com axe): título, "Publicado em DD/MM/AAAA HH:MM por Nome (papel)", "Atualizado em …" quando houver, texto com `whitespace-pre-line` sem interpretar marcação (teste com `<script>` no texto), selo de texto "Novo", botão "Marcar como lido" com nome acessível com o título, estado vazio "Nenhum comunicado publicado para você nesta edição." e selo "Dados fictícios" opcional.
- [x] T016 [US2] Mostrar `ListaComunicados` em "Regulamento e avisos" (`AlunoRegulamentoPage` em `src/app/paginas/aluno.tsx`) e na seção "Recebidos" de `DocenteComunicadosPage`; marcar como lido invalida as consultas de comunicados e de avisos.

## Fase 5: US3, corrigir ou retirar (P2)

**Teste independente**: o docente corrige com justificativa; Ana vê o texto novo, "Atualizado em …", o selo "Novo" de volta e um aviso "Comunicado atualizado"; `docente2` não consegue corrigir; a coordenação retira e Ana deixa de ver.

- [x] T017 RED [US3]: seção "correção e retirada" no pgTAP. Testar:
  - `corrigir_comunicado` como autor `dA`: `versao` 2, `corrigido_em` preenchido, auditoria com o texto anterior e a justificativa, um aviso `comunicado_atualizado` por destinatário e `novo` volta a `true` para `a1`;
  - mesmos título e texto: `avisos = 0`, `versao` inalterada;
  - justificativa com menos de 10 caracteres: `23514`; rascunho ou retirado: `23514`;
  - `dB` e `mA` (não autores): `42501`; `c`: aceito; `dA` depois de desativado em TA: `42501`;
  - não há parâmetro de público: o público continua o mesmo depois da correção;
  - `retirar_comunicado`: `estado = 'retirado'`, `retirado_em` e `justificativa_retirada` gravados, nenhum aviso novo; segunda chamada sem mudança; `a1` deixa de ver; `c` vê com a justificativa;
  - na edição G: corrigir e retirar recusados com `23514`.
- [x] T018 GREEN [US3]: implementar `public.corrigir_comunicado` e `public.retirar_comunicado` (com `select … for update`) na migration. Rodar até T017 passar.
- [x] T019 [US3] RED+GREEN: em `src/modules/comunicados/ui/GestaoComunicados.tsx` (+ teste), ações "Corrigir" (título, texto e justificativa) e "Retirar" (justificativa e confirmação) em publicados com `podeEditar`; retirados mostram "Retirado" e a justificativa; mensagens "Comunicado corrigido; o público foi avisado de novo." e "Comunicado retirado." só depois da resposta.

## Fase 6: US4, regulamento a partir das regras da edição (P2)

**Teste independente**: os valores da página batem com `edicoes.regras` do seed e a versão é `regras_versao`.

- [x] T020 [P] [US4] RED+GREEN: `src/modules/comunicados/domain/regulamento.ts` (+ `.test.ts`) com `resumoDoRegulamento(regras: unknown)` (R8). Testar com `REGRAS_PILOTO`: presença, participação, questões, entrega, apresentação, total por encontro, prova oficial, faixas de atraso de `entrega.faixasDeAtraso` e `limiteAtrasoMinutos`, teto de descontos e prazo de revisão de `prazos.revisaoHoras`; com uma chave ausente o item vem `null`; com valor não numérico, `null`; nenhum número fixo no código.
- [x] T021 [US4] Expor `regras` em `Edicao` (`src/modules/organizacao/domain/tipos.ts`, `data/repositorioSupabase.ts` e o demo de organização), mantendo `quantidadeEncontros` e `regrasVersao`.
- [x] T022 [US4] RED+GREEN: `src/modules/comunicados/ui/ResumoRegulamento.tsx` (+ teste com axe), com "a definir" para item `null`, a versão das regras e o alerta "Resumo em validação: o regulamento oficial aprovado prevalece". Usar em `AlunoRegulamentoPage` (no lugar do resumo com `REGRAS_PILOTO`), `DocenteComunicadosPage` e `CoordenacaoComunicadosPage`; atualizar `src/app/paginas/AlunoInicioPage.test.tsx` ou o teste da página do aluno, se depender do texto antigo.

## Fase 7: Acabamento e verificação

- [x] T023 [P] E2E da demonstração em `e2e/jornadas.spec.ts` (describe "comunicados e regulamento (spec 009, demonstração)"): aluna vê os comunicados fictícios com "Dados fictícios" e o resumo do regulamento; coordenação abre "Comunicados e regulamento" com a escrita desabilitada; docente vê o item "Comunicados".
- [x] T024 E2E real em `e2e-supabase/comunicados.spec.ts`, seguindo as jornadas 1–4 do [quickstart.md](quickstart.md) (coordenação publica para estudantes do 3º ano A; Ana vê e marca como lido; Íris não vê; docente publica e corrige; Ana vê "Atualizado em" e "Novo"; coordenação retira). Ajustar `playwright.supabase.config.ts` se a ordem com as outras jornadas importar.
- [x] T025 [P] Script `scripts/testar-concorrencia-comunicados.mjs`, no molde de `scripts/testar-concorrencia-publicacao.mjs`: duas publicações e duas correções simultâneas do mesmo comunicado geram um só lote de avisos (SC-003).
- [x] T026 [P] Documentação:
  - `docs/decisoes-e-pendencias.md`: nova seção da spec 009 com público por perfil e turma **[validar]**, limites de 200/5.000 caracteres **[validar]**, documento oficial do regulamento ausente, autoria de docentes e mentores sem aprovação, correção que avisa de novo, "Novo" derivado dos avisos e apoio/analista fora;
  - `docs/requisitos-e-referencias.md`: RF06 como feito (spec 009);
  - `docs/arquitetura.md`: módulo 13 atualizado; `src/modules/comunicados/README.md`.
- [x] T027 Portões finais, com resultados registrados em `specs/009-comunicados-regulamento/quickstart.md`: `npm run verify`, `npm run test:db`, `npm run test:e2e`, `npm run test:e2e:supabase`, o script de T025 e `npx supabase db reset` no fim.

## Dependências

- Fase 1 → Fase 2 → histórias. US1 e US2 são P1 e juntas formam o MVP; US2 precisa de comunicados publicados (T009) para os testes de leitura.
- As tarefas de SQL alteram a mesma migration e o mesmo pgTAP, então são sequenciais: T004 → T009 → T014 → T018.
- US4 não depende do SQL das outras histórias: T020–T022 podem andar em paralelo depois da Fase 2.
- As páginas (T012, T016, T022) dependem dos componentes das próprias histórias; T019 altera o arquivo de T011.

## Paralelismo

- **Fundação:** T005 e T006 em paralelo com T003/T004.
- **Componentes:** T010 e T011 em paralelo com T008/T009; T015 com T013/T014.
- **Regulamento:** T020 em paralelo com qualquer fase de SQL.
- **Acabamento:** T023, T025 e T026 em paralelo.

## Estratégia de implementação

1. MVP: Fases 1–4 (publicar e ler). Validar com as jornadas 1 e 2 do quickstart.
2. Incremento: US3 (correção e retirada), depois US4 (regulamento).
3. Fechar com a Fase 7; nenhuma tarefa é marcada sem o teste correspondente passando.
