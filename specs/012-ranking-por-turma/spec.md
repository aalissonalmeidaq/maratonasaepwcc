# Feature Specification: Ranking por turma

**Feature Branch**: `012-ranking-por-turma`
**Created**: 2026-11-03
**Status**: Draft
**Input**: User description: "Spec 012 — ranking por turma. Decisões já tomadas na spec 011
(Clarifications 2026-11-03 e docs/decisoes-e-pendencias.md §6.9): o ranking passa a ser por turma
e é apresentado dentro de cada turma; substitui o ranking por categoria da spec 007; o aluno vê só
o ranking da própria turma. Com ajustes de regras por turma (spec 011), equipes de turmas
diferentes podem ter máximos diferentes, por isso a comparação fica dentro da turma. Publicações
existentes da spec 007 são imutáveis (posições gravadas) e não mudam. Manter as garantias da spec
007: publicação versionada e auditada, estados parcial/provisório/definitivo, desempate, revisão
com prazo, sem nota individual da prova oficial nem dados pessoais no ranking. Considerar como
ficam a tela de ranking da coordenação, o ranking do aluno, o painel da turma (spec 004), o painel
inicial do aluno (posição) e da coordenação (pendências por categoria), premiação e relatórios."

**Rastreabilidade**: PRD RF14, RF16, HU05, HU06 (classificação, estados, desempate e revisão);
spec 004 (painel da turma), spec 007 (cálculo oficial, publicação e revisão), spec 008 (painéis e
relatórios), spec 011 (regras e encontros por turma; decisões desta spec). Constituição V, VI, VII,
IX, X.

**Divergência registrada**: o PRD descreve o ranking e o desempate "por categoria" (RF14, HU05,
risco "múltiplos cursos incomparáveis"). Pela governança da constituição, vale a instrução mais
recente do usuário (spec 011, 2026-11-03): a classificação passa a ser por turma. A categoria
continua como atributo da turma e das equipes (regras de formação de equipe da spec 003), mas não
define mais o ranking.

## Clarifications

### Decisões herdadas da spec 011 (2026-11-03)

- O ranking é por turma e é apresentado dentro de cada turma.
- Substitui o ranking por categoria da spec 007.
- O aluno vê só o ranking da própria turma.

### Session 2026-11-03

- Q: Com o ranking por turma, a premiação vale para quem? → A: Para cada turma: 1º, 2º e 3º
  lugares de cada turma recebem os prêmios configurados na edição, a partir da publicação
  definitiva da turma.
- Q: Os alunos continuam vendo as publicações antigas por categoria? → A: Não; só a coordenação as
  lê (auditoria e revisões já abertas); o aluno vê apenas o ranking da própria turma.
- Q: Empate persistente numa posição premiada da definitiva: como fica a premiação? → A: A
  coordenação decide: a posição aparece compartilhada com "empate a decidir" e a coordenação
  registra a decisão com justificativa, auditada.
- Q: A coordenação publica várias turmas de uma vez ou uma por vez? → A: Várias de uma vez: marca
  as turmas e publica todas no mesmo estado com uma justificativa única; cada turma vira uma
  versão própria; na definitiva, só as turmas com pendência são recusadas, as demais publicam.
- Q: Docentes e mentores veem as equipes premiadas das turmas em que atuam? → A: Sim, inclusive
  antes da definitiva: com publicação provisória veem a premiação marcada como "provisório".

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Coordenação publica o ranking de cada turma (Priority: P1)

A coordenação abre o ranking, escolhe a turma e vê a classificação calculada das equipes daquela
turma, com as pendências que impedem fechar o resultado. Publica como parcial, provisório ou
definitivo; cada publicação congela uma versão com posições, totais e desempates aplicados, e
entra no histórico da turma. As regras de publicação da spec 007 continuam valendo, agora dentro
da turma.

