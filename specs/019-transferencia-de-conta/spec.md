# Feature Specification: Transferência de conta entre unidades

**Feature Branch**: `019-transferencia-de-conta`
**Created**: 2026-11-06
**Status**: Draft
**Input**: User description: "Hoje uma conta pertence a uma só unidade (regra 'uma unidade por conta'
da spec 016) e quem muda de unidade precisa ter a conta desativada e outra criada. Só o master
transfere, e só contas de equipe; vínculos e funções ativos na origem são encerrados e preservados;
no destino a conta chega sem funções e a gestão do destino as define."

**Rastreabilidade**: spec 016 (unidades, master, gestão), ADR 0013 (multiunidade), constituição V
(segurança no servidor), VI (dados de estudantes), IX (mudanças pequenas), X (nada inventado, pt-BR).

## Clarifications

### Session 2026-11-06

- Q: Quem faz a transferência e quais contas podem ser transferidas? → A: Só o master, e só contas
  de equipe (gestão, coordenação, docente, mentor, analista). Estudantes ficam de fora, porque o
  master não lê dados de estudantes.
- Q: O que acontece com os vínculos e o histórico na unidade de origem? → A: São encerrados e
  preservados: nada é apagado. O histórico das edições e a auditoria continuam na origem, legíveis só
  por quem já tem acesso lá.
- Q: Quais funções a conta recebe na unidade de destino? → A: Nenhuma. A gestão do destino as define
  depois; até lá a conta não acessa nada.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - O master transfere uma conta de equipe (Priority: P1)

Uma pessoa da equipe (por exemplo, uma docente) passa a trabalhar em outra unidade. O master abre
a equipe da unidade de origem, escolhe a conta, a unidade de destino, escreve a justificativa e confirma.
A conta passa a pertencer à unidade de destino, sem funções e sem acesso ao que era da origem.

**Why this priority**: sem isso, mudar de unidade exige desativar a conta e criar outra, perdendo a
identidade e o histórico da pessoa.

**Independent Test**: transferir uma docente da unidade A para a B e conferir que ela pertence à B,
não tem funções, não vê nada da A e aparece na lista da B para a gestão definir as funções.

**Acceptance Scenarios**:

1. **Given** uma conta de equipe ativa na unidade A e a unidade B ativa, **When** o master transfere
   a conta para a B com justificativa de ao menos 10 caracteres, **Then** a conta pertence à B, sem
   funções, e a gestão da B a vê na equipe da unidade.
2. **Given** a conta transferida, **When** a pessoa entra, **Then** vê a tela "aguardando permissão"
   até a gestão da B atribuir funções, e não acessa dado algum da A nem da B.
3. **Given** a conta transferida e a gestão da B atribuindo a função de docente, **When** a gestão
   conclui, **Then** a pessoa passa a ter acesso só ao que a gestão e a coordenação da B vincularem.
4. **Given** a transferência concluída, **When** a gestão da A consulta a equipe, **Then** a conta não
   está mais nela, mas o histórico (edições encerradas, auditoria) continua legível para a gestão da
   A e para quem já tinha acesso.

---

### User Story 2 - Transferências que deixariam a origem sem responsável são recusadas (Priority: P1)

O sistema recusa, com mensagem clara em português, transferir a conta quando isso deixaria a unidade
de origem sem responsável ou quando a operação não faz sentido.

**Why this priority**: a regra de que toda unidade e toda edição tenham responsável é o que mantém a
operação segura; a transferência não pode quebrá-la.

**Independent Test**: tentar cada caso de recusa e conferir a mensagem e que nada mudou.

**Acceptance Scenarios**:

1. **Given** a conta é a última gestão ativa da unidade, **When** o master tenta transferi-la, **Then**
   é recusado ("Indique outra gestão antes").
2. **Given** a conta é a última coordenação ativa de uma edição não encerrada, **When** o master
   tenta transferi-la, **Then** é recusado ("Indique outra coordenação antes").
3. **Given** a conta é de master ou de estudante, **When** o master tenta transferi-la, **Then** é
   recusado (só contas de equipe).
4. **Given** destino igual à origem, ou unidade desativada (origem ou destino), **When** o master
   tenta, **Then** é recusado.
5. **Given** justificativa com menos de 10 caracteres, **When** o master tenta, **Then** é recusado.
6. **Given** qualquer perfil que não seja master (gestão, coordenação, docente...), **When** tenta
   transferir, **Then** é recusado no servidor.

---

### User Story 3 - A transferência é auditada e não perde nada (Priority: P2)

Quem audita a rede encontra o registro de cada transferência (quem, quando, de onde, para onde e a
justificativa), e nada da origem é apagado: funções e vínculos antigos ficam como histórico
inativo.

**Why this priority**: auditoria e preservação sustentam a confiança nos dados; mas a operação em si
(P1) já entrega o valor central.

**Independent Test**: transferir uma conta com vínculos e conferir a auditoria e que os registros
antigos existem, inativos, na origem.

**Acceptance Scenarios**:

1. **Given** uma transferência concluída, **When** se consulta a auditoria, **Then** há um registro
   com autor, horário do servidor, unidade de origem, unidade de destino e justificativa.
2. **Given** uma conta com funções e vínculos em edições da origem, **When** é transferida, **Then**
   todas as funções e vínculos da origem ficam inativos, nenhum é apagado e a pessoa não é mais
   considerada da origem em nenhuma verificação de acesso.
3. **Given** a mesma operação repetida por engano (mesmo pedido), **When** o servidor a recebe de
   novo, **Then** não duplica nada (a conta já está no destino) e informa que já está lá.

