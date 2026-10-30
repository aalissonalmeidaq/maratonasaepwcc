# Feature Specification: Formação de equipes por convite entre alunos

**Feature Branch**: `003-equipes-por-convite`
**Created**: 2026-10-30
**Status**: Implementada em 2026-10-30 (pendências **[validar]** em
`docs/decisoes-e-pendencias.md` §6.2)
**Input**: User description: "As duplas ou trios serão montados pelos alunos através de convites
que eles irão trocar entre si. Uma vez que o aluno recebe um convite e aceita, as demais
solicitações para formação da equipe ou dupla são canceladas e a dupla ou trio (para turma de
quantidade de alunos ímpares) é formada; só pode ser alterada pela coordenação, mentor ou
docente. A coordenação faz a criação da turma, o cadastro prévio dos alunos da turma e pode ver
e editar as equipes (duplas ou trio), mas não pode defini-las."

**Rastreabilidade**: substitui a formação de duplas pela coordenação da spec 002 (US3, FR-004,
FR-013, SC-003); mantém o histórico e as justificativas de alteração (spec 002 FR-005, FR-006).
Constituição V, VI, VII, IX.

## Clarifications

### Session 2026-10-30

- Q: Numa turma com número ímpar de alunos, como o trio é formado? → A: O aluno pode convidar até
  2 colegas no mesmo convite; o trio se forma quando os dois aceitam. Só em turma com número
  ímpar de alunos e só um trio por turma.
- Q: E o aluno que não formar equipe? → A: Não há prazo; docente, mentor ou coordenação incluem
  quem sobrou numa equipe existente a qualquer momento (formar equipe nova com quem sobrou:
  só docente ou mentor, FR-010).
- Q: Um aluno pode ter vários convites enviados ao mesmo tempo? → A: Sim; o convidado aceita ou
  recusa, quem enviou pode cancelar, e ao formar a equipe os pendentes dos envolvidos são
  cancelados.
- Q: Quem dá o nome da equipe? → A: A própria equipe, depois de formada; em seguida, só docente
  ou mentor vinculado à turma podem alterá-lo (conforme esclarecimento posterior desta sessão).
- Q: Numa turma, se sobrarem alunos sem equipe que não se convidam, quem resolve? → A: Docente ou
  mentor da turma podem formar equipe nova só com alunos que sobraram (sem equipe), com
  justificativa e histórico. A coordenação continua sem formar equipes.
- Q: Quando um aluno que está numa equipe é desativado, o que acontece com a equipe? → A: Nada
  automático: a equipe continua igual e mostra "integrante inativo" para a gestão, que decide
  (substituir, remover ou desfazer) com justificativa.
- Q: Ao remover um integrante de uma dupla, o que deve acontecer com a equipe que fica com
  apenas um aluno? → A: Impedir a remoção isolada; exigir substituição ou desfazer a equipe.
- Q: Se uma turma já tem um trio e passa a ter número par de alunos ativos, o que deve acontecer
  com esse trio? → A: Manter o trio e avisar a gestão para decidir o ajuste.
- Q: Quem já aceitou um convite de trio pode retirar o aceite enquanto o outro convidado ainda
  não respondeu? → A: Sim; retirar o aceite cancela o convite inteiro, sem formar equipe.
- Q: Ao substituir um integrante, a gestão pode escolher alguém que já está em outra equipe?
  → A: Não; o substituto deve ser aluno ativo da mesma turma, sem equipe.
- Q: Se a gestão der um nome à equipe antes dos alunos, eles ainda poderão escolher outro nome
  uma vez? → A: A hipótese de nome inicial pela gestão foi superada pelo esclarecimento abaixo.
  Depois de receber nome próprio, somente docentes ou mentores vinculados à turma podem
  alterá-lo; alunos e coordenação não podem renomear.
- Q: Quem pode definir o primeiro nome próprio de uma equipe? → A: Somente os integrantes;
  depois da escolha inicial, somente docente ou mentor vinculado à turma pode alterá-lo.
- Q: Como o aluno fica sabendo que recebeu um convite de equipe? → A: Só no app: contador de
  convites recebidos pendentes no painel/menu do aluno e na tela "Minha equipe"; sem e-mail.
- Q: Quando a edição é encerrada, alunos ainda trocam convites e a gestão ainda altera equipes?
  → A: Não; com a edição encerrada o servidor recusa convites, formação, nome e qualquer
  alteração de equipe; tudo fica somente para leitura, com o histórico preservado.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Aluno forma dupla por convite (Priority: P1)