**Why this priority**: sem a publicação por turma não há ranking para ninguém ver; as demais
histórias leem o que esta publica.

**Independent Test**: como coordenação, publicar o ranking parcial do 3º ano A; conferir que só
equipes dessa turma aparecem, com as posições calculadas pelas regras da turma; tentar publicar o
3º ano A como definitivo com prova pendente na turma e ser recusado com a lista das pendências;
publicar o 3º ano B sem ser afetado pelas pendências do 3º ano A.

**Acceptance Scenarios**:

1. **Given** pontos calculados de uma turma, **When** a coordenação publica o ranking parcial
   dessa turma, **Then** a versão guarda as posições e os totais só das equipes da turma, os
   desempates aplicados, o estado, a autoria e o horário do servidor.
2. **Given** equipes da turma empatadas no total, **When** o ranking é gerado, **Then** o
   desempate segue prática, depois questões/prova, depois presença (como na spec 007), e o empate
   persistente gera posição compartilhada.
3. **Given** componente pendente, ocorrência não decidida ou pedido de revisão aberto em alguma
   equipe da turma, **When** a coordenação tenta publicar a turma como definitiva, **Then** o
   servidor recusa e lista as pendências daquela turma.
4. **Given** pendências só no 3º ano A, **When** a coordenação publica o 3º ano B como definitivo,
   **Then** a publicação é aceita.
5. **Given** uma versão já publicada da turma, **When** a coordenação publica outra, **Then** a
   nova exige justificativa e a anterior continua no histórico da turma.
6. **Given** a lista de turmas da edição, **When** a coordenação abre o ranking, **Then** vê para
   cada turma o estado da última publicação (ou "não publicado") e o número de pendências.
7. **Given** várias turmas marcadas, **When** a coordenação publica todas como parciais com uma
   justificativa, **Then** cada turma ganha a própria versão parcial, com a mesma justificativa.
8. **Given** três turmas marcadas para a definitiva e uma delas com pendência, **When** a
   coordenação publica, **Then** as duas sem pendência são publicadas e a outra é recusada com a
   lista das pendências dela; o resultado mostra o que foi publicado e o que foi recusado.

---

### User Story 2 - Aluno vê o ranking da própria turma (Priority: P1)

O aluno abre o ranking e vê a última versão publicada da própria turma: posições e totais das
equipes da turma, com o estado, o detalhe por componente só da própria equipe e nenhuma nota
individual. Não vê ranking de outras turmas. O painel inicial mostra a posição da equipe na turma.

**Why this priority**: é o resultado visível da maratona para quem compete (HU05).

**Independent Test**: como aluna do 3º ano A, abrir o ranking depois da publicação parcial da
turma e ver só equipes do 3º ano A, com "Parcial" e o detalhe da própria equipe; conferir que o
painel inicial mostra a mesma posição; conferir que nenhuma equipe do 3º ano B aparece.

**Acceptance Scenarios**:

1. **Given** uma publicação da turma do aluno, **When** ele abre o ranking, **Then** vê a versão
   mais recente da própria turma, com estado, posições e totais, e o detalhe por componente só da
   própria equipe.
2. **Given** turmas da mesma categoria, **When** o aluno abre o ranking, **Then** não vê equipes
   nem posições de outra turma.
3. **Given** a turma ainda sem publicação, **When** o aluno abre o ranking ou o painel inicial,
   **Then** vê "Ranking da turma ainda não publicado" e continua vendo a prévia dos pontos da
   própria equipe com o selo "Prévia — não oficial".
4. **Given** uma publicação provisória da turma dentro do prazo de revisão, **When** o aluno
   abre o ranking ou a pontuação, **Then** pode pedir revisão dos pontos da própria equipe, como
   na spec 007.
5. **Given** a equipe empatada, **When** o aluno vê a posição, **Then** ela aparece como
   compartilhada ("1º lugar (empatada)").

---

### User Story 3 - Painéis e turma mostram o ranking da turma (Priority: P2)

