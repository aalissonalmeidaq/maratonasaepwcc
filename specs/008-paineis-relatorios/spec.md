# Feature Specification: Painéis com dados reais e relatórios CSV

**Feature Branch**: `008-paineis-relatorios`
**Created**: 2026-11-02
**Status**: Draft
**Input**: User description: "Incremento 5 da Maratona SAEP: painéis e relatórios (RF17). Os
painéis iniciais de aluno, docente/mentor e coordenação, hoje com dados de demonstração, passam a
usar dados reais do servidor (pontos oficiais, ranking publicado, ocorrências, revisões, presença,
entregas, avisos e próximos encontros), respeitando o que cada perfil pode ver e sem notas
individuais da prova. A coordenação exporta relatórios em CSV (pontos por equipe e encontro,
presença, entregas, ocorrências e revisões) com controle de acesso no servidor e auditoria.
Numerar como spec 008."

**Rastreabilidade**: PRD RF17 (Should), RNF05, RNF06; specs 004, 006 e 007 (dados de origem).
Constituição V, VI, VII, VIII, X.

## Clarifications

### Session 2026-11-02

- Q: A nota individual da prova oficial entra em algum relatório CSV? → A: Não; fica só na tela
  da coordenação. Os relatórios trazem apenas os pontos da prova por equipe.
- Q: Docentes e mentores também exportam CSV? → A: Sim, limitados às turmas em que atuam e sem
  nota individual; a coordenação exporta toda a edição.
- Q: As pendências dos painéis contam todos os encontros ou só os já realizados? → A: Só os já
  realizados (data anterior a hoje em Brasília ou estado "realizado", não cancelados); a recusa
  do definitivo continua considerando todos.
- Q: Nos CSV de presença e entregas, como identificar cada estudante? → A: Só pelo nome, com
  equipe e turma; sem e-mail nem identificador interno.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Aluno vê o painel da equipe com dados reais (Priority: P1)

Ao entrar, o aluno vê um resumo da própria equipe: pontos até agora (prévia não oficial), posição
na última publicação do ranking da categoria, próximo encontro, próximo prazo de desafio ou lista
ainda aberto, ocorrências e pedidos de revisão da equipe que pedem atenção e os avisos não lidos.
Cada bloco leva à página completa correspondente.

**Why this priority**: é a tela mais acessada pelos estudantes; hoje, fora da demonstração, ela
mostra só atalhos (RF17).

**Independent Test**: com o seed local, entrar como aluna da Dupla Órbita depois de registrar
lançamentos e publicar o ranking; conferir que pontos, posição, próximo encontro e prazo aberto
batem com as páginas de pontuação, ranking, encontros e desafios; conferir que nada de outra
equipe aparece.

**Acceptance Scenarios**:

1. **Given** uma aluna em equipe ativa, **When** abre o painel, **Then** vê os pontos da prévia
   com o selo "Prévia — não oficial", a posição e o estado da última publicação da categoria (ou
   "Ranking ainda não publicado"), o próximo encontro e o prazo aberto mais próximo.
2. **Given** uma ocorrência da equipe aguardando manifestação ou uma decisão dentro do prazo de
   revisão, **When** a aluna abre o painel, **Then** vê o aviso com o prazo e o caminho para agir.
3. **Given** um aluno sem equipe, **When** abre o painel, **Then** vê o convite para formar
   equipe e os encontros, sem pontos nem posição.
4. **Given** qualquer aluno, **When** abre o painel, **Then** nenhuma nota individual da prova,
   pontos de outras equipes fora do ranking publicado ou ocorrências de outras equipes aparecem.

---

### User Story 2 - Docente ou mentor vê o painel das turmas (Priority: P1)

O docente ou mentor vê, para as turmas em que atua: o próximo encontro, o que falta registrar no
último encontro realizado (presença, participação, avaliações de entregas recebidas), entregas
recebidas ainda sem avaliação, ocorrências das turmas aguardando decisão e a situação da prévia
dos pontos por turma. Cada item leva à página onde a ação é feita.

**Why this priority**: orienta o trabalho semanal da equipe docente e reduz lançamentos
esquecidos que travam a publicação do ranking.

**Independent Test**: como docente da turma A, com uma entrega recebida e não avaliada e uma
presença não registrada, conferir que os dois itens aparecem e somem depois do registro; como
docente da turma B, não ver itens da turma A.

**Acceptance Scenarios**:

1. **Given** uma entrega recebida sem avaliação, **When** o docente abre o painel, **Then** vê o
   item com a equipe, o desafio e o caminho para avaliar.
2. **Given** um encontro realizado sem presença registrada para a turma, **When** o docente abre o
   painel, **Then** vê a pendência de presença daquele encontro.
3. **Given** o registro feito, **When** o docente volta ao painel, **Then** a pendência não aparece
   mais.
4. **Given** um docente de outra turma, **When** abre o painel, **Then** não vê nenhum item de
   turmas em que não atua.

---

### User Story 3 - Coordenação vê o painel da edição (Priority: P1)

