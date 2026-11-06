# Feature Specification: Unidades, usuário master e gestão da unidade

> **Nota (spec 018):** a tela, as RPCs e as tabelas de premissas foram retiradas do site; o registro das premissas vive em `docs/premissas.md`.

**Feature Branch**: `016-unidades-e-master`
**Created**: 2026-11-05
**Status**: Draft
**Input**: User description: "Criar um usuário master responsável pelo cadastro das unidades e
da coordenação, funcionando como multi-tenant: os tenants são as unidades. O master cadastra a
unidade e gera uma conta de gestão para ela; a gestão da unidade cria os seus usuários
(coordenação, docentes, mentores e analistas). O master é quem define as premissas do sistema."

**Rastreabilidade**: PRD RF01, RF03, §19 (unidade, cursos e volume; cadastro e login); premissa
P25 da spec 015 ("instalação de uma só unidade"); specs 002 e 010 (contas, edições, cadastro
permanente), 015 (premissas); ADRs 0006, 0008, 0009. Constituição V, VI, VII, X.

## Clarifications

### Session 2026-11-05

- Q: Quem responde às premissas P01–P32? → A: Só o master; as premissas são do sistema e valem
  para todas as unidades. Coordenação, docentes e mentores passam a só ler.
- Q: Como as unidades ficam separadas? → A: Uma instalação com várias unidades no mesmo banco.
  Edições, cursos, turmas, equipes e vínculos pertencem a uma unidade; cada unidade só vê e gere
  o que é seu, com a separação garantida no servidor. O master vê todas as unidades.
- Q: Como nasce o primeiro master? → A: Por um comando da administração do banco (no ambiente
  local, pelos dados de teste). Depois, um master pode convidar outros masters pela tela. Ninguém
  vira master pela interface sem já ser master.
- Q: O que o master faz nas unidades? → A: Só cadastra a unidade e gera a conta de gestão dela.
  A gestão da unidade cria os usuários da unidade: coordenação, docentes, mentores e analistas.
  O master não lê dados de estudantes, notas, equipes nem ranking.
- Q: O que o analista vê e faz? → A: Só lê os painéis e os relatórios CSV da unidade, como a
  coordenação vê, sem notas individuais nem dados de contato; não altera nada.
- Q: Uma conta pode pertencer a mais de uma unidade? → A: Não: cada conta pertence a uma única
  unidade; quem atua em duas usa dois e-mails.
- Q: Quem cria as edições dentro de uma unidade? → A: A gestão e a coordenação da unidade, em
  qualquer momento (não só a primeira edição).
- Q: Quem fica com a gestão da unidade inicial, que já tem dados? → A: Ninguém automaticamente: a
  unidade nasce sem gestão, a coordenação atual continua trabalhando e o master cria a conta de
  gestão pela tela quando quiser.
- Q: Uma pessoa pode acumular funções na mesma unidade com a mesma conta? → A: Sim: a conta tem
  uma ou mais funções na unidade (ex.: gestão e coordenação) e vê as áreas de cada uma.
- Q: A gestão pode acrescentar ou trocar a coordenação de qualquer edição da unidade? → A: Sim, em
  qualquer edição não encerrada, mantendo ao menos uma coordenação ativa; desativar a conta da
  última coordenação de uma edição é recusado até indicar outra.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Master cadastra unidades e a gestão de cada uma (Priority: P1)

O master entra no sistema e vê a lista de unidades. Cadastra uma unidade nova (nome) e informa
o nome e o e-mail da pessoa que fará a gestão dela; essa pessoa recebe o convite para criar a
própria senha e passa a gerir a unidade. O master pode desativar e reativar uma unidade e trocar
ou acrescentar contas de gestão.

**Why this priority**: sem unidade e sem gestão não há como cadastrar a coordenação de uma
unidade nova; é a base do multi-tenant.

**Independent Test**: como master, cadastrar a unidade "Unidade B" com uma conta de gestão;
entrar com a conta de gestão e ver só a Unidade B.

**Acceptance Scenarios**:

1. **Given** o master, **When** abre "Unidades", **Then** vê cada unidade com nome, situação
   (ativa ou inativa) e as contas de gestão com a situação do acesso (convite pendente, ativo).
