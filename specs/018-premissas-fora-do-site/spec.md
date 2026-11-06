# Feature Specification: Premissas fora do site

**Feature Branch**: `018-premissas-fora-do-site`
**Created**: 2026-11-06
**Status**: Draft
**Input**: User description: "As Premissas em validação (spec 015) não devem ser tratadas no site e
sim no desenvolvimento (decisão do usuário, 2026-11-06). Remover do aplicativo a tela, o aviso
no início do master, o módulo, as RPCs e as tabelas; manter o registro das premissas só na
documentação de desenvolvimento."

**Rastreabilidade**: spec 015 (premissas em validação), spec 016 (master responde às premissas),
`docs/decisoes-e-pendencias.md`, `docs/operacao-e-homologacao.md`. Constituição V (segurança no
servidor), VI (dados de estudantes), IX (mudanças pequenas), X (nada inventado, pt-BR).

## Clarifications

### Session 2026-11-06

- Q: As respostas já gravadas (tabela de respostas com auditoria) devem ser preservadas ou
  apagadas? → A: Apagadas junto com a tabela: só existem respostas de teste (decisão do usuário).
- Q: As 32 premissas já foram todas resolvidas? → A: Sim; P25 pela spec 016 e as demais por
  decisão do projeto (06/11/2026). Nenhuma está em aberto no sistema.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - O site deixa de tratar premissas (Priority: P1)

Quem usa o site (master, gestão, coordenação, docentes e mentores) não encontra mais a tela
"Premissas em validação", nem o item de menu, nem o aviso de pendências no início do master. As
premissas passam a ser assunto da equipe de desenvolvimento, não dos usuários.

**Why this priority**: é o pedido central; usuários finais não devem lidar com decisões de
desenvolvimento.

**Independent Test**: entrar com cada perfil e conferir que não existe o item de menu, o aviso, nem
as rotas antigas (abrir as rotas antigas leva à página de "não encontrado").

**Acceptance Scenarios**:

1. **Given** qualquer perfil autenticado, **When** abre o menu, **Then** não há "Premissas em
   validação" em nenhum grupo.
2. **Given** o início do master, **When** a página carrega, **Then** não há aviso de premissas.
3. **Given** uma pessoa que abre `/master/premissas`, `/gestao/premissas`,
   `/coordenacao/premissas` ou `/docente/premissas`, **When** a página carrega, **Then** vê a
   página de rota não encontrada, sem erro de aplicativo.
4. **Given** o modo demonstração, **When** qualquer perfil navega, **Then** o comportamento é o
   mesmo: nada de premissas.

---

### User Story 2 - O servidor deixa de guardar e expor premissas (Priority: P1)

O banco não tem mais as tabelas de premissas e de respostas, nem as duas funções que as liam e
gravavam. Nenhum perfil consegue consultar ou registrar premissas, e a segurança das demais tabelas
e funções não muda.

**Why this priority**: remover só a tela deixaria dados e funções órfãos no servidor (superfície
de ataque e manutenção sem uso).

**Independent Test**: no banco local, confirmar que os objetos de premissas não existem e que todos
os demais testes de segurança continuam passando.

**Acceptance Scenarios**:

1. **Given** o banco com todas as migrations, **When** se consulta o catálogo, **Then** não
   existem as tabelas nem as funções de premissas.
2. **Given** qualquer perfil, **When** tenta chamar as funções antigas, **Then** recebe erro de
   função inexistente.
3. **Given** a varredura de segurança (tabelas com política de conta ativa e funções com a guarda),
   **When** roda, **Then** passa sem as tabelas e funções removidas.
4. **Given** um banco que ainda tinha respostas de teste, **When** a migration é aplicada, **Then**
   elas são apagadas junto com a tabela, sem tocar em nenhum dado de outras funcionalidades.

---

### User Story 3 - O registro das premissas fica na documentação (Priority: P2)

A equipe de desenvolvimento continua com a lista P01–P32 e o estado de cada uma, em texto, na
documentação do repositório. Nada se perde do que o catálogo guardava (pergunta, o que o sistema
usa hoje, onde afeta, tema e como foi resolvida).

**Why this priority**: sem o registro, as decisões e o que ainda depende da unidade na
implantação se perderiam junto com a tela.

**Independent Test**: abrir o documento e encontrar as 32 premissas com tema, pergunta, o que o
sistema usa, onde afeta e a resolução.

**Acceptance Scenarios**:

1. **Given** o documento de premissas, **When** a equipe o abre, **Then** vê P01–P32 com código,
   tema, pergunta, premissa em uso, onde afeta, referência e como foi resolvida.
2. **Given** a documentação de decisões e de operação, **When** são lidas, **Then** não mandam
   ninguém usar uma tela do site para responder premissas e apontam para o documento.
3. **Given** a lista do que depende da unidade na implantação (e-mail, premiação, conferência
   visual), **When** a documentação de operação é lida, **Then** continua lá, sem depender da tela.

---

### Edge Cases

