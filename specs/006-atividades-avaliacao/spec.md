# Feature Specification: Atividades, entregas, presença e avaliação dos encontros

**Feature Branch**: `006-atividades-avaliacao`
**Created**: 2026-10-30
**Status**: Implementada em 2026-10-30 (prova oficial, ranking e ocorrências seguem no Incremento 4)
**Input**: User description: "Incremento 3 da Maratona SAEP: atividades e acompanhamento dos
encontros. Questões preparatórias com submissão única por dupla (RF07–RF08); desafios/projetos
com envio de entrega e comprovante emitido só pelo servidor, arquivos em Storage privado
(RF09–RF10); registro de presença e participação pelo docente (RF11); avaliação por rubricas com
feedback (RF12). Usar as regras de pontuação já prontas no domínio TS; publicação de ranking,
prova oficial e ocorrências ficam para o Incremento 4. Numerada inicialmente 008 e renumerada para 006 a pedido do usuário em 2026-10-30 (003 já foi usado
por icones-svg)."

**Rastreabilidade**: PRD RF07, RF08, RF09, RF10, RF11, RF12; HU02, HU03, HU07; RNF04, RNF05,
RNF06; specs 002 (turmas, encontros, duplas) e 003 (equipes por convite, trio). Constituição II,
V, VI, VII, IX, X.

## Clarifications

### Session 2026-10-30

- Q: Quem cria e publica as questões e os desafios, e para quem valem? → A: O docente, para as
  próprias turmas (turmas às quais está vinculado). A coordenação supervisiona.
- Q: A equipe pode reenviar a entrega do desafio antes do prazo? → A: Sim. Cada envio gera nova
  versão e novo comprovante; as anteriores ficam no histórico; vale a última recebida.
- Q: Quando a equipe vê a nota da rubrica e o feedback, e quem altera uma avaliação registrada?
  → A: A equipe vê assim que o docente registra. Correções posteriores são feitas pelo docente ou
  pela coordenação, com justificativa e histórico.
- Q: Cada turma pode ter mais de um desafio e mais de uma lista de questões publicados no mesmo
  encontro? → A: Sim. A nota do encontro em cada componente é a média dos desafios (entrega e
  apresentação) ou das listas (questões) publicados para a turma naquele encontro.
- Q: Como um desafio ou uma lista passa para "encerrado"? → A: Automaticamente pelo horário do
  servidor (lista no prazo; desafio no prazo + tolerância máxima de atraso das regras); o docente
  também pode encerrar antes.
- Q: Quem faz o primeiro registro de presença, participação e avaliação? → A: Docente e mentor da
  turma; a coordenação só corrige registros existentes, com justificativa.
- Q: Quais tipos de arquivo e qual tamanho máximo a entrega aceita? → A: PDF, ZIP, PNG e JPG, até
  50 MB por arquivo.
- Q: O mentor da turma pode fazer as mesmas ações que o docente? → A: Sim, tudo: criar, editar,
  publicar e encerrar desafios e listas, registrar presença, participação, avaliação e prorrogação.
- Q: Como a presença de cada aluno é registrada? → A: Só "presente" ou "ausente"; atraso ou saída
  antecipada contam como presente e podem ser anotados numa observação, sem afetar os pontos.
- Q: O que acontece com arquivos que chegam ao armazenamento sem gerar entrega? → A: Ficam sem
  versão nem comprovante e inacessíveis ao aluno; a limpeza automática fica como pendência
  operacional (fora deste incremento).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Equipe entrega o desafio e recebe comprovante do servidor (Priority: P1)

O docente cadastra o desafio do encontro para as suas turmas (enunciado, recursos permitidos,
política de uso de IA, prazo, formas de entrega aceitas) e o publica. Um integrante da equipe
abre o desafio, envia um arquivo ou link e só vê "Entrega recebida" com protocolo e horário
depois que o servidor confirma a gravação.

**Why this priority**: é a jornada mais sensível do incremento (HU02): uma confirmação falsa ou
uma entrega perdida afeta a nota da equipe e a confiança no sistema.

