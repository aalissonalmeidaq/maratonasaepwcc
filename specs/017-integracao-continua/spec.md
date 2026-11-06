# Feature Specification: Integração contínua das verificações

**Feature Branch**: `017-integracao-continua`
**Created**: 2026-11-06
**Status**: Draft
**Input**: User description: "Spec 017 — integração contínua (CI) no GitHub. Os PRs #19–#22 foram
mesclados sem nenhum check automático; as verificações exigidas pelo projeto só rodam na máquina de
quem desenvolve. Toda proposta de mudança (PR) para o main roda automaticamente essas verificações,
mostra o resultado no PR e a mesclagem só é permitida com tudo verde."

**Rastreabilidade**: `CLAUDE.md` ("Antes de concluir: verify, test:e2e e, com Docker, test:db"),
`docs/operacao-e-homologacao.md`, constituição (portões de qualidade, segurança e dados). Os PRs
#19 a #22 foram mesclados sem nenhuma verificação automática.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Todo PR mostra o resultado das verificações (Priority: P1)

Quem abre uma proposta de mudança para o `main` vê, na própria proposta, o resultado das
verificações do projeto: qualidade do código (tipos, estilo, testes de unidade e build), regras de
segurança do banco, jornadas de ponta a ponta no modo demonstração e jornadas contra o banco local.
Cada grupo aparece como uma verificação separada, com verde ou vermelho.

**Why this priority**: hoje nada garante que as verificações exigidas pelo projeto foram rodadas;
isso depende de quem desenvolve lembrar. É o valor central da spec.

**Independent Test**: abrir uma proposta com uma mudança qualquer e conferir que as quatro
verificações iniciam sozinhas e terminam com resultado visível na proposta.

**Acceptance Scenarios**:

1. **Given** uma proposta aberta para o `main`, **When** ela é criada ou recebe novos commits,
   **Then** as quatro verificações (qualidade, banco, jornadas de demonstração, jornadas com banco
   local) rodam sozinhas e o resultado de cada uma aparece na proposta.
2. **Given** uma mudança que quebra um teste, **When** as verificações terminam, **Then** a
   verificação correspondente fica vermelha, as demais seguem independentes e a proposta mostra
   qual falhou.
3. **Given** uma proposta já verificada, **When** novos commits são enviados, **Then** a execução
   anterior ainda em andamento é cancelada e só a mais recente vale.

---

### User Story 2 - Falha deixa evidência para diagnóstico (Priority: P2)

Quando uma verificação de jornadas falha, a pessoa que desenvolve consegue entender por quê sem
reproduzir na própria máquina: os relatórios e os registros de execução (traços, capturas e
vídeos das jornadas, resultados dos testes) ficam guardados e baixáveis a partir da proposta.

**Why this priority**: falhas de jornada de ponta a ponta são difíceis de entender só pelo texto;
sem evidência a CI vira ruído e é ignorada.

**Independent Test**: provocar uma falha de jornada de propósito e baixar o artefato da execução
com o traço da jornada que falhou.

**Acceptance Scenarios**:

1. **Given** uma verificação de jornadas que falhou, **When** a execução termina, **Then** o
   relatório e os traços da falha ficam disponíveis para download por tempo limitado.
2. **Given** uma verificação que passou, **When** a execução termina, **Then** não são guardados
   traços de falha (apenas o resumo), para não ocupar espaço.

---

### User Story 3 - Mesclagem só com tudo verde (Priority: P2)

O dono do repositório consegue exigir que a mesclagem no `main` só aconteça com as quatro
verificações verdes. Esse bloqueio é uma configuração do repositório, feita uma vez pelo dono, com
passo a passo documentado; o pipeline em si nunca altera configurações do repositório.

**Why this priority**: sem o bloqueio, a CI é apenas informativa; mas ele depende de permissão que
só o dono tem, por isso fica como passo guiado e não como código.

**Independent Test**: seguir o passo a passo documentado e comprovar que uma proposta com
verificação vermelha ou pendente não pode ser mesclada.

**Acceptance Scenarios**:

1. **Given** a regra de proteção configurada conforme a documentação, **When** alguma verificação
   está vermelha ou pendente, **Then** a mesclagem fica bloqueada.
2. **Given** a regra configurada, **When** as quatro verificações ficam verdes, **Then** a
   mesclagem é liberada.
3. **Given** a documentação, **When** o dono lê o passo a passo, **Then** encontra os nomes exatos
   das verificações a exigir e a explicação de que o pipeline não faz essa configuração.

---

### User Story 4 - Verificação do main e execução manual (Priority: P3)

Depois de cada mesclagem, as verificações rodam também sobre o `main`, e quem mantém o projeto pode
disparar uma execução manual (por exemplo, para reexecutar após uma falha de infraestrutura).

**Why this priority**: detecta regressão de mesclagens combinadas e instabilidade do ambiente, mas
não é necessária para o bloqueio das propostas.

**Independent Test**: mesclar uma proposta e conferir que há execução no `main`; disparar uma
execução manual e conferir o resultado.

**Acceptance Scenarios**:

1. **Given** uma mesclagem no `main`, **When** ela termina, **Then** as verificações rodam sobre o
   `main` e o resultado fica visível no histórico.
2. **Given** a necessidade de reexecutar, **When** a pessoa dispara a execução manual, **Then** as
   verificações rodam sobre a versão escolhida.

---

### Edge Cases

- Proposta vinda de uma cópia (fork) do repositório: as verificações rodam sem acesso a nenhum
  segredo; como o projeto não precisa de segredos, devem funcionar igualmente.
- Falha de infraestrutura (download de dependência, imagem do banco local indisponível): a
  verificação falha de forma identificável e pode ser reexecutada sem novo commit.
