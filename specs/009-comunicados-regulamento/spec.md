# Feature Specification: Comunicados e regulamento

**Feature Branch**: `009-comunicados-regulamento`
**Created**: 2026-11-02
**Status**: Draft
**Input**: User description: "Comunicados e regulamento (RF06, módulo 13 `modules/comunicados`):
a coordenação publica comunicados da edição, que estudantes, docentes e mentores leem conforme o
perfil e o vínculo; o regulamento continua resumido a partir da configuração das regras. Seguir o
PRD e docs/requisitos-e-referencias.md, sem inventar regras; registrar lacunas em
docs/decisoes-e-pendencias.md."

**Rastreabilidade**: PRD RF06 (Must), seção 4 (a coordenação publica o regulamento), seção 11
(alterações posteriores geram nova versão e justificativa), RNF04, RNF05, RNF06; spec 007 (avisos
no aplicativo); spec 008 (contador de avisos no painel do aluno). Constituição V, VI, VII, VIII, X.

## Clarifications

### Session 2026-11-02

- Q: Quem pode publicar comunicados? → A: Coordenação, docentes e mentores; docentes e mentores
  só para as turmas em que atuam.
- Q: Comunicado de docente ou mentor precisa de aprovação da coordenação? → A: Não; publica
  direto. A coordenação vê todos e pode corrigir ou retirar com justificativa.
- Q: A correção de um comunicado publicado avisa de novo quem já leu? → A: Sim; gera o aviso
  "Comunicado atualizado" para o público e o selo "Novo" volta para todos.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Coordenação, docentes e mentores publicam um comunicado (Priority: P1)

Quem publica escreve um comunicado (título e texto), escolhe o público — todos da edição, só
estudantes ou só a equipe docente (docentes e mentores), opcionalmente limitado a uma ou mais
turmas — e publica. A coordenação escolhe qualquer público da edição; docentes e mentores publicam
só para as turmas em que atuam, sempre com pelo menos uma turma escolhida. Antes de publicar, o
autor pode guardar como rascunho, que só ele e a coordenação veem. Depois de publicado, o
comunicado aparece para as pessoas do público e cada uma recebe um aviso no aplicativo.

**Why this priority**: sem publicação não há comunicados reais; hoje a página da coordenação está
"em construção" e os comunicados existem só na demonstração (RF06, Must).

**Independent Test**: com o seed local, a coordenação publica um comunicado para os estudantes do
3º ano A; a aluna da turma A vê o comunicado e um aviso novo; a aluna da turma B e o docente da
turma A não veem.

**Acceptance Scenarios**:

1. **Given** a coordenação de uma edição aberta, **When** publica um comunicado com título, texto
   e público, **Then** só depois da confirmação do servidor a tela mostra "Comunicado publicado",
   com data e hora da publicação.
2. **Given** um comunicado guardado como rascunho, **When** qualquer pessoa fora da coordenação
   consulta os comunicados, **Then** o rascunho não aparece nem gera aviso.
3. **Given** um comunicado publicado para "estudantes" limitado à turma A, **When** um estudante
   da turma B, um docente da turma A ou um mentor consultam os comunicados, **Then** não o veem;
   **When** um estudante ativo da turma A consulta, **Then** o vê.
4. **Given** a publicação, **When** ela é confirmada, **Then** cada pessoa do público recebe um
   aviso no aplicativo com o título do comunicado, uma única vez.
5. **Given** um título vazio, um texto vazio ou um público sem perfil, **When** a coordenação
   tenta publicar, **Then** o sistema recusa com a mensagem do campo e nada é publicado.
6. **Given** um docente da turma A, **When** publica para os estudantes da turma A, **Then** a
   publicação vale; **When** tenta publicar para a turma B, para a edição inteira ou sem turma,
   mesmo chamando o servidor diretamente, **Then** a operação é recusada.
7. **Given** um estudante, ou uma pessoa sem papel na edição, **When** tenta criar, publicar,
   corrigir ou retirar um comunicado, mesmo chamando o servidor diretamente, **Then** a operação
   é recusada.

---

### User Story 2 - Estudantes, docentes e mentores leem os comunicados (Priority: P1)