**Independent Test**: como docente da turma A, publicar um desafio; como aluno de uma equipe da
turma A, enviar um PDF e ver protocolo e horário; repetir com a rede desligada e ver que nenhuma
confirmação aparece; como aluno da turma B, não ver o desafio nem o arquivo da turma A.

**Acceptance Scenarios**:

1. **Given** um desafio publicado e dentro do prazo, **When** um integrante envia um arquivo de
   tipo e tamanho permitidos, **Then** o servidor grava o arquivo, registra a versão e devolve
   protocolo e horário do servidor, exibidos a todos os integrantes da equipe.
2. **Given** a entrega em andamento, **When** a conexão cai ou o servidor responde com erro,
   **Then** a tela informa que a entrega **não** foi recebida e oferece tentar novamente; nada é
   mostrado como enviado.
3. **Given** uma entrega já recebida e o prazo ainda aberto, **When** a equipe envia outra
   versão, **Then** o servidor emite novo comprovante, a versão anterior fica no histórico e a
   avaliação passa a considerar a última.
4. **Given** um arquivo de tipo não aceito ou acima do limite, **When** o integrante tenta
   enviar, **Then** o envio é recusado com o motivo (no navegador e, de novo, no servidor).
5. **Given** o prazo encerrado há 10 minutos e a equipe sem entrega, **When** ela envia, **Then**
   a entrega é recebida e o comprovante informa o atraso e o desconto previsto no critério
   organização (até 15 min: 2 pontos; até 30 min: 5 pontos).
6. **Given** o prazo encerrado há mais de 30 minutos e sem prorrogação registrada, **When** a
   equipe tenta enviar, **Then** o servidor recusa e a tela explica que a entrega não é mais
   aceita.
7. **Given** um desafio em rascunho, **When** um aluno procura o desafio, **Then** ele não aparece.

---

### User Story 2 - Docente registra presença e participação do encontro (Priority: P1)

No dia do encontro, o docente (ou mentor) da turma abre a lista de alunos com suas equipes,
marca presença individual e registra a participação de cada equipe pelos critérios da edição.

**Why this priority**: presença e participação valem até 20 dos 100 pontos do encontro e são
registradas em todos os quatro encontros, inclusive no da prova oficial.

**Independent Test**: como docente da turma A, marcar presença de todos os alunos e a
participação de uma equipe; recarregar e ver os registros vindos do servidor com autor e
horário; como docente da turma B, tentar registrar na turma A e ser recusado pelo servidor.

**Acceptance Scenarios**:

1. **Given** um encontro da edição e a turma vinculada ao docente, **When** ele marca cada aluno
   como presente ou ausente e salva, **Then** o servidor grava cada marcação com autor e horário
   do servidor e a tela só confirma após a resposta.
2. **Given** uma equipe da turma, **When** o docente informa os pontos de cada critério de
   participação (envolvimento até 4, colaboração até 3, organização até 3), **Then** o servidor
   recusa valores fora dos limites e grava os válidos.
3. **Given** uma presença já registrada, **When** o docente ou a coordenação a altera, **Then** a
   alteração exige justificativa e o valor anterior fica no histórico.
4. **Given** um aluno ausente e o colega presente, **When** os pontos parciais são calculados,
   **Then** a equipe perde apenas os 5 pontos de presença do ausente.

---

### User Story 3 - Docente avalia a entrega e a apresentação com rubrica e feedback (Priority: P2)

O docente vê as entregas recebidas das equipes das suas turmas, abre a última versão, atribui
as notas da rubrica de entrega e da apresentação, escreve o feedback e registra. A equipe vê as
notas e o feedback assim que o servidor confirma o registro.

**Why this priority**: a entrega e a apresentação valem até 50 dos 100 pontos do encontro
(HU03); depende da US1 para existir entrega a avaliar.

**Independent Test**: como docente da turma A, avaliar a entrega de uma equipe com quatro notas
e feedback; como aluno da equipe, ver notas, total e feedback; como aluno de outra equipe, não
ver nada dessa avaliação.

