# Feature Specification: Regras da edição e das turmas

**Feature Branch**: `011-regras-edicao`
**Created**: 2026-11-03
**Status**: Draft
**Input**: User description: "Regras da edição e das turmas (continuação da spec 010; RF02, PRD §9
'alterações posteriores geram nova versão e justificativa' e §12 'parametrização controlada e
versão aprovada'): a coordenação altera os valores das regras da edição pelo aplicativo, com
versões e justificativa; cada turma herda as regras da edição e pode ajustar valores próprios."
Complemento do usuário em 2026-11-03: "os critérios para as avaliações e as pontuações por
encontro são definidos pela coordenação e/ou mentor; a pontuação máxima é a somatória máxima de
pontos por encontro multiplicada pelo número de encontros previsto para a edição e para cada
turma; o ranking deve ser dentro de cada turma e apresentado dentro de cada turma; o aluno vê o
ranking de sua turma."

**Rastreabilidade**: PRD RF02 (a coordenação configura critérios), seção 9 (versão e
justificativa nas alterações), seção 12 (parametrização controlada e versão aprovada), RF14
(cálculo); spec 001 (contrato `RegrasDaEdicao`), spec 006 (rubricas e avaliações), spec 007
(cálculo oficial), spec 009 (resumo do regulamento), spec 010 (turmas na edição, mentor por
curso). Constituição V, VI, VII, VIII, X.

**Divisão de escopo**: o ranking por turma (que substitui o ranking por categoria da spec 007)
fica para a **spec 012**. Esta spec cuida das regras: versões da edição, regras próprias da turma
(inclusive critérios), encontros da turma, pontuação máxima e a versão usada em cada encontro.

## Clarifications

### Session 2026-11-03

- Q: Depois de ativada, a edição ainda aceita mudança de regras? → A: Sim, com nova versão e
  justificativa auditada; edição encerrada não muda. (spec 010)
- Q: Quando as regras mudam com a edição ativa, os encontros passados são recalculados? → A: Não;
  cada encontro usa as regras vigentes no seu início (data e horário). (spec 010)
- Q: Quem dá o nome de cada versão nova das regras da edição? → A: O sistema sugere (anterior com
  o último número incrementado) e a coordenação pode trocar; o nome é único na edição. (spec 010)
- Q: Quem define critérios e pontuações? → A: A coordenação (edição e qualquer turma) e o mentor
  (turmas do curso a que está vinculado).
- Q: Definir critérios inclui criar, remover e renomear critérios? → A: Sim. Substitui a decisão
  da spec 010 de mudar só valores.
- Q: A turma pode ter menos encontros que a edição? → A: Sim; a turma participa de um subconjunto
  dos encontros da edição, e a pontuação máxima dela usa os encontros dela.
- Q: A turma guarda só o que ajustou? → A: Sim; herda o resto da edição, inclusive mudanças
  posteriores da edição. (spec 010)
- Q: A spec fica única ou dividida? → A: Dividida; o ranking por turma vai para a spec 012.
- Q: O mentor pode ajustar todos os grupos de regras da turma? → A: Não; o mentor ajusta presença,
  participação, questões, entrega (critérios, pontos e atraso) e apresentação; penalidades e prazos
  ficam só com a coordenação; a prova oficial segue os valores do PRD (HU04) e não é ajustada.
- Pedido do usuário (2026-11-03): reorganizar o menu em categorias para facilitar o uso da
  plataforma; incluído nesta spec como User Story 6.
- Q: Como devem ficar as categorias do menu da coordenação? → A: Por fluxo da edição: Preparação
  (Edições, Cursos e turmas, Organização, Equipes, Encontros), Durante os encontros (Presença,
  Avaliações, Prova oficial, Ocorrências), Resultado (Ranking, Revisões, Premiação) e Comunicação
  (Comunicados, Relatórios); grupos sempre abertos.
