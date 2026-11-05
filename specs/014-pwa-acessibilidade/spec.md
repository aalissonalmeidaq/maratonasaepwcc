# Feature Specification: PWA, regulamento público offline e acessibilidade

**Feature Branch**: `014-pwa-acessibilidade`
**Created**: 2026-11-04
**Status**: Draft
**Input**: User description: "Incremento 5 do PRD (RF18, HU07, RNF02–RNF04): PWA instalável com
aviso de atualização, leitura offline do conteúdo público previamente carregado — uma página
pública, sem login, com o resumo das regras da edição e as datas dos encontros, guardada para ler
offline — e auditoria de acessibilidade com meta WCAG 2.2 AA, verificação automática no
navegador real e um roteiro de teste com leitor de tela para a unidade executar."

**Rastreabilidade**: PRD RF18, HU07, RNF01–RNF04; Design System §10 (PWA e conectividade) e
acessibilidade; ADR 0005 (PWA e cache: "leitura offline de conteúdo público além do shell exige
definir quais conteúdos são públicos"); specs 009 e 011 (resumo do regulamento e regras da
turma). Constituição VI, VII, VIII, X.

## Clarifications

### Session 2026-11-04

- Q: Offline, o que o aplicativo deve conseguir mostrar? → A: O shell e, além dele, uma página
  pública (sem login) com o resumo das regras da edição e as datas dos encontros, guardada para
  leitura offline. Nada autenticado fica gravado no aparelho.
- Q: Qual meta e qual forma de validação da acessibilidade? → A: WCAG 2.2 nível AA, com
  verificação automática no navegador real nas telas principais dos três perfis (celular e
  desktop), jornadas só com teclado e um roteiro de teste com leitor de tela para a unidade
  executar, com os resultados registrados.
- Q: O sistema permite mais de uma edição ativa ao mesmo tempo. Qual edição a página pública deve
  mostrar? → A: Todas as edições ativas com o regulamento publicado, uma seção por edição, pela
  data de início.
- Q: Além de número, título, data e horário, o que mais dos encontros a página pública mostra?
  → A: A situação (agendado, realizado, cancelado); o ambiente e as orientações ficam só para quem
  entra no sistema.
- Q: Uma edição ativa aparece na página pública automaticamente ou só com autorização? → A: Só
  depois que a coordenação da edição autorizar ("Publicar regulamento"); a mudança fica na
  auditoria.
- Q: Quando uma edição com o regulamento publicado é encerrada, continua na página pública? → A:
  Não: sai ao encerrar. A coordenação pode retirar a publicação a qualquer momento enquanto a
  edição está ativa.

- Q: Se o navegador não conseguir salvar o regulamento para leitura offline, como a página deve
  se comportar? → A: Mostrar o regulamento online e avisar que não foi possível salvar para
  leitura offline.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Regulamento público, sem login (Priority: P1)

Qualquer pessoa — estudante antes do primeiro acesso, responsável, visitante — abre a página
pública do regulamento a partir da tela de entrada e vê, de cada edição ativa cujo regulamento a
coordenação publicou, o resumo das regras de pontuação e a lista de encontros com data, horário e
situação. A página não pede login e não mostra nenhum dado de pessoa, equipe, nota ou ocorrência.
A coordenação decide, na tela da edição, quando publicar e quando retirar o regulamento público.

**Why this priority**: é o "conteúdo público" que o PRD (RNF03, RNF04, HU07) manda guardar para
leitura offline; sem ele, não há o que ler offline sem violar a privacidade.

**Independent Test**: como coordenação, publicar o regulamento de uma edição ativa; sem entrar no
sistema, abrir a página pública a partir da tela de entrada e ver o resumo das regras e os
encontros dessa edição; conferir que não há nomes de pessoas nem de equipes; retirar a publicação
e ver a edição sair da página.

**Acceptance Scenarios**:

1. **Given** uma edição ativa com o regulamento publicado, **When** alguém abre a página pública
   do regulamento, **Then** vê o nome da edição, o resumo das regras de pontuação (como no
   regulamento da spec 009, pelas regras vigentes da edição) e os encontros com número, título,
   data, horário (ou "horário a confirmar") e situação (agendado, realizado, cancelado).
2. **Given** a página pública, **When** ela carrega, **Then** não aparece nenhum nome de pessoa,
   equipe, turma, nota, pontuação de equipe, ocorrência, ambiente ou orientação de encontro.
3. **Given** nenhuma edição ativa com o regulamento publicado, **When** alguém abre a página,
   **Then** vê "Nenhum regulamento publicado no momento."
4. **Given** duas edições ativas com o regulamento publicado, **When** a página abre, **Then**
   mostra uma seção por edição, pela data de início.