2. **Given** o master, **When** cadastra uma unidade com nome e, opcionalmente, uma conta de
   gestão (nome e e-mail), **Then** a unidade é criada e a pessoa recebe o convite para criar a
   senha (como nas contas da spec 002), só após a resposta do servidor; sem gestão, a unidade
   aparece em "Unidades sem gestão".
3. **Given** um nome de unidade já usado, **When** o master tenta cadastrar, **Then** é recusado
   com "Já existe uma unidade com esse nome."
4. **Given** uma unidade ativa, **When** o master a desativa com justificativa, **Then** ninguém da
   unidade consegue usar o sistema até ela ser reativada; os dados ficam guardados.
5. **Given** uma unidade, **When** o master acrescenta ou desativa uma conta de gestão, **Then** a
   unidade precisa manter ao menos uma conta de gestão ativa.
6. **Given** o master, **When** convida outro master (nome e e-mail), **Then** a pessoa recebe o
   convite e passa a ser master; ninguém desativa o próprio acesso de master e a instalação
   mantém ao menos um master ativo.
7. **Given** qualquer outro perfil, **When** tenta abrir "Unidades" ou cadastrar unidade, **Then**
   o servidor recusa.

---

### User Story 2 - Gestão da unidade cria a equipe da unidade (Priority: P1)

A pessoa da gestão da unidade cadastra as contas da equipe da unidade — coordenação, docentes,
mentores e analistas — e cria edições da unidade, indicando quem coordena cada uma (a
coordenação também cria edições na sua unidade). A partir
daí, a coordenação trabalha como hoje (cursos, turmas, estudantes, vínculos às turmas), só dentro
da sua unidade.

**Why this priority**: é o que a pessoa usuária pediu ("a gestão cria os seus usuários"); sem
isso a coordenação de uma unidade nova não existe.

**Independent Test**: como gestão da Unidade B, criar uma conta de coordenação e uma de docente,
criar uma edição com essa coordenação; entrar como a coordenação e ver só a edição da Unidade B.

**Acceptance Scenarios**:

1. **Given** a gestão da unidade, **When** abre "Equipe da unidade", **Then** vê as contas da
   unidade com nome, função (coordenação, docente, mentor, analista) e situação do acesso; sem
   estudantes.
2. **Given** a gestão, **When** cadastra uma pessoa com nome, e-mail e função, **Then** a conta é
   criada na unidade e recebe o convite para criar a senha; e-mail já usado na mesma unidade é
   recusado; a função pode ser trocada e a conta desativada com justificativa.
3. **Given** a gestão, **When** cria uma edição (nome, período) e escolhe a coordenação entre as
   contas de coordenação da unidade, **Then** a edição nasce em preparação, na unidade, com essa
   coordenação (o restante segue a spec 010).
   3a. **Given** a coordenação de uma edição da unidade, **When** cria outra edição, **Then** a edição
   nasce na mesma unidade, com quem criou como coordenação (como na spec 010).
   3c. **Given** uma edição não encerrada da unidade, **When** a gestão acrescenta ou retira uma
   coordenação, **Then** a mudança vale após o servidor e fica na auditoria; retirar a última
   coordenação ativa, ou desativar a conta dela, é recusado com "Indique outra coordenação antes.".
   3b. **Given** uma conta com as funções gestão e coordenação, **When** entra, **Then** vê as áreas
   das duas funções e escolhe a área no menu.
4. **Given** a coordenação de uma edição, **When** vincula docentes e mentores às turmas, **Then**
   só pode escolher pessoas da equipe da sua unidade.
5. **Given** a gestão, **When** tenta ver notas, equipes, ranking ou dados de estudantes, **Then**
   não há essas telas para ela e o servidor recusa.
6. **Given** a gestão da Unidade A, **When** tenta ver ou alterar algo da Unidade B, **Then** o
   servidor recusa.

---

### User Story 3 - Cada unidade só vê o que é seu (Priority: P1)

Coordenação, docentes, mentores, estudantes e analistas veem e alteram apenas dados da própria
unidade. O que já existe hoje passa a pertencer a uma unidade inicial, sem perda de dados.