Cada pessoa vê, do mais recente para o mais antigo, os comunicados publicados para o seu perfil e
as suas turmas na edição. O estudante os encontra em "Regulamento e avisos"; docentes e mentores
ganham a página "Comunicados". Ao abrir um comunicado, o aviso correspondente fica lido.

**Why this priority**: é o lado que dá sentido à publicação; os dois juntos formam o menor
incremento útil.

**Independent Test**: depois da publicação da US1, entrar como aluna da turma A, ver o comunicado
no topo da lista com o selo "Novo", abri-lo e conferir que o contador de avisos diminui.

**Acceptance Scenarios**:

1. **Given** comunicados publicados para públicos diferentes, **When** uma pessoa abre a lista,
   **Then** vê só os do seu público, em ordem da publicação mais recente, com título, data e hora
   e o texto completo com as quebras de linha preservadas.
2. **Given** um comunicado não lido, **When** a pessoa o vê na lista, **Then** ele aparece com o
   selo "Novo" (em texto, não só em cor); **When** ela o marca como lido ou abre o aviso, **Then**
   o selo some e o contador de avisos do cabeçalho diminui.
3. **Given** um docente vinculado às turmas A e B, **When** há um comunicado para a equipe docente
   da turma B, **Then** ele o vê; um docente só da turma A não vê.
4. **Given** um estudante que deixou a turma ou a edição, **When** consulta os comunicados,
   **Then** não vê os comunicados restritos a turmas das quais não faz mais parte.
5. **Given** nenhum comunicado para a pessoa, **When** ela abre a lista, **Then** vê "Nenhum
   comunicado publicado para você nesta edição."
6. **Given** que a pessoa está sem conexão, **When** abre a página, **Then** vê que os comunicados
   exigem conexão; nenhum comunicado fica guardado no cache do aplicativo.

---

### User Story 3 - Corrigir ou retirar um comunicado publicado (Priority: P2)

Depois de publicado, um comunicado pode ser corrigido (título, texto) ou retirado pelo autor ou
pela coordenação, sempre com justificativa. A correção mantém o comunicado no lugar com a marca
"Atualizado em …" e avisa o público de novo; a retirada o tira da lista de quem lê. O que havia
antes fica no histórico de auditoria.

**Why this priority**: erros em comunicados acontecem e o PRD pede que alterações posteriores
tenham nova versão e justificativa; ainda assim, publicar e ler vêm antes.

**Independent Test**: corrigir o texto do comunicado da US1 com justificativa; a aluna da turma A
vê o texto novo com "Atualizado em …"; a auditoria guarda o texto anterior, o autor e a
justificativa; retirar o comunicado e conferir que ele some da lista da aluna.

**Acceptance Scenarios**:

1. **Given** um comunicado publicado, **When** a coordenação o corrige com justificativa, **Then**
   quem lê vê o texto novo com "Atualizado em" data e hora, e a versão anterior, o autor, o horário
   do servidor e a justificativa ficam na auditoria.
2. **Given** uma correção ou retirada sem justificativa, **When** a coordenação confirma, **Then**
   o sistema recusa.
3. **Given** um comunicado publicado, **When** a coordenação tenta mudar o público, **Then** a
   operação é recusada; para outro público, retira-se e publica-se um novo comunicado.
4. **Given** um comunicado retirado, **When** alguém do público consulta, **Then** ele não aparece;
   **When** a coordenação consulta, **Then** ele aparece como "Retirado", com a justificativa.
5. **Given** a mesma correção enviada duas vezes (reenvio após falha de rede), **When** o servidor
   recebe, **Then** grava uma só vez.
6. **Given** um comunicado já lido, **When** uma correção é confirmada, **Then** cada pessoa do
   público recebe um aviso "Comunicado atualizado" e o comunicado volta a ter o selo "Novo"; a
   retirada não gera aviso.
7. **Given** um comunicado de um docente, **When** outro docente da mesma turma tenta corrigi-lo
   ou retirá-lo, **Then** a operação é recusada; **When** a coordenação o faz, **Then** vale.

---

### User Story 4 - Regulamento resumido a partir das regras da edição (Priority: P2)

