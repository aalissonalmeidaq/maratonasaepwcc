# Feature Specification: Resultado oficial, ocorrências e ranking

**Feature Branch**: `007-resultado-oficial-ranking`
**Created**: 2026-10-31
**Status**: Draft
**Input**: User description: "Incremento 4 da Maratona SAEP: resultado oficial e classificação.
Registro da prova oficial (RF13: realização confirmada/pendente/não realizou e nota oficial por
estudante, sem expor notas individuais no ranking); ocorrências e penalidades com manifestação e
pedido de revisão em até 24 h (RF15); cálculo oficial dos pontos no servidor como fonte única
(RF14), reproduzindo o núcleo TS já testado; publicação do ranking por categoria nos estados
parcial, provisório e definitivo, sem notas individuais (RF16, HU05, HU06). Usar os lançamentos
da spec 006 (presença, participação, questões, entrega, apresentação). Numerar como spec 007."

**Rastreabilidade**: PRD RF13, RF14, RF15, RF16; HU04, HU05, HU06; RNF05, RNF06; PRD §regras
(prova oficial, ocorrências, desempate, revisão em 24 h, estados do ranking); specs 002, 003 e
006 (lançamentos dos encontros). Constituição II, V, VI, VII, IX, X.

## Clarifications

### Session 2026-11-01

- Q: O pedido de revisão vale só para decisões de ocorrência ou também para os pontos
  publicados? → A: Ambos — decisão de ocorrência e qualquer componente publicado da própria equipe.
- Q: Além do aviso no aplicativo, é preciso enviar e-mail? → A: Não; só aviso no aplicativo.
- Q: Antes da publicação, o que o aluno vê na página de pontuação da própria equipe? → A: Os
  pontos da própria equipe por encontro, calculados no servidor, com o selo "Prévia — não
  oficial"; ranking e posições só depois de publicados.
- Q: Ao deferir um pedido de revisão, como os pontos são corrigidos? → A: Corrigindo o registro
  de origem (rubrica, presença, prova, questões ou decisão da ocorrência) pelas correções com
  justificativa já existentes, ligadas ao pedido; não há ajuste manual de pontos.
- Q: Quais publicações do ranking abrem o prazo de 24 h para revisão dos pontos? → A: Só a
  provisória; parcial não abre e definitiva é final (decisões de ocorrência abrem prazo próprio).
- Q: A coordenação pode decidir uma ocorrência antes da manifestação ou do fim do prazo? → A:
  Não; só depois da manifestação enviada ou do prazo encerrado; antes disso o servidor recusa.
- Q: O que docentes e mentores veem dos pontos e do ranking? → A: A prévia dos pontos oficiais
  de todas as equipes da própria turma (por encontro e componente, sem nota individual de prova)
  e o ranking publicado da categoria.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Coordenação registra a prova oficial (Priority: P1)

No encontro da prova oficial, a coordenação registra, para cada estudante, se realizou a prova
(confirmada, pendente ou não realizou) e, quando disponível e autorizada, a nota oficial e a sua
fonte. A equipe recebe 5 pontos por integrante que realizou e mais 10 por nota confirmada igual
ou superior a 70, até 30 por equipe. Enquanto houver realização ou nota pendente, o componente da
equipe fica pendente e o resultado não pode ser definitivo.

**Why this priority**: a prova oficial vale até 30 pontos e decide se o ranking pode ser
fechado; sem ela não existe resultado oficial (HU04).

**Independent Test**: como coordenação, registrar realização confirmada para os dois integrantes
de uma equipe e nota 75 para um deles; conferir 20 pontos da equipe; marcar outra equipe como
pendente e conferir que o resultado dela aparece pendente; como aluno, não ver nenhuma nota
individual de prova.

**Acceptance Scenarios**:

1. **Given** um encontro configurado com prova oficial, **When** a coordenação registra
   realização confirmada de um estudante sem nota, **Then** a equipe soma 5 pontos e o
   componente fica pendente até a nota ser confirmada ou registrada como indisponível.
2. **Given** realização confirmada, **When** a coordenação registra nota 70 ou mais com fonte e
   escala confirmadas, **Then** a equipe soma mais 10 pontos por esse estudante, limitado a 30.
3. **Given** um estudante que não realizou, **When** o registro é salvo, **Then** ele não soma
   pontos e o componente da equipe pode ser considerado completo.
4. **Given** uma nota já registrada, **When** a coordenação a corrige, **Then** a correção exige
   justificativa e o valor anterior fica no histórico.