O painel da turma (spec 004) passa a mostrar a classificação publicada daquela turma; o docente e
o mentor veem o ranking das turmas em que atuam; o painel inicial da coordenação mostra as
pendências e a última publicação por turma, no lugar de por categoria.

**Why this priority**: mantém coerentes as telas que já mostravam o ranking por categoria; depende
das histórias 1 e 2.

**Independent Test**: como docente do 3º ano A, abrir o painel da turma e ver a classificação
publicada do 3º ano A; como coordenação, abrir o início e ver pendências e estado por turma;
conferir que os números batem com a tela de ranking.

**Acceptance Scenarios**:

1. **Given** uma publicação da turma, **When** docente, mentor ou coordenação abrem o painel da
   turma, **Then** veem a classificação publicada da turma, sem nota individual.
2. **Given** um docente ou mentor, **When** abrem o ranking, **Then** veem apenas as turmas em que
   atuam; a coordenação vê todas.
3. **Given** a coordenação no início, **When** o painel carrega, **Then** as pendências dos
   encontros realizados e a última publicação aparecem por turma, com os mesmos números da tela de
   ranking.
4. **Given** o relatório de pontos, **When** a coordenação ou o docente o exportam, **Then** cada
   equipe aparece com a turma e, quando houver, a posição da última publicação da turma.

---

### User Story 4 - Histórico por categoria preservado (Priority: P3)

As publicações por categoria feitas antes desta spec continuam no histórico, imutáveis, para
consulta e auditoria. Pedidos de revisão abertos sobre elas seguem o fluxo da spec 007 até serem
respondidos.

**Why this priority**: garante rastreabilidade (constituição IX) sem bloquear o novo fluxo.

**Independent Test**: com uma publicação por categoria já existente, conferir que a coordenação a
encontra no histórico com posições e totais originais; responder um pedido de revisão aberto
sobre ela; conferir que não é possível criar nova publicação por categoria.

**Acceptance Scenarios**:

1. **Given** publicações por categoria anteriores, **When** a coordenação abre o histórico,
   **Then** as vê com posições, totais, estado e autoria originais, identificadas como "por
   categoria (anterior)".
2. **Given** um pedido de revisão aberto sobre uma publicação por categoria, **When** a
   coordenação responde, **Then** o fluxo da spec 007 continua valendo.
3. **Given** a coordenação, **When** tenta criar uma publicação por categoria, **Then** o servidor
   recusa.

### Edge Cases

- Turma sem equipes ativas: aparece na lista sem ranking; a publicação é recusada com o motivo.
- Equipe sem nenhum lançamento: aparece na classificação da turma com total 0 e marcada como
  pendente (como na spec 007).
- Equipe que muda de turma depois de publicada: a versão publicada não muda; a próxima publicação
  usa a composição atual de cada turma.
- Encontro fora da turma (spec 011): não entra no total nem nas pendências daquela turma.
- Turmas com pontuação máxima diferente: nunca são comparadas entre si em nenhuma tela.
- Empate persistente em posição premiada: premiação "a definir" até a decisão da coordenação;
  nova publicação definitiva da turma (com justificativa) anula a decisão anterior, que fica no
  histórico.
- Edição encerrada: rankings só podem ser lidos.
- Publicação simultânea da mesma turma por duas pessoas: uma versão é criada e a outra recebe
  aviso para recarregar.
- Aplicação offline: leitura do que já foi carregado; publicar ou pedir revisão exige conexão.

## Requirements _(mandatory)_

### Functional Requirements

**Publicação por turma (RF16, HU05)**

- **FR-001**: A coordenação MUST gerar e publicar o ranking de cada turma da edição nos estados
  parcial, provisório ou definitivo; cada publicação MUST criar uma versão imutável da turma com
  posições, totais, desempates aplicados, estado, autoria e horário do servidor, e MUST ser
  auditada.