A página "Regulamento e avisos" mostra o resumo das regras com os valores da configuração da
edição (pontuação por encontro, prova oficial, atrasos, descontos e prazo de revisão) e a versão
dessas regras. A equipe docente e a coordenação veem o mesmo resumo. O aviso de que o regulamento
oficial aprovado prevalece continua visível.

**Why this priority**: hoje o resumo usa os valores fixos do piloto, mesmo que a edição tenha
outra configuração; corrigir isso evita informação divergente, mas o resumo já existe.

**Independent Test**: com o seed local, conferir que os números da página batem com a
configuração gravada na edição e que a versão exibida é a da edição.

**Acceptance Scenarios**:

1. **Given** uma edição com regras configuradas, **When** um estudante, docente, mentor ou a
   coordenação abre o regulamento, **Then** vê os valores e a versão das regras dessa edição.
2. **Given** um valor ausente na configuração, **When** a página é montada, **Then** o item mostra
   "a definir" em vez de um número presumido.
3. **Given** qualquer perfil, **When** abre o regulamento, **Then** vê o aviso "Resumo em
   validação: o regulamento oficial aprovado prevalece".

---

### Edge Cases

- Edição encerrada: comunicados continuam legíveis; criar, publicar, corrigir e retirar são
  recusados.
- Público limitado a uma turma de outra edição: recusado.
- Estudante incluído na turma depois da publicação: passa a ver o comunicado (o público é
  avaliado na leitura), mas não recebe aviso retroativo.
- Pessoa com mais de um papel (por exemplo, docente e mentor): vê cada comunicado uma vez e
  recebe um só aviso.
- Texto com caracteres de marcação (HTML, scripts, links): aparece como texto puro, sem ser
  interpretado.
- Título com mais de 200 caracteres ou texto com mais de 5.000: recusado com a mensagem do campo.
- Rascunho apagado: some sem deixar comunicado; publicado não pode ser apagado, só retirado.
- Demonstração: comunicados fictícios com o selo "Dados fictícios"; publicar, corrigir e retirar
  ficam desabilitados.
- Duas publicações simultâneas do mesmo rascunho: só uma vale; avisos não duplicam.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A coordenação, os docentes e os mentores da edição MUST poder criar comunicados
  com título (1 a 200 caracteres), texto (1 a 5.000 caracteres) e público, e guardá-los como
  rascunho.
- **FR-002**: O público MUST ser definido por perfil — todos da edição, estudantes ou equipe
  docente (docentes e mentores) — e, opcionalmente, por uma ou mais turmas da mesma edição. Para
  docentes e mentores, as turmas MUST ser obrigatórias e todas entre as turmas em que a pessoa
  atua; a regra MUST valer no servidor.
- **FR-003**: O autor MUST poder publicar o próprio rascunho, sem etapa de aprovação; a
  publicação registra autor e horário do servidor e só é mostrada como concluída depois da
  confirmação do servidor. A coordenação MUST ver todos os comunicados da edição, com o autor.
- **FR-004**: Ao publicar, o sistema MUST gerar um aviso no aplicativo para cada pessoa ativa do
  público, uma única vez por pessoa, com o título do comunicado e o caminho para lê-lo. Cada
  correção confirmada MUST gerar um aviso "Comunicado atualizado" para o público e tornar o
  comunicado não lido de novo; a retirada MUST NOT gerar aviso.
- **FR-005**: Cada pessoa MUST ver só os comunicados publicados (não retirados) da sua edição
  cujo público inclua um papel ativo seu e, quando houver turmas, uma turma ativa sua; a regra
  MUST valer no servidor.
- **FR-006**: Rascunhos e comunicados retirados MUST ficar visíveis só para o autor e a
  coordenação.
- **FR-007**: A lista de leitura MUST mostrar os comunicados em ordem da publicação mais recente,
  com título, data e hora, texto completo como texto puro com quebras de linha e, quando houver,
  "Atualizado em" data e hora.
- **FR-008**: Comunicados não lidos MUST ter o selo "Novo" em texto; abrir o aviso ou marcar o
  comunicado como lido MUST atualizar o contador de avisos.
- **FR-009**: O autor e a coordenação MUST poder corrigir título e texto de um comunicado
  publicado e retirá-lo, sempre com justificativa; outros docentes e mentores MUST NOT; a versão anterior, o autor, o horário e a justificativa
  MUST ficar na auditoria. O público de um comunicado publicado MUST NOT mudar.
