# Feature Specification: Formação de equipes por convite entre alunos

**Feature Branch**: `006-equipes-por-convite`
**Created**: 2026-10-30
**Status**: Draft
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
  quem sobrou numa equipe a qualquer momento.
- Q: Um aluno pode ter vários convites enviados ao mesmo tempo? → A: Sim; o convidado aceita ou
  recusa, quem enviou pode cancelar, e ao formar a equipe os pendentes dos envolvidos são
  cancelados.
- Q: Quem dá o nome da equipe? → A: A própria equipe, depois de formada; em seguida, só docente,
  mentor ou coordenação podem alterá-lo.

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
   cancelado e Davi continua sem equipe.
3. **Given** turma com número par de alunos ativos, ou que já tem trio ativo, **When** um aluno
   tenta enviar ou aceitar convite de trio, **Then** o servidor recusa.

---

### User Story 3 - Equipe escolhe o nome (Priority: P2)

**Acceptance Scenarios**:

1. **Given** uma equipe recém-formada, **Then** ela é exibida com os primeiros nomes dos
   integrantes ("Ana e Bruno") até ter nome próprio.
2. **Given** a equipe sem nome escolhido, **When** um integrante define o nome, **Then** o nome é
   gravado; **When** um integrante tenta mudá-lo de novo, **Then** o servidor recusa.
3. **Given** um nome já usado por outra equipe ativa da turma, **Then** o servidor recusa.

---

### User Story 4 - Equipe docente e coordenação alteram equipes formadas (Priority: P1)

Depois de formada, a equipe só muda por ação da coordenação (qualquer turma da edição) ou de
docente e mentor (turmas vinculadas): substituir integrante, incluir aluno sem equipe, remover
integrante, desfazer a equipe e renomear. Toda alteração exige justificativa e fica no histórico.

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

### Edge Cases

- Convite para si mesmo, convite repetido pendente para a mesma pessoa → recusados.
- Aluno desativado na turma: seus convites pendentes são cancelados.
- Convite de trio com uma das duas pessoas entrando em outra equipe antes de aceitar → o convite
  de trio é cancelado.
- Equipe desfeita: integrantes voltam a ficar sem equipe e podem trocar convites de novo;
  histórico mantido.
- Falha de rede ao aceitar: nada é exibido como formado sem a resposta do servidor.
- Docente ou mentor podem formar equipe nova com dois alunos que sobraram? **Fora desta spec**
  (ver Assumptions); hoje só incluem alunos em equipe existente.

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
  docente/mentor vinculado à turma, com justificativa (≥ 10 caracteres) e histórico.
- **FR-007**: A coordenação MUST NOT formar equipes; MUST ver e alterar equipes (FR-006).
- **FR-008**: Um integrante MUST poder definir o nome da equipe uma única vez; depois, só quem
  altera equipes (FR-006).
- **FR-009**: Toda tabela nova (convites) MUST ter RLS e testes pgTAP; escrita só por funções do
  servidor.

### Key Entities

- **Convite**: turma, remetente, convidados (1 ou 2, cada um com situação: pendente, aceito,
  recusado), situação geral (pendente, formado, recusado, cancelado), motivo do cancelamento,
  datas.
- **Equipe** (antes "Dupla"): nome (opcional até a equipe escolher), turma, edição, situação,
  2 ou 3 integrantes ativos, histórico.

## Success Criteria _(mandatory)_

- **SC-001**: Um aluno envia um convite em até 3 interações a partir da tela "Minha dupla".
- **SC-002**: Nenhuma combinação proibida (aluno em duas equipes, trio em turma par, segundo trio,
  equipe entre turmas) é gravada, inclusive com aceites simultâneos (teste pgTAP de concorrência
  ou sequencial equivalente).
- **SC-003**: 100% dos cenários de autorização desta spec têm teste pgTAP.
- **SC-004**: E2E contra Supabase local: convite → aceite → os dois veem a equipe.

## Assumptions

- Convites não expiram; não há prazo para formar equipes.
- Docente e mentor alteram equipes existentes (incluir, substituir, remover, desfazer, renomear);
  formar equipe nova a partir de alunos que sobraram não está previsto. **[validar]**
- "Equipe" passa a ser o termo geral (dupla ou trio); a interface continua dizendo "dupla" quando
  são dois integrantes.
- A coordenação continua responsável por criar turmas e cadastrar previamente os alunos
  (spec 002).