A coordenação vê os indicadores da edição (cursos, turmas, equipes, estudantes ativos, encontros
realizados), as pendências que impedem o resultado definitivo (componentes sem registro, notas da
prova pendentes, ocorrências sem decisão, revisões abertas) e a situação do ranking de cada
categoria (última versão publicada e estado).

**Why this priority**: dá à coordenação a visão para conduzir a edição até o resultado definitivo.

**Independent Test**: com dados do seed e uma ocorrência registrada, conferir que os contadores do
painel batem com as listas das páginas de ocorrências, revisões, prova oficial e ranking.

**Acceptance Scenarios**:

1. **Given** a edição em andamento, **When** a coordenação abre o painel, **Then** vê os
   indicadores e as pendências por categoria, cada uma levando à página correspondente.
2. **Given** uma categoria sem publicação, **When** a coordenação abre o painel, **Then** a
   categoria aparece como "Ranking ainda não publicado".
3. **Given** uma pendência resolvida, **When** a coordenação volta ao painel, **Then** o contador
   diminui.

---

### User Story 4 - Coordenação e equipe docente exportam relatórios em CSV (Priority: P2)

A coordenação, ou o docente/mentor nas turmas em que atua, escolhe um relatório, aplica filtros
(categoria, turma, encontro) e baixa um arquivo CSV com os dados que já pode ver no sistema:
pontos por equipe e encontro, presença, entregas, ocorrências e pedidos de revisão. Cada
exportação fica registrada na auditoria.

**Why this priority**: atende à prestação de contas e ao acompanhamento fora do sistema (RF17),
mas depende de os dados já existirem nas histórias anteriores.

**Independent Test**: como coordenação, exportar "Pontos por equipe e encontro" da Categoria A e
conferir que o arquivo abre numa planilha com acentos corretos e os mesmos totais da prévia; como
docente da turma A, exportar só linhas da turma A e ser recusado ao pedir a turma B; como aluno,
ser recusado; conferir o registro na auditoria.

**Acceptance Scenarios**:

1. **Given** a coordenação na página de relatórios, **When** escolhe um relatório e os filtros e
   exporta, **Then** recebe um arquivo CSV com cabeçalho em português, uma linha por registro e
   os mesmos valores mostrados nas telas.
2. **Given** um aluno, ou um docente pedindo turma em que não atua, **When** tenta obter um
   relatório, **Then** o servidor recusa e nada é gerado.
3. **Given** um docente ou mentor, **When** exporta sem filtro de turma, **Then** o arquivo traz
   só as turmas em que ele atua.
4. **Given** uma exportação concluída, **When** a auditoria é consultada, **Then** há o registro
   com autor, horário, relatório e filtros.
5. **Given** filtros sem resultados, **When** quem exporta, **Then** recebe o arquivo só
   com o cabeçalho e o aviso "Nenhum registro para os filtros escolhidos".
6. **Given** a aplicação sem conexão, **When** alguém tenta exportar, **Then** a ação fica
   desabilitada com o motivo; nenhum arquivo é gerado a partir de cache.

### Edge Cases

- Edição encerrada: painéis e relatórios continuam disponíveis só para leitura.
- Encontro futuro ou cancelado: não gera pendência nos painéis; encontro realizado hoje passa a
  contar no dia seguinte, salvo se marcado como "realizado".
- Equipe sem lançamentos: aparece nos relatórios com zeros e marcada como pendente.
- Estudante que saiu da equipe: no relatório de presença, aparece com a equipe da qual era
  integrante na data do encontro (pelo histórico de integrantes) ou como "Sem equipe" se não estava
  em nenhuma.
- Nomes com vírgula, aspas ou quebra de linha: o CSV mantém o valor íntegro numa única célula.
- Valores decimais: separador decimal compatível com planilhas em português do Brasil.
- Muitos registros: a exportação de uma edição do piloto inteira termina sem cortar linhas.
- Modo demonstração: painéis com dados fictícios identificados; exportação desabilitada.

## Requirements _(mandatory)_

### Functional Requirements

**Painéis (US1 a US3)**

- **FR-001**: Os painéis iniciais de aluno, docente/mentor e coordenação MUST usar dados do
  servidor fora do modo demonstração; nenhum dado fictício aparece fora da demonstração.
- **FR-002**: O painel do aluno MUST mostrar a prévia dos pontos da própria equipe (com o selo
  "Prévia — não oficial"), a posição e o estado da última publicação da categoria, o próximo
  encontro, o prazo aberto mais próximo (desafio ou lista), as ações pendentes da equipe
  (manifestação no prazo, revisão possível) e a quantidade de avisos não lidos.
- **FR-003**: O painel do docente/mentor MUST mostrar, só para as turmas em que atua, o próximo
  encontro, pendências de registro dos encontros já realizados (presença, participação,
  avaliação de entregas recebidas), ocorrências das turmas sem decisão e a situação da prévia por
  turma.
- **FR-004**: O painel da coordenação MUST mostrar os indicadores da edição, as pendências por
  categoria (componentes sem registro, prova pendente, ocorrências sem decisão, revisões abertas)
  e a última publicação do ranking de cada categoria.