**Acceptance Scenarios**:

1. **Given** uma entrega recebida, **When** o docente informa quatro notas entre 0 e 10
   (compreensão, aplicação técnica, qualidade, organização) e o feedback, **Then** o servidor
   registra a avaliação com autor e horário, e o total de até 40 aparece para a equipe.
2. **Given** uma entrega recebida com atraso, **When** o docente avalia, **Then** o desconto de
   atraso é aplicado ao critério organização e mostrado separado da nota dada.
3. **Given** a apresentação da equipe, **When** o docente informa clareza (até 3), explicação
   (até 4) e respostas (até 3), **Then** o servidor recusa valores fora dos limites e grava os
   válidos.
4. **Given** uma equipe sem entrega, **When** o docente abre a avaliação, **Then** a prática fica
   zerada e ele pode marcar a apresentação como "não avaliável" (zero) ou avaliá-la.
5. **Given** uma avaliação registrada, **When** o docente ou a coordenação a corrige, **Then** a
   correção exige justificativa, o valor anterior fica no histórico e a equipe vê o valor novo.
6. **Given** uma avaliação sendo registrada sem conexão, **When** o docente tenta salvar,
   **Then** a tela informa que é preciso conexão e não exibe a avaliação como registrada.

---

### User Story 4 - Equipe responde às questões preparatórias com submissão única (Priority: P2)

O docente cadastra a lista de questões objetivas do encontro (enunciado, alternativas, gabarito,
justificativa e capacidade associada), define o prazo e publica para as suas turmas. A equipe
responde e envia uma única vez; depois do prazo vê acertos, gabarito e justificativas.

**Why this priority**: as questões valem até 30 pontos nos encontros sem prova oficial; ficam
depois de entrega e presença porque o modelo de pontuação já está pronto e a jornada tem menos
risco de perda de dados.

**Independent Test**: como docente, publicar uma lista com 10 questões; como integrante A da
equipe, responder e enviar; como integrante B, tentar enviar de novo e ser recusado pelo
servidor; antes do prazo, nenhum aluno consegue obter o gabarito.

**Acceptance Scenarios**:

1. **Given** uma lista publicada e dentro do prazo, **When** um integrante envia as respostas,
   **Then** o servidor registra a submissão da equipe com autor, horário e versão da lista, e a
   tela confirma após a resposta.
2. **Given** a equipe já submeteu, **When** outro integrante (ou o mesmo) tenta enviar, **Then**
   o servidor recusa e a tela mostra quem enviou e quando. A repetição técnica da **mesma
   tentativa** (mesma chave de envio, quando a resposta da primeira chamada se perdeu na rede)
   não é um novo envio: o servidor devolve a confirmação original.
3. **Given** dois integrantes enviando ao mesmo tempo, **When** o servidor processa, **Then**
   apenas uma submissão é aceita.
4. **Given** uma lista publicada, **When** um aluno consulta a lista antes do encerramento,
   **Then** gabarito e justificativas não são entregues ao navegador dele.
5. **Given** o prazo encerrado, **When** a equipe abre a lista, **Then** vê suas respostas,
   gabarito, justificativas e a pontuação (acertos ÷ total × 30); questão sem resposta conta
   como erro.
6. **Given** um encontro configurado com a prova oficial como componente objetivo, **When** o
   docente tenta criar lista de questões para ele, **Then** a opção não é oferecida.

---

### User Story 5 - Equipe acompanha a pontuação parcial do encontro (Priority: P3)

O aluno vê, por encontro, os pontos da própria equipe em cada componente (presença,
participação, questões, entrega, apresentação), calculados pelas regras da edição e marcados
como **parciais**, com o feedback recebido.

**Why this priority**: dá retorno à equipe; a publicação de ranking fica para o Incremento 4.

**Independent Test**: com registros de presença, questões e avaliação de uma equipe, abrir o
painel do aluno e conferir que cada componente bate com as regras da edição.

**Acceptance Scenarios**:

1. **Given** registros do encontro, **When** o aluno abre o painel, **Then** vê os pontos de
   cada componente da própria equipe e o total do encontro, identificado como parcial.