- **FR-010**: Comunicados publicados MUST NOT ser apagados; rascunhos podem ser apagados.
- **FR-011**: Publicar, corrigir e retirar MUST ser idempotentes: o mesmo envio repetido grava
  uma vez e não duplica avisos.
- **FR-012**: Na edição encerrada, todas as escritas de comunicados MUST ser recusadas; a leitura
  continua.
- **FR-013**: Docentes e mentores MUST ter uma página "Comunicados" no menu, com os comunicados
  que recebem e os que escreveram; o estudante MUST ver os comunicados na página "Regulamento e
  avisos"; a coordenação MUST gerenciar todos os comunicados da edição em "Comunicados e
  regulamento".
- **FR-014**: O resumo do regulamento MUST usar os valores e a versão das regras gravadas na
  edição, para todos os perfis, mostrar "a definir" para valores ausentes e manter o aviso de que
  o regulamento oficial aprovado prevalece.
- **FR-015**: Comunicados MUST NOT ficar no cache do aplicativo; sem conexão, a página informa que
  exige conexão e as ações de escrita ficam bloqueadas.
- **FR-016**: Na demonstração, os comunicados MUST ser fictícios e identificados como tal, e as
  escritas MUST ficar desabilitadas.
- **FR-017**: Comunicados MUST NOT trazer dados de estudantes gerados pelo sistema (notas,
  ocorrências, e-mails); a tela de escrita MUST lembrar a coordenação de não incluir dados
  pessoais no texto.

### Key Entities _(include if feature involves data)_

- **Comunicado**: pertence a uma edição; título, texto, estado (rascunho, publicado, retirado),
  autor, horários de criação, publicação, última correção e retirada, justificativa da retirada.
- **Público do comunicado**: perfil-alvo (todos, estudantes, equipe docente) e, opcionalmente, a
  lista de turmas da edição.
- **Aviso** (já existe, spec 007): ganha os tipos "comunicado publicado" e "comunicado
  atualizado", com referência ao comunicado; marca a leitura por pessoa.
- **Regras da edição** (já existem): fonte dos valores e da versão do resumo do regulamento.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em testes com pessoas de perfis e turmas diferentes, 100% dos comunicados aparecem
  só para o público escolhido, inclusive em chamadas diretas ao servidor.
- **SC-002**: Quem publica (coordenação, docente ou mentor) publica um comunicado novo em até 4
  interações a partir da página de comunicados.
- **SC-003**: 100% das publicações e correções geram exatamente um aviso por pessoa do público,
  mesmo com reenvio ou envio simultâneo.
- **SC-004**: 100% das correções e retiradas têm justificativa, autor e versão anterior
  recuperáveis na auditoria.
- **SC-005**: Os valores do resumo do regulamento coincidem 100% com a configuração da edição.
- **SC-006**: As telas novas passam na verificação automática de acessibilidade e funcionam em
  celular, tablet e desktop.

## Assumptions

- Quem lê vê o nome e o papel do autor (coordenação, docente ou mentor) em cada comunicado.
- Docentes e mentores que deixam de atuar numa turma não corrigem nem retiram mais os
  comunicados dela; a coordenação continua podendo.
- O público por perfil e turma é a leitura adotada para "público autorizado" (RF06); outros
  recortes (por equipe ou por pessoa) ficam fora **[validar]**.
- Os limites de 200 caracteres no título e 5.000 no texto são premissas técnicas **[validar]**.
- O regulamento oficial continua ausente (`docs/decisoes-e-pendencias.md`); este incremento não
  publica documento de regulamento nem anexo, só o resumo gerado da configuração. A publicação do
  documento aprovado fica para quando ele existir.
- Sem anexos, agendamento, confirmação de leitura ("ciente") nem relatório de quem leu; sem
  e-mail nem notificação push (RF20 é Could e fora do escopo).
- Os papéis de apoio e analista não leem comunicados neste incremento, porque o PRD não define o
  que recebem.
- Comunicados são conteúdo autenticado; por isso não entram na leitura offline (Constituição VII,
  RNF06).
