# Feature Specification: Premissas em validação

**Feature Branch**: `015-premissas-em-validacao`
**Created**: 2026-11-05
**Status**: Draft
**Input**: User description: "Resolver as pendências [validar]: o que der para decidir vira ajuste;
o restante vira uma lista objetiva para a coordenação. A coordenação recebe e responde os itens
numa tela própria (decisão do usuário, 2026-11-05)."

**Rastreabilidade**: `docs/decisoes-e-pendencias.md` (37 marcas **[validar]**, **[decidir]** e
**[pendência]**), PRD §16 (critérios de pronto: regulamento aprovado e aceite da coordenação
registrado), §19 (questões em aberto). Constituição V, VI, VII, VIII, X.

## Clarifications

### Session 2026-11-05

- Q: Como a coordenação deve receber e responder os itens que só a unidade pode decidir? → A:
  Numa tela "Premissas em validação" na área da coordenação: cada item com a premissa em uso,
  onde ela afeta o sistema e as opções; a coordenação registra "Confirmada" ou "Precisa mudar"
  com justificativa, guardado e auditado no servidor. Mudar uma regra continua exigindo uma spec.
- Q: As respostas valem para a instalação inteira ou para cada edição? → A: Instalação inteira:
  uma situação por premissa; a coordenação de qualquer edição, inclusive encerrada, responde.
- Q: Docentes e mentores podem ver a lista e as respostas? → A: Sim, só leitura (premissas,
  situação e histórico com justificativas); registrar continua exclusivo da coordenação.
  Estudantes não acessam.
- Q: A coordenação precisa levar a lista para fora do sistema? → A: As duas formas: "Baixar lista
  (CSV)" e uma versão para impressão pelo navegador.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver as premissas que aguardam a unidade (Priority: P1)

A coordenação abre "Premissas em validação" e vê, agrupadas por tema (Pontuação, Equipes e
atividades, Acesso e edições, Comunicados e relatórios, Identidade visual, Operação), as
premissas que o sistema adotou sem decisão da unidade. Cada uma mostra a pergunta objetiva, a
premissa em uso hoje, onde ela afeta o sistema, as opções conhecidas (quando houver) e a situação
("Aguardando resposta", "Confirmada" ou "Precisa mudar").

**Why this priority**: sem a lista, as premissas ficam espalhadas em documentos técnicos que a
coordenação não lê; é a entrega que permite o aceite do PRD §16.

**Independent Test**: entrar como coordenação, abrir a tela e encontrar todas as premissas do
catálogo, cada uma com pergunta, premissa em uso, impacto e situação "Aguardando resposta".

**Acceptance Scenarios**:

1. **Given** a coordenação, **When** abre "Premissas em validação", **Then** vê as premissas por
   tema, cada uma com código (ex.: "P09"), pergunta, premissa em uso, onde afeta e situação.
2. **Given** a tela, **When** a coordenação filtra por situação ("Aguardando resposta",
   "Confirmada", "Precisa mudar") ou por tema, **Then** a lista mostra só as que atendem ao filtro e
   o total de cada situação continua visível.
3. **Given** docente ou mentor, **When** abre "Premissas em validação" pelo menu, **Then** vê a
   mesma lista, situações e histórico, sem o formulário de resposta.
   3a. **Given** estudante, **When** tenta abrir a tela ou ler as premissas, **Then** não há entrada
   no menu e o servidor recusa a leitura.
4. **Given** o início da coordenação, **When** há premissas aguardando resposta, **Then** um
   indicador mostra quantas e leva à tela.
   4a. **Given** a tela, **When** a coordenação escolhe "Baixar lista (CSV)", **Then** recebe um
   arquivo com código, tema, pergunta, premissa em uso, situação e a última resposta (decisão,
   justificativa, quem e quando), no padrão dos relatórios da spec 008.
   4b. **Given** a tela, **When** a pessoa usa o comando de imprimir do navegador, **Then** sai uma
   versão legível sem menu nem botões, com cada premissa num bloco que não se divide entre
   páginas.
5. **Given** o modo demonstração, **When** a tela abre, **Then** mostra o mesmo catálogo com
   respostas fictícias e recusa novos registros, como as demais escritas da demonstração.

---

### User Story 2 - Registrar a resposta da unidade (Priority: P1)

A coordenação registra, para uma premissa, "Confirmada" (a premissa em uso vale) ou "Precisa
mudar" (descrevendo o que deve mudar), sempre com justificativa. A resposta fica com quem
registrou e quando; uma resposta nova não apaga as anteriores, que ficam no histórico.