5. **Given** a coordenação de uma edição ativa, **When** escolhe "Publicar regulamento" na tela da
   edição, **Then** a edição passa a aparecer na página pública; **When** escolhe "Retirar
   regulamento", **Then** a edição sai da página; as duas mudanças ficam na auditoria.
6. **Given** uma edição em rascunho ou encerrada, **When** a coordenação abre a tela da edição,
   **Then** não há a opção de publicar; ao encerrar uma edição publicada, ela sai da página
   pública.
7. **Given** docente ou estudante, **When** tenta publicar ou retirar o regulamento, **Then** o
   servidor recusa.
8. **Given** a tela de entrada, **When** a pessoa procura o regulamento, **Then** há um link
   "Regulamento da Maratona" que leva à página pública.
9. **Given** o resumo, **When** a página mostra as regras, **Then** avisa "Resumo em validação: o
   regulamento oficial aprovado prevalece." (como na spec 009).
10. **Given** o modo demonstração, **When** a página é aberta, **Then** mostra os dados fictícios
    identificados como tais.

---

### User Story 2 - Leitura offline do que já foi carregado (Priority: P1)

Depois de visitar a página pública com internet e salvar o conteúdo com sucesso, a pessoa
consegue abri-la sem conexão e vê o último conteúdo salvo, com a data em que foi salvo.
Se não for possível salvar, a leitura online continua disponível com um aviso. O aplicativo também abre offline: a tela
de entrada e as áreas internas mostram claramente que não há conexão, sem erro técnico, e nenhuma
ação de envio, avaliação ou registro simula sucesso.

**Why this priority**: é a HU07 e o RNF04; junto da US1 entrega o modo offline previsto no MVP.

**Independent Test**: com internet, abrir a página pública; desligar a conexão e recarregar: a
página abre com o conteúdo e "Salvo em …"; abrir uma área interna offline e ver o aviso de "sem
conexão" no lugar de erro; tentar uma ação de envio e vê-la bloqueada.

**Acceptance Scenarios**:

1. **Given** uma cópia salva com sucesso em visita anterior à página pública, **When** a pessoa
   a abre sem conexão, **Then** vê o último conteúdo salvo e "Conteúdo salvo em <data e hora>.
   Pode estar desatualizado."
2. **Given** nenhuma visita anterior, **When** a pessoa abre a página pública sem conexão,
   **Then** vê "Sem conexão: abra esta página com internet uma vez para lê-la depois offline."
3. **Given** o aplicativo já aberto uma vez, **When** a pessoa o abre sem conexão, **Then** a
   tela de entrada carrega e informa que entrar exige conexão; o link do regulamento público
   continua disponível.
4. **Given** uma área interna aberta, **When** a conexão cai e a pessoa navega para outra tela
   ainda não carregada, **Then** vê "Sem conexão: esta tela precisa de internet para carregar."
   no lugar de uma mensagem de erro técnica; telas já carregadas na sessão continuam visíveis.
5. **Given** sem conexão, **When** a pessoa tenta enviar, avaliar, registrar ou publicar,
   **Then** a ação fica bloqueada com o motivo, sem simular sucesso (como já ocorre).
6. **Given** a conexão volta, **When** a pessoa está numa tela de "sem conexão", **Then** a tela
   tenta carregar de novo sem precisar recarregar o aplicativo.
7. **Given** a página pública carregada com internet, **When** o navegador não consegue salvar
   o conteúdo por falta de espaço ou armazenamento bloqueado, **Then** a leitura online continua
   disponível e a página avisa "Não foi possível salvar o regulamento para leitura offline.",
   sem indicar que o conteúdo atual foi salvo.

---

### User Story 3 - Instalar e atualizar o aplicativo (Priority: P2)

A pessoa instala o aplicativo quando o navegador permite, ou recebe a orientação de como
adicioná-lo à tela inicial quando o navegador não oferece a instalação (iPhone/iPad). Quando sai
uma nova versão, ela vê o aviso e escolhe quando atualizar.

**Why this priority**: o RF18 já tem a base (instalação, aviso de atualização, indicador de
conexão); esta história completa a orientação para quem não tem o botão de instalar e verifica o
fluxo de ponta a ponta.

**Independent Test**: no Android/desktop, ver o botão "Instalar aplicativo"; no iPhone, ver a
orientação "Compartilhar → Adicionar à Tela de Início"; publicar uma versão nova e ver o aviso de
atualização.

**Acceptance Scenarios**:

1. **Given** um navegador que oferece instalação, **When** a pessoa abre o menu, **Then** vê
   "Instalar aplicativo" (como já ocorre).
2. **Given** Safari no iPhone/iPad, **When** a pessoa abre o menu, **Then** vê a orientação para
   adicionar à tela inicial pelo botão Compartilhar.