- Decisões registradas para a spec 012: o ranking é por turma e apresentado dentro de cada turma;
  substitui o ranking por categoria; o aluno vê só o ranking da própria turma.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Regras da edição com versões (Priority: P1)

A coordenação define as regras da edição, que valem para todas as turmas que não as ajustaram:
critérios das rubricas (participação, entrega, apresentação) com os pontos máximos, pontos de
presença e questões, faixas e limite de atraso, tipos de penalidade e teto de
descontos, prazos de manifestação e revisão e a quantidade de encontros. Pode alterar valores e
também criar, remover e renomear critérios, faixas e tipos de penalidade. A prova oficial segue os
valores do PRD (HU04: realização confirmada vale 5 por aluno; nota confirmada ≥ 70 agrega 10) e
não é alterada por esta funcionalidade. Cada gravação gera uma versão com nome, justificativa e
horário a partir do qual vale.

**Why this priority**: os números do piloto estão "a confirmar" e hoje só mudam pelo banco, sem
rastro.

**Independent Test**: numa edição em preparação, acrescentar um critério à rubrica da entrega e
mudar os pontos de outro, com justificativa; conferir a versão nova no histórico, a anterior
preservada e o resumo do regulamento com os critérios novos.

**Acceptance Scenarios**:

1. **Given** a coordenação da edição, **When** altera valores ou critérios com justificativa de
   pelo menos 10 caracteres e confirma o nome sugerido, **Then** a edição passa a ter uma versão
   nova e a anterior continua consultável com autor, horário e justificativa.
2. **Given** um critério criado, **When** grava, **Then** ele exige nome (1 a 80 caracteres) e
   pontuação máxima maior que zero, e o nome não se repete na mesma rubrica.
3. **Given** um valor inválido (negativo, faixas de atraso fora de ordem ou acima do limite, rubrica
   sem nenhum critério), **When** grava, **Then** é recusado com a
   mensagem do campo.
4. **Given** o critério usado para descontar atraso, **When** se tenta removê-lo, **Then** é
   recusado com a orientação de escolher outro critério de atraso antes.
5. **Given** o mesmo envio repetido, **When** o servidor responde, **Then** não há versão nova.
6. **Given** um nome de versão já usado na edição, **When** grava, **Then** é recusado.
7. **Given** duas pessoas que abriram as regras na mesma versão, **When** a segunda grava depois,
   **Then** é recusada como desatualizada, com a orientação de recarregar.
8. **Given** quantidade de encontros menor que o número de encontros já cadastrados, **When**
   grava, **Then** é recusado.
9. **Given** edição encerrada, ou pessoa sem coordenação da edição, **When** tenta gravar,
   **Then** é recusado.

---

### User Story 2 - Regras próprias da turma (Priority: P1)

A coordenação, em qualquer turma, e o mentor, nas turmas do curso a que está vinculado, ajustam as
regras de uma turma por grupo: o mentor ajusta presença, participação, questões, entrega
(critérios, pontos e atraso) e apresentação; a coordenação ajusta esses grupos e também
penalidades e prazos. A prova oficial não é ajustada por turma. No grupo ajustado, a turma pode
substituir os valores e os critérios. Os
grupos não ajustados continuam herdados da edição, inclusive quando a edição muda depois. Cada
gravação tem justificativa e vale a partir do horário da gravação.

**Why this priority**: o usuário definiu que critérios e pontuações são da coordenação e/ou do
mentor, por turma; com o ranking dentro de cada turma (spec 012), turmas diferentes não competem
entre si.

**Independent Test**: como mentor do curso, criar um critério próprio na rubrica de apresentação
da turma A; conferir que a turma A usa a rubrica própria, a turma B usa a da edição, e que uma
mudança posterior na rubrica de entrega da edição chega à turma A.

**Acceptance Scenarios**:

1. **Given** o mentor vinculado ao curso da turma A, **When** ajusta um grupo das regras da turma A
   com justificativa, **Then** a turma A passa a usar o grupo ajustado a partir da gravação.
