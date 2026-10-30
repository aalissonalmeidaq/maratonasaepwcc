# Feature Specification: Organização da maratona

**Feature Branch**: `002-organizacao-maratona`
**Created**: 2026-10-29
**Status**: Implementada em 2026-10-30 (regras marcadas **[validar]** em
`docs/decisoes-e-pendencias.md` aguardam a coordenação)
**Input**: User description: "Incremento 2 — edições, cursos, turmas, vínculos, estudantes,
duplas, encontros e ambientes, com dados reais do Supabase, autorização no servidor e auditoria."

**Rastreabilidade**: PRD RF02, RF03, RF04, RF05; HU01; RNF05; constituição V, VI, IX.

## Clarifications

### Session 2026-10-30

- Q: Como a pessoa recebe o acesso pela primeira vez após a coordenação criar a conta? → A:
  Superada pelo último esclarecimento desta sessão: link de primeiro acesso por e-mail (sem senha
  provisória).
- Q: Quem forma as duplas e trios? → A: Os próprios alunos, por convites entre si (spec 006).
  A coordenação cria turmas, cadastra os alunos e vê e altera equipes, mas não as forma; docente e
  mentor também alteram. Substitui a formação pela coordenação desta spec.
- Q: O que acontece com o estudante sem par quando a turma tem número ímpar de estudantes? → A:
  Um trio por turma, só com número ímpar de alunos ativos, formado por convite a dois colegas
  (regras na spec 006).
- Q: Uma turma que já tem duplas pode ser movida para outro curso? → A: Não. Com dupla ativa na
  turma, o curso fica bloqueado (o servidor recusa); nome e ano letivo continuam editáveis.
- Q: O que acontece ao remover um ambiente já marcado em algum encontro? → A: O servidor recusa
  e a mensagem lista os encontros que usam o ambiente; a coordenação troca o ambiente deles antes.
- Q: Como formar uma dupla em no máximo 4 ações? → A: Pergunta superada: a coordenação não forma
  equipes (spec 006). O nome é escolhido pela própria equipe depois de formada.
- Q: Se alguém esquecer a senha, como recupera o acesso? → A: Pelo link "Esqueci minha senha" na
  tela de entrada, enviado ao e-mail da conta, para definir uma senha nova.
- Q: Como a coordenação faz o cadastro prévio dos alunos de uma turma? → A: Importação de planilha
  CSV (nome, e-mail) para uma turma, com prévia e relatório de linhas recusadas; o cadastro
  individual continua para casos avulsos.
- Q: Na importação por planilha, como cada aluno recebe o primeiro acesso? → A: A conta é criada
  sem senha conhecida; o aluno recebe por e-mail um link para criar a própria senha.
- Q: O cadastro individual também usa o link por e-mail? → A: Sim. Todo cadastro (individual ou
  CSV) cria a conta sem senha conhecida e envia o link de primeiro acesso; não há senha
  provisória nem troca obrigatória.
- Q: Na importação, o que fazer com e-mail que já tem conta? → A: Reaproveitar a conta e só criar
  o vínculo de aluno da turma (sem novo convite); se a pessoa já estiver ativa em outra turma da
  edição, a linha é recusada com o motivo.
- Q: A coordenação vê quem ainda não fez o primeiro acesso? → A: Sim. Em "Pessoas e vínculos",
  cada conta mostra "Aguardando primeiro acesso" ou "Acesso ativo", com "Reenviar convite" e
  correção do e-mail nas pendentes.
- Q: Por quanto tempo vale o link de primeiro acesso? → A: 7 dias. O link de recuperação de senha
  vale 1 hora.

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

### User Story 3 - Alteração de duplas com histórico (Priority: P1) — HU01

**Formação substituída pela spec 006**: duplas e trios são formados pelos alunos por convite.
Esta história mantém as regras de integridade da equipe e as alterações (substituir, desfazer)
com justificativa e histórico, feitas pela coordenação e — conforme a spec 006 — por docente e
mentor da turma. Os cenários 1–3 continuam valendo como regras do servidor para qualquer
formação.

**Independent Test**: com uma equipe formada, tentar incluir um dos mesmos estudantes em outra
(recusado), substituir um integrante com justificativa e consultar o histórico.

**Acceptance Scenarios**:

1. **Given** dois estudantes ativos da turma T sem dupla ativa, **When** a dupla é formada,
   **Then** é criada de forma atômica (dupla e integrantes juntos).
2. **Given** um estudante já em dupla ativa na edição, **When** se tenta incluí-lo em outra
   dupla, **Then** o servidor recusa e nada é gravado.
3. **Given** estudantes de turmas diferentes, **When** se tenta formar a dupla, **Then** o
   servidor recusa.