**Why this priority**: é o registro de aceite exigido pelo PRD §16; sem ele a lista é só leitura.

**Independent Test**: registrar "Confirmada" numa premissa e "Precisa mudar" em outra; ver as
situações mudarem, o histórico com autor e data, e a auditoria com as duas respostas.

**Acceptance Scenarios**:

1. **Given** uma premissa aguardando resposta, **When** a coordenação registra "Confirmada" com
   justificativa, **Then** a situação passa a "Confirmada" só depois da resposta do servidor, com
   o nome de quem registrou e a data.
2. **Given** uma premissa, **When** a coordenação registra "Precisa mudar", **Then** precisa
   descrever o que deve mudar (no campo de justificativa) e a situação passa a "Precisa mudar".
3. **Given** uma premissa já respondida, **When** a coordenação registra outra resposta, **Then**
   a nova vale e as anteriores continuam no histórico da premissa, na ordem em que foram
   registradas.
4. **Given** justificativa com menos de 10 caracteres, **When** a coordenação envia, **Then** o
   envio é recusado com o motivo, sem mudar a situação.
5. **Given** duas pessoas da coordenação respondendo a mesma premissa ao mesmo tempo, **When** a
   segunda envia sobre uma situação que já mudou, **Then** é avisada de que a premissa foi
   respondida por outra pessoa e vê a resposta atual antes de registrar de novo.
6. **Given** sem conexão, **When** a coordenação tenta registrar, **Then** o envio fica bloqueado
   com o motivo (como nas demais escritas).
7. **Given** docente ou estudante, **When** tenta registrar uma resposta, **Then** o servidor
   recusa.

---

### User Story 3 - Limpar o que já foi decidido e ajustar o que é técnico (Priority: P2)

Itens marcados como pendentes que specs posteriores já resolveram deixam de aparecer como
pendentes na documentação, com a referência de onde foram decididos. Itens técnicos, que não
dependem da unidade, são resolvidos no próprio sistema. O que sobra vira premissa do catálogo.

**Why this priority**: evita perguntar à coordenação o que já está decidido ou o que não é
assunto dela; reduz a lista ao essencial.

**Independent Test**: conferir que nenhuma marca **[validar]**, **[decidir]** ou **[pendência]**
em aberto fica na documentação sem estar no catálogo ou marcada como resolvida com referência.

**Acceptance Scenarios**:

1. **Given** "Encontros valem para todas as turmas da edição", **When** a documentação é
   revisada, **Then** aparece como resolvido pela spec 011 (encontros por turma), fora do
   catálogo.
2. **Given** "Ranking por categoria" e "turmas do mesmo curso com atividades diferentes afetam a
   comparabilidade do ranking por curso", **When** revisados, **Then** aparecem como resolvidos
   pela spec 012 (ranking por turma), fora do catálogo.
3. **Given** o fuso horário dos relatórios e do corte de "encontro realizado", **When** ajustado,
   **Then** o sistema usa o fuso oficial de Juazeiro do Norte (CE), `America/Fortaleza`, e os
   resultados atuais não mudam (mesmo deslocamento, sem horário de verão).
4. **Given** um item técnico resolvido, **When** a documentação é revisada, **Then** ele aparece
   como resolvido com a data e o motivo, fora do catálogo.

### Edge Cases

- Premissa com resposta "Precisa mudar": o sistema continua com a premissa em uso até uma spec
  mudar a regra; a tela diz isso ("O sistema segue a premissa em uso até a mudança ser feita").
- Coordenação de uma edição encerrada apenas: continua lendo e respondendo (o catálogo é da
  instalação, não da edição).
- Pessoa deixa a coordenação: as respostas dela ficam no histórico com o nome registrado.
- Catálogo ganha uma premissa nova numa versão futura: ela entra como "Aguardando resposta";
  premissas retiradas do catálogo (resolvidas por uma spec) somem da lista de pendentes e o
  histórico continua consultável na própria premissa, marcada "Resolvida pela spec NNN".
- Justificativa longa: limite de 2.000 caracteres, com contador.

## Requirements _(mandatory)_

### Functional Requirements

**Catálogo (US1)**

- **FR-001**: O sistema MUST manter um catálogo de premissas em validação da instalação, cada uma
  com código estável (P01, P02…), tema, pergunta objetiva, premissa em uso, onde afeta o sistema,
  opções conhecidas (opcional) e referência ao documento ou spec de origem.
- **FR-002**: O conteúdo do catálogo MUST vir da versão do sistema (não é editável pela tela) e
  MUST conter todas as premissas listadas no Apêndice A.