2. **Given** um mentor de outro curso, um docente ou um estudante, **When** tenta ajustar as regras
   da turma A, mesmo chamando o servidor diretamente, **Then** é recusado.
3. **Given** a coordenação da edição, **When** ajusta qualquer turma, **Then** vale como para o
   mentor.
4. **Given** uma turma com o grupo "entrega" ajustado, **When** a edição muda o grupo
   "apresentação", **Then** a turma recebe a mudança da apresentação e mantém a entrega própria.
5. **Given** uma turma com um grupo ajustado, **When** a coordenação ou o mentor desfaz o ajuste
   com justificativa, **Then** o grupo volta a ser herdado da edição a partir da gravação.
6. **Given** um ajuste de turma inválido (mesmas validações da edição), **When** grava, **Then** é
   recusado com a mensagem do campo.
7. **Given** casas decimais e quantidade de encontros da edição, **When** se tenta ajustá-las por
   turma, **Then** é recusado (são da edição; os encontros da turma são definidos na US3).
8. **Given** o mentor da turma, **When** tenta ajustar penalidades ou prazos, **Then** é recusado;
   **When** a coordenação ajusta, **Then** vale.
9. **Given** qualquer pessoa, **When** tenta alterar a prova oficial na edição ou na turma, **Then**
   é recusado.

---

### User Story 3 - Encontros da turma e pontuação máxima (Priority: P1)

A coordenação define de quais encontros da edição cada turma participa (por padrão, todos). A
pontuação máxima da turma é a soma dos pontos máximos de cada encontro de que ela participa,
pelas regras vigentes da turma naquele encontro; com as mesmas regras em todos os encontros, é a
soma máxima por encontro multiplicada pelo número de encontros da turma. A pontuação máxima
aparece junto da pontuação da equipe e nos painéis da turma.

**Why this priority**: a pontuação máxima é a referência para estudantes e docentes acompanharem o
desempenho; turmas que começaram depois não podem ser medidas por encontros de que não participam.

**Independent Test**: tirar o encontro 1 da turma B; conferir que a turma B mostra pontuação máxima
de 3 encontros e a turma A de 4, e que o encontro 1 não aparece para a turma B.

**Acceptance Scenarios**:

1. **Given** uma turma nova na edição, **When** é vinculada, **Then** participa de todos os
   encontros da edição.
2. **Given** a coordenação, **When** tira um encontro sem lançamentos da turma, **Then** ele deixa
   de aparecer e de contar para a turma.
3. **Given** um encontro com lançamentos da turma (presença, avaliação, submissão, ocorrência),
   **When** a coordenação tenta tirá-lo da turma, **Then** é recusado com o que impede.
4. **Given** as regras vigentes da turma, **When** a equipe ou o docente veem a pontuação, **Then**
   veem também a pontuação máxima da turma calculada pela regra desta história.
5. **Given** um encontro da edição criado depois, **When** é cadastrado, **Then** entra em todas as
   turmas da edição, e a coordenação pode tirá-lo de turmas específicas.

---

### User Story 4 - Cada encontro com as regras vigentes no seu início (Priority: P1)

Os pontos de cada encontro de uma turma são calculados com a versão da edição vigente no início do
encontro, combinada com os ajustes da turma vigentes no mesmo instante. Avaliações, rubricas e
pontuações daquele encontro usam essas regras, inclusive os critérios. Mudanças posteriores valem
só para encontros que começam depois.

**Why this priority**: sem isso, mudar critérios no meio do ciclo invalidaria avaliações já
lançadas e mudaria pontuações já vistas.

**Independent Test**: com o encontro 1 realizado e o 2 por começar, acrescentar um critério à
rubrica da entrega da turma A; conferir que a avaliação do encontro 1 mantém os critérios antigos e
a do encontro 2 mostra o novo, com o cálculo do servidor igual à pontuação parcial do aplicativo.

**Acceptance Scenarios**:

1. **Given** um encontro que começou antes de uma mudança, **When** a pontuação ou o formulário de
   avaliação são abertos, **Then** usam as regras anteriores.
2. **Given** um encontro que começa depois da mudança, **When** são abertos, **Then** usam as
   regras novas, com os critérios novos.
3. **Given** a pontuação parcial mostrada no aplicativo, **When** comparada com o cálculo oficial,
   **Then** coincide encontro a encontro.
4. **Given** encontro sem horário de início, **When** se decide a versão, **Then** vale o início do
   dia do encontro.

---

### User Story 5 - Ver as regras vigentes e o histórico (Priority: P2)

Estudantes e docentes veem as regras vigentes da sua turma (com a indicação dos grupos ajustados
para a turma) e a pontuação máxima; a coordenação e o mentor veem o histórico de versões da edição
e dos ajustes da turma.

**Why this priority**: transparência do regulamento e rastreabilidade.

**Independent Test**: como aluna da turma A com ajuste, abrir o regulamento e ver os critérios da
turma com "definido para a sua turma"; como coordenação, ver o histórico.

**Acceptance Scenarios**:

1. **Given** uma estudante, **When** abre o resumo do regulamento, **Then** vê as regras vigentes
   para a sua turma, os grupos ajustados e a pontuação máxima.
2. **Given** a coordenação ou o mentor da turma, **When** abre o histórico, **Then** vê cada versão
   da edição e cada ajuste da turma com nome ou horário, autor e justificativa.
3. **Given** uma pessoa sem vínculo com a edição, **When** tenta ler regras ou histórico, **Then**
   o servidor não devolve nada.

---

### User Story 6 - Menu organizado em categorias (Priority: P2)

O menu de cada área passa a mostrar os itens agrupados em categorias com título, na barra lateral
e no menu do celular, para a pessoa achar as funções mais rápido. Nenhuma função muda de endereço
nem de permissão. A tela inicial de cada área é um painel de indicadores, não repete o menu como
atalhos (revisão pedida pelo usuário em 2026-11-03).

Categorias por área (os itens existentes, sem itens novos):

- **Estudante:** Início · **Minha participação** (Minha equipe, Minha turma, Encontros, Desafios e
  entregas) · **Resultados** (Pontuação, Ranking, Ocorrências, Revisões) · **Informações**
  (Regulamento e avisos).
- **Docente e mentor:** Início · **Turmas e atividades** (Minhas turmas, Atividades, Encontros) ·
  **Lançamentos** (Presença, Avaliações, Pontos da turma, Ocorrências) · **Comunicação** (Comunicados,
  Relatórios).
- **Coordenação:** Início · **Preparação** (Edições, Cursos e turmas, Organização, Equipes,
  Encontros) · **Durante os encontros** (Presença, Avaliações, Prova oficial, Ocorrências) ·
  **Resultado** (Ranking, Revisões, Premiação) · **Comunicação** (Comunicados, Relatórios).

**Why this priority**: a coordenação já tem 16 itens numa lista única; com as telas de regras, o
uso fica mais difícil sem agrupamento.

**Independent Test**: como coordenação, abrir o menu no desktop e no celular e conferir as
categorias com títulos, a ordem dos itens e o item atual destacado; navegar só pelo teclado.

**Acceptance Scenarios**:

1. **Given** qualquer área, **When** o menu é aberto, **Then** os itens aparecem nas categorias da
   área, com o título da categoria antes dos itens e "Início" fora das categorias, no topo.
2. **Given** um leitor de tela, **When** percorre o menu, **Then** cada categoria é anunciada como um
   grupo com o seu título, e o item da página atual é indicado.
3. **Given** a navegação por teclado, **When** a pessoa usa Tab, **Then** passa pelos itens na ordem
   das categorias, sem armadilhas de foco.
4. **Given** a tela inicial da área, **When** é aberta, **Then** mostra no topo os indicadores
   principais do perfil e, abaixo, o que pede ação, sem repetir os itens do menu como atalhos.
