# Feature Specification: Fundação e experiência navegável por perfil

**Feature Branch**: `001-fundacao-perfis-demo`
**Created**: 2026-10-29
**Status**: Draft (aguardando validação da coordenação)
**Input**: User description: "Incremento 0 (fundação) e primeira experiência navegável para
coordenação, docente e aluno com dados fictícios; regras de pontuação do piloto como configuração
versionada e testada; base de autenticação, rotas protegidas, PWA e esquema inicial do Supabase."

**Rastreabilidade**: PRD RF01, RF06 (leitura), RF14 (núcleo de cálculo), RF16 (estados do
ranking), RF18; HU03, HU04, HU05, HU07; RNF01–RNF04, RNF06.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Acesso por perfil com rotas protegidas (Priority: P1)

Uma pessoa usuária entra no sistema e é levada ao painel do seu perfil (coordenação, docente ou
aluno). Ela só vê no menu as funções do seu perfil e não consegue abrir, pela URL, telas de outro
perfil.

**Why this priority**: sem separação de perfis nenhuma outra tela pode ser demonstrada com
segurança; é a base de RF01.

**Independent Test**: no modo demonstração, entrar como cada perfil, verificar o painel inicial
e tentar acessar uma rota de outro perfil.

**Acceptance Scenarios**:

1. **Given** uma pessoa não autenticada, **When** ela abre `/coordenacao`, **Then** é
   redirecionada para a tela de entrada.
2. **Given** um aluno autenticado, **When** ele abre `/coordenacao`, **Then** vê a mensagem
   "Acesso não autorizado" e um link para o seu painel, sem nenhum dado da coordenação.
3. **Given** uma docente autenticada, **When** o menu é exibido, **Then** ele contém apenas
   itens do perfil docente, cada um com ícone e rótulo de texto.
4. **Given** o modo demonstração ativo, **When** qualquer tela é exibida, **Then** há um aviso
   permanente "Modo demonstração — dados fictícios, acesso não seguro".

---

### User Story 2 - Painel do aluno com a pontuação da própria dupla (Priority: P1)

O aluno vê sua dupla, o próximo encontro, a próxima tarefa, a pontuação acumulada da dupla com
a referência ao máximo da edição e o estado da classificação.

**Why this priority**: é a principal visão do estudante (PRD §13, Design System §9).

**Independent Test**: entrar como aluno fictício e conferir que os pontos exibidos são os
calculados pelas regras da edição a partir dos registros fictícios, sem notas individuais de
terceiros.

**Acceptance Scenarios**:

1. **Given** registros fictícios de presença, participação, questões e rubricas, **When** o
   painel é aberto, **Then** a pontuação mostrada é igual à soma calculada pelo núcleo de regras
   e o texto "até {máximo} pontos" usa o máximo configurado na edição.
2. **Given** a prova oficial com nota pendente para um integrante, **When** o painel é aberto,
   **Then** o bônus de nota não é somado e a situação aparece como "Pendente".
3. **Given** o ranking publicado como "Provisório", **When** o aluno o consulta, **Then** vê
   posição, nome das duplas e total, e não vê notas individuais de nenhum estudante.

---

### User Story 3 - Painel da docente com presença e avaliações pendentes (Priority: P2)

A docente vê as turmas autorizadas, os encontros, as presenças a registrar e as entregas que
aguardam avaliação, além da rubrica do desafio com os limites de cada critério.

**Why this priority**: orienta o próximo incremento (registro de presença e rubrica) e valida a
navegação do perfil.

**Independent Test**: entrar como docente fictícia e conferir que só aparecem turmas
vinculadas a ela.

**Acceptance Scenarios**:

1. **Given** uma docente vinculada a uma turma, **When** abre "Minhas turmas", **Then** vê só
   essa turma.
2. **Given** a tela de rubrica, **When** é exibida, **Then** mostra os quatro critérios da
   entrega (até 10 cada, total 40) e os três da apresentação (3, 4 e 3).

---

### User Story 4 - Painel da coordenação com pendências e estado do ranking (Priority: P2)

A coordenação vê indicadores gerais (turmas, duplas, encontros), pendências (notas oficiais
pendentes, avaliações em aberto), a classificação por categoria com seu estado e a configuração
de premiação registrada como "a confirmar".

**Independent Test**: entrar como coordenação fictícia e conferir indicadores e ranking.

**Acceptance Scenarios**:

1. **Given** duplas empatadas no total, **When** o ranking é calculado, **Then** o desempate
   segue: entrega prática → questões/prova oficial → presença → colocação compartilhada.
2. **Given** a premiação sem valores confirmados, **When** exibida, **Then** aparece como
   "a confirmar" sem valores inventados.

---

### User Story 5 - Instalação, conexão e atualização (Priority: P3)

A pessoa usuária é informada quando está sem conexão, quando há nova versão disponível e pode
instalar o aplicativo quando o navegador permitir.

**Acceptance Scenarios**:

1. **Given** a aplicação aberta, **When** a conexão cai, **Then** aparece "Você está sem
   conexão" e ações de envio ficam indisponíveis com a explicação "Requer conexão".
2. **Given** uma nova versão publicada, **When** o service worker a detecta, **Then** aparece a
   opção "Atualizar agora", sem recarregar sozinho.