5. **Given** um aluno ou um docente, **When** consultam o resultado, **Then** não veem a nota
   oficial individual de outros estudantes; o aluno vê apenas os pontos da própria equipe nesse
   componente.

---

### User Story 2 - Docente registra ocorrência e coordenação decide (Priority: P1)

Um docente, mentor ou a coordenação registra uma ocorrência para uma equipe em um encontro, com
o fato, o tipo previsto nas regras e a evidência. A equipe é notificada no aplicativo, pode se
manifestar no prazo, e a coordenação registra a decisão fundamentada. A penalidade só afeta os
pontos depois da decisão que a confirma.

**Why this priority**: penalidades alteram pontos e a classificação; o fluxo precisa ser
auditável e respeitar o direito de manifestação (RF15).

**Independent Test**: como docente da turma A, registrar uma ocorrência de "uso não autorizado"
com evidência para uma equipe; como aluno da equipe, manifestar-se; como coordenação, confirmar
a ocorrência; conferir o desconto de 5 pontos no encontro; como aluno de outra equipe, não ver a
ocorrência.

**Acceptance Scenarios**:

1. **Given** um encontro e uma equipe da turma, **When** o docente registra a ocorrência com
   fato, tipo e evidência (texto e, opcionalmente, arquivo), **Then** ela fica "registrada",
   visível à equipe, à equipe docente da turma e à coordenação, e não altera pontos ainda.
2. **Given** uma ocorrência registrada, **When** um integrante da equipe envia a manifestação
   dentro do prazo, **Then** a manifestação fica anexada com autor e horário do servidor.
3. **Given** uma ocorrência com manifestação enviada ou com o prazo de manifestação encerrado,
   **When** a coordenação decide (confirmar ou
   arquivar) com justificativa, **Then** a decisão fica registrada e, se confirmada, a penalidade
   do tipo passa a valer no cálculo do encontro.
4. **Given** duas ocorrências confirmadas pelo mesmo fato, **When** os pontos são calculados,
   **Then** o desconto é aplicado uma única vez.
5. **Given** ocorrências confirmadas que somam mais de 10 pontos de desconto em um encontro,
   **When** os pontos são calculados, **Then** o desconto do encontro fica limitado a 10 e o total
   do encontro não fica negativo.
6. **Given** plágio comprovado e confirmado, **When** os pontos são calculados, **Then** a entrega
   do desafio fica zerada, fora do limite de 10, e a apresentação é zerada se a coordenação
   indicar que ela dependia da entrega.

---

### User Story 3 - Pontos oficiais calculados no servidor (Priority: P1)

O servidor calcula os pontos oficiais de cada equipe por encontro e no total, a partir dos
lançamentos da spec 006, da prova oficial e das ocorrências confirmadas, usando as regras
versionadas da edição. Esse é o único valor oficial; as telas leem o resultado do servidor.

**Why this priority**: o ranking, a revisão e a premiação dependem de um valor único, auditável
e igual ao cálculo já validado (RF14).

**Independent Test**: com os lançamentos de um encontro conhecidos, comparar os pontos do
servidor com os casos de contrato do cálculo da edição; alterar uma nota e ver os pontos do
servidor atualizados.

**Acceptance Scenarios**:

1. **Given** os lançamentos de um encontro, **When** o servidor calcula, **Then** cada componente
   e o total batem com os casos de contrato das regras de pontuação.
2. **Given** um encontro com vários desafios ou listas (FR-026 da spec 006), **When** o servidor
   calcula, **Then** usa a média simples por componente, como a pontuação parcial.
3. **Given** qualquer componente pendente, **When** o servidor calcula, **Then** marca o total da
   equipe como pendente e indica quais componentes faltam.
4. **Given** um lançamento corrigido, **When** os pontos são lidos de novo, **Then** refletem a
   correção, e a correção aparece no histórico com justificativa.

---

### User Story 4 - Coordenação publica o ranking por categoria (Priority: P2)

A coordenação gera e publica a classificação de cada categoria como parcial, provisória ou
definitiva. A publicação congela uma versão com as posições, os totais e os critérios de
desempate; cada nova publicação cria uma nova versão com justificativa. Alunos veem a versão
publicada mais recente, com o estado, sem notas individuais.

**Why this priority**: é o resultado visível da maratona (HU05) e depende das histórias
anteriores.

**Independent Test**: como coordenação, publicar o ranking parcial de uma categoria; como aluno,
ver posições e totais das equipes da categoria com o selo "Parcial" e o detalhe só da própria
equipe; tentar publicar como definitivo com prova pendente e ser recusado.