O aluno vê os colegas da própria turma que ainda não têm equipe, envia convites e acompanha os
convites enviados e recebidos. Quando um convite é aceito, a dupla é formada pelo servidor.

**Independent Test**: com duas contas de aluno da mesma turma, Ana convida Bruno; Bruno aceita;
os dois passam a ver a mesma dupla e os demais convites pendentes deles somem.

**Acceptance Scenarios**:

1. **Given** Ana e Bruno, alunos ativos da turma T sem equipe, **When** Ana convida Bruno,
   **Then** Bruno vê o convite recebido e Ana o vê como enviado, ambos "pendente".
2. **Given** o convite pendente, **When** Bruno aceita, **Then** o servidor forma a dupla
   (equipe e integrantes juntos) e cancela todos os outros convites pendentes enviados ou
   recebidos por Ana e por Bruno; a confirmação só aparece após a resposta do servidor.
3. **Given** um convite pendente, **When** o convidado recusa ou quem enviou cancela, **Then** o
   convite deixa de valer e nenhuma equipe é formada.
4. **Given** Bruno já em equipe ativa, **When** alguém tenta convidá-lo ou um convite antigo é
   aceito, **Then** o servidor recusa ("Esta pessoa já está em uma equipe").
5. **Given** um aluno de outra turma, **When** Ana tenta convidá-lo (inclusive pela API),
   **Then** o servidor recusa.
6. **Given** dois convites para Bruno aceitos quase ao mesmo tempo, **Then** só uma equipe é
   formada; a segunda tentativa recebe uma mensagem clara e nada é gravado.

---

### User Story 2 - Trio por convite em turma ímpar (Priority: P1)

Em turma com número ímpar de alunos ativos e sem trio ativo, o aluno pode convidar dois colegas
no mesmo convite; o trio se forma quando os dois aceitam.

**Acceptance Scenarios**:

1. **Given** turma ímpar sem trio, **When** Carla convida Davi e Elisa no mesmo convite e os dois
   aceitam, **Then** o servidor forma o trio e cancela os demais convites pendentes dos três e
   os demais convites de trio pendentes da turma.
2. **Given** um convite de trio em que só Davi aceitou, **Then** a equipe ainda não existe e o
   convite continua pendente para Elisa; **When** Elisa recusa, **Then** o convite inteiro é
   encerrado como "recusado" e Davi continua sem equipe; nenhum aceite posterior é permitido.
3. **Given** turma com número par de alunos ativos, ou que já tem trio ativo, **When** um aluno
   tenta enviar ou aceitar convite de trio, **Then** o servidor recusa.
4. **Given** um trio já formado, **When** a turma passa a ter número par de alunos ativos,
   **Then** o trio permanece formado e coordenação, docente e mentor veem um aviso para decidir
   o ajuste, sem alteração automática da equipe.
5. **Given** um convite de trio com apenas um aceite, **When** quem aceitou retira o aceite
   antes da formação da equipe, **Then** o servidor cancela o convite inteiro, sem formar equipe;
   os envolvidos continuam sem equipe e seus outros convites não são cancelados por essa ação.

---

### User Story 3 - Equipe escolhe o nome (Priority: P2)

**Acceptance Scenarios**:

1. **Given** uma equipe recém-formada, **Then** ela é exibida com os primeiros nomes dos
   integrantes ("Ana e Bruno") até ter nome próprio.
2. **Given** a equipe sem nome escolhido, **When** um integrante define o nome, **Then** o nome é
   gravado; **When** um integrante tenta alterar um nome próprio já definido, **Then** o
   servidor recusa.
3. **Given** um nome já usado por outra equipe ativa da turma, **Then** o servidor recusa.
4. **Given** uma equipe com nome próprio, **When** docente ou mentor vinculado à turma o altera
   com justificativa, **Then** o servidor grava a alteração e seu histórico; se a ação for feita
   por aluno ou coordenação, inclusive pela API, o servidor recusa.
5. **Given** uma equipe ainda sem nome próprio, **When** coordenação, docente ou mentor tenta
   definir o primeiro nome, inclusive pela API, **Then** o servidor recusa; a escolha inicial
   cabe somente aos integrantes.

---

### User Story 4 - Equipe docente e coordenação alteram equipes formadas (Priority: P1)

Depois de formada, a equipe só muda por ação da coordenação (qualquer turma da edição) ou de
docente e mentor (turmas vinculadas): substituir integrante, incluir aluno sem equipe, remover
integrante e desfazer a equipe. Renomear é permitido somente a docente ou mentor vinculado à
turma. Toda alteração exige justificativa e fica no histórico.