3. **Given** o aplicativo já instalado, **When** é aberto, **Then** a orientação e o botão de
   instalar não aparecem.
4. **Given** uma nova versão publicada, **When** a pessoa usa o aplicativo, **Then** vê o aviso de
   atualização e a nova versão só entra quando ela escolhe "Atualizar agora" (como já ocorre).

---

### User Story 4 - Acessibilidade WCAG 2.2 AA (Priority: P2)

As telas principais dos três perfis atendem WCAG 2.2 nível AA: verificação automática sem
violações no navegador real (celular e desktop), jornadas completas só com teclado, foco visível
e não encoberto, alvos de toque com pelo menos 24×24 px e contraste verificado. A unidade recebe
um roteiro de teste com leitor de tela para executar, e os resultados ficam registrados.

**Why this priority**: o RNF02 e a constituição VIII exigem; a verificação no navegador real e o
leitor de tela ficaram pendentes desde a spec 001.

**Independent Test**: rodar a verificação automática nas telas principais e não ter violações
AA; fazer as jornadas de teclado; entregar o roteiro de leitor de tela.

**Acceptance Scenarios**:

1. **Given** as telas principais (entrada, regulamento público, início, ranking, pontuação,
   encontros, presença, avaliações, edições), **When** a verificação automática roda no navegador
   real em celular e desktop, **Then** não há violações das regras WCAG 2.2 A e AA.
2. **Given** só o teclado, **When** a pessoa entra no sistema, navega pelo menu, abre o ranking e
   sai, **Then** consegue concluir sem mouse, com o foco sempre visível e nunca coberto por
   elementos fixos (cabeçalho, aviso de demonstração).
3. **Given** botões, links e controles, **When** medidos, **Then** têm alvo de pelo menos 24×24 px
   ou espaçamento equivalente (WCAG 2.2, 2.5.8).
4. **Given** o roteiro de leitor de tela, **When** a unidade o executa com NVDA (computador) e
   TalkBack (Android), **Then** cada passo tem o resultado esperado descrito e um campo para
   registrar o obtido; os resultados ficam registrados na documentação.
5. **Given** uma violação encontrada, **When** for corrigida, **Then** a verificação automática
   passa a cobri-la para não voltar.

### Edge Cases

- Publicação nova, retirada ou encerramento: a página pública mostra a mudança na próxima visita
  com internet; offline continua a versão salva, com a data em que foi salva.
- Nenhuma edição publicada: "Nenhum regulamento publicado no momento."; a versão salva offline
  continua com a data em que foi salva.
- Edição publicada sem encontros cadastrados: a seção mostra "Encontros ainda não divulgados."
- Edição publicada é encerrada (o ciclo da spec 010 é rascunho → ativa → encerrada, sem volta):
  deixa de aparecer, sem a coordenação precisar retirar.
- Pessoa logada abre a página pública: vê o mesmo conteúdo público; nada da sessão entra no que é
  guardado para offline.
- Saída do sistema ("Sair") em computador compartilhado: nada autenticado fica no cache; a página
  pública salva continua disponível.
- Navegador sem suporte a service worker: o aplicativo funciona online; a leitura offline não fica
  disponível e nada quebra.
- Falta de espaço ou armazenamento bloqueado: a página mantém a leitura online e avisa que não
  conseguiu salvar para leitura offline; não promete acesso offline ao conteúdo que não foi salvo.
- Zoom de 200% e texto ampliado: a página pública e as telas principais continuam legíveis, sem
  rolagem horizontal.

## Requirements _(mandatory)_

### Functional Requirements

**Regulamento público (RNF03, HU07)**