5. **Given** o celular a partir de 360 px, **When** o menu é aberto, **Then** as categorias aparecem
   sem rolagem horizontal.

---

### Edge Cases

- Mudança gravada durante um encontro em andamento: o encontro mantém as regras do seu início.
- Data de um encontro alterada depois de uma mudança: as regras seguem a nova data de início.
- Critério renomeado: avaliações de encontros anteriores mantêm o nome antigo; as novas usam o
  nome novo.
- Critério removido: avaliações já lançadas em encontros anteriores continuam valendo com ele.
- Tipo de penalidade removido: ocorrências já registradas mantêm o tipo e os pontos de quando foram
  registradas.
- Mentor desvinculado do curso: deixa de ajustar as regras das turmas; os ajustes que fez continuam
  valendo.
- Turma desvinculada: os ajustes e os encontros dela saem junto com a turma na edição.
- Versão inicial: as regras de criação da edição são a primeira versão e valem para qualquer
  encontro anterior à primeira mudança.
- Nome sugerido sem número no fim: recebe o sufixo `.1`.
- Demonstração: regras, ajustes e histórico com dados fictícios e escrita desabilitada.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A coordenação da edição MUST alterar as regras da edição (valores, critérios, faixas
  e tipos de penalidade), em preparação ou ativa; regras inválidas MUST ser recusadas com mensagem
  por campo.
- **FR-002**: Toda alteração efetiva das regras da edição MUST gerar uma versão com nome único na
  edição (sugerido e editável), horário a partir do qual vale, autor e justificativa de pelo menos
  10 caracteres; versões anteriores MUST continuar consultáveis.
- **FR-003**: Gravações simultâneas sobre a mesma versão MUST resultar em uma versão nova e uma
  recusa por desatualização; o mesmo envio repetido MUST NOT gerar versão nova.
- **FR-004**: O mentor MUST ajustar, nas turmas do curso a que está vinculado, os grupos presença,
  participação, questões, entrega e apresentação; a coordenação MUST ajustar esses grupos e também
  penalidades e prazos em qualquer turma; outras pessoas MUST NOT.
- **FR-016**: A prova oficial MUST seguir os valores do PRD (HU04) e MUST NOT ser alterada, nem na
  edição nem por turma.
- **FR-005**: A turma MUST guardar só os grupos ajustados e herdar os demais da edição, inclusive
  mudanças posteriores; desfazer um ajuste MUST voltar a herdar o grupo.
- **FR-006**: Ajustes de turma MUST ter justificativa, valer a partir da gravação e ficar no
  histórico com autor e horário; casas decimais e quantidade de encontros MUST NOT ser ajustadas
  por turma.
- **FR-007**: Critérios MUST ter nome de 1 a 80 caracteres, único na rubrica, e pontuação máxima
  maior que zero; cada rubrica MUST ter ao menos um critério; o critério de atraso MUST existir na
  rubrica da entrega.
- **FR-008**: A coordenação MUST definir os encontros de que cada turma participa (padrão: todos);
  encontro com lançamentos da turma MUST NOT sair da turma.
- **FR-009**: A pontuação máxima da turma MUST ser a soma dos máximos de cada encontro de que ela
  participa, pelas regras vigentes da turma em cada encontro, e MUST aparecer junto da pontuação
  da equipe e nos painéis da turma.
- **FR-010**: Cada encontro de uma turma MUST usar a versão da edição vigente no seu início
  (sem horário, início do dia) combinada com os ajustes da turma vigentes no mesmo instante, no
  cálculo do servidor, na pontuação parcial do aplicativo e nos formulários de avaliação.
- **FR-011**: Mudanças de regras MUST NOT alterar a pontuação de encontros que começaram antes da
  gravação.
- **FR-012**: Estudantes e docentes MUST ver as regras vigentes da sua turma, os grupos ajustados e
  a pontuação máxima; coordenação e mentor MUST ver o histórico da edição e da turma.