4. **Given** uma dupla ativa, **When** a coordenação substitui um integrante sem justificativa
   (mínimo de 10 caracteres), **Then** a operação é recusada; com justificativa, o histórico
   registra saída, entrada, responsável, horário e motivo.
5. **Given** um aluno, **When** consulta a própria dupla, **Then** vê o nome da dupla e dos
   colegas, e não vê duplas de outras turmas.
6. Trio (um por turma, só em turma com número ímpar de alunos ativos): ver spec 006.

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

### User Story 6 - Contas e acesso (Priority: P3) — RF03

A coordenação cria contas (nome, e-mail, papel e turma) sem acesso a chaves privadas no
navegador; a criação ocorre em função no servidor, que verifica se quem chama é coordenação da
edição.

**Acceptance Scenarios**:

1. **Given** a coordenação, **When** cria a conta de um estudante com turma, **Then** a conta,
   o perfil e a atribuição são criados sem senha conhecida, e a pessoa recebe por e-mail um link
   de primeiro acesso para criar a própria senha.
2. **Given** uma docente, **When** chama a função, **Then** recebe "não autorizado" e nada é
   criado.
3. **Given** uma conta recém-criada, **When** a pessoa abre o link de primeiro acesso, **Then**
   define a própria senha (mínimo de 10 caracteres) e entra; sem o link de convite ou de
   recuperação não há como entrar (nenhuma senha foi definida por outra pessoa).
4. **Given** uma pessoa que esqueceu a senha, **When** informa o e-mail em "Esqueci minha senha",
   **Then** recebe um link de uso único, válido por 1 hora, para definir uma senha nova; a tela
   responde da mesma forma exista ou não a conta.
5. **Given** uma planilha CSV com nome e e-mail de alunos, **When** a coordenação a importa para a
   turma T, **Then** vê uma prévia com as linhas válidas e as recusadas (e o motivo) antes de
   confirmar; ao confirmar, o servidor cria as contas como alunos da turma T, sem senha conhecida,
   envia a cada aluno um link de primeiro acesso para criar a própria senha e informa quantas
   foram criadas e quais linhas falharam.
6. **Given** contas que ainda não usaram o link, **When** a coordenação abre "Pessoas e vínculos",
   **Then** vê "Aguardando primeiro acesso" nessas contas (e "Acesso ativo" nas demais), pode
   corrigir o e-mail e "Reenviar convite"; o reenvio invalida o link anterior.

### Edge Cases

- Dupla com o mesmo estudante duas vezes → recusada.
- Dupla com integrante que não é aluno ativo da turma → recusada.
- Substituir integrante que não pertence à dupla → recusado.
- Desfazer dupla mantém o histórico (integrantes recebem data de saída; nada é apagado).
- Encontro sem ambiente definido é permitido (ambiente "a confirmar").
- Remover ambiente em uso por encontro → recusado; nenhum encontro perde o ambiente sem ação
  explícita da coordenação.
- Trio: regras e formação por convite na spec 006.
- Duplas mistas entre turmas: fora do escopo (recusadas).
- Falha de rede em qualquer gravação: mensagem de erro, sem confirmação de sucesso.
- "Esqueci minha senha" com e-mail sem conta → mesma resposta neutra (não revela quem tem conta);
  link vencido ou já usado → mensagem clara e opção de pedir outro.
- Modo demonstração: primeiro acesso, recuperação, reenvio e importação ficam indisponíveis, com
  aviso; nada é apresentado como enviado ou concluído.
- Importação CSV: e-mail que já tem conta → só cria o vínculo de aluno na turma (sem novo convite);
  se a pessoa já estiver ativa em outra turma da edição → linha recusada com o motivo.
- Importação CSV: e-mail repetido no arquivo, e-mail inválido, nome vazio,
  colunas faltando ou arquivo acima de 500 linhas → linha (ou arquivo) recusada com motivo; as
  demais seguem. Separador "," ou ";" e codificação UTF-8 aceitos.
- Link de primeiro acesso vencido (após 7 dias) → o aluno usa "Esqueci minha senha" ou a
  coordenação reenvia o convite.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Coordenação MUST criar, editar e remover cursos e turmas da edição que coordena.
  O curso de uma turma MUST NOT mudar enquanto ela tiver dupla ativa (regra no servidor), pois o
  curso define a categoria do ranking.
- **FR-002**: Coordenação MUST atribuir e desativar papéis de outras pessoas; nunca os próprios.
- **FR-003**: Um estudante MUST estar ativo em no máximo uma turma por edição.
- **FR-004**: Formar dupla MUST ser atômico e exigir alunos ativos distintos da mesma turma,
  sem equipe ativa na edição. Quem forma e o trio: spec 006 (a coordenação não forma equipes).
