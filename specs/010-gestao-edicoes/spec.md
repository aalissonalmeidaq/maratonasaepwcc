# Feature Specification: Gestão de edições, turmas e vínculos

**Feature Branch**: `010-gestao-edicoes`
**Created**: 2026-11-03
**Status**: Draft
**Input**: User description: "Gestão de edições (RF01/RF02): hoje edições só são criadas pela
administração do banco (sem política de INSERT para authenticated). Definir quem cria, configura
(regras e versão das regras), ativa e encerra edições pelo aplicativo, e o papel administrador que
atribui a coordenação de cada edição, com RLS, auditoria e escrita só por RPC. Seguir o PRD,
docs/requisitos-e-referencias.md e docs/decisoes-e-pendencias.md, sem inventar regras; registrar
lacunas em docs/decisoes-e-pendencias.md." Fluxo definido pelo usuário em 2026-11-03: "criar a
edição, vincular as turmas que participam da edição. Cada turma herda as regras básicas da edição e
tem controle individualizado com o processo de enturmação/cadastros ou vinculação dos alunos,
vinculação dos docentes. O mentor é vinculado ao curso e automaticamente às turmas pertencentes ao
curso."

**Rastreabilidade**: PRD RF01 e RF02 (Must: "Coordenação cadastra edições, cursos, turmas e
docentes responsáveis"), RF03 (cadastrar/importar alunos), seção 4 (fluxo da coordenação), seção 9
(estados); `docs/decisoes-e-pendencias.md` (criação de edições só pela administração do banco até
esta spec); specs 002 (organização) e 004 (painel da turma). Constituição V, VI, VII, VIII, X.

**Divisão de escopo**: as regras ficam para a **spec 011** (versões das regras da edição, ajustes
por turma e versão usada por encontro). Nesta spec, a edição nasce com as regras de uma base e as
turmas usam as regras da edição; as decisões já tomadas sobre regras estão registradas abaixo e
seguem para a 011.

## Clarifications

### Session 2026-11-03

- Q: Quem cria edições pelo aplicativo? → A: Quem tem atribuição ativa de coordenação em qualquer
  edição; a criadora sai como coordenação da edição nova. Não há papel administrador novo; a
  primeira edição de uma instalação continua criada pela administração do banco.
- Q: Pode haver mais de uma edição ativa ao mesmo tempo? → A: Sim; quem participa de mais de uma
  edição escolhe qual ver por um seletor.
- Q: A coordenação pode encerrar a edição com pendências (ocorrências sem decisão, revisões
  abertas, categorias sem ranking publicado)? → A: Sim, com aviso: a tela lista as pendências e
  pede confirmação e justificativa; o encerramento vale mesmo assim.
- Q: Enquanto a edição está em rascunho, quem já tem vínculo com ela deve vê-la? → A: Sim, como
  hoje; quem tem vínculo vê a edição em rascunho com a marcação "Em preparação", e a escrita segue
  as regras de cada funcionalidade.
- Q: As turmas existem fora da edição? → A: Sim; cursos e turmas viram cadastro permanente da
  unidade, e a coordenação escolhe quais turmas participam de cada edição.
- Q: O que é o controle individualizado de cada turma? → A: A gestão por turma: uma tela por turma
  para cadastrar, importar e vincular alunos e vincular docentes, sem estado próprio da turma.
- Q: Como fica o vínculo do mentor? → A: Só por curso; vale para todas as turmas do curso na
  edição, inclusive as vinculadas depois. Os vínculos atuais por turma são convertidos.
- Q: Além da coordenação, os docentes da turma podem fazer a enturmação dela? → A: Não; só a
  coordenação faz a gestão de qualquer turma; docentes e mentores veem a lista da turma, como hoje.
- Q: A correção de nome ou categoria no cadastro chega às edições ativas? → A: Não
  automaticamente; chega só às edições em preparação. Ativas e encerradas mantêm o que tinham, e a
  coordenação de uma edição ativa pode aplicar a correção nela por uma ação explícita ("Atualizar a
  partir do cadastro"), auditada.
- Q: A spec fica única ou é dividida? → A: Dividida; as regras vão para a spec 011.
- Decisões sobre regras, registradas para a spec 011: as regras mudam com a edição ativa, com nova
  versão e justificativa; só valores mudam (sem acrescentar, remover ou renomear critérios, faixas
  ou tipos de penalidade); cada encontro usa a versão vigente no seu início; o rótulo da versão é
  sugerido e editável, único na edição; cada turma herda as regras da edição e pode ajustar valores
  próprios.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Criar a edição (Priority: P1)

A coordenação cria a edição de um novo ciclo pelo aplicativo, com nome e período, e já sai dela
como coordenação. A edição nasce em preparação (rascunho), com as regras copiadas de uma base: as
regras do piloto ou as de uma edição que essa pessoa coordena.

Pessoa autorizada é quem tem atribuição ativa de coordenação em qualquer edição (leitura literal
do PRD: "Coordenação cadastra edições"). A primeira edição de uma instalação continua criada pela
administração do banco.

**Why this priority**: primeiro passo do fluxo; sem ele, cada ciclo depende de acesso ao banco.

**Independent Test**: com a conta de coordenação, criar "Maratona 2027 (fictícia)" a partir das
regras do piloto; conferir que ela aparece em preparação, que a criadora é coordenação dela e que
uma conta sem vínculo não a vê.

**Acceptance Scenarios**:

1. **Given** uma pessoa autorizada, **When** informa nome e período e escolhe a base de regras,
   **Then** a edição é criada em preparação, com as regras e a versão da base, e a pessoa passa a
   ser coordenação dela.
2. **Given** um nome com menos de 3 ou mais de 160 caracteres, ou fim antes do início, **When**
   confirma, **Then** é recusado com o motivo.
3. **Given** uma pessoa sem autorização, **When** tenta criar uma edição, mesmo chamando o servidor
   diretamente, **Then** a operação é recusada.
4. **Given** o mesmo pedido de criação enviado duas vezes, **When** o servidor responde, **Then**
   existe uma só edição nova.
5. **Given** a base "edição que coordeno", **When** a pessoa escolhe uma edição que não coordena,
   **Then** é recusado.
6. **Given** a coordenação da edição, **When** corrige nome ou período (em preparação ou ativa),
   **Then** a alteração é gravada e auditada; outras pessoas são recusadas.

---

### User Story 2 - Cadastro permanente e vínculo das turmas à edição (Priority: P1)

A coordenação mantém o cadastro permanente de cursos (com a categoria de ranking) e turmas da
unidade e escolhe quais turmas participam da edição. Vincular uma turma traz junto o curso dela
para a edição. Cada turma vinculada usa as regras da edição.

**Why this priority**: segundo passo do fluxo; as turmas deixam de ser recriadas a cada ciclo.

**Independent Test**: cadastrar o curso "Técnico em Informática (fictício)" e as turmas "A" e "B";
vincular só a turma "A" à edição nova; conferir que a edição mostra o curso e a turma "A", e que a
turma "B" segue no cadastro, disponível para outras edições.

**Acceptance Scenarios**:

1. **Given** a coordenação, **When** cadastra um curso com nome e categoria e turmas nele, **Then**
   eles ficam no cadastro permanente, disponíveis para qualquer edição.
2. **Given** um curso ou turma com nome repetido no cadastro (curso por nome; turma por nome dentro
   do curso), **When** salva, **Then** é recusado com a mensagem do nome repetido.
3. **Given** turmas do cadastro, **When** a coordenação as vincula à edição, **Then** elas passam a
   participar da edição com o curso delas, e o vínculo fica auditado.
4. **Given** uma turma já vinculada à edição, **When** é vinculada de novo, **Then** nada muda.
5. **Given** uma turma vinculada sem alunos, docentes nem registros na edição, **When** a
   coordenação a desvincula, **Then** ela sai da edição e continua no cadastro. Os vínculos de
   mentor que vinham do curso não impedem o desvínculo e saem junto com a turma.
6. **Given** uma turma vinculada com alunos, docentes ou registros na edição, **When** a
   coordenação tenta desvinculá-la, **Then** é recusado com o que impede.
7. **Given** um curso ou turma do cadastro que participa ou participou de alguma edição, **When**
   alguém tenta apagá-lo, **Then** é recusado; corrigir nome e categoria continua possível.
8. **Given** a mesma turma do cadastro, **When** ela participa de duas edições, **Then** alunos,
   docentes, equipes e registros de uma edição não aparecem na outra.

---

### User Story 3 - Gestão por turma: alunos e docentes (Priority: P1)

Cada turma vinculada tem sua própria tela de gestão, onde a coordenação faz a enturmação: cadastra
contas de alunos, importa alunos por CSV, vincula alunos que já têm conta, desvincula alunos e
vincula ou desvincula docentes.

**Why this priority**: terceiro passo do fluxo; reúne por turma o que hoje está espalhado na tela
de organização da edição.

**Independent Test**: na turma "A" da edição nova, cadastrar uma aluna, importar três alunos por
CSV, vincular um aluno que já tinha conta de outra edição e vincular um docente; conferir as
listas da turma e que o docente vê só essa turma.

**Acceptance Scenarios**:

1. **Given** a tela da turma, **When** a coordenação cadastra uma conta de aluno, **Then** a conta
   é criada já vinculada a essa turma, com o convite de primeiro acesso da spec 002.
2. **Given** um CSV de alunos, **When** a coordenação importa na tela da turma, **Then** a prévia
   e a importação seguem a spec 002 e todos os alunos ficam vinculados a essa turma.
3. **Given** um aluno com conta (de outra edição ou desvinculado), **When** a coordenação o busca
   pelo nome e vincula, **Then** ele passa a ser aluno da turma sem criar conta nova.
4. **Given** um aluno já ativo em outra turma da mesma edição, **When** se tenta vinculá-lo, **Then**
   é recusado ("O estudante já está ativo em outra turma desta edição"), como na spec 002.
5. **Given** um aluno vinculado, **When** a coordenação o desvincula, **Then** o vínculo fica
   inativo com histórico, e a equipe dele não muda automaticamente (spec 003, FR-011).
6. **Given** um docente com conta, **When** a coordenação o vincula ou desvincula da turma, **Then**
   ele passa a atuar ou deixa de atuar só naquela turma.
7. **Given** a lista da turma, **When** a coordenação a consulta, **Then** vê alunos, docentes e
   mentores (estes vindos do curso) com a situação de acesso de cada conta.
8. **Given** um docente ou mentor da turma, **When** abre a turma, **Then** vê a lista como hoje,
   sem as ações de gestão; uma tentativa de vincular ou cadastrar pelo servidor é recusada.

---

### User Story 4 - Mentor vinculado ao curso (Priority: P1)

A coordenação vincula o mentor ao curso na edição. Ele passa a atuar automaticamente em todas as
turmas desse curso na edição, inclusive nas que forem vinculadas depois, e deixa de atuar em todas
ao ser desvinculado do curso.

**Why this priority**: regra explícita do fluxo; evita vincular o mentor turma por turma.

**Independent Test**: vincular um mentor ao curso com as turmas "A" e "B" na edição; conferir que
ele atua nas duas; vincular a turma "C" do mesmo curso e conferir que ele passa a atuar nela;
desvinculá-lo do curso e conferir que deixa de atuar nas três.

**Acceptance Scenarios**:

1. **Given** um curso na edição, **When** a coordenação vincula um mentor a ele, **Then** o mentor
   atua em todas as turmas do curso na edição.
2. **Given** um mentor vinculado ao curso, **When** uma turma do curso é vinculada à edição,
   **Then** ele passa a atuar nela sem ação adicional.
3. **Given** um mentor vinculado ao curso, **When** é desvinculado do curso, **Then** deixa de atuar
   em todas as turmas do curso naquela edição, com histórico.
4. **Given** um pedido de vínculo de mentor direto a uma turma, **When** chega ao servidor,
   **Then** é recusado com a orientação de vincular ao curso.
5. **Given** mentores hoje vinculados por turma, **When** esta spec entra em vigor, **Then** cada
   um passa a ser vinculado ao curso das turmas em que atuava. **[validar]** (passa a atuar também
   nas outras turmas do mesmo curso)

---

### User Story 5 - Ativar e encerrar a edição (Priority: P1)

A coordenação ativa a edição quando as turmas estão vinculadas e a encerra ao fim do ciclo.
Encerrar deixa a edição só para leitura em todo o aplicativo. Os dois passos pedem confirmação
explícita, e encerrar pede justificativa.

**Why this priority**: fecha o ciclo de vida; as specs anteriores dependem do estado da edição,
que hoje só muda no banco.

**Independent Test**: ativar a edição com uma turma vinculada; encerrá-la com justificativa e
conferir que criar curso, lançar presença ou publicar comunicado nela é recusado e a leitura
continua.

**Acceptance Scenarios**:

1. **Given** uma edição em preparação com início, fim e pelo menos uma turma vinculada, **When** a
   coordenação ativa, **Then** o estado passa a "ativa" e fica auditado.
2. **Given** uma edição em preparação sem período ou sem turma vinculada, **When** a coordenação
   tenta ativar, **Then** é recusado com o que falta.
3. **Given** uma edição ativa, **When** a coordenação encerra com justificativa, **Then** o estado
   passa a "encerrada" e toda escrita na edição passa a ser recusada; a leitura continua.
4. **Given** uma edição ativa com ocorrência sem decisão, pedido de revisão aberto ou categoria
   sem ranking publicado, **When** a coordenação pede para encerrar, **Then** vê a lista dessas
   pendências antes de confirmar; confirmando com justificativa, a edição é encerrada e as
   pendências ficam como estavam, só para leitura.
5. **Given** uma edição encerrada, **When** alguém tenta reativá-la ou alterá-la, **Then** é
   recusado.
6. **Given** ativar ou encerrar repetido (reenvio), **When** o servidor responde, **Then** o estado
   não muda de novo e não há registro duplicado.

---

### User Story 6 - Coordenação da edição (Priority: P2)

A coordenação de uma edição acrescenta ou desativa outras pessoas como coordenação dela. Ninguém
altera a própria atribuição, e a edição nunca fica sem pelo menos uma coordenação ativa.

**Why this priority**: continuidade; com edições criadas pelo aplicativo, passa a ser o caminho
normal.

**Independent Test**: atribuir uma segunda pessoa como coordenação; conferir que ela gere a
edição; tentar desativar a última coordenação ativa e ver a recusa.

**Acceptance Scenarios**:

1. **Given** a coordenação da edição, **When** atribui uma pessoa com conta como coordenação,
   **Then** a pessoa passa a ver e gerir a edição; repetir a atribuição (reenvio) conclui sem
   mudança e sem erro.
2. **Given** a última coordenação ativa da edição, **When** alguém tenta desativá-la, **Then** é
   recusado.
3. **Given** uma pessoa tentando alterar a própria atribuição, **When** confirma, **Then** é
   recusado.

---

### User Story 7 - Escolher a edição em uso (Priority: P2)

Quem participa de mais de uma edição visível escolhe qual edição ver por um seletor no topo da
tela; todas as telas da área passam a mostrar a edição escolhida. Quem participa de uma só edição
não vê seletor.

**Why this priority**: com edições ativas ao mesmo tempo, a escolha automática da "edição atual"
deixa de bastar.

**Independent Test**: com a coordenação em duas edições, trocar no seletor e conferir organização,
turmas, comunicados e painel na edição escolhida; com uma conta em uma só edição, conferir que o
seletor não aparece.

**Acceptance Scenarios**:

1. **Given** uma pessoa com vínculo em duas edições visíveis, **When** abre o aplicativo pela
   primeira vez, **Then** vê a edição ativa de maior data de início (sem ativa, a de maior data de
   início entre as visíveis), e o seletor mostra as duas com nome e estado.
2. **Given** a pessoa escolhe outra edição, **When** navega entre as telas da área, **Then** todas
   mostram a edição escolhida, e a escolha é lembrada neste dispositivo.
3. **Given** a edição lembrada deixou de ser visível, **When** a pessoa abre o aplicativo, **Then**
   volta para a edição padrão sem erro.
4. **Given** uma pessoa com vínculo em uma só edição, **When** abre o aplicativo, **Then** não vê
   seletor.
5. **Given** uma edição em que a pessoa não tem vínculo, **When** ela tenta ver dados dela
   (inclusive alterando o endereço), **Then** o servidor não devolve nada.

---

### Edge Cases

- Turma do cadastro vinculada a uma edição nova enquanto participa de outra edição ativa: permitido;
  cada edição tem seus próprios alunos, docentes e registros para aquela turma.
- Aluno de uma turma na edição passada entra numa edição nova: precisa ser vinculado de novo
  (vínculos não são copiados entre edições).
- Curso ou turma do cadastro com nome ou categoria corrigidos: a correção chega sozinha só às
  edições em preparação; numa edição ativa, a coordenação dela vê o aviso "O cadastro tem uma
  correção para este curso" e decide aplicar ("Atualizar a partir do cadastro"); edições
  encerradas e rankings publicados mantêm o que foi registrado.
- Desvincular um docente que tem avaliações lançadas: o vínculo fica inativo e os lançamentos
  permanecem, como hoje.
- Mentor também vinculado como docente de uma turma do curso: os dois vínculos convivem; desvincular
  do curso não remove o vínculo de docente.
- Curso sem turmas vinculadas na edição: não aparece na edição; vincular um mentor exige o curso
  presente na edição (ao menos uma turma vinculada). Quando a última turma do curso é
  desvinculada, os vínculos de mentor ao curso ficam inativos (com histórico) e o curso sai da
  edição; vincular de novo uma turma do curso não reativa os mentores, que precisam ser
  vinculados outra vez.
- Edição em preparação continua visível a quem tem vínculo, com a marcação "Em preparação".
- Período sem datas é permitido em preparação; para ativar, início e fim são exigidos.
- Edição criada por engano: pode ser apagada pela coordenação enquanto estiver em preparação sem
  turmas vinculadas nem outras atribuições.
- Demonstração: edições, cadastro e gestão por turma aparecem com dados fictícios e escrita
  desabilitada.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Pessoas autorizadas (com atribuição ativa de coordenação em qualquer edição) MUST
  criar edições pelo aplicativo com nome (3 a 160 caracteres), período opcional (fim não anterior
  ao início) e base de regras (piloto ou edição que coordenam); a edição MUST nascer em preparação
  e a criadora MUST ser atribuída como coordenação dela na mesma operação.
- **FR-002**: Pessoas sem autorização MUST NOT criar edições, mesmo chamando o servidor
  diretamente.
- **FR-003**: A coordenação da edição MUST alterar nome e período; outras pessoas MUST NOT.
- **FR-004**: Pessoas autorizadas MUST manter o cadastro permanente de cursos (nome único e
  categoria) e turmas (nome único dentro do curso); itens que participam ou participaram de alguma
  edição MUST NOT ser apagados. Correções de nome e categoria MUST chegar automaticamente só às
  edições em preparação; numa edição ativa, MUST valer só quando a coordenação dela aplicar a
  correção, com auditoria; edições encerradas MUST NOT mudar.
- **FR-005**: A coordenação da edição MUST vincular turmas do cadastro à edição, trazendo o curso
  delas; MUST desvincular uma turma só se ela não tiver alunos, docentes nem registros na edição.
- **FR-006**: Alunos, docentes, mentores, equipes e registros MUST pertencer à turma **na edição**;
  a mesma turma do cadastro em duas edições MUST NOT misturar dados entre elas.
- **FR-007**: Cada turma vinculada MUST ter uma tela de gestão onde só a coordenação cadastra contas de
  alunos, importa alunos por CSV, vincula alunos com conta, desvincula alunos e vincula ou
  desvincula docentes, com as validações das specs 002 e 003 (um aluno ativo em no máximo uma turma
  por edição).
- **FR-008**: Mentores MUST ser vinculados ao curso na edição e MUST atuar em todas as turmas desse
  curso na edição, inclusive as vinculadas depois; vínculo de mentor direto a uma turma MUST ser
  recusado.
- **FR-009**: Os vínculos atuais de mentor por turma MUST ser convertidos em vínculo ao curso das
  turmas, com registro na auditoria.
- **FR-010**: Ativar MUST exigir edição em preparação, início e fim preenchidos e pelo menos uma
  turma vinculada; encerrar MUST exigir edição ativa e justificativa de pelo menos 10 caracteres.
- **FR-011**: Antes de encerrar, a coordenação MUST ver as pendências da edição (ocorrências sem
  decisão, pedidos de revisão abertos, categorias sem ranking publicado), com quantidade por tipo;
  as pendências MUST NOT impedir o encerramento, e a auditoria do encerramento MUST guardar a
  lista apresentada.
- **FR-012**: Edição encerrada MUST NOT voltar a preparação ou a ativa, nem aceitar escrita em
  nenhuma funcionalidade; a leitura MUST continuar.
- **FR-013**: Criar, alterar, vincular, desvincular, ativar, encerrar e atribuir MUST ser
  idempotentes: o mesmo envio repetido grava uma só vez.
- **FR-014**: A edição MUST manter pelo menos uma coordenação ativa; ninguém MUST alterar a própria
  atribuição.
- **FR-015**: A visibilidade da edição MUST continuar como hoje (quem tem vínculo a vê em qualquer
  estado); em preparação, as telas MUST mostrar a marcação "Em preparação".
- **FR-016**: Edição em preparação sem turmas vinculadas nem outras atribuições MUST poder ser
  apagada pela coordenação; nos demais casos MUST NOT.
- **FR-017**: Toda escrita sobre edições, cadastro, vínculos de turma e atribuições MUST passar pelo
  servidor, com auditoria; a interface MUST NOT dar a operação como concluída antes da resposta.
- **FR-018**: A coordenação MUST ver a lista das edições que coordena, com estado, período e versão
  das regras.
- **FR-019**: Quem tem vínculo com mais de uma edição visível MUST escolher a edição por um
  seletor; a escolha MUST ser lembrada no dispositivo e descartada quando deixar de ser visível;
  quem tem uma só edição MUST NOT ver seletor.
- **FR-020**: Mais de uma edição MUST poder estar ativa ao mesmo tempo; cada operação MUST valer só
  para a edição escolhida, com a autorização conferida no servidor para aquela edição.
- **FR-021**: Todas as telas MUST estar em português do Brasil, funcionar em celular e desktop e ser
  operáveis por teclado.

### Key Entities _(include if feature involves data)_

- **Edição**: nome, período, estado (em preparação, ativa, encerrada; "em preparação" é o estado
  `rascunho` no banco), regras e versão das regras
  (copiadas da base), horários de criação, ativação e encerramento, justificativa e pendências do
  encerramento.
- **Curso do cadastro**: nome único e categoria de ranking; permanente.
- **Turma do cadastro**: nome único dentro do curso; permanente.
- **Turma na edição**: a participação de uma turma do cadastro numa edição; dona dos vínculos de
  alunos e docentes e de todos os registros daquela edição ligados à turma (equipes, atividades,
  presenças, comunicados).
- **Curso na edição**: o curso de uma turma vinculada, dono dos vínculos de mentores.
- **Vínculo (atribuição)**: pessoa, edição, papel e alvo (turma na edição para aluno e docente;
  curso na edição para mentor; nenhum para coordenação, apoio e analista), ativo ou não, com
  histórico.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A coordenação percorre o fluxo criar edição → vincular turmas → enturmar alunos e
  docentes → vincular mentor → ativar sem acesso ao banco, numa única área do aplicativo.
- **SC-002**: Uma turma do cadastro é vinculada a uma edição nova em até 3 interações, sem redigitar
  curso, categoria ou nome.
- **SC-003**: 100% das tentativas de criar, alterar, vincular, ativar ou encerrar por quem não tem
  permissão são recusadas no servidor, inclusive por chamada direta.
- **SC-004**: Envios repetidos ou simultâneos da mesma operação resultam em exatamente um efeito.
- **SC-005**: Depois do encerramento, 100% das operações de escrita das funcionalidades das specs
  002–009 sobre aquela edição são recusadas, e a leitura continua disponível.
- **SC-006**: Um mentor vinculado ao curso atua em 100% das turmas do curso na edição, inclusive as
  vinculadas depois, sem vínculo manual por turma.
- **SC-007**: Quem participa de mais de uma edição troca de edição em até 2 interações, e 100% das
  telas da área passam a mostrar a edição escolhida.

## Assumptions

- Instalação de uma unidade: o cadastro permanente é único por instalação, sem entidade "unidade".
  **[validar]**
- Os dados existentes migram para o modelo novo: cada curso e turma atuais geram um item no cadastro
  permanente (mesmo nome dentro do curso vira um só) e ficam vinculados à edição em que estão.
- Vincular uma turma não copia alunos nem docentes de outra edição.
- Regras: nesta spec, todas as turmas usam as regras da edição, como hoje. Versões, ajustes por
  turma e versão por encontro ficam para a spec 011.
- A premiação fica fora: o PRD não define prêmios.
- Edição encerrada não é reaberta; a reabertura, se necessária, terá spec própria. **[validar]**
- Apoio técnico-administrativo e analista continuam sem acesso à gestão de edições e do cadastro
  (constituição V).
- Contas novas continuam criadas pela Edge Function da spec 002 (sem senha provisória, convite de
  primeiro acesso).