2. **Given** um componente ainda não registrado, **When** o aluno abre o painel, **Then** o
   componente aparece como "aguardando registro", não como zero.
3. **Given** qualquer aluno, **When** abre o painel, **Then** não vê notas de outras equipes.

### Edge Cases

- Equipe alterada (integrante substituído) depois de uma entrega: a entrega pertence à equipe;
  o histórico mostra o autor original do envio.
- Aluno sem equipe ativa: vê o desafio e as questões, mas não pode enviar; a tela explica que é
  preciso fazer parte de uma equipe.
- Prorrogação ou impedimento justificado registrado para uma equipe: o prazo dela passa a ser o
  novo, sem desconto de atraso.
- Reenvio depois do prazo quando a equipe já tem entrega no prazo: recusado (evita trocar uma
  entrega sem atraso por uma com atraso sem querer).
- Desafio ou lista editados depois de publicados: só antes da primeira entrega/submissão; depois
  disso o servidor recusa a edição.
- Docente desvinculado da turma: perde acesso a novas ações nela; os registros que fez continuam
  com sua autoria.
- Arquivo enviado parcialmente ou sem confirmação (upload interrompido, ou arquivo gravado mas
  registro recusado): não gera versão nem comprovante e não aparece ao aluno; a limpeza automática
  desses arquivos é pendência operacional, fora deste incremento.
- Relógio do aparelho adiantado/atrasado: prazo e atraso usam sempre o horário do servidor.
- Trio (spec 003): presença de três alunos limitada ao máximo de presença por equipe das regras
  da edição; ver pendência.
- Aplicação aberta offline: desafios, listas e registros já carregados podem ser lidos, mas
  envio, submissão, presença e avaliação mostram que é preciso conexão.

## Requirements _(mandatory)_

### Functional Requirements

**Desafios e entregas (RF09, RF10, HU02)**

- **FR-001**: Docentes e mentores MUST poder criar, editar e publicar o desafio de um encontro para uma ou
  mais das turmas a que estão vinculados, com título, enunciado, recursos permitidos, política
  de uso de IA, prazo (data e hora), formas de entrega aceitas (arquivo, link ou ambas) e os
  critérios da rubrica de entrega das regras da edição.
- **FR-002**: Desafios MUST ter estados rascunho → publicado → encerrado; alunos só veem desafios
  publicados das próprias turmas; o servidor MUST recusar edição de desafio que já tenha entrega.
- **FR-003**: Integrantes de equipe ativa MUST poder enviar arquivo ou link; o servidor MUST
  validar tipo (PDF, ZIP, PNG ou JPG) e tamanho (até 50 MB) do arquivo e a forma do link antes de
  registrar.
- **FR-004**: O servidor MUST emitir o comprovante (protocolo único e horário do servidor) só
  depois de gravar arquivo e registro; a interface MUST NOT mostrar entrega como recebida sem
  essa resposta.
- **FR-005**: Cada envio MUST gerar nova versão com autor e horário; a avaliação considera a
  última versão recebida; versões anteriores permanecem no histórico, visíveis à equipe e aos
  avaliadores.
- **FR-006**: O servidor MUST calcular o atraso pelo próprio horário: até o limite das faixas da
  edição a entrega é aceita com o desconto previsto; acima do limite (piloto: 30 min) é recusada,
  salvo prorrogação ou impedimento registrado.
- **FR-007**: Docentes e mentores da turma e a coordenação MUST poder registrar prorrogação ou impedimento
  justificado para uma equipe, com novo prazo, autor e justificativa.
- **FR-008**: Arquivos de entrega MUST ficar em armazenamento privado, acessíveis apenas aos
  integrantes da equipe, aos docentes e mentores da turma e à coordenação da edição.

**Presença e participação (RF11)**

- **FR-009**: Docentes e mentores vinculados à turma MUST poder registrar presença individual
  (presente ou ausente) de cada aluno da turma em cada encontro, com observação opcional (até 300
  caracteres; ex.: chegou atrasado) que não afeta os pontos.