- **FR-004a**: As pendências dos painéis (FR-003 e FR-004) MUST considerar só encontros já
  realizados: data anterior a hoje no horário de Brasília ou estado "realizado", excluídos os
  cancelados. A lista completa, usada na recusa da publicação definitiva (spec 007), continua na
  página de ranking.
- **FR-005**: Cada contador ou item de painel MUST levar à página onde o dado é visto ou a ação é
  feita, e os números MUST ser iguais aos das páginas de origem.
- **FR-006**: Nenhum painel MUST mostrar nota individual da prova oficial, pontos de outras
  equipes fora do ranking publicado, nem ocorrências fora do que o perfil já pode ver (FR-010 da
  spec 007).

**Relatórios CSV (US4)**

- **FR-007**: A coordenação MUST poder exportar, para toda a edição, estes relatórios, filtrando por categoria, turma e
  encontro quando aplicável: (a) pontos por equipe e encontro, com componentes, descontos, total
  e pendências; (b) presença por estudante e encontro; (c) entregas por equipe e desafio, com
  versão, horário do servidor, atraso e situação da avaliação; (d) ocorrências, com tipo, estado,
  decisão e datas; (e) pedidos de revisão, com objeto, estado e resposta.
- **FR-008**: Os dados de cada relatório MUST ser gerados e autorizados no servidor. Alunos MUST
  ser recusados; docentes e mentores MUST receber só linhas das turmas em que atuam, e pedir uma
  turma em que não atuam MUST ser recusado.
- **FR-009**: Cada exportação MUST gerar registro de auditoria com autor, horário do servidor,
  relatório e filtros.
- **FR-010**: O arquivo MUST abrir corretamente em planilhas em português do Brasil: cabeçalho em
  português, acentos preservados, separador `;` e vírgula decimal, valores com vírgula, aspas ou
  quebra de linha íntegros, e datas no fuso de Brasília.
- **FR-011**: Os relatórios MUST NOT incluir dados que o perfil não vê nas telas, e nenhum
  relatório inclui a nota individual da prova oficial (nem para a coordenação): só os pontos da
  prova por equipe.
- **FR-011a**: Nos relatórios, estudantes MUST ser identificados só pelo nome, com a equipe e a
  turma; nenhum relatório inclui e-mail, identificador interno ou outro dado pessoal.
- **FR-012**: Exportar MUST exigir conexão; nenhum relatório é montado a partir de cache, e nada
  autenticado vai para o cache do aplicativo.
- **FR-013**: Docentes e mentores MUST poder exportar os mesmos relatórios de FR-007, limitados
  às turmas em que atuam e com os mesmos limites de visibilidade das telas (FR-019a e FR-010 da
  spec 007).

**Transversais**

- **FR-014**: Na edição encerrada, painéis e relatórios MUST continuar disponíveis só para
  leitura.
- **FR-015**: No modo demonstração, os painéis MUST usar só dados fictícios identificados, e a
  exportação MUST ficar desabilitada com o aviso de demonstração.

### Key Entities

- **Resumo do aluno**: equipe, prévia dos pontos, posição publicada, próximo encontro, prazo
  aberto, ações pendentes, avisos não lidos (derivado).
- **Resumo da equipe docente**: turmas, próximo encontro, pendências de registro, entregas sem
  avaliação, ocorrências sem decisão, situação por turma (derivado).
- **Resumo da coordenação**: indicadores, pendências por categoria, última publicação por
  categoria (derivado).
- **Relatório**: tipo, filtros, linhas, autor e horário da exportação (registro na auditoria).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, os números dos painéis são iguais aos das páginas de origem.
- **SC-002**: Em nenhum teste um painel expõe nota individual da prova a aluno ou docente, nenhum
  relatório CSV contém nota individual da prova, e nenhum expõe dados de outra equipe ou turma
  fora do permitido.
- **SC-003**: 100% das tentativas de exportação por aluno ou de turma em que o docente não atua
  são recusadas pelo servidor.
- **SC-004**: A coordenação ou o docente obtém um relatório em até 3 interações a partir do
  painel.
- **SC-005**: O CSV de pontos da edição do piloto abre numa planilha em português sem ajuste
  manual, com acentos e decimais corretos, em 100% dos testes.
- **SC-006**: Toda exportação concluída tem registro na auditoria.

## Assumptions

- Comunicados (RF06) ainda não existem; o painel do aluno mostra os avisos do aplicativo no lugar
  da lista de comunicados.
- Os painéis mostram os dados já calculados pelas specs 004, 006 e 007; nenhuma regra de cálculo
  nova é criada.
- "Prazo aberto mais próximo" considera desafios e listas publicados para a turma do aluno.
- Volume do piloto: uma edição, quatro encontros e dezenas de equipes; a exportação é síncrona.
- Datas no CSV no horário de Brasília (America/Sao_Paulo). **[validar]**
- Relatórios de acompanhamento pedagógico além dos listados (ex.: desempenho por capacidade) ficam
  fora desta spec.