**Why this priority**: isolamento entre unidades é o requisito central do multi-tenant e da
proteção de dados (constituição V e VI).

**Independent Test**: com duas unidades e dados em cada uma, entrar com cada perfil da Unidade A
e conferir, nas telas e diretamente no servidor, que nada da Unidade B aparece.

**Acceptance Scenarios**:

1. **Given** duas unidades com edições, turmas, equipes e notas, **When** qualquer pessoa da
   Unidade A consulta qualquer tela ou dado, **Then** nada da Unidade B aparece.
2. **Given** a instalação atual, **When** a mudança é aplicada, **Then** todas as edições, cursos,
   turmas, pessoas e vínculos existentes passam a pertencer à unidade inicial "SENAI Juazeiro do
   Norte", com os mesmos dados, e a coordenação atual continua trabalhando como antes.
3. **Given** o cadastro permanente de cursos e turmas (spec 010), **When** a coordenação o usa,
   **Then** ele é o da sua unidade.
4. **Given** o regulamento público (spec 014), **When** alguém o abre, **Then** cada edição
   publicada aparece com o nome da sua unidade.

---

### User Story 4 - Master responde às premissas (Priority: P2)

As premissas em validação (spec 015) são do sistema: só o master registra "Confirmada" ou
"Precisa mudar". Coordenação, docentes, mentores e gestão de qualquer unidade leem.

**Why this priority**: decisão do usuário; muda quem responde, sem mudar o catálogo nem o
histórico.

**Independent Test**: como master, responder uma premissa; como coordenação, ver a resposta sem
formulário e ser recusada ao tentar responder.

**Acceptance Scenarios**:

1. **Given** o master, **When** abre "Premissas em validação", **Then** vê o formulário de
   resposta em cada premissa pendente.
2. **Given** coordenação, gestão, docente ou mentor, **When** abre a tela, **Then** lê premissas,
   situação e histórico, sem formulário; o servidor recusa respostas desses perfis.
3. **Given** respostas registradas antes desta mudança, **When** a tela abre, **Then** continuam no
   histórico como foram registradas.
4. **Given** o início do master, **When** há premissas aguardando resposta, **Then** aparece o
   aviso com a quantidade (o aviso sai do início da coordenação).

### Edge Cases