---

### Edge Cases

- Conta com edição em andamento na origem na qual é a única coordenação: recusada até a gestão da
  origem indicar outra coordenação.
- Conta que é mentora com vínculos derivados por turma: todos os vínculos (diretos e derivados)
  encerrados junto.
- Conta com convite de primeiro acesso ainda pendente: pode ser transferida; o convite segue valendo
  e a pessoa entra já na unidade nova.
- Duas transferências simultâneas da mesma conta: só uma vence; a outra recebe recusa informando que
  a conta já mudou de unidade.
- Unidade de destino desativada depois da transferência: a conta passa a ser recusada em tudo, como
  qualquer conta de unidade desativada.
- Conta desativada: a transferência é recusada (reativar antes).
- Coordenadora única de uma edição **encerrada**: a transferência é permitida (a regra de "última
  coordenação" vale só para edições não encerradas), e o vínculo passa a inativo como histórico.
- Conta transferida de volta à unidade de origem depois: segue as mesmas regras; os vínculos antigos
  continuam inativos (não são reativados sozinhos).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Só o master MUST poder transferir uma conta; qualquer outro perfil é recusado no
  servidor.
- **FR-002**: Só contas de equipe (com ao menos uma função ativa de gestão, coordenação, docente,
  mentor ou analista, ou que tenham tido uma) MUST ser transferíveis; contas de master e de estudante
  são recusadas.
- **FR-003**: A transferência MUST exigir origem e destino ativos e diferentes, conta ativa e
  justificativa de 10 a 2.000 caracteres (após remover espaços das pontas).
- **FR-004**: A transferência MUST ser recusada se a conta for a última gestão ativa da unidade de
  origem ou a última coordenação ativa de uma edição não encerrada da origem, com mensagem clara.
- **FR-005**: Ao transferir, a conta MUST passar a pertencer à unidade de destino, sem nenhuma função
  no destino.
- **FR-006**: Ao transferir, todas as funções e todos os vínculos da conta na origem (inclusive os de
  edições encerradas e os derivados) MUST ficar inativos e preservados; nada é apagado.
- **FR-007**: Depois da transferência, a conta MUST NOT ter acesso a nenhum dado da origem, e a gestão
  e as demais contas da origem MUST continuar lendo o histórico como antes.
- **FR-008**: A gestão do destino MUST ver a conta na equipe da unidade (sem funções) e poder definir
  as funções pelo fluxo existente; a função de gestão continua só do master.
- **FR-009**: A transferência MUST gerar um registro de auditoria com autor, horário do servidor,
  unidades de origem e destino e justificativa.
- **FR-010**: A operação MUST ser atômica e idempotente: ou conclui por inteiro ou não muda nada, e
  repetir o mesmo pedido não duplica nem altera nada.
- **FR-011**: O master MUST ter, na área de rede, uma tela para escolher a conta (da lista de contas
  da rede), a unidade de destino e a justificativa, com confirmação explícita e mensagens de recusa do
  servidor; o master continua sem ver dados de estudantes.
- **FR-012**: O isolamento entre unidades MUST permanecer: nenhuma outra operação ou consulta passa a
  enxergar dados de outra unidade por causa da transferência.
- **FR-013**: Nenhuma regra de pontuação nem outra funcionalidade MUST mudar; a regra "uma unidade
  por conta" continua valendo (a conta nunca pertence a duas unidades ao mesmo tempo).

### Key Entities

- **Conta de equipe**: pessoa com funções na unidade; pertence a uma só unidade por vez.
- **Transferência**: operação do master que muda a unidade da conta; atributos: conta, unidade de
  origem, unidade de destino, justificativa, autor e horário (registrados na auditoria).
- **Função e vínculo inativos**: registros da origem preservados como histórico, sem concessão de
  acesso.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O master conclui uma transferência em até 4 passos de tela (escolher conta, destino,
  justificar, confirmar), e a conta aparece na equipe do destino imediatamente.
- **SC-002**: Em 100% das tentativas de recusa previstas (última gestão, última coordenação, master,
  estudante, origem igual ao destino, unidade desativada, justificativa curta, perfil sem permissão),
  nada muda e a mensagem explica o motivo.
- **SC-003**: Em 100% das transferências, a conta transferida acessa 0 dados da origem e 0 dados do
  destino até a gestão do destino atribuir funções (conferido nos testes de isolamento).
- **SC-004**: 0 registros são apagados na origem em uma transferência (contagem antes e depois igual,
  com os ativos passando a inativos).
- **SC-005**: Cada transferência gera exatamente 1 registro de auditoria da transferência (tabela
  própria, com autor, horário, origem, destino e justificativa), além das linhas de auditoria das
  funções e dos vínculos inativados.
- **SC-006**: A gestão e as contas da origem leem o histórico da origem depois da transferência com o
  mesmo resultado de antes (conferido por comparação nos testes).

## Assumptions

- A tela fica na área do master, na lista de equipe da unidade (Rede › Unidades), reaproveitando os padrões de
  confirmação com justificativa já usados para desativações.
- "Conta de equipe" é a conta que tem ou teve função de gestão, coordenação, docente, mentor ou
  analista na unidade; estudantes são identificados pelo vínculo de aluno e ficam de fora.
- A gestão do destino já consegue definir funções de contas da própria unidade (spec 016); a conta
  recém-transferida passa a aparecer na lista dela por pertencer à unidade.
- O e-mail e a identidade (login) da conta não mudam.
- Fora de escopo: transferir estudantes, transferir em lote, aprovar transferências por outras
  pessoas, mover dados de edições entre unidades e mudar a unidade de masters.
