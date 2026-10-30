# Feature Specification: Organização da maratona

**Feature Branch**: `002-organizacao-maratona`
**Created**: 2026-10-29
**Status**: Draft (aguardando validação da coordenação)
**Input**: User description: "Incremento 2 — edições, cursos, turmas, vínculos, estudantes,
duplas, encontros e ambientes, com dados reais do Supabase, autorização no servidor e auditoria."

**Rastreabilidade**: PRD RF02, RF03, RF04, RF05; HU01; RNF05; constituição V, VI, IX.

## Clarifications

### Session 2026-10-30

- Q: Como a pessoa recebe o acesso pela primeira vez após a coordenação criar a conta? → A:
  A coordenação entrega a senha provisória pessoalmente e, no primeiro login, o sistema exige
  criar uma senha nova antes de qualquer outra tela.
- Q: O que acontece com o estudante sem par quando a turma tem número ímpar de estudantes? → A:
  Permite-se um trio: no máximo um por turma, somente quando o número de alunos ativos da turma
  for ímpar no momento da formação.
- Q: Uma turma que já tem duplas pode ser movida para outro curso? → A: Não. Com dupla ativa na
  turma, o curso fica bloqueado (o servidor recusa); nome e ano letivo continuam editáveis.
- Q: O que acontece ao remover um ambiente já marcado em algum encontro? → A: O servidor recusa
  e a mensagem lista os encontros que usam o ambiente; a coordenação troca o ambiente deles antes.
- Q: Como formar uma dupla em no máximo 4 ações? → A: Ao escolher os integrantes, o nome é
  sugerido a partir dos primeiros nomes (ex.: "Ana e Bruno"); a coordenação pode trocá-lo, e ele
  continua obrigatório e único na turma.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Coordenação organiza cursos e turmas (Priority: P1)

A coordenação cadastra e corrige cursos (com categoria de ranking) e turmas da edição que
coordena. Cada alteração fica registrada na auditoria.

**Why this priority**: turmas são a base de vínculos, duplas e permissões.

**Independent Test**: entrar como coordenação, criar um curso e uma turma, recarregar e ver os
dados vindos do servidor; tentar o mesmo como docente e ser recusado pelo servidor.

**Acceptance Scenarios**:

1. **Given** a coordenação de uma edição, **When** cria o curso "X" na categoria "A", **Then** o
   curso aparece na lista após confirmação do servidor e a auditoria registra autor e horário.
2. **Given** um curso com o mesmo nome na edição, **When** a coordenação tenta criá-lo de novo,
   **Then** recebe a mensagem "Já existe um curso com esse nome nesta edição".
3. **Given** uma docente, **When** tenta criar curso ou turma (inclusive pela API), **Then** o
   servidor recusa.
4. **Given** uma turma com pelo menos uma dupla ativa, **When** a coordenação tenta trocar o curso
   dela (inclusive pela API), **Then** o servidor recusa com "Esta turma já tem duplas; o curso
   não pode ser alterado"; a mudança de nome ou de ano letivo é aceita.

---

### User Story 2 - Coordenação vincula pessoas às turmas (Priority: P1)

A coordenação atribui papéis (docente, mentor, aluno, apoio, analista) a contas existentes,
vinculando docentes/mentores e estudantes às turmas, e pode desativar vínculos.

**Independent Test**: vincular uma conta como aluno de uma turma e verificar que a pessoa passa
a ver essa turma; desativar e verificar que deixa de ver.

**Acceptance Scenarios**:

1. **Given** uma conta existente, **When** a coordenação a vincula como aluno da turma T,
   **Then** a pessoa vê a turma T e não vê outras turmas.