- **FR-002**: A classificação MUST considerar só as equipes ativas da turma, com os totais
  calculados pelas regras de cada encontro para a turma (spec 011).
- **FR-003**: O desempate MUST seguir o da spec 007 (entrega prática, depois questões/prova oficial,
  depois presença; empate persistente gera posição compartilhada), aplicado dentro da turma.
- **FR-004**: A publicação definitiva de uma turma MUST ser recusada enquanto houver, nas equipes
  da turma, componente pendente, ocorrência não decidida ou pedido de revisão aberto; pendências
  de outras turmas MUST NOT impedir.
- **FR-005**: A segunda publicação de uma turma em diante MUST exigir justificativa; versões
  anteriores permanecem no histórico da turma.
- **FR-006**: Só a coordenação MUST poder publicar; publicações simultâneas da mesma turma MUST
  resultar em uma versão e uma recusa com aviso para recarregar.
- **FR-007**: A tela de ranking da coordenação MUST listar as turmas da edição com o estado da
  última publicação (ou "não publicado") e o número de pendências **dos encontros realizados**
  (os mesmos números do painel inicial, SC-006), e permitir abrir cada turma. A recusa da
  definitiva (FR-004) considera todos os encontros e lista o que falta.
- **FR-007a**: A coordenação MUST poder marcar várias turmas e publicá-las de uma vez no mesmo
  estado, com uma justificativa única (exigida se alguma delas já tiver publicação). Cada turma
  MUST gerar a própria versão, de forma independente: uma turma recusada (pendência na
  definitiva, turma sem equipes ou versão desatualizada) MUST NOT impedir as outras; a resposta
  MUST informar, por turma, se foi publicada ou recusada e o motivo.

**Visibilidade (HU05, constituição VI)**

- **FR-008**: O aluno MUST ver apenas a versão publicada mais recente da própria turma, com o
  estado e o detalhe por componente só da própria equipe; MUST NOT ver ranking de outras turmas.
- **FR-009**: Docentes e mentores MUST ver o ranking publicado só das turmas em que atuam; a
  coordenação vê todas as turmas da edição.
- **FR-010**: Nenhum ranking MUST exibir nota individual da prova oficial, ocorrências ou dados
  pessoais além do nome da equipe.
- **FR-011**: Sem publicação da turma, o aluno MUST ver "Ranking da turma ainda não publicado" e a
  prévia dos pontos da própria equipe com o selo "Prévia — não oficial" (como na spec 007).

**Revisão (HU06)**

- **FR-012**: A revisão dos pontos MUST continuar como na spec 007, contando o prazo a partir da
  publicação **provisória da turma**, pelo prazo das regras vigentes da turma (spec 011);
  publicação parcial não abre prazo e a definitiva é final.
- **FR-012a**: O aviso de publicação no aplicativo (spec 007, FR-026) MUST ir só para os
  integrantes das equipes da turma publicada; numa publicação em lote, cada turma avisa as
  próprias equipes.

**Telas que já mostravam o ranking**

- **FR-013**: O painel da turma (spec 004) MUST mostrar a classificação publicada da turma.
- **FR-014**: O painel inicial do aluno MUST mostrar a posição da equipe na última publicação da
  turma.
- **FR-015**: O painel inicial da coordenação MUST mostrar pendências dos encontros realizados e a
  última publicação por turma, no lugar de por categoria.
- **FR-016**: O relatório de pontos MUST trazer a turma de cada equipe e a posição da última
  publicação da turma, quando houver.

**Histórico anterior**

- **FR-017**: Publicações por categoria existentes MUST permanecer imutáveis e consultáveis só pela
  coordenação, identificadas como "por categoria (anterior)"; alunos, docentes e mentores MUST NOT
  lê-las; novas publicações por categoria MUST ser recusadas; pedidos de revisão abertos sobre
  elas seguem o fluxo da spec 007 (o integrante da equipe vê o próprio pedido e a resposta).