- **FR-003**: A tela "Premissas em validação" MUST listar as premissas por tema, com a situação
  atual ("Aguardando resposta", "Confirmada", "Precisa mudar"), filtros por situação e por tema e
  o total por situação.
- **FR-004**: A coordenação (de qualquer edição da instalação, inclusive encerrada) MUST ler e
  responder. Docentes e mentores com vínculo ativo em qualquer edição MUST poder só ler (lista,
  situação e histórico com justificativas). O servidor MUST recusar estudantes e visitantes e
  MUST recusar registro de quem não é coordenação.
- **FR-004a**: A tela MUST oferecer "Baixar lista (CSV)" (código, tema, pergunta, premissa em uso,
  situação e última resposta: decisão, justificativa, autor e data), com a proteção contra
  fórmulas dos relatórios da spec 008, e MUST ter versão para impressão (sem menu e botões, cada
  premissa num bloco inteiro).
- **FR-005**: O início da coordenação MUST mostrar quantas premissas aguardam resposta, com link
  para a tela, quando houver alguma.

**Respostas (US2)**

- **FR-006**: A coordenação MUST poder registrar "Confirmada" ou "Precisa mudar" com
  justificativa de 10 a 2.000 caracteres; em "Precisa mudar", a justificativa descreve o que deve
  mudar.
- **FR-007**: Cada resposta MUST guardar quem registrou e quando; a situação atual é a da
  resposta mais recente; as anteriores MUST continuar consultáveis no histórico da premissa.
  Respostas não são editadas nem apagadas.
- **FR-008**: O registro MUST recusar envio feito sobre uma situação desatualizada (outra resposta
  registrada depois de a tela carregar), informando a resposta atual.
- **FR-009**: A situação MUST mudar na tela só após a resposta do servidor; offline, o envio fica
  bloqueado (constituição VII).
- **FR-010**: Toda resposta MUST ficar na auditoria.
- **FR-011**: Registrar "Precisa mudar" MUST NOT alterar regras ou comportamento do sistema; a
  tela MUST informar que a premissa em uso continua valendo até uma mudança ser especificada.

**Limpeza e ajustes técnicos (US3)**

- **FR-012**: A documentação MUST marcar como resolvidos, com a referência, os itens já decididos
  por specs posteriores (Apêndice B) e os resolvidos por esta spec.
- **FR-013**: Datas de relatórios e o corte de "encontro realizado" MUST usar o fuso
  `America/Fortaleza`, sem mudar resultados atuais.
- **FR-014**: Ao fim, toda marca em aberto da documentação MUST estar no catálogo ou marcada como
  resolvida (SC-003).

### Key Entities _(include if feature involves data)_

- **Premissa**: código, tema, pergunta, premissa em uso, onde afeta, opções (lista opcional),
  referência, ordem; e, se retirada, a spec que a resolveu.
- **Resposta à premissa**: premissa, decisão ("confirmada" ou "precisa_mudar"), justificativa,
  quem registrou (nome no momento do registro) e quando.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A coordenação encontra qualquer premissa do catálogo em até 3 interações (abrir a
  tela, filtrar por tema ou situação, abrir o item).
- **SC-002**: 100% das respostas registradas aparecem no histórico da premissa e na auditoria,
  com autor e data.
- **SC-003**: Zero marcas **[validar]**, **[decidir]** ou **[pendência]** em aberto na
  documentação fora do catálogo, verificado por busca em `docs`, `src`, `supabase/tests` e nas
  migrations desta spec (specs e migrations anteriores ficam como registro histórico e não são
  editadas).
- **SC-004**: Zero leituras aceitas para estudante ou visitante e zero registros aceitos para
  quem não é coordenação, nos testes do servidor.

## Assumptions

- O catálogo e as respostas são da instalação (uma unidade, conforme spec 010), não de cada
  edição.
- Respostas não mudam regras automaticamente; cada "Precisa mudar" vira entrada de trabalho para
  uma spec futura (constituição X: nada é inventado nem aplicado sem especificação).
- A redação das perguntas é feita a partir da documentação existente, sem acrescentar regras.
- Itens de operação que dependem de infraestrutura (provedor de e-mail, SMTP) entram no catálogo
  como premissas do tema "Operação".

## Apêndice A — Catálogo inicial