2. **Given** um estudante já ativo em uma turma da edição, **When** a coordenação o vincula a
   outra turma da mesma edição, **Then** o servidor recusa ("O estudante já está ativo em
   outra turma desta edição").
3. **Given** a própria coordenação, **When** tenta alterar as próprias atribuições, **Then** o
   servidor recusa.

---

### User Story 3 - Coordenação forma e altera duplas com histórico (Priority: P1) — HU01

A coordenação forma duplas com dois estudantes ativos da mesma turma (ou um trio, quando a
turma tem número ímpar de alunos ativos — ver FR-004). Substituições e
desfazimento exigem justificativa e geram histórico com responsável.

**Independent Test**: formar uma dupla, tentar formar outra com um dos mesmos estudantes
(recusado), substituir um integrante com justificativa e consultar o histórico.

**Acceptance Scenarios**:

1. **Given** dois estudantes ativos da turma T sem dupla ativa, **When** a coordenação forma a
   dupla, **Then** a dupla é criada de forma atômica (dupla e integrantes juntos).
2. **Given** um estudante já em dupla ativa na edição, **When** a coordenação tenta incluí-lo
   em outra dupla, **Then** o servidor recusa e nada é gravado.
3. **Given** estudantes de turmas diferentes, **When** a coordenação tenta formar a dupla,
   **Then** o servidor recusa.
4. **Given** uma dupla ativa, **When** a coordenação substitui um integrante sem justificativa
   (mínimo de 10 caracteres), **Then** a operação é recusada; com justificativa, o histórico
   registra saída, entrada, responsável, horário e motivo.
5. **Given** um aluno, **When** consulta a própria dupla, **Then** vê o nome da dupla e dos
   colegas, e não vê duplas de outras turmas.
6. **Given** uma turma com número ímpar de alunos ativos e nenhum trio ativo, **When** a
   coordenação forma uma equipe com três estudantes, **Then** o trio é criado; **Given** uma
   turma com número par de alunos ativos ou que já tem um trio ativo, **Then** o servidor recusa.

---

### User Story 4 - Coordenação configura encontros e ambientes (Priority: P2)

A coordenação cadastra ambientes e encontros (número, título, data, horário de início e fim,
ambiente, tipo da avaliação objetiva — questões ou prova oficial — orientações e situação).
A quantidade de encontros é a configurada na edição, não fixa no código.

**Acceptance Scenarios**:

1. **Given** horário de término anterior ao início, **When** salva, **Then** é recusado.
2. **Given** número de encontro repetido na edição, **When** salva, **Then** é recusado.
3. **Given** número maior que a quantidade de encontros configurada, **When** salva, **Then**
   é recusado com a orientação de ajustar a configuração da edição.
4. **Given** um aluno ou docente da edição, **When** consulta encontros, **Then** vê data,
   horário, ambiente e orientações.
5. **Given** um ambiente usado por pelo menos um encontro, **When** a coordenação tenta removê-lo,
   **Then** o servidor recusa e a mensagem informa os encontros que o usam; um ambiente sem
   encontros é removido. A coordenação também pode editar nome e observações de um ambiente.

---

### User Story 5 - Telas de organização com dados reais (Priority: P1)

Com o Supabase configurado, as telas de organização (coordenação), turmas (docente) e dupla/
encontros (aluno) usam dados do servidor, com estados de carregamento, erro e vazio. No modo
demonstração continuam com dados fictícios e as ações de escrita ficam indisponíveis.

---

### User Story 6 - Criação de contas pela coordenação (Priority: P3) — RF03

A coordenação cria contas (nome, e-mail, papel e turma) sem acesso a chaves privadas no
navegador; a criação ocorre em função no servidor, que verifica se quem chama é coordenação da
edição.

**Acceptance Scenarios**:

1. **Given** a coordenação, **When** cria a conta de um estudante com turma, **Then** a conta,
   o perfil e a atribuição são criados; a coordenação entrega a senha provisória pessoalmente.
2. **Given** uma docente, **When** chama a função, **Then** recebe "não autorizado" e nada é
   criado.
3. **Given** uma conta com senha provisória, **When** a pessoa entra pela primeira vez, **Then**
   precisa definir uma senha nova antes de acessar qualquer outra tela; a provisória deixa de
   valer.

### Edge Cases

- Dupla com o mesmo estudante duas vezes → recusada.
- Dupla com integrante que não é aluno ativo da turma → recusada.
- Substituir integrante que não pertence à dupla → recusado.
- Desfazer dupla mantém o histórico (integrantes recebem data de saída; nada é apagado).
- Encontro sem ambiente definido é permitido (ambiente "a confirmar").
- Remover ambiente em uso por encontro → recusado; nenhum encontro perde o ambiente sem ação
  explícita da coordenação.
- Trio: no máximo um ativo por turma e só com número ímpar de alunos ativos na formação; um trio
  já formado continua válido se o número de alunos mudar depois.
- Duplas mistas entre turmas: fora do escopo (recusadas).
- Falha de rede em qualquer gravação: mensagem de erro, sem confirmação de sucesso.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Coordenação MUST criar, editar e remover cursos e turmas da edição que coordena.
  O curso de uma turma MUST NOT mudar enquanto ela tiver dupla ativa (regra no servidor), pois o
  curso define a categoria do ranking.
- **FR-002**: Coordenação MUST atribuir e desativar papéis de outras pessoas; nunca os próprios.
- **FR-003**: Um estudante MUST estar ativo em no máximo uma turma por edição.
- **FR-004**: Formar dupla MUST ser atômico e exigir dois alunos ativos distintos da mesma
  turma, sem dupla ativa na edição. Excepcionalmente, MUST aceitar três integrantes (trio) quando
  a turma tiver número ímpar de alunos ativos e ainda não tiver trio ativo.
- **FR-013**: Ao escolher os integrantes, o formulário MUST sugerir o nome da equipe com os
  primeiros nomes ("Ana e Bruno"; trio: "Ana, Bruno e Carla"), sem sobrescrever um nome digitado
  pela coordenação.
- **FR-005**: Substituir integrante e desfazer dupla MUST exigir justificativa (≥ 10
  caracteres) e registrar histórico com responsável e horário do servidor.
- **FR-006**: Escrita em duplas e integrantes MUST ocorrer apenas por funções do servidor que
  verificam a autorização; a API não aceita escrita direta nessas tabelas.
- **FR-007**: Encontros MUST validar horário, número único e limite configurado na edição.
- **FR-012**: Coordenação MUST editar e remover ambientes; remover ambiente usado por encontro
  MUST ser recusado pelo servidor, informando os encontros afetados.
- **FR-008**: Aluno MUST ver apenas a própria dupla, o colega e os encontros da edição; docente
  MUST ver duplas das turmas vinculadas.
- **FR-009**: As telas MUST indicar carregamento, erro, vazio e sucesso confirmado.
- **FR-010**: Criação de contas MUST ocorrer em função do servidor; nenhuma chave privada no
  navegador.
- **FR-011**: Conta criada com senha provisória MUST exigir a troca da senha no primeiro login,
  antes de qualquer outra tela; a marcação de troca pendente MUST ser controlada pelo servidor
  (não apenas pela interface).

### Key Entities

- **Ambiente**: nome, observações, edição.
- **Encontro**: número, título, data, início, fim, ambiente, avaliação objetiva, orientações,
  situação.
- **Dupla**: nome, turma, edição, situação; 2 integrantes ativos (3 quando for o trio da turma).
- **Integrante da dupla**: estudante, entrada, saída, motivo, responsável.

## Success Criteria _(mandatory)_

- **SC-001**: 100% dos cenários de autorização desta spec têm teste pgTAP passando.
- **SC-002**: Nenhuma combinação inválida de dupla (Edge Cases) é gravada pelo servidor.
- **SC-003**: A coordenação forma uma dupla em até 4 interações a partir da lista de duplas
  (turma, integrante 1, integrante 2, "Formar dupla"), aceitando o nome sugerido.
- **SC-004**: Com o Supabase local, as jornadas "formar dupla" e "aluno vê dupla" passam em E2E.

## Assumptions

- Dupla = 2 estudantes da mesma turma; trio permitido só para turma com número ímpar de alunos
  ativos (um por turma). Duplas entre turmas não são permitidas.
- Encontros valem para todas as turmas da edição no piloto.
- Contas são criadas com senha provisória definida pela coordenação e entregue pessoalmente;
  a troca é obrigatória no primeiro login (FR-011).
- Criação de edições continua restrita à administração do banco nesta spec.