- **FR-001**: O sistema MUST oferecer uma página pública, sem login, com uma seção por edição
  ativa com o regulamento publicado (pela data de início): nome da edição, resumo das regras de
  pontuação vigentes da edição e os encontros (número, título, data, horário ou "horário a
  confirmar" e situação: agendado, realizado ou cancelado).
- **FR-002**: A página pública MUST NOT exibir nem receber do servidor nomes ou dados de pessoas,
  equipes, turmas, notas, pontuações, ocorrências, comunicados, ambientes ou orientações de
  encontros.
- **FR-003**: O servidor MUST liberar esses dados públicos a quem não está autenticado, e apenas
  esses campos, só de edições ativas com o regulamento publicado.
- **FR-004**: A tela de entrada MUST ter o link "Regulamento da Maratona" para a página pública.
- **FR-005**: Sem edição ativa com o regulamento publicado, a página MUST mostrar "Nenhum
  regulamento publicado no momento."
- **FR-005a**: A coordenação da edição MUST poder publicar ("Publicar regulamento") e retirar
  ("Retirar regulamento") o regulamento público de uma edição ativa, na tela da edição; outros
  perfis MUST ser recusados pelo servidor; cada mudança MUST ficar na auditoria. Edição em
  rascunho ou encerrada MUST NOT aparecer na página pública, mesmo que tenha sido publicada antes.

**Offline (RF18, RNF04, HU07)**

- **FR-006**: Após uma visita com conexão e gravação bem-sucedida, a página pública MUST abrir
  sem conexão com o último conteúdo salvo e a data e hora em que foi salvo.
- **FR-006a**: Se o navegador não conseguir salvar o regulamento por falta de espaço ou
  armazenamento bloqueado, a página MUST manter a leitura online e mostrar "Não foi possível
  salvar o regulamento para leitura offline."; MUST NOT indicar que o conteúdo atual foi salvo.
- **FR-007**: O que é guardado para leitura offline MUST ser só o shell do aplicativo e o conteúdo
  público da FR-001; nenhuma resposta autenticada MUST ser guardada no aparelho (ADR 0005,
  constituição VI).
- **FR-008**: Sem conexão, telas que precisam do servidor MUST mostrar "Sem conexão: esta tela
  precisa de internet para carregar." no lugar de erro técnico, e MUST tentar de novo quando a
  conexão voltar.
- **FR-009**: Ações de envio, avaliação, registro e publicação MUST continuar bloqueadas offline,
  sem simular sucesso (constituição VII).

**Instalação e atualização (RF18)**

- **FR-010**: Em navegadores sem o pedido de instalação (Safari no iPhone/iPad), o menu MUST
  mostrar a orientação para adicionar à tela inicial; no aplicativo instalado, a orientação e o
  botão de instalar MUST NOT aparecer.
- **FR-011**: A atualização MUST continuar sob escolha da pessoa ("Atualizar agora"), como na
  ADR 0005.

**Acessibilidade (RNF02, constituição VIII)**

- **FR-012**: As telas principais (FR-013) MUST passar na verificação automática das regras WCAG
  2.2 A e AA no navegador real, em celular e desktop.
- **FR-013**: Telas principais: entrada, regulamento público, início dos três perfis, ranking da
  turma, pontuação da equipe, encontros, presença, avaliações, ranking da coordenação e edições.
- **FR-014**: As jornadas de entrar, navegar pelo menu, abrir o ranking e sair MUST poder ser
  feitas só com teclado, com foco visível e não encoberto por elementos fixos.
- **FR-015**: Controles interativos MUST ter alvo de pelo menos 24×24 px ou o espaçamento
  equivalente (WCAG 2.2, 2.5.8).
- **FR-016**: Um roteiro de teste com leitor de tela (NVDA e TalkBack) MUST ser entregue com os
  passos, o resultado esperado e um campo para o resultado obtido; os resultados da execução pela
  unidade ficam registrados na documentação.

### Key Entities _(include if feature involves data)_

- **Publicação do regulamento**: marca da edição dizendo se o regulamento é público, com quem e
  quando publicou ou retirou (na auditoria).
- **Regulamento público**: para cada edição ativa publicada, nome, data de início, resumo das
  regras de pontuação vigentes (sem ajustes por turma) e encontros (número, título, data, horário,
  situação); mais a data e hora em que o conteúdo foi gerado ou salvo.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A página pública abre sem conexão em 100% dos casos com cópia previamente salva
  disponível e suporte a leitura offline, mostrando a data em que foi salva. Em 100% dos testes
  de falta de espaço ou armazenamento bloqueado, a leitura online continua disponível e o aviso
  da FR-006a aparece, sem confirmação falsa de gravação.
- **SC-002**: Zero respostas autenticadas guardadas no cache do aplicativo, verificado
  inspecionando o armazenamento depois de usar os três perfis e sair.
- **SC-003**: Zero violações WCAG 2.2 A/AA na verificação automática das telas principais, em
  celular e desktop.
- **SC-004**: As jornadas de teclado dos três perfis são concluídas sem mouse em 100% das
  execuções dos testes de ponta a ponta.
- **SC-005**: O roteiro de leitor de tela cobre 100% das telas principais.

## Assumptions

- "Conteúdo público" é só o da FR-001; comunicados, ranking, ambientes, orientações e qualquer
  dado da turma continuam exigindo login.
- Edições existentes começam com o regulamento não publicado; publicar é decisão da coordenação.
- O resumo público usa as regras vigentes da edição (sem ajustes por turma, que dependem de saber
  a turma da pessoa).
- A verificação automática cobre o que ferramentas detectam; o roteiro de leitor de tela e a
  revisão humana completam o que elas não detectam. Não se declara certificação de conformidade.
- A execução do roteiro com leitor de tela é feita pela unidade; esta spec entrega o roteiro e o
  lugar para registrar os resultados.