**Acceptance Scenarios**:

1. **Given** pontos calculados, **When** a coordenação publica o ranking parcial de uma
   categoria, **Then** a versão publicada guarda posições, totais, desempates aplicados, autor,
   horário e estado.
2. **Given** equipes empatadas no total, **When** o ranking é gerado, **Then** o desempate segue
   prática, depois questões/prova, depois presença; o empate persistente gera posição
   compartilhada.
3. **Given** qualquer equipe com componente pendente ou ocorrência ainda não decidida, **When** a
   coordenação tenta publicar como definitivo, **Then** o servidor recusa e lista as pendências.
4. **Given** uma versão já publicada, **When** a coordenação publica outra, **Then** a anterior
   continua no histórico e a nova exige justificativa.
5. **Given** um aluno, **When** abre o ranking ou o painel da turma, **Then** vê a versão
   publicada mais recente da própria categoria com o estado, sem notas individuais, e o detalhe
   por componente só da própria equipe.

---

### User Story 5 - Estudante pede revisão em até 24 h (Priority: P2)

Depois de uma decisão de ocorrência ou de uma publicação provisória do ranking, um integrante da equipe
pode pedir revisão dentro de 24 horas, ressalvada exceção registrada pela coordenação. A
coordenação responde com decisão e justificativa; quando deferido, corrige o registro de origem,
o que recalcula os pontos e exige nova publicação para aparecer no ranking.

**Why this priority**: garante o direito de revisão previsto (HU06); depende de ocorrências e
publicação.

**Independent Test**: como aluno, pedir revisão 2 horas depois da decisão; como coordenação,
deferir com justificativa e corrigir o registro de origem; conferir o novo total; tentar pedir revisão 25 horas depois
e ser recusado, salvo exceção registrada.

**Acceptance Scenarios**:

1. **Given** uma decisão ou publicação provisória há menos de 24 horas, **When** um integrante da equipe
   envia o pedido de revisão com justificativa, **Then** o pedido fica registrado com autor e
   horário do servidor e a coordenação é avisada no aplicativo.
2. **Given** mais de 24 horas passadas, **When** o integrante tenta pedir revisão, **Then** o
   servidor recusa, salvo exceção registrada pela coordenação para aquela equipe.
3. **Given** um pedido, **When** a coordenação responde deferindo ou indeferindo com
   justificativa, **Then** a resposta fica no histórico e a equipe a vê.
4. **Given** um pedido deferido que altera pontos, **When** a coordenação corrige o registro de
   origem ligado ao pedido, **Then** os pontos oficiais são recalculados com histórico, e o
   ranking publicado só muda numa nova publicação.

### Edge Cases

- Prova oficial com escala diferente de 0–100 ou sem autorização de uso da nota: a nota fica
  pendente; nenhuma conversão é feita pelo sistema.
- Estudante desativado depois da prova: o registro continua valendo para a equipe em que estava.
- Ocorrência registrada para equipe que depois mudou de composição: pertence à equipe; o
  histórico mostra quem eram os integrantes no fato.
- Manifestação enviada depois do prazo: recusada, salvo exceção registrada.
- Decisão tentada antes da manifestação e com o prazo ainda aberto: recusada pelo servidor.
- Ocorrência arquivada: não gera desconto e continua visível no histórico restrito.
- Publicação definitiva com revisão ainda aberta: recusada até a revisão ser respondida.
- Pedido de revisão sobre publicação parcial ou definitiva: recusado; a parcial não abre prazo
  e a definitiva é final.
- Equipe sem nenhum lançamento: aparece no ranking com total 0 e marcada como pendente.
- Nenhuma nota oficial disponível no prazo: o ranking pode ser publicado como provisório.
- Aplicação offline: leitura do que já foi carregado; registrar, decidir, publicar ou pedir
  revisão exige conexão.

## Requirements _(mandatory)_

### Functional Requirements

**Prova oficial (RF13, HU04)**

- **FR-001**: A coordenação MUST registrar, por estudante e encontro de prova oficial, a
  realização (confirmada, pendente, não realizou) e, opcionalmente, a nota oficial com fonte e a
  confirmação de que a escala e a autorização de uso foram verificadas.
- **FR-002**: Os pontos da prova MUST seguir as regras da edição (piloto: 5 por realização
  confirmada, +10 por nota confirmada ≥ 70, até 30 por equipe); realização ou nota pendente deixa
  o componente pendente.
