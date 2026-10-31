# Tasks: Atividades, entregas, presença e avaliação dos encontros

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `006-atividades-avaliacao` | **Atualização**: 2026-10-30.
**Testes**: obrigatórios pela Constituição II e pela spec (SC-002, SC-004, SC-005, SC-006, SC-007). Em cada história, escreva e rode o teste antes do código e confirme que ele falha pelo comportamento que ainda não existe (RED). Só então implemente até ele passar (GREEN).
**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`. `[P]` marca tarefas em arquivos distintos, sem dependência entre si dentro do grupo. Todas concluídas em 2026-10-30; resultados e divergências do contrato em `quickstart.md`.
**Convenções**:

- Repetir uma operação com os mesmos valores é um sucesso sem efeito (Constituição V, contracts/rpc.md "Idempotência").
- O docente e o mentor da turma têm as mesmas permissões (`app.atua_na_turma`).
- A coordenação só corrige registros existentes (FR-011) e registra prorrogação (FR-007).
- Toda RPC é `security definer` com `search_path = ''`, sem execução para `anon`.
- Correções exigem justificativa de pelo menos 10 caracteres, gravada via `set_config('app.justificativa', …, true)`.
- Limites e critérios vêm sempre de `edicoes.regras` (FR-025).

## Fase 1: Preparação

- [x] T001 Conferir o ambiente local e registrar o estado inicial em `specs/006-atividades-avaliacao/quickstart.md`:
  - o Supabase local roda nas portas 5442x com Storage habilitado;
  - o pgTAP base (001–006) passa;
  - o `npm run verify` passa na branch.
- [x] T002 Criar o esqueleto do módulo `src/modules/atividades/` (`index.ts` e `README.md`).
  - Atualizar os READMEs de `src/modules/{desafios,presenca,avaliacao,questoes}` para apontar que essas responsabilidades passam a viver no módulo `atividades`.

## Fase 2: Fundação (bloqueia todas as histórias)

Objetivo: o esquema seguro, o bucket, os contratos TS e a injeção dos repositórios.

- [x] T003 RED: escrever `supabase/tests/007_atividades_avaliacao.test.sql` com fixtures fictícias:
  - edição E com regras completas: turmas TA e TB, docente de TA, mentor de TA, docente de TB, coordenação;
  - alunos com equipes;
  - encontro de questões e encontro de prova oficial;
  - edição F com a coordenação de F.

  Testar:
  - a existência das tabelas `desafios`, `desafio_turmas`, `entregas`, `prorrogacoes`, `presencas`, `participacoes`, `avaliacoes`, `listas_questoes`, `lista_turmas`, `questoes`, `alternativas` e `submissoes_questoes`;
  - RLS habilitada em todas;
  - nenhum INSERT, UPDATE ou DELETE para `authenticated` e nenhum SELECT para `anon`;
  - o bucket `entregas` privado, com `file_size_limit` de 50 MB e os tipos `application/pdf`, `application/zip`, `application/x-zip-compressed`, `image/png` e `image/jpeg`.

  Rodar `npm run test:db` e ver a falha.

- [x] T004 GREEN: criar `supabase/migrations/20261030160000_atividades_avaliacao.sql` com as tabelas e restrições do [data-model.md](data-model.md):
  - `desafios.titulo`: "texto de 3 a 160 caracteres";
  - `enunciado`: "texto de 1 a 8000 caracteres";
  - `aceita_arquivo or aceita_link`;
  - `entregas`: exatamente um entre arquivo e link, `versao` única por `(desafio, dupla)` e `protocolo` único;
  - `presencas.observacao` com "até 300 caracteres, opcional";
  - `avaliacoes.feedback` com "até 4000 caracteres";
  - `submissoes_questoes`: `(lista_id, dupla_id)` único e `chave_envio` único;
  - `entregas`: `chave_envio` único por `(desafio_id, dupla_id)` e `arquivo_path` único quando informado (repetição segura, I1);
  - os gatilhos de auditoria em todas as tabelas;
  - o bucket `entregas` (insert em `storage.buckets`).

  Rodar até T003 passar.

- [x] T005 Completar a migration com os helpers internos (`app.*`):
  - `regras_da_edicao(edicao)`;
  - `e_integrante_ativo(dupla, pessoa)` e `equipe_ativa_do_aluno(edicao, pessoa)`;
  - `validar_notas(notas jsonb, criterios jsonb)`, que dá erro `23514` com a mensagem do critério;
  - `exigir_justificativa(texto)`;
  - `prazo_efetivo(desafio, dupla)`;
  - `desafio_encerrado(desafio)` e `lista_encerrada(lista)`, derivados do horário do servidor (FR-027);
  - `desafio_publicado_na_turma(desafio, turma)`.

  Criar também as políticas de SELECT por perfil e vínculo descritas no data-model:
  - o aluno nunca lê `questoes`, `alternativas` nem `submissoes_questoes` diretamente;
  - as políticas de `storage.objects` do bucket `entregas` seguem o research R1: insert pelo integrante no prefixo da equipe com o desafio publicado na turma; select pela equipe e pela gestão; sem update nem delete.

- [x] T006 [P] Definir os tipos e o contrato do repositório em `src/modules/atividades/domain/tipos.ts` e exportar em `src/modules/atividades/index.ts`:
  - `RegrasDaEdicao` vem de `@/modules/pontuacao` e é devolvida pelo servidor em `presencas_da_turma`, `painel_avaliacao` e `lancamentos_da_minha_equipe`. A UI nunca usa `REGRAS_PILOTO` como fonte;
  - `Desafio`, `SituacaoDesafio`, `EntregaVersao`, `Comprovante`, `Prorrogacao`;
  - `ListaQuestoes`, `QuestaoEditavel`, `QuestaoParaEquipe`, `ResultadoLista`;
  - `RegistroPresenca` (com `observacao`), `Participacao`, `Avaliacao`, `PainelAvaliacaoEquipe`;
  - `LancamentosDaEquipe`;
  - `RepositorioAtividades`.
- [x] T007 Injetar `atividades: RepositorioAtividades` em `src/app/dados/useRepositorios.ts` e `src/app/dados/repositorios.tsx`.
  - Criar um esqueleto do repositório Supabase em `src/modules/atividades/data/repositorioSupabase.ts`.
  - Criar a versão de demonstração somente leitura em `src/modules/demo/repositorios.ts`: ela devolve os desafios fictícios de `modules/demo/dados.ts` e recusa toda escrita com a mensagem padrão da demonstração.
  - Acrescentar a cobertura correspondente em `src/modules/demo/repositorios.test.ts`.
- [x] T008 Acrescentar ao `supabase/seed.sql`, sem dados reais:
  - um desafio publicado da turma A no encontro 4, com prazo futuro e aceitando arquivo e link;
  - uma lista de questões publicada da turma A no encontro 4, com 3 questões e prazo futuro.

  Esses dados servem aos E2E reais.

**Marco**: T003 passa; o app compila com o repositório novo; o seed aplica sem erro.

## Fase 3: US1 — Equipe entrega o desafio e recebe comprovante do servidor (P1, MVP)

Objetivo: o docente publica o desafio, e a equipe envia um arquivo ou link. O comprovante só aparece depois que o servidor confirma.

**Teste independente**: o docente da turma A publica um desafio. Um aluno da equipe envia um PDF e vê protocolo e horário. Sem rede, nada aparece como recebido. Um aluno da turma B não vê o desafio nem o arquivo.

- [x] T009 [US1] RED no pgTAP (`supabase/tests/007_atividades_avaliacao.test.sql`). Desafios:
  - repetição segura: `registrar_prorrogacao` repetida com o mesmo novo prazo e a mesma justificativa dá sucesso sem criar outra linha nem auditoria; com outro prazo, cria uma nova prorrogação (vale a mais recente);
  - auditoria: salvar ou publicar um desafio, registrar uma entrega e registrar uma prorrogação geram uma linha em `public.auditoria` com `autor_id` igual a quem fez a ação; a prorrogação traz a justificativa (FR-023);
  - repetição segura: chamar `registrar_entrega` de novo com a mesma `p_chave` devolve o mesmo protocolo e o mesmo `recebidaEm`, sem criar versão; com outra chave, cria a versão seguinte;
  - `salvar_desafio` pelo docente e pelo mentor da turma;
  - recusa quando quem salva é docente de outra turma, aluno ou a coordenação;
  - `publicar_desafio`, com vários desafios permitidos no mesmo encontro e turma (FR-026);
  - `encerrar_desafio` manual;
  - edição recusada depois da primeira entrega.

  Entregas:
  - `registrar_entrega` com link e com arquivo (objeto inserido em `storage.objects` pela fixture);
  - recusa de tipo ou tamanho inválido;
  - recusa quando o arquivo está fora do prefixo da equipe ou foi enviado por outra pessoa;
  - atraso de 10 min com desconto 2, calculado pela fixture com o prazo no passado;
  - atraso acima de 30 min recusado;
  - prorrogação permite enviar sem desconto, mesmo com o desafio encerrado (FR-027);
  - reenvio depois do prazo recusado quando já existe entrega no prazo;
  - nova versão gera novo protocolo.

  Visibilidade:
  - aluno de outra turma e aluno sem equipe são recusados;
  - um desafio em rascunho é invisível ao aluno em `atividades_da_turma`;
  - as políticas de Storage permitem a leitura pela equipe e pela gestão e negam o acesso a outra equipe.

- [x] T010 [US1] GREEN em `supabase/migrations/20261030160000_atividades_avaliacao.sql`: implementar as RPCs `salvar_desafio`, `publicar_desafio`, `encerrar_desafio`, `registrar_prorrogacao`, `registrar_entrega`, `entregas_da_equipe` e `atividades_da_turma`, seguindo [contracts/rpc.md](contracts/rpc.md) e os research R1, R2 e R2.1. O protocolo tem o formato `ENT-AAAAMMDD-XXXXXX`.
- [x] T011 [P] [US1] RED em `src/modules/atividades/domain/regras.test.ts` para:
  - `validarArquivo(arquivo)`: tipos PDF, ZIP, PNG e JPG, e tamanho de até 50 MB;
  - `validarLink(texto)`: só `http` ou `https`;
  - `atrasoPrevisto(prazo, agora, regras)`, que devolve os minutos e o desconto pelas faixas;
  - `situacaoDesafio(desafio, agora, regras)`, que devolve "aberto", "prazo encerrado" ou "encerrado".
- [x] T012 [US1] GREEN em `src/modules/atividades/domain/regras.ts`.
- [x] T013 [P] [US1] RED e GREEN em `src/modules/atividades/data/repositorioSupabase.test.ts` e `repositorioSupabase.ts`:
  - `enviarEntrega` faz o upload em `entregas/{desafio}/{dupla}/{uuid}.{ext}` e depois chama a RPC;
  - a chave de envio (`crypto.randomUUID()`) é criada uma vez por envio e reaproveitada se o usuário tentar de novo depois de uma falha, junto com o mesmo caminho de arquivo;
  - se o upload falhar, nada é registrado;
  - se a RPC falhar, o erro é propagado e nenhum comprovante é devolvido;
  - o mapeamento do JSON para camelCase;
  - os métodos de desafio;
  - `urlArquivo` gera um link assinado curto.
- [x] T014 [P] [US1] RED em `src/modules/atividades/ui/FormDesafio.test.tsx`:
  - campos e validação: título de 3 a 160 caracteres, ao menos uma forma de entrega, prazo obrigatório e ao menos uma turma;
  - "Salvar rascunho" e "Publicar" só confirmam depois que a promessa resolve;
  - bloqueio offline;
  - axe.
- [x] T015 [US1] GREEN em `src/modules/atividades/ui/FormDesafio.tsx`.
- [x] T016 [P] [US1] RED em `src/modules/atividades/ui/EnvioEntrega.test.tsx`. Este componente substitui `src/modules/desafios/ui/EnvioEntrega.tsx`. Cobrir:
  - arquivo ou link conforme o que o desafio aceita, e validação no navegador;
  - comprovante com protocolo, horário e o aviso de atraso e desconto, só depois da resposta;
  - "A entrega não foi recebida" com o motivo, em caso de erro;
  - bloqueio sem equipe, offline e em modo demonstração;
  - histórico de versões;
  - axe.
- [x] T017 [US1] GREEN em `src/modules/atividades/ui/EnvioEntrega.tsx`.
  - Remover `src/modules/desafios/ui/EnvioEntrega.*`.
  - Fazer `src/modules/desafios/index.ts` reexportar de `@/modules/atividades`, ou remover o módulo, ajustando os imports.
- [x] T018 [US1] Integrar as telas:
  - as consultas e gravações em `src/app/dados/consultas.ts` (`useAtividadesDaTurma`, `useEntregas`);
  - em `src/app/paginas/atividades.tsx`:
    - `DocenteAtividadesPage`: a parte de desafios, com filtro por encontro;
    - `AlunoDesafiosPage` real, que substitui a versão da demonstração em `src/app/paginas/aluno.tsx`;
  - a rota `/docente/atividades` em `src/app/rotas.tsx` e o item "Atividades" no menu docente em `src/app/navegacao.ts`.
- [x] T019 [US1] E2E real em `e2e-supabase/atividades.spec.ts`:
  - o docente cria e publica um desafio;
  - a aluna envia um PDF (fixture em `e2e-supabase/fixtures/entrega.pdf`) e vê o comprovante;
  - com `context.setOffline(true)`, o envio fica bloqueado;
  - um aluno da turma B não vê o desafio.

## Fase 4: US2 — Docente registra presença e participação do encontro (P1)

Objetivo: presença individual e participação por equipe, com autor e horário do servidor.

**Teste independente**: o docente da turma A marca a presença e a participação de uma equipe. Ao recarregar, os dados vêm do servidor. O docente da turma B é recusado.

- [x] T020 [US2] RED no pgTAP:
  - repetição segura: reenviar o mesmo lote de presença (e a mesma participação) sem justificativa dá sucesso, não cria linha nem auditoria nova, e o valor continua o mesmo;
  - `registrar_presencas` em lote pelo docente e pelo mentor da turma;
  - primeiro registro feito pela coordenação é recusado (FR-011);
  - correção pela coordenação com justificativa é aceita;
  - alteração sem justificativa é recusada;
  - aluno de outra turma no lote é recusado;
  - observação maior que 300 caracteres é recusada;
  - `registrar_participacao` recusa valores fora de `regras.participacao` (envolvimento até 4, colaboração até 3, organização até 3) e critério desconhecido;
  - a auditoria guarda antes, depois e justificativa;
  - o aluno lê a própria presença e a da equipe, mas não as de outra equipe.
- [x] T021 [US2] GREEN: implementar `registrar_presencas`, `registrar_participacao` e `presencas_da_turma(p_encontro, p_turma)` na migration.
- [x] T022 [P] [US2] RED em `src/modules/atividades/ui/RegistroPresenca.test.tsx` e `FormParticipacao.test.tsx`:
  - sem conexão, "Salvar presenças" e "Salvar participação" ficam desabilitados e a tela explica que é preciso conexão (FR-024);
  - os critérios e máximos vêm da prop `regras` (dados do servidor), testados com regras diferentes das do piloto;
  - alunos agrupados por equipe;
  - "Marcar todos presentes";
  - observação opcional;
  - justificativa exigida quando muda um registro existente;
  - confirmação só depois do servidor;
  - limites dos critérios no rótulo e na validação;
  - axe.

  Para o SC-003, conferir que marcar 30 alunos exige um único envio.

- [x] T023 [US2] GREEN em `src/modules/atividades/ui/RegistroPresenca.tsx` e `FormParticipacao.tsx`.
- [x] T024 [US2] Integrar em `src/app/paginas/atividades.tsx` a `PresencaPage`, com seletor de turma e de encontro.
  - Usar em `/docente/presenca`, substituindo a versão da demonstração em `src/app/paginas/docente.tsx`.
  - Criar a rota nova `/coordenacao/presenca` e o item de menu da coordenação.
- [x] T025 [US2] E2E real em `e2e-supabase/atividades.spec.ts`:
  - o docente salva a presença da turma A e a participação de uma equipe, recarrega e vê os valores;
  - corrige com justificativa.

## Fase 5: US3 — Docente avalia a entrega e a apresentação com rubrica e feedback (P2)

Objetivo: a rubrica de entrega e de apresentação com feedback, visível à equipe assim que registrada.

**Teste independente**: o docente avalia uma equipe com quatro notas e feedback. A equipe vê notas, total e feedback. Outra equipe não vê nada.

- [x] T026 [US3] RED no pgTAP:
  - repetição segura: reenviar a mesma avaliação sem justificativa dá sucesso e não gera auditoria nova; mudar uma nota sem justificativa é recusado;
  - auditoria: o registro e a correção da avaliação geram auditoria com o autor; na correção, a justificativa vai junto;
  - `registrar_avaliacao` com notas válidas e feedback obrigatório quando há entrega;
  - nota acima do máximo é recusada;
  - sem entrega: `p_notas_entrega` deve ser nulo e a apresentação pode ser marcada como "não avaliável";
  - primeiro registro pela coordenação é recusado; correção com justificativa é aceita;
  - `painel_avaliacao` só para a gestão;
  - a equipe lê a própria avaliação e a outra equipe não.
- [x] T027 [US3] GREEN: implementar `registrar_avaliacao` e `painel_avaliacao` na migration.
- [x] T028 [P] [US3] RED em `src/modules/atividades/ui/FormAvaliacao.test.tsx` e `FormProrrogacao.test.tsx`:
  - sem conexão, o registro de avaliação e a prorrogação ficam desabilitados com o motivo em texto (FR-024, US3 cenário 6);
  - os campos e máximos vêm de `regras` (dados do servidor), testados com regras diferentes das do piloto;
  - um campo por critério com o máximo;
  - o desconto de atraso exibido separado da nota (FR-013);
  - "Apresentação não avaliável";
  - feedback obrigatório quando há entrega;
  - justificativa quando já existe avaliação;
  - prorrogação com novo prazo e justificativa;
  - confirmação só depois do servidor;
  - axe.
- [x] T029 [US3] GREEN em `src/modules/atividades/ui/FormAvaliacao.tsx` e `FormProrrogacao.tsx`.
- [x] T030 [US3] Integrar:
  - a `AvaliacoesPage`, por turma e desafio, com cartões por equipe, última entrega, versões, link do arquivo e os formulários. Ela substitui `DocenteAvaliacoesPage` em `src/app/paginas/docente.tsx`; a página nova mantém as tabelas de critérios das regras;
  - a rota `/coordenacao/avaliacoes` e o item de menu;
  - a visão da avaliação para o aluno no cartão do desafio, em `AlunoDesafiosPage`.
- [x] T031 [US3] E2E real em `e2e-supabase/atividades.spec.ts`: o docente avalia a entrega da US1 com feedback, e a aluna vê as notas e o feedback.

## Fase 6: US4 — Equipe responde às questões preparatórias com submissão única (P2)

Objetivo: listas versionadas, gabarito protegido até o prazo e uma única submissão por equipe.

**Teste independente**: o docente publica uma lista. O integrante A envia as respostas e o integrante B é recusado. Antes do prazo, nenhum aluno obtém o gabarito.

- [x] T032 [US4] RED no pgTAP. Montagem da lista com `salvar_lista`:
  - auditoria: salvar ou publicar uma lista e enviar as respostas geram auditoria com o autor;
  - recusada em encontro de prova oficial;
  - questão sem exatamente uma alternativa correta é recusada;
  - edição depois de submissão é recusada;
  - a versão aumenta a cada edição.

  Leitura pelo aluno com `lista_para_equipe`:
  - antes do prazo, o JSON não contém as chaves `correta`/`justificativa`, e a leitura direta das tabelas devolve 0 linhas (SC-005);
  - depois do prazo, traz o gabarito e os acertos.

  Envio com `enviar_respostas`:
  - a segunda submissão (outra chave, mesmo de outro integrante ou do mesmo) é recusada informando quem enviou e quando (FR-018);
  - repetição segura: chamar de novo com a mesma `p_chave` devolve o mesmo `enviadaEm`, sem nova linha nem nova auditoria;
  - resposta para uma alternativa de outra lista é recusada;
  - os acertos são calculados no servidor.

  Também: várias listas no mesmo encontro são permitidas.

- [x] T033 [US4] GREEN: implementar `salvar_lista`, `publicar_lista`, `encerrar_lista`, `lista_para_equipe`, `enviar_respostas` e `listas_da_gestao(p_turma)` na migration.
- [x] T034 [P] [US4] Criar `scripts/testar-concorrencia-questoes.mjs`, no mesmo modelo de `scripts/testar-concorrencia-equipes.mjs`: dois `enviar_respostas` sobrepostos da mesma equipe; esperado um sucesso e uma recusa (SC-007).
- [x] T035 [P] [US4] RED em `src/modules/atividades/ui/FormLista.test.tsx`, `ResponderLista.test.tsx` e `ResultadoLista.test.tsx`.
  - `ResponderLista` e `FormLista`: sem conexão, enviar e salvar ficam desabilitados com o motivo em texto (FR-024);
  - `FormLista`: adicionar e remover questões e alternativas e marcar a alternativa correta.
  - `ResponderLista`: `radio` em `fieldset`/`legend`; confirmação "A equipe só pode enviar uma vez"; "Respostas enviadas por {nome} em {data}".
  - `ResultadoLista`: gabarito, justificativas e "Pontuação: X de 30".
  - axe nos três.
- [x] T036 [US4] GREEN em `src/modules/atividades/ui/FormLista.tsx`, `ResponderLista.tsx` e `ResultadoLista.tsx`.
- [x] T037 [US4] Integrar as listas em `DocenteAtividadesPage`, aparecendo só em encontros de questões, e em `AlunoDesafiosPage`, na seção "Questões do encontro".
- [x] T038 [US4] E2E real em `e2e-supabase/atividades.spec.ts`: a aluna responde a lista do seed, e a segunda conta da mesma equipe vê "Respostas enviadas por…" sem conseguir enviar.

## Fase 7: US5 — Equipe acompanha a pontuação parcial do encontro (P3)

Objetivo: pontos por componente e por encontro, calculados pelas regras da edição, com média por encontro e indicação "Aguardando registro".

**Teste independente**: com registros de presença, questões e avaliação de uma equipe, os componentes batem com as regras.

- [x] T039 [P] [US5] RED em `src/modules/atividades/domain/lancamentos.test.ts` para `montarLancamentos(encontro, dados, regras)`:
  - **média (FR-026)**: dois desafios avaliados com 30 e 20 dão entrega média de 25; o desconto de atraso é aplicado por desafio antes da média; um desafio avaliado sem entrega conta 0; duas listas com 30 e 15 dão 22,5.
  - **aguardando registro**: qualquer item pendente deixa o componente "aguardando"; a presença sem marcação também fica "aguardando".
  - **lista**: uma lista encerrada sem submissão conta 0.
  - **contrato**: o resultado bate com os casos do `calcularEncontro` (SC-006).
- [x] T040 [US5] GREEN em `src/modules/atividades/domain/lancamentos.ts`.
- [x] T041 [US5] RED no pgTAP para `lancamentos_da_minha_equipe(p_edicao)`:
  - devolve só a equipe do aluno;
  - questões só depois do prazo;
  - inclui as regras da edição;
  - um aluno sem equipe recebe resposta vazia.
- [x] T042 [US5] GREEN: implementar `lancamentos_da_minha_equipe` na migration.
- [x] T043 [P] [US5] RED em `src/modules/atividades/ui/PontuacaoDoEncontro.test.tsx`:
  - componentes com "x / máximo" ou "Aguardando registro";
  - selo "Parcial";
  - feedback;
  - axe.
- [x] T044 [US5] GREEN em `src/modules/atividades/ui/PontuacaoDoEncontro.tsx` e integrar `AlunoPontuacaoPage` real em `src/app/paginas/atividades.tsx`. Na demonstração, ela usa os lançamentos fictícios que já existem.
- [x] T045 [US5] E2E real em `e2e-supabase/atividades.spec.ts`: depois de US1 a US4, a aluna vê presença, participação e entrega calculadas, e o que falta aparece como "Aguardando registro".

## Fase 8: Acabamento

- [x] T046 [P] Atualizar o E2E da demonstração em `e2e/jornadas.spec.ts`:
  - "aluno busca desafios" e "envio de entrega não simula sucesso no modo demonstração" usam as páginas reais com o repositório da demonstração;
  - o "docente vê turmas vinculadas e rubricas" continua passando;
  - entra um caso novo: na demonstração, a docente abre "Atividades" e "Presença" e as ações ficam bloqueadas;
  - verificar ausência de rolagem horizontal em 412 px.
- [x] T047 [P] Atualizar a documentação:
  - `docs/arquitetura.md`: o módulo `atividades`;
  - `docs/requisitos-e-referencias.md`: RF07–RF12 e HU02/HU03;
  - `docs/decisoes-e-pendencias.md` §6.4: as decisões implementadas e a pendência de arquivos órfãos;
  - `src/modules/atividades/README.md`;
  - o status da spec.
- [x] T048 Rodar os portões e registrar os resultados em `specs/006-atividades-avaliacao/quickstart.md`:
  - `npm run verify`;
  - `npm run test:db`;
  - `node scripts/testar-concorrencia-questoes.mjs`;
  - `npm run test:e2e`, com o servidor já aquecido;
  - `npx supabase db reset` seguido do E2E real.

## Dependências

- **Fases**: Preparação (T001–T002) → Fundação (T003–T008) → histórias → Acabamento.
- **Entre histórias**: US1 e US2 são independentes entre si. US3 depende de US1, porque precisa de uma entrega. US4 é independente de US1 a US3. US5 depende dos dados de US1 a US4 para o E2E, mas o domínio (T039–T040) pode correr em paralelo depois de T006.
- **Arquivos compartilhados**: a migration e o pgTAP são editados por várias histórias. Por isso, as tarefas SQL de histórias diferentes rodam em sequência (T010 → T021 → T027 → T033 → T042). `src/app/paginas/atividades.tsx` também é compartilhado, então T018, T024, T030, T037 e T044 rodam em sequência.

## Paralelo

- Depois de T006: T011, T013 e os RED de UI (T014, T016, T022, T028, T035, T039 e T043) mexem em arquivos distintos.
- O script T034 corre em paralelo com a UI da US4.

## Estratégia

1. MVP = US1 (entrega com comprovante) + US2 (presença), as duas P1. Validar e demonstrar.
2. Depois, US3 (avaliação) e US4 (questões).
3. Por último, US5 (pontuação parcial) e o acabamento.
4. Cada história termina com E2E real e o pgTAP passando antes da próxima.