- Unidade desativada: as contas dela não entram (mensagem "Unidade desativada. Procure a gestão
  da rede."); o master continua vendo a unidade; reativar devolve o acesso.
- Pessoa em mais de uma unidade: uma conta pertence a uma única unidade; quem atua em duas usa
  duas contas com e-mails diferentes. E-mail já usado em outra unidade é recusado.
- Unidade inicial sem gestão: funciona normalmente; o início do master avisa "Unidade sem
  gestão" até ele criar a conta.
- Master que também é gestão ou coordenação: não permitido com a mesma conta (papéis de rede e de
  unidade separados).
- E-mail de convite: depende do provedor de e-mail (P32); no ambiente local, o convite chega na
  caixa de teste, como hoje.
- Estudantes continuam cadastrados pela coordenação (importação CSV e cadastro na turma, spec 010).
- Analistas: a conta é criada pela gestão e só lê os painéis e relatórios CSV da unidade.

## Requirements _(mandatory)_

### Functional Requirements

**Master e unidades (US1)**

- **FR-001**: O sistema MUST ter o perfil master, de alcance da instalação, sem vínculo com
  unidade ou edição.
- **FR-002**: O primeiro master MUST ser criado só por comando da administração do banco; um
  master MUST poder convidar outros masters; a instalação MUST manter ao menos um master ativo e
  ninguém MUST desativar o próprio acesso de master.
- **FR-003**: O master MUST cadastrar, renomear, desativar e reativar unidades (nome único;
  desativar com justificativa), e MUST criar e desativar contas de gestão da unidade; a última
  conta de gestão ativa de uma unidade MUST NOT ser desativada (a unidade inicial pode nascer
  sem gestão).
- **FR-004**: O master MUST NOT ler dados de estudantes, notas, equipes, entregas, ocorrências ou
  ranking de nenhuma unidade.

**Gestão da unidade (US2)**

- **FR-005**: A gestão da unidade MUST criar, trocar a função e desativar contas da equipe da
  unidade com as funções coordenação, docente, mentor e analista, por convite para criar a senha
  (ADR 0009), confirmando só após a resposta do servidor.
- **FR-006**: A gestão da unidade MUST criar edições da unidade e indicar a coordenação de cada
  uma entre as contas de coordenação da unidade; a coordenação MUST também criar edições na sua
  unidade (spec 010). A função gestão, sozinha, MUST NOT ler dados de estudantes, notas, equipes
  ou ranking.
- **FR-006c**: A gestão MUST acrescentar e retirar coordenações de qualquer edição não encerrada da
  unidade; cada edição não encerrada MUST manter ao menos uma coordenação ativa, inclusive ao
  desativar contas da equipe.
- **FR-006b**: Uma conta MUST pertencer a uma única unidade e MAY acumular funções nela (gestão,
  coordenação, docente, mentor, analista), com as permissões de cada função; e-mail já usado em
  outra unidade MUST ser recusado.
- **FR-006a**: O analista MUST só ler os painéis e os relatórios CSV das edições da sua
  unidade (sem notas individuais nem dados de contato) e MUST NOT alterar nada.
- **FR-007**: A coordenação MUST vincular a turmas só docentes e mentores da equipe da própria
  unidade; estudantes continuam cadastrados pela coordenação.

**Isolamento (US3)**

- **FR-008**: Edições, cadastro permanente de cursos e turmas e contas (exceto master) MUST
  pertencer a exatamente uma unidade; toda leitura e escrita MUST ficar restrita à unidade de
  quem pede, verificada no servidor.
- **FR-009**: Contas de unidade desativada MUST ser recusadas no servidor em toda operação.
- **FR-010**: Os dados existentes MUST passar à unidade inicial "SENAI Juazeiro do Norte" sem
  perda nem mudança de comportamento para os perfis atuais.
- **FR-011**: O regulamento público MUST mostrar o nome da unidade de cada edição publicada.

**Premissas (US4)**

- **FR-012**: Só o master MUST registrar respostas às premissas; coordenação, gestão, docentes e
  mentores MUST poder só ler; estudantes, analistas e visitantes MUST ser recusados (spec 015,
  FR-004 substituído).
- **FR-013**: O aviso de premissas aguardando resposta MUST aparecer no início do master, não mais
  no da coordenação.

**Auditoria**

- **FR-014**: Cadastro, renomeação, desativação e reativação de unidades, contas de gestão,
  contas da equipe e masters MUST ficar na auditoria com autor, data e justificativa quando
  houver.

### Key Entities _(include if feature involves data)_

- **Unidade**: nome (único), situação (ativa ou inativa), datas de criação e de desativação,
  justificativa da desativação.
- **Master**: conta com acesso de rede; situação.
- **Membro da unidade**: conta, unidade (uma só), funções (uma ou mais entre gestão,
  coordenação, docente, mentor, analista), situação.
- **Edição** (existente): passa a ter a unidade.
- **Cadastro permanente de cursos e turmas** (existente): passa a ter a unidade.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero leituras ou escritas aceitas entre unidades diferentes nos testes do servidor,
  para todos os perfis.
- **SC-002**: Uma unidade nova fica pronta para a coordenação trabalhar (unidade, gestão, conta de
  coordenação e edição) em até 4 cadastros, sem ajuda da administração do banco.
- **SC-003**: 100% dos dados existentes pertencem à unidade inicial após a mudança, e as suítes de
  teste das specs anteriores continuam passando.
- **SC-004**: Zero leituras de dados de estudantes, notas, equipes ou ranking aceitas para master
  e gestão nos testes do servidor.

## Assumptions

- A unidade tem só nome e situação; outros dados (cidade, CNPJ, endereço) não foram pedidos.
- "SENAI Juazeiro do Norte" é o nome já usado pelo aplicativo (manifesto do PWA) e pode ser
  renomeado pelo master.
- O master não pertence a unidade e não acumula funções de unidade com a mesma conta.
- O catálogo de premissas continua da instalação (spec 015).
- Fora do escopo: cobrança, domínio ou marca por unidade, transferência de dados entre unidades e
  relatórios consolidados da rede.