- **FR-010**: Docentes e mentores vinculados à turma MUST poder registrar a participação de cada
  equipe por encontro, por critério das regras da edição, com limites validados no servidor.
- **FR-011**: Registros de presença e participação MUST guardar autor e horário do servidor;
  alterações MUST exigir justificativa e manter o valor anterior no histórico. O primeiro registro
  de presença, participação e avaliação é feito por docente ou mentor da turma; a coordenação só
  corrige registros existentes (com justificativa) e o servidor recusa primeiro registro feito por
  ela.

**Avaliação por rubrica (RF12, HU03)**

- **FR-012**: Docentes e mentores vinculados à turma MUST poder registrar a avaliação da entrega
  (critérios e limites das regras da edição, piloto 4 × 0–10) e da apresentação (piloto:
  clareza 3, explicação 4, respostas 3), com feedback escrito obrigatório na entrega.
- **FR-013**: O desconto de atraso MUST ser aplicado ao critério definido nas regras (piloto:
  organização) e exibido separado da nota atribuída; a pontuação de um critério não fica
  negativa.
- **FR-014**: Equipe sem entrega MUST ter a prática zerada; a apresentação pode ser avaliada ou
  marcada como "não avaliável" (zero).
- **FR-015**: A avaliação MUST ficar visível à equipe assim que o servidor confirmar o registro;
  correções posteriores pelo docente/mentor da turma ou pela coordenação MUST exigir
  justificativa e manter histórico.

**Questões preparatórias (RF07, RF08)**

- **FR-016**: Docentes e mentores MUST poder criar listas de questões objetivas por encontro (apenas em
  encontros cujo componente objetivo são as questões), com enunciado, alternativas, uma
  alternativa correta, justificativa e capacidade associada (texto), e publicar para uma ou mais
  de suas turmas com prazo.
- **FR-017**: Gabarito e justificativas MUST NOT ser entregues a alunos antes do encerramento do
  prazo da lista.
- **FR-018**: Cada equipe MUST ter no máximo uma submissão por lista, garantida pelo servidor
  mesmo com envios simultâneos; a submissão registra autor, horário e versão da lista. Repetir
  a mesma tentativa (mesma chave de envio) devolve a confirmação original sem criar nova
  submissão; qualquer outro envio é recusado.
- **FR-019**: A lista MUST NOT ser editada depois da primeira submissão; antes disso, cada edição
  gera nova versão.
- **FR-020**: A pontuação das questões MUST seguir as regras da edição (piloto: acertos ÷ total ×
  30, questão sem resposta conta como erro) e só aparecer à equipe depois do prazo.
  **Acompanhamento, segurança e transversais**

- **FR-021**: O aluno MUST ver os pontos parciais da própria equipe por componente e encontro,
  calculados pelas regras da edição, com componentes não registrados como "aguardando registro".
- **FR-022**: Toda autorização desta spec MUST ser aplicada no servidor por perfil e vínculo:
  aluno só acessa dados da própria turma e equipe; docente/mentor só das turmas vinculadas;
  coordenação, das turmas da edição que coordena.
- **FR-023**: Criação, publicação, envio, submissão, registro e correção MUST gerar auditoria com
  autor, horário do servidor e, nas correções, justificativa.
- **FR-024**: Envio, submissão, presença e avaliação MUST exigir conexão; offline, a interface
  informa que é preciso conexão e não simula sucesso; dados autenticados não vão para cache
  público do aplicativo.
- **FR-025**: Os valores de pontos, limites, faixas de atraso e critérios MUST vir das regras
  versionadas da edição, não de constantes fixas.
- **FR-026**: Um encontro MAY ter mais de um desafio e mais de uma lista publicados para a mesma
  turma. A pontuação do encontro em cada componente MUST ser a média simples dos itens publicados
  para a turma: entrega e apresentação pela média das avaliações dos desafios (o desconto de atraso
  é aplicado em cada desafio antes da média; desafio sem entrega conta 0 depois de avaliado);
  questões pela média das pontuações das listas encerradas (lista sem submissão conta 0). Enquanto
  algum item do componente estiver pendente, o componente aparece como "aguardando registro".