- **FR-005**: Substituir integrante e desfazer dupla MUST exigir justificativa (≥ 10
  caracteres) e registrar histórico com responsável e horário do servidor.
- **FR-006**: Escrita em duplas e integrantes MUST ocorrer apenas por funções do servidor que
  verificam a autorização; a API não aceita escrita direta nessas tabelas.
- **FR-007**: Encontros MUST validar horário, número único e limite configurado na edição.
- **FR-008**: Aluno MUST ver apenas a própria dupla, os colegas e os encontros da edição; docente
  MUST ver duplas das turmas vinculadas.
- **FR-009**: As telas MUST indicar carregamento, erro, vazio e sucesso confirmado.
- **FR-010**: Criação de contas MUST ocorrer em função do servidor; nenhuma chave privada no
  navegador.
- **FR-011**: Toda conta MUST ser criada sem senha conhecida por terceiros; a pessoa recebe por
  e-mail um link de primeiro acesso (uso único, válido por 7 dias) para criar a própria senha. A
  coordenação MUST ver a situação do primeiro acesso de cada conta ("Aguardando primeiro acesso" /
  "Acesso ativo"), corrigir o e-mail das pendentes e reenviar o link (o anterior deixa de valer).
  Nenhuma senha é digitada pela coordenação.
- **FR-012**: Coordenação MUST editar e remover ambientes; remover ambiente usado por encontro
  MUST ser recusado pelo servidor, informando os encontros afetados.
- **FR-013**: Removido (sugestão de nome no formulário da coordenação; a formação passou para
  a spec 006).
- **FR-014**: A tela de entrada MUST oferecer "Esqueci minha senha", que envia ao e-mail da conta
  um link de uso único, válido por 1 hora, para definir senha nova (mínimo de 10 caracteres); a
  resposta MUST ser a mesma exista ou não a conta.
- **FR-015**: A coordenação MUST poder importar alunos de uma turma por arquivo CSV (nome,
  e-mail), com prévia antes de gravar; a criação ocorre no servidor (mesma verificação do
  FR-010), com contas e convites como no FR-011, e o resultado lista criadas, vinculadas (conta já
  existente) e recusadas. O cadastro individual permanece.

### Key Entities

- **Ambiente**: nome, observações, edição.
- **Encontro**: número, título, data, início, fim, ambiente, avaliação objetiva, orientações,
  situação.
- **Dupla**: nome, turma, edição, situação; 2 integrantes ativos (3 quando for o trio da turma).
- **Integrante da dupla**: estudante, entrada, saída, motivo, responsável.

## Success Criteria _(mandatory)_

- **SC-001**: 100% dos cenários de autorização desta spec têm teste automatizado passando: pgTAP
  para regras do banco (RLS e funções) e E2E contra o Supabase local para as funções do servidor
  (`criar-conta`, `reenviar-convite`, `definir-senha-inicial`, `importar-alunos`).
- **SC-002**: Nenhuma combinação inválida de dupla (Edge Cases) é gravada pelo servidor.
- **SC-003**: Superado pela spec 006 (SC-001: aluno envia convite em até 3 interações).
- **SC-004**: Com o Supabase local, passam em E2E: o aluno vê a própria equipe e os colegas (e não
  vê equipes de outras turmas), e a coordenação altera uma equipe com justificativa e histórico.
  A jornada "coordenação forma dupla" vale só até a spec 006 substituí-la pela formação por
  convite.

## Assumptions

- Dupla = 2 estudantes da mesma turma; trio só em turma com número ímpar de alunos ativos (um
  por turma). Formação por convite entre alunos (spec 006). Duplas entre turmas não são
  permitidas.
- Encontros valem para todas as turmas da edição no piloto.
- Contas são criadas sem senha; o primeiro acesso é por link enviado ao e-mail da conta (FR-011).
- O prazo dos links de e-mail do Supabase Auth é único e limitado a 24 h; o convite de 7 dias
  exige um token próprio (tabela com RLS + função do servidor), enquanto a recuperação (1 h) usa
  o mecanismo padrão. Detalhar no plano.
- Primeiro acesso e recuperação por e-mail (FR-011, FR-014) exigem e-mails reais nas contas e,
  na homologação/produção, dois envios configurados: um provedor de e-mail para os convites
  (enviados pelas funções do servidor) e o SMTP próprio do Supabase Auth para a recuperação. No
  ambiente local, as duas mensagens ficam na caixa de teste (Mailpit).
- Criação de edições continua restrita à administração do banco nesta spec.