### Edge Cases

- Questões com total zero não podem gerar divisão por zero (resultado 0 e erro de configuração).
- Rubrica com nota acima do máximo do critério ou negativa é rejeitada.
- Atraso acima de 30 minutos sem exceção autorizada torna a entrega "não realizada" (0).
- Desconto de atraso não deixa o critério organização negativo.
- Duas penalidades com o mesmo fato (mesmo identificador de fato) contam uma única vez.
- Soma de descontos de ocorrências distintas limitada ao teto da edição (piloto: 10).
- Pontuação do encontro nunca negativa.
- Plágio comprovado zera a entrega afetada.
- Nota oficial pendente nunca gera bônus; realização não confirmada não gera pontos.
- Ausência de um integrante retira só os pontos de presença dele.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST direcionar cada pessoa autenticada ao painel do seu perfil.
- **FR-002**: O sistema MUST impedir, na interface, acesso a rotas de outro perfil e MUST
  aplicar a mesma restrição no banco por RLS (a interface não é a barreira de segurança).
- **FR-003**: O modo demonstração MUST ser explícito, identificado em todas as telas e
  desativado quando não configurado.
- **FR-004**: As regras de pontuação MUST ser lidas de uma configuração versionada da edição
  (máximos por componente, critérios, faixas de atraso, teto de descontos, bônus da prova
  oficial, política de arredondamento).
- **FR-005**: Questões MUST ser pontuadas por `acertos ÷ total × máximo`, com duas casas
  decimais e sem arredondamento intermediário.
- **FR-006**: Presença MUST valer por integrante (piloto: 5 cada, até 10 por dupla).
- **FR-007**: Participação MUST somar envolvimento (≤4), colaboração (≤3) e organização (≤3).
- **FR-008**: Entrega MUST somar quatro critérios (≤10 cada); apresentação três (≤3, ≤4, ≤3).
- **FR-009**: Atraso MUST descontar do critério organização conforme faixas configuradas, sem
  deixá-lo negativo; acima do limite, entrega não realizada salvo exceção autorizada.
- **FR-010**: Prova oficial MUST somar 5 por realização confirmada e +10 por nota confirmada
  ≥ 70 por estudante, até 30 por dupla; pendente não soma.
- **FR-011**: Penalidades MUST ser deduplicadas por fato, limitadas ao teto por encontro e o
  total do encontro MUST NOT ser negativo.
- **FR-012**: O ranking MUST ordenar por total e desempatar por entrega prática, depois
  questões/prova, depois presença; empate persistente gera colocação compartilhada.
- **FR-013**: O ranking MUST exibir seu estado (Parcial, Provisório, Definitivo) e MUST NOT
  expor notas individuais.
- **FR-014**: A aplicação MUST indicar ausência de conexão, bloquear ações de escrita offline e
  oferecer atualização da versão sob ação da pessoa usuária.
- **FR-015**: O service worker MUST NOT armazenar respostas de dados (Supabase) em cache.
- **FR-016**: O banco MUST ter esquema inicial versionado de perfis, vínculos, edições, cursos,
  turmas e auditoria com RLS habilitado em todas as tabelas expostas.

### Key Entities

- **Perfil/Atribuição**: pessoa, papel (coordenação, docente, mentor, aluno, apoio, analista),
  edição e vínculo de turma.
- **Edição**: nome, período, estado, regras versionadas e premiação configurada.
- **Curso / Turma / Categoria**: agrupam estudantes e definem o ranking.
- **Dupla**: dois integrantes, categoria e histórico de composição.
- **Encontro**: data, horário, ambiente, componentes avaliados.
- **Lançamentos de pontuação**: presença, participação, questões, rubricas, prova oficial,
  penalidades.
- **Ranking**: versão, estado, posições calculadas.
- **Auditoria**: autor, ação, alvo, momento do servidor, justificativa.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Os três perfis acessam seu painel em até 2 interações a partir da tela de entrada.
- **SC-002**: 100% dos cenários de regra listados em Edge Cases têm teste automatizado passando.
- **SC-003**: Nenhuma rota de outro perfil exibe dados quando acessada diretamente pela URL.
- **SC-004**: As telas principais são utilizáveis sem rolagem horizontal em 360 px e em 1280 px.
- **SC-005**: Nenhuma verificação automática de acessibilidade (axe) retorna violação crítica
  nas telas principais.

## Assumptions

- Regras do piloto vêm do prompt do usuário e do PRD; o regulamento/projeto pedagógico aprovado
  não foi fornecido e pode alterá-las (versão da regra: `piloto-2026.0-a-confirmar`).
- Arredondamento: duas casas decimais (meio para cima) apenas no resultado final de cada
  componente, conforme sugestão do usuário; a confirmar antes da abertura.
- Teto de descontos (10) aplica-se a descontos gerais de ocorrências; zerar a entrega por
  plágio não entra nesse teto (é efeito sobre o componente, não desconto geral).
- Desempate "questões e prova oficial" usa a soma do componente de 30 pontos de cada encontro.
- Ranking é por categoria; no piloto, categoria = curso (a confirmar).
- Autenticação real será por e-mail e senha no Supabase Auth com contas criadas pela
  coordenação; integração com login institucional fica em aberto.