- Marcadores de bookmarks ou links antigos para as rotas removidas: levam à página de rota não
  encontrada, não a erro de aplicativo.
- Ambiente local com o banco já migrado: a migration nova aplica sem erro e é idempotente (pode
  rodar em banco onde os objetos já foram removidos).
- Permissões do módulo de acesso e a navegação por perfil: nenhuma permissão ficou ligada a
  premissas; a remoção não pode deixar item de menu órfão nem alterar áreas de outros perfis.
- Cópias salvas offline do aplicativo (PWA) antigo: continuam abrindo; as rotas removidas caem no
  "não encontrado" após a atualização.
- Documentos históricos das specs 015 e 016 continuam descrevendo o que foi feito na época, com
  nota de que a funcionalidade foi retirada pela spec 018.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O aplicativo MUST NOT oferecer a tela "Premissas em validação" para nenhum perfil,
  nem item de menu, nem aviso de pendências no início do master, no modo real e no de
  demonstração.
- **FR-002**: As rotas de premissas de master, gestão, coordenação e docente MUST deixar de
  existir; abri-las MUST resultar na página de rota não encontrada.
- **FR-003**: O código do aplicativo ligado a premissas (módulo, consultas, repositórios, dados de
  demonstração, fixtures e estilos exclusivos) MUST ser removido, sem deixar importações órfãs.
- **FR-004**: O banco MUST deixar de ter as tabelas de premissas e de respostas e as duas funções de
  leitura e resposta; as respostas de teste existentes MUST ser apagadas junto.
- **FR-005**: A remoção no banco MUST ser feita por uma migration nova, só com remoções dos objetos
  de premissas, idempotente, sem editar migrations antigas e sem tocar em dados ou objetos de outras
  funcionalidades.
- **FR-006**: A documentação de desenvolvimento MUST conter um documento com as 32 premissas
  (código, tema, pergunta, premissa em uso, onde afeta, referência e resolução) criado a partir do
  catálogo atual antes de ele ser removido.
- **FR-007**: `docs/decisoes-e-pendencias.md` e `docs/operacao-e-homologacao.md` MUST deixar de
  descrever a tela como forma de responder premissas, apontar para o documento de premissas e
  manter a lista do que depende da unidade na implantação.
- **FR-008**: Os testes MUST ser ajustados: teste de banco das premissas removido; varreduras de
  segurança do banco sem as tabelas e funções removidas; testes de unidade e de jornada
  (demonstração e Supabase) e de acessibilidade sem as rotas removidas; novos testes MUST provar que
  as rotas antigas dão "não encontrado" e que os objetos não existem no banco.
- **FR-009**: Nenhuma regra de pontuação, permissão ou outra funcionalidade MUST mudar; nenhum
  outro teste existente MUST precisar de ajuste além dos que mencionam premissas.
- **FR-010**: Os documentos das specs 015 e 016 MUST receber uma nota curta informando que a
  funcionalidade foi retirada pela spec 018, sem reescrever o histórico.

### Key Entities

- **Premissa (documentação)**: item P01–P32 com tema, pergunta, premissa em uso, onde afeta,
  referência e resolução; passa a existir só em texto no repositório.
- **Registros removidos**: catálogo de premissas e respostas com auditoria, que deixam de existir no
  banco.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em 100% dos perfis (master, gestão, coordenação, docente, mentor, analista,
  estudante), nenhum item de menu, aviso ou página de premissas aparece, no modo real e na
  demonstração.
- **SC-002**: As quatro rotas antigas levam à página de rota não encontrada em 100% das tentativas.
- **SC-003**: 0 objetos de premissas (tabelas e funções) existem no banco depois de todas as
  migrations; a varredura de segurança do banco continua aprovada.
- **SC-004**: O documento de premissas contém as 32 premissas, cada uma com os seis campos
  preenchidos (conferido por contagem).
- **SC-005**: Todas as verificações do projeto (qualidade, banco, jornadas de demonstração e
  jornadas com banco local) passam, sem teste novo ignorado.
- **SC-006**: 0 referências restantes no código do aplicativo ou nas migrations novas a
  funcionalidades removidas (conferido por busca), exceto nas migrations antigas e nos documentos
  históricos.

## Assumptions

- As premissas continuam existindo como assunto de desenvolvimento; a spec não altera nenhuma
  decisão tomada (todas as 32 estão resolvidas).
- Não há dados reais de premissas: só respostas de teste (confirmado pelo usuário).
- Os registros de auditoria já gravados sobre respostas de premissas (linhas na tabela de
  auditoria geral) permanecem, pois pertencem à trilha de auditoria; só são removidas as tabelas
  próprias de premissas. **Verificar no plano** se a tabela de auditoria referencia as tabelas
  removidas por chave.
- O módulo de acesso (permissões) não tem permissão própria de premissas; a navegação por perfil
  é a única ligação.
- Fora de escopo: alterar o que é registrado nas specs 015 e 016 além de uma nota, mudar qualquer
  outra tela, e criar qualquer outro canal para tratar premissas.