- **FR-027**: O encerramento MUST ser automático pelo horário do servidor: a lista encerra no
  prazo (e então mostra gabarito e pontuação); o desafio encerra no prazo mais a tolerância máxima
  de atraso das regras (piloto: 30 min). O docente MAY encerrar antes. Equipe com prorrogação
  registrada continua podendo enviar até o novo prazo dela, mesmo com o desafio encerrado.

### Key Entities

- **Desafio**: atividade prática de um encontro para uma ou mais turmas; enunciado, recursos
  permitidos, política de IA, prazo, formas de entrega aceitas, estado, autor.
- **Entrega (versão)**: envio de uma equipe para um desafio; arquivo ou link, autor, protocolo,
  horário do servidor, minutos de atraso, número da versão.
- **Prorrogação**: novo prazo para uma equipe em um desafio, com justificativa e autor.
- **Lista de questões / Questão / Alternativa**: conjunto versionado de questões objetivas de um
  encontro, com prazo e turmas; gabarito e justificativa protegidos até o encerramento.
- **Submissão de questões**: respostas únicas de uma equipe a uma versão da lista; autor e
  horário.
- **Presença**: aluno, encontro, presente/ausente, autor, horário, histórico.
- **Participação**: equipe, encontro, pontos por critério, autor, horário, histórico.
- **Avaliação**: equipe, desafio/encontro, notas por critério de entrega e de apresentação,
  apresentação não avaliável, feedback, autor, horário, histórico de correções.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Um integrante envia a entrega e vê o comprovante em até 3 interações a partir do
  painel do aluno.
- **SC-002**: Em 100% dos testes com falha de rede ou erro do servidor, nenhuma entrega,
  submissão, presença ou avaliação aparece como concluída.
- **SC-003**: Um docente registra a presença de uma turma de 30 alunos em menos de 2 minutos.
- **SC-004**: 100% das tentativas de acesso cruzado testadas (outra turma, outra equipe, outro
  perfil) são recusadas pelo servidor.
- **SC-005**: Em nenhum teste o gabarito chega ao aluno antes do encerramento da lista.
- **SC-006**: Os pontos parciais exibidos batem com os casos de contrato das regras de pontuação
  em 100% dos cenários testados.
- **SC-007**: Nenhuma equipe consegue registrar duas submissões para a mesma lista, inclusive com
  envios simultâneos.

## Assumptions

- Equipe = dupla (spec 002) ou trio (spec 003, implementada em 2026-10-30). Esta spec usa a equipe ativa
  do aluno na edição, qualquer que seja a forma de composição.
- Mentores têm as mesmas permissões que docentes nas turmas vinculadas, inclusive criar e
  publicar desafios e listas e registrar prorrogação (decidido em 2026-10-30). Nesta spec,
  "docente" inclui o mentor da turma.
- Cada docente publica o próprio conteúdo por turma; turmas do mesmo curso podem ter atividades
  diferentes, o que afeta a comparabilidade no ranking por curso. **[validar]** com a coordenação.
- Formatos e limite de arquivo: PDF, ZIP, PNG e JPG até 50 MB por arquivo (decidido em
  2026-10-30); o docente escolhe se o desafio aceita arquivo, link ou ambos.
- Presença só tem "presente" e "ausente" (decidido em 2026-10-30); atraso ou saída antecipada vão
  numa observação opcional, sem efeito nos pontos.
- Prorrogação e impedimento podem ser registrados pelo docente da turma e pela coordenação.
  **[validar]**
- Os pontos exibidos são parciais e calculados com as regras de domínio já existentes; a fonte
  oficial de pontos gravados, o ranking, a prova oficial e as ocorrências ficam para o
  Incremento 4.
- Não há rascunho de respostas no servidor: a equipe responde na tela e envia de uma vez.
- O modo demonstração continua funcionando com dados fictícios para as novas telas.
- Registros feitos aqui são a base que o Incremento 4 usará para o cálculo oficial.