- **FR-003**: A nota oficial individual MUST NOT ser exibida a alunos, a docentes nem em
  qualquer ranking; só a coordenação a vê. O sistema MUST NOT alterar a nota oficial.
- **FR-004**: Correções de registro da prova MUST exigir justificativa e manter histórico.

**Ocorrências e penalidades (RF15)**

- **FR-005**: Docentes e mentores da turma e a coordenação MUST poder registrar ocorrência para
  uma equipe em um encontro, com fato (texto), tipo previsto nas regras da edição, evidência
  (texto e arquivo opcional em armazenamento privado) e, quando houver, o identificador do fato
  para evitar duplicidade.
- **FR-006**: Os tipos e pontos MUST vir das regras versionadas da edição; no piloto:
  reincidência após orientação registrada (2), desrespeito com responsabilidade da equipe (5),
  uso não autorizado (5) e plágio comprovado (zera a entrega e, se indicado, a apresentação).
- **FR-007**: A ocorrência MUST seguir os estados registrada → manifestação → decisão (confirmada
  ou arquivada), sujeita a pedido de revisão (FR-020); só a confirmada afeta pontos.
- **FR-008**: Integrantes da equipe MUST poder enviar uma manifestação por ocorrência dentro do
  prazo da edição (piloto: 24 h após o registro), salvo exceção registrada.
- **FR-009**: Somente a coordenação MUST decidir ocorrências, com justificativa obrigatória, e
  só depois de a equipe enviar a manifestação ou de o prazo de manifestação (com eventual
  exceção) terminar; antes disso o servidor MUST recusar a decisão.
- **FR-010**: Ocorrências MUST ser visíveis apenas à própria equipe, à equipe docente da turma e
  à coordenação da edição; nunca aparecem no ranking.
- **FR-011**: O cálculo MUST aplicar o desconto uma vez por fato, limitar os descontos gerais de
  um encontro a 10 pontos, manter o plágio fora desse limite e não deixar o encontro negativo.

**Cálculo oficial (RF14)**

- **FR-012**: O servidor MUST calcular os pontos oficiais por equipe e encontro e o total da
  edição a partir dos lançamentos da spec 006, da prova oficial e das ocorrências confirmadas,
  com as regras versionadas da edição; esse resultado é a única fonte oficial.
- **FR-013**: O cálculo do servidor MUST produzir os mesmos valores dos casos de contrato do
  núcleo de pontuação, incluindo a média por componente quando houver vários itens (FR-026 da
  spec 006).
- **FR-014**: Cada total MUST indicar se está pendente e quais componentes faltam.

**Publicação do ranking (RF16, HU05)**

- **FR-015**: A coordenação MUST gerar e publicar o ranking de cada categoria nos estados
  parcial, provisório ou definitivo; cada publicação MUST criar uma versão imutável com
  posições, totais, critérios de desempate, autor, horário e estado.
- **FR-016**: O desempate MUST seguir prática, depois questões/prova oficial (soma do componente
  objetivo de todos os encontros, decisão já registrada em `docs/decisoes-e-pendencias.md` e no
  núcleo de pontuação), depois presença;
  empate persistente gera posição compartilhada.
- **FR-017**: A publicação definitiva MUST ser recusada enquanto houver componente pendente,
  ocorrência não decidida ou pedido de revisão aberto na categoria.
- **FR-018**: A segunda publicação em diante MUST exigir justificativa; versões anteriores
  permanecem no histórico.
- **FR-019**: Alunos MUST ver apenas a versão publicada mais recente da própria categoria, com o
  estado e o detalhe por componente só da própria equipe; nenhuma nota individual aparece.
  Posições e totais de outras equipes só aparecem depois de publicados. Antes e entre
  publicações, o aluno continua vendo os pontos da própria equipe por encontro, lidos do cálculo
  oficial do servidor, com o selo "Prévia — não oficial".
- **FR-019a**: Docentes e mentores MUST ver a prévia dos pontos oficiais de todas as equipes da
  própria turma, por encontro e por componente, sem a nota individual da prova oficial, e o
  ranking publicado da categoria da turma; não veem prévia de equipes de outras turmas.

**Revisão (HU06)**

- **FR-020**: Integrantes da equipe MUST poder pedir revisão com justificativa em até 24 horas
  (prazo das regras da edição) sobre uma decisão de ocorrência da própria equipe **ou** sobre
  qualquer componente dos pontos da própria equipe numa publicação **provisória** (avaliação,
  presença, participação, questões, prova); o prazo conta da decisão ou da publicação
  provisória, respectivamente. Publicação parcial não abre prazo, e a definitiva é final: pedidos
  sobre ela são recusados.