- Verificação lenta ou travada: tem limite de tempo; estourar o limite conta como falha.
- Mudança só de documentação: continua rodando as verificações (o custo é aceitável e evita
  exceções que escondem quebras, como comandos documentados que deixam de funcionar).
- Duas propostas simultâneas: cada uma usa seu próprio ambiente isolado; nenhuma depende do
  estado deixado pela outra.
- Testes que dependem de ordem ou de dados deixados por execuções anteriores: o ambiente nasce
  limpo a cada execução, com o seed fictício local.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Toda proposta de mudança para o `main` MUST disparar automaticamente, ao ser criada
  e a cada novo commit, as verificações do projeto, sem ação manual.
- **FR-002**: As verificações MUST ser quatro grupos independentes, cada um com resultado próprio
  na proposta: (1) qualidade do código (tipos, estilo, testes de unidade, build); (2) regras de
  segurança do banco; (3) jornadas de ponta a ponta no modo demonstração; (4) jornadas contra o
  banco local, incluindo funções de servidor e caixa de e-mail de teste.
- **FR-003**: As verificações MUST reproduzir exatamente os comandos exigidos por `CLAUDE.md` e
  pelo `package.json`; o pipeline MUST NOT redefinir critérios de aprovação diferentes dos que
  valem na máquina de quem desenvolve.
- **FR-004**: O banco usado MUST ser local, efêmero e criado do zero dentro de cada execução, com
  as migrations e o seed fictício; o pipeline MUST NOT conectar nenhum banco remoto nem executar
  seed fora do ambiente local da própria execução.
- **FR-005**: O pipeline MUST NOT exigir, ler ou gravar segredos; as chaves locais efêmeras do
  banco local são geradas na própria execução e nunca vão para o frontend de produção.
- **FR-006**: Relatórios e traços das jornadas MUST ser guardados e baixáveis quando uma
  verificação de jornadas falhar, com prazo de retenção limitado.
- **FR-007**: Uma nova execução para a mesma proposta MUST cancelar a anterior ainda em andamento.
- **FR-008**: Cada verificação MUST ter limite de tempo; estourar o limite conta como falha.
- **FR-009**: O pipeline MUST reaproveitar dependências já baixadas entre execuções para manter o
  tempo total aceitável, sem que o cache altere o resultado.
- **FR-010**: As verificações MUST rodar também sobre o `main` após cada mesclagem e poder ser
  disparadas manualmente.
- **FR-011**: O pipeline MUST NOT alterar configurações do repositório (proteção de branch,
  permissões, segredos); essas configurações são passos manuais do dono, documentados.
- **FR-012**: A documentação em português do Brasil MUST explicar: o que cada verificação cobre,
  como reproduzi-la localmente, como baixar os artefatos de falha, como reexecutar, e o passo a
  passo para o dono exigir as quatro verificações antes de mesclar (com os nomes exatos).
- **FR-013**: O pipeline MUST usar permissões mínimas (somente leitura do conteúdo do repositório).
- **FR-014**: Uma mudança que quebre propositalmente qualquer um dos quatro grupos MUST ser
  detectada por aquele grupo (provado por uma proposta de teste descartável ou por execução local
  equivalente documentada).

### Key Entities

- **Verificação**: um dos quatro grupos de checagem, com nome estável, resultado (verde,
  vermelho, cancelada), duração e, em falha de jornadas, artefatos.
- **Execução**: uma rodada das verificações para uma proposta, para o `main` ou manual; pode ser
  cancelada por outra mais recente.
- **Artefato de falha**: relatório e traços guardados por tempo limitado.
- **Regra de proteção**: configuração manual do repositório que exige as quatro verificações
  verdes; fora do código.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das propostas para o `main` abertas após a entrega têm as quatro verificações
  executadas automaticamente, sem ação de quem desenvolve.
- **SC-002**: Uma mudança que quebre um teste de qualquer um dos quatro grupos faz exatamente
  aquele grupo ficar vermelho em todas as tentativas de prova (3 de 3).
- **SC-003**: O tempo total até o resultado de todas as verificações numa proposta é de até 25
  minutos, com os grupos independentes rodando em paralelo.
- **SC-004**: Em toda falha de jornada, o traço da jornada que falhou pode ser baixado a partir da
  proposta em até 2 cliques, sem reproduzir localmente.
- **SC-005**: Com a regra de proteção configurada, 0 propostas com verificação vermelha ou
  pendente conseguem ser mescladas.
- **SC-006**: O dono do repositório configura o bloqueio em até 10 minutos seguindo só a
  documentação.
- **SC-007**: Nenhuma execução usa segredo do repositório nem acessa serviço remoto do projeto
  (conferido na revisão do pipeline).

## Assumptions

- O repositório está no GitHub e usa propostas de mudança (PRs) para o `main`, como nos PRs #19–#22.
- As verificações exigidas são as de `CLAUDE.md`: `verify`, `test:db`, `test:e2e` e
  `test:e2e:supabase`; o pipeline as executa como estão.
- O ambiente de execução do GitHub oferece Docker, necessário para o banco local do Supabase.
- "Exigir verificações antes de mesclar" exige permissão de administrador e fica como passo manual
  documentado (FR-011); o plano pode oferecer, como alternativa opcional, o comando para o dono
  aplicar a regra.
- O tempo de 25 minutos considera o custo observado localmente (qualidade ~1 min, banco ~10 s,
  jornadas de demonstração ~2 min, jornadas com banco ~5 min) mais a preparação do ambiente.
- Retenção dos artefatos de falha: 7 dias.
- Fora de escopo: implantação (deploy), publicação, análise estática de segurança de terceiros,
  cobertura de código com limite mínimo, e testes contra qualquer ambiente remoto.