| Código | Tema                     | Premissa em uso (resumo)                                                                          |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------- |
| P01    | Identidade visual        | SVGs da marca de `docs/referencias/` (não os de `VETORIZADAS CLAUDE/`)                            |
| P02    | Identidade visual        | 117 ícones redesenhados a partir das pranchas, no mesmo estilo                                    |
| P03    | Identidade visual        | Cores da interface pelos tokens (`#062457`, `#FFB820`), não pela prancha (`#0B2D6B`, `#FFC02E`)   |
| P04    | Identidade visual        | Seta da marca em coral `#FC4B55`, como nos SVGs oficiais                                          |
| P05    | Identidade visual        | Menu lateral com 17,5rem (celular 16rem, tablet 18rem)                                            |
| P06    | Identidade visual        | Padrões gráficos recriados em SVG a partir da prancha 08                                          |
| P07    | Identidade visual        | Ícones do aplicativo instalado gerados do símbolo, fundo branco no ícone adaptável                |
| P08    | Identidade visual        | Fonte Montserrat (licença SIL OFL) hospedada com o aplicativo                                     |
| P09    | Pontuação                | Arredondamento: 2 casas, meio para cima, só no componente e no total                              |
| P10    | Pontuação                | Teto de 10 pontos para descontos de ocorrências; plágio (zerar entrega) fora do teto              |
| P11    | Pontuação                | Prorrogação ou impedimento registrado: sem desconto de atraso                                     |
| P12    | Pontuação                | Penalidade repetida pelo mesmo fato: vale a primeira, as demais são ignoradas com aviso           |
| P13    | Pontuação                | Premiação registrada como configuração; valores, quantidade, validade e entrega a definir         |
| P14    | Pontuação                | Vários desafios/listas no encontro: componente é a média simples dos itens                        |
| P15    | Pontuação                | Trio: presença dos três limitada ao máximo por equipe (piloto 10)                                 |
| P16    | Pontuação                | Penalidades e prazos de 24 h conforme o PRD, a conferir com o regulamento                         |
| P17    | Pontuação                | Nota da prova sem escala 0–100 confirmada fica pendente; o sistema não converte escalas           |
| P18    | Pontuação                | Limites de proteção das regras: 20 critérios, nomes de 80 caracteres, 0–4 casas, 1–20 encontros   |
| P19    | Pontuação                | Pontuação máxima da turma soma as regras de cada encontro, inclusive avaliação objetiva diferente |
| P20    | Equipes e atividades     | Limite de atraso exibido do desafio: o maior entre as turmas (cada equipe usa o da sua)           |
| P21    | Equipes e atividades     | Justificativa mínima de 10 caracteres para substituir integrante ou desfazer equipe               |
| P22    | Equipes e atividades     | Convites de equipe não expiram e não têm limite por estudante                                     |
| P23    | Equipes e atividades     | Nomes de equipe sem moderação; docente/mentor renomeia com justificativa                          |
| P24    | Equipes e atividades     | Prorrogação/impedimento registrados por docente/mentor da turma ou pela coordenação               |
| P25    | Acesso e edições         | Cadastro permanente de cursos e turmas; instalação de uma só unidade                              |
| P26    | Acesso e edições         | Busca de pessoas limitada às contas das edições que a coordenação coordena, sem e-mail            |
| P27    | Acesso e edições         | Mentor vinculado ao curso atua em todas as turmas dele                                            |
| P28    | Acesso e edições         | Edição encerrada não é reaberta                                                                   |
| P29    | Comunicados e relatórios | Público dos comunicados por perfil e turma; sem público por equipe ou por pessoa                  |
| P30    | Comunicados e relatórios | Comunicado: título de 1 a 200 caracteres, texto de 1 a 5.000, sem formatação                      |
| P31    | Comunicados e relatórios | Listas com 10 itens por página                                                                    |
| P32    | Operação                 | E-mails de convite e recuperação de senha: provedor e remetente da unidade a definir              |

## Apêndice B — Itens resolvidos por specs posteriores ou por esta spec

| Item                                                           | Resolvido por                        |
| -------------------------------------------------------------- | ------------------------------------ |
| Encontros valem para todas as turmas da edição                 | Spec 011 (encontros por turma)       |
| Ranking por categoria (categoria = curso)                      | Spec 012 (ranking por turma)         |
| Atividades diferentes por turma afetam o ranking por curso     | Spec 012 (ranking por turma)         |
| Encerramento ainda confere "categoria sem ranking"             | Spec 013 (já riscado)                |
| Fuso `America/Sao_Paulo` nos relatórios e no corte de encontro | Esta spec (`America/Fortaleza`)      |
| Contraste e axe no navegador real e leitor de tela pendentes   | Spec 014 (auditoria; roteiro manual) |