- **FR-013**: Edição encerrada MUST NOT aceitar mudança de regras, ajustes nem encontros da turma.
- **FR-014**: Toda escrita de regras MUST passar pelo servidor, com auditoria; a interface MUST NOT
  dar a gravação como concluída antes da resposta.
- **FR-015**: Todas as telas MUST estar em português do Brasil, funcionar em celular e desktop e ser
  operáveis por teclado.
- **FR-017**: O menu de cada área MUST agrupar os itens nas categorias da User Story 6, com título
  visível e anunciado como grupo para leitores de tela; "Início" MUST ficar no topo, fora das
  categorias; endereços e permissões MUST NOT mudar.
- **FR-018** _(revisado em 2026-11-03)_: A tela inicial de cada área MUST funcionar como painel de
  indicadores (KPIs) com os números do servidor, cada um com o link para a página de origem quando
  houver, e MUST NOT repetir os itens do menu como atalhos. A navegação fica no menu.

### Key Entities _(include if feature involves data)_

- **Grupo de regras**: presença, participação, questões, entrega, apresentação, penalidades ou prazos;
  **grupos de avaliação** são os cinco primeiros (os que o mentor ajusta).

- **Versão das regras da edição**: conjunto completo das regras (valores e critérios), com nome
  único na edição, horário a partir do qual vale, autor e justificativa.
- **Ajuste de regras da turma**: grupos de regras próprios de uma turma na edição, com horário a
  partir do qual vale, autor (coordenação ou mentor) e justificativa; cada gravação guarda o
  conjunto completo de grupos ajustados da turma naquele momento.
- **Encontro da turma**: participação de uma turma num encontro da edição.
- **Regras vigentes de um encontro para uma turma**: versão da edição vigente no início do
  encontro, com os grupos ajustados da turma vigentes no mesmo instante.
- **Pontuação máxima da turma**: soma dos máximos dos encontros da turma pelas regras vigentes em
  cada um.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A coordenação ou o mentor alteram critérios ou pontos e gravam em até 3 minutos, sem
  acesso ao banco.
- **SC-002**: 100% das alterações de regras e ajustes de turma têm valor anterior, autor, horário e
  justificativa recuperáveis.
- **SC-003**: Depois de uma mudança de regras, 0 encontros que começaram antes dela têm pontuação
  ou critérios de avaliação alterados.
- **SC-004**: A pontuação parcial do aplicativo e o cálculo oficial coincidem em 100% dos casos de
  teste, inclusive com duas versões, critérios novos e ajustes de turma.
- **SC-005**: 100% das tentativas de ajuste por quem não tem permissão (inclusive mentor de outro
  curso) e em edição encerrada são recusadas no servidor.
- **SC-006**: A pontuação máxima mostrada para cada turma confere com a soma dos máximos dos
  encontros dela em 100% dos casos de teste.
- **SC-007**: 100% dos itens de menu de cada área aparecem em exatamente uma categoria (ou em
  "Início"), e nenhum endereço ou permissão muda (conferido por teste).

## Assumptions

- A pontuação máxima por encontro é a soma dos máximos de presença, participação, avaliação
  objetiva do encontro (questões ou prova oficial), entrega e apresentação, conforme as regras
  vigentes. Quando os encontros diferem (ex.: um tem prova oficial), a soma por encontro substitui o
  "máximo por encontro × número de encontros" informado pelo usuário. **[validar]**
- Os limites de proteção (até 20 encontros, até 4 casas decimais, até 20 critérios por rubrica) servem para evitar erro de digitação, não são regra do PRD. **[validar]**
- Docentes não alteram regras; lançam avaliações com os critérios vigentes da turma.
- O ranking por turma, que substitui o por categoria, é a spec 012; até lá o ranking publicado
  continua como na spec 007, agora com as regras vigentes de cada encontro.
- O regulamento oficial aprovado continua ausente; o resumo segue marcado como "em validação".
- A premiação continua fora: o PRD não define prêmios.