**Premiação**

- **FR-018**: A premiação configurada da edição MUST valer para cada turma: as equipes nas
  posições premiadas da **publicação definitiva** de cada turma são as premiadas daquela turma.
  A situação segue a **última publicação** da turma: definitiva → premiados; provisória →
  "provisório", sem anunciar premiados como finais; parcial ou nenhuma → "a definir".
- **FR-018a**: A coordenação MUST ver na tela de premiação, por turma, os prêmios configurados e
  as equipes premiadas. Docentes e mentores MUST ver a premiação só das turmas em que atuam: a
  final, depois da definitiva, e a provisória (pelas posições da publicação provisória mais
  recente), marcada como "provisório — não final". Alunos MUST ver só os premiados da própria
  turma e só depois da definitiva.
- **FR-018b**: Empate persistente numa posição premiada da publicação definitiva MUST aparecer
  como posição compartilhada com o aviso "empate a decidir"; a coordenação MUST registrar a
  decisão da premiação dessa posição com justificativa (auditada, com autoria e horário do
  servidor); enquanto não decidir, a premiação da turma fica "a definir". A decisão não altera
  as posições publicadas.

**Transversais**

- **FR-019**: Telas MUST estar em português do Brasil, funcionar em celular e desktop e ser
  operáveis por teclado; estados comunicados por texto além de cor.
- **FR-020**: Toda autorização MUST ser aplicada no servidor e validada com perfis e vínculos
  distintos.

### Key Entities _(include if feature involves data)_

- **Premiação da edição**: lista de prêmios por posição (já existente, valores a validar),
  aplicada a cada turma.
- **Decisão de premiação em empate**: turma, publicação definitiva, posição, decisão,
  justificativa, autoria e horário do servidor.

- **Publicação do ranking da turma**: turma, estado (parcial, provisório, definitivo), número da
  versão na turma, posições e totais congelados por equipe, desempates aplicados, justificativa,
  autoria, horário do servidor.
- **Publicação por categoria (anterior)**: publicações da spec 007, imutáveis, só para consulta e
  revisões já abertas.
- **Turma**: já existente (spec 010); agrupa as equipes comparadas entre si e tem as próprias
  regras (spec 011).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em 100% das publicações, só equipes da própria turma aparecem na classificação.
- **SC-002**: Nenhum aluno consegue ver posições ou totais de equipes de outra turma, verificado
  contra o banco com alunos de turmas diferentes.
- **SC-003**: A coordenação publica o ranking de uma turma, ou de várias turmas marcadas, em até 3
  interações a partir da tela de ranking (além de marcar as turmas).
- **SC-004**: Pendências de uma turma nunca bloqueiam a publicação definitiva de outra.
- **SC-005**: 100% das publicações por categoria anteriores continuam consultáveis com os valores
  originais depois da mudança.
- **SC-006**: Os números do painel inicial da coordenação, do painel da turma e da tela de ranking
  coincidem para a mesma turma.
- **SC-007**: As equipes premiadas de cada turma coincidem com as posições da publicação definitiva
  da turma em 100% dos casos.

## Assumptions

- A categoria continua existindo como atributo da turma e da equipe (formação de equipes, spec 003)
  e nos filtros de relatório; só deixa de definir a classificação.
- O cálculo oficial dos pontos (spec 007, com as regras por encontro da spec 011) não muda; muda
  só o conjunto de equipes comparadas e a unidade de publicação.
- Mentores seguem sem permissão de publicar; o vínculo do mentor ao curso dá leitura das turmas
  do curso.
- Pedidos de revisão continuam ligados à publicação que abriu o prazo; os da spec 007 sobre
  publicações por categoria são respondidos normalmente.
- Valores, quantidade e condições dos prêmios continuam como configuração a validar (pendência já
  registrada); esta spec não define prêmios.