**Acceptance Scenarios**:

1. **Given** um aluno sem equipe na turma, **When** a docente da turma o inclui numa dupla com
   justificativa, **Then** a equipe passa a ter três integrantes, desde que a turma seja ímpar e
   ainda não tenha trio; caso contrário, o servidor recusa.
2. **Given** um integrante de equipe, **When** tenta sair, trocar de equipe ou alterar a equipe
   depois de formada, **Then** o servidor recusa.
3. **Given** uma docente de outra turma, **When** tenta alterar a equipe, **Then** o servidor
   recusa.
4. **Given** a coordenação, **When** tenta formar uma equipe nova (inclusive pela API), **Then** o
   servidor recusa; ela vê e altera equipes, mas não as forma.
5. **Given** dois alunos sem equipe na turma, **When** o docente ou mentor da turma forma uma
   dupla com eles e justificativa, **Then** o servidor forma a equipe, cancela os convites
   pendentes dos dois e registra autor e justificativa; com aluno que já tem equipe, recusa. Um
   trio só pode ser formado assim em turma ímpar sem trio.
6. **Given** uma dupla formada, **When** a gestão tenta remover um integrante sem substituí-lo,
   **Then** o servidor recusa e orienta substituir o integrante ou desfazer a equipe; nenhuma
   equipe com apenas um integrante é mantida.
7. **Given** uma equipe formada, **When** a gestão substitui um integrante, **Then** o servidor
   exige que o substituto seja aluno ativo da mesma turma e sem equipe ativa na edição; se já
   pertencer a outra equipe, a operação é recusada sem alterar nenhuma das equipes.

### Edge Cases

- Convite para si mesmo, convite repetido pendente para a mesma pessoa → recusados.
- Aluno desativado na turma: seus convites pendentes são cancelados; se estiver em equipe, ele
  continua nela e a equipe aparece com o aviso "integrante inativo" para coordenação, docente e
  mentor, que decidem a alteração (FR-006).
- Convite de trio com uma das duas pessoas entrando em outra equipe antes de aceitar → o convite
  de trio é cancelado.
- Equipe desfeita: integrantes voltam a ficar sem equipe e podem trocar convites de novo;
  histórico mantido.
- Falha de rede ao aceitar: nada é exibido como formado sem a resposta do servidor.
- Edição encerrada com convites pendentes: os convites ficam pendentes sem ação possível; nenhuma
  equipe é formada ou alterada depois do encerramento (FR-017).
- Turma com trio formado passa a ter número par de alunos ativos: o trio é preservado e a
  gestão recebe aviso para decidir o ajuste; a mudança no cadastro não é bloqueada por isso.
- Cadastro ou ativação de aluno concluídos ao mesmo tempo que a formação de um trio: o resultado
  equivale ao caso anterior (trio preservado, aviso à gestão). A paridade é verificada no
  momento da formação, sob bloqueio da turma; o cadastro de alunos não é alterado por esta spec.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Aluno ativo sem equipe MUST poder convidar colegas ativos da própria turma sem
  equipe: 1 convidado (dupla) ou 2 convidados (trio, só em turma com número ímpar de alunos
  ativos e sem trio ativo).
- **FR-002**: Um aluno MUST poder ter vários convites pendentes enviados e recebidos; o convidado
  aceita ou recusa, e quem enviou pode cancelar.
- **FR-003**: A formação MUST ocorrer no servidor, de forma atômica, quando todos os convidados
  aceitam; ao formar, MUST cancelar os demais convites pendentes dos integrantes (e, no trio, os
  convites de trio pendentes da turma).
- **FR-004**: Cada aluno MUST estar em no máximo uma equipe ativa por edição; a garantia vale sob
  concorrência.
- **FR-005**: Aluno MUST ver apenas os colegas da própria turma (nome e se têm equipe) e os
  próprios convites; nunca alunos ou convites de outras turmas.
- **FR-006**: Depois de formada, a equipe MUST ser alterada somente por coordenação da edição ou
  docente/mentor vinculado à turma, com justificativa (≥ 10 caracteres) e histórico, exceto a
  alteração de nome próprio, restrita a docente/mentor vinculado à turma (FR-008).