- **FR-021**: A coordenação MUST poder registrar exceção de prazo por equipe, com justificativa,
  e responder pedidos (deferido/indeferido) com justificativa.
- **FR-022**: Um pedido deferido MUST ser atendido corrigindo o registro de origem (nota de
  rubrica, presença, participação, prova, questões ou decisão da ocorrência) pela correção com
  justificativa já prevista, ligada ao pedido; o sistema MUST NOT oferecer ajuste manual de
  pontos. Os pontos oficiais são recalculados a partir dos registros, com histórico; o ranking
  publicado só muda numa nova publicação.

**Transversais**

- **FR-023**: Toda autorização desta spec MUST ser aplicada no servidor por perfil e vínculo.
- **FR-024**: Registro, manifestação, decisão, publicação, revisão e correção MUST gerar
  auditoria com autor, horário do servidor e justificativa quando houver; repetir a mesma
  operação com os mesmos valores não grava de novo.
- **FR-025**: Registrar, decidir, publicar e pedir revisão MUST exigir conexão; nada é mostrado
  como concluído sem resposta do servidor; notas, ocorrências e dados pessoais não vão para cache
  público do aplicativo.
- **FR-026**: Avisos de ocorrência, decisão, publicação e resposta de revisão MUST aparecer no
  aplicativo para os envolvidos (contador e lista de avisos); não há envio de e-mail nesta spec.
  Os prazos de 24 h contam do horário do fato no servidor (decisão ou publicação), não da leitura
  do aviso.

### Key Entities

- **Resultado da prova oficial**: estudante, encontro, realização, nota, fonte, escala e
  autorização confirmadas, autor, horário, histórico.
- **Ocorrência**: equipe, encontro, desafio (opcional), tipo, fato, identificador do fato,
  evidências, estado, autor, horário.
- **Manifestação**: ocorrência, integrante autor, texto, horário.
- **Decisão**: ocorrência, resultado (confirmada/arquivada), justificativa, indicação de
  apresentação dependente (plágio), autor, horário.
- **Pedido de revisão**: equipe, objeto (decisão ou publicação), justificativa, estado, resposta,
  correções de origem vinculadas, autor, horários.
- **Exceção de prazo**: equipe, objeto, novo prazo, justificativa, autor.
- **Pontos oficiais**: equipe, encontro, componentes, descontos, total, pendências (derivado).
- **Publicação do ranking**: categoria, estado, versão, posições congeladas, justificativa,
  autor, horário.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em 100% dos casos de contrato das regras de pontuação, os pontos oficiais do
  servidor são iguais aos do cálculo validado.
- **SC-002**: Em nenhum teste uma nota oficial individual aparece para aluno, docente ou em
  qualquer ranking.
- **SC-003**: 100% das tentativas de acesso cruzado testadas (ocorrência de outra equipe, prova
  de outro estudante, prévia de equipe de outra turma, publicação por quem não é coordenação)
  são recusadas pelo servidor.
- **SC-004**: A coordenação publica o ranking de uma categoria em até 3 interações a partir do
  painel dela.
- **SC-005**: Nenhuma publicação definitiva é aceita com pendência, ocorrência não decidida ou
  revisão aberta.
- **SC-006**: Pedidos de revisão fora do prazo são recusados em 100% dos testes, salvo exceção
  registrada.

## Assumptions

- A prova oficial é aplicada fora do sistema; o registro é manual pela coordenação, sem
  integração com o SAEP (PRD, fora do MVP).
- Escala 0–100 é a premissa para a regra "≥ 70"; outra escala deixa a nota pendente até a
  equivalência ser confirmada pela coordenação. **[validar]**
- Os tipos de ocorrência e pontos vêm do PRD e entram nas regras versionadas da edição; conduta
  grave segue decisão fundamentada e normas institucionais, fora do cálculo automático.
- O prazo de manifestação e o de revisão são de 24 horas no piloto, configuráveis nas regras.
- "Publicar" é um ato da coordenação, independente do estado (decisão da spec 004); a regra
  "aluno só vê depois da publicação" passa a valer com este incremento para o ranking (posições e
  totais das outras equipes); a prévia da própria equipe continua visível (FR-019).
- A pontuação parcial da spec 006 continua no aplicativo do aluno; o painel da equipe passa a
  mostrar os pontos oficiais do servidor quando disponíveis.
- Premiação e certificados ficam fora desta spec.