- **FR-007**: A coordenação MUST NOT formar equipes; MUST ver e alterar equipes (FR-006).
- **FR-008**: Somente um integrante MUST poder definir o primeiro nome próprio da equipe,
  enquanto ela ainda não tiver nome próprio; o servidor MUST recusar a escolha inicial por
  coordenação, docente ou mentor. Depois da escolha inicial, somente docente ou mentor
  vinculado à turma MUST poder alterá-lo, com justificativa (≥ 10 caracteres) e histórico;
  o servidor MUST recusar renomeação por alunos e coordenação.
- **FR-009**: Toda tabela nova (convites) MUST ter RLS e testes pgTAP; escrita só por funções do
  servidor.
- **FR-010**: Docente ou mentor vinculado à turma MUST poder formar equipe nova somente com
  alunos ativos da turma sem equipe (2, ou 3 em turma ímpar sem trio), com justificativa
  (≥ 10 caracteres) e histórico; ao formar, os convites pendentes dos integrantes são cancelados.
- **FR-011**: Desativar um aluno MUST NOT alterar automaticamente a equipe dele; as telas de
  gestão MUST sinalizar "integrante inativo" na equipe.
- **FR-012**: Remover um integrante de uma dupla sem substituição MUST ser recusado pelo
  servidor; a gestão MUST substituir o integrante ou desfazer a equipe, com justificativa e
  histórico conforme FR-006. A remoção de integrante de trio pode resultar em dupla.
- **FR-013**: Se uma turma com trio formado passar a ter número par de alunos ativos, o sistema
  MUST preservar o trio e sinalizar a situação à coordenação, docente e mentor para decisão de
  ajuste conforme FR-006; MUST NOT alterar a equipe automaticamente nem bloquear a mudança no
  cadastro por esse motivo. A restrição de paridade continua valendo para formar novos trios.
- **FR-014**: Um convidado que já aceitou um convite de trio MUST poder retirar o aceite
  enquanto a equipe ainda não foi formada; o servidor MUST cancelar o convite inteiro, sem
  formar equipe nem cancelar os outros convites dos envolvidos. Após a formação, vale FR-006.
- **FR-015**: Na substituição de integrante, o substituto MUST ser aluno ativo da mesma turma,
  sem equipe ativa na edição. O servidor MUST recusar substituição por aluno já em outra equipe,
  sem alterar nenhuma das equipes; troca simultânea entre equipes não faz parte deste incremento.
- **FR-016**: O aluno MUST ver no painel inicial e no menu a quantidade de convites recebidos
  pendentes, com acesso direto à tela "Minha equipe"; nenhum e-mail ou notificação externa é
  enviado sobre convites de equipe.
- **FR-017**: Com a edição encerrada, o servidor MUST recusar envio, resposta, retirada e
  cancelamento de convites, formação, nomeação e toda alteração de equipe; as telas mostram as
  equipes e o histórico somente para leitura.

### Key Entities

- **Convite**: turma, remetente, convidados (1 ou 2, cada um com situação: pendente, aceito,
  recusado), situação geral (pendente, formado, recusado, cancelado), motivo do encerramento,
  datas.
- **Equipe** (antes "Dupla"): nome (opcional até a equipe escolher), turma, edição, situação,
  2 ou 3 integrantes, histórico; a desativação do vínculo de aluno preserva sua participação
  até decisão da gestão (FR-011).

## Success Criteria _(mandatory)_

- **SC-001**: Um aluno envia um convite em até 3 interações a partir da tela "Minha equipe".
- **SC-002**: Nenhuma combinação proibida (aluno em duas equipes, formação de trio em turma par,
  segundo trio, equipe entre turmas) é gravada, inclusive com aceites simultâneos (teste pgTAP de concorrência
  ou sequencial equivalente).
- **SC-003**: 100% dos cenários de autorização desta spec têm teste pgTAP.
- **SC-004**: E2E contra Supabase local: convite → aceite → os dois veem a equipe.

## Assumptions

- Convites não expiram; não há prazo para formar equipes.
- Edições em `rascunho` ou `ativa` permitem formar e alterar equipes; só `encerrada` bloqueia
  (FR-017).
- Docente e mentor alteram equipes existentes (incluir, substituir, remover, desfazer, renomear)
  e formam equipe nova com alunos que sobraram (FR-010).
- "Equipe" passa a ser o termo geral (dupla ou trio): menu e títulos de tela usam "equipe"
  ("Minha equipe", "Equipes"); o rótulo de cada equipe formada diz "Dupla" ou "Trio" conforme o
  número de integrantes.
- A coordenação continua responsável por criar turmas e cadastrar previamente os alunos
  (spec 002).
