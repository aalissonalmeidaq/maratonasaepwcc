# Feature Specification: Busca dinâmica e paginação nas listagens

**Feature Branch**: `005-busca-paginacao`
**Created**: 2026-10-30
**Status**: Draft
**Input**: User description: "todas as listagens devem ser paginadas e devem possuir uma busca
dinâmica (filtra enquanto é digitado)."

**Rastreabilidade**: constituição VIII (acessibilidade e responsividade), IX.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Encontrar um registro digitando (Priority: P1)

Quem consulta uma listagem (cursos, turmas, vínculos, duplas, encontros, ambientes, presença,
rubricas, classificação) digita parte de um nome e a lista é filtrada a cada tecla, sem botão
de enviar.

**Acceptance Scenarios**:

1. **Given** uma listagem com registros, **When** a pessoa digita "ana", **Then** só ficam as
   linhas em que algum campo visível contém "ana", ignorando maiúsculas e acentos ("Ána", "ANA").
2. **Given** um termo com duas palavras ("lucia turma"), **When** é digitado, **Then** ficam as
   linhas que contêm **todas** as palavras, em qualquer coluna.
3. **Given** um termo sem resultados, **Then** a listagem informa "Nenhum resultado para “termo”"
   e oferece "Limpar busca"; a caixa de busca continua visível.
4. **Given** a busca, **Then** o número de resultados é anunciado a leitores de tela sem mover o
   foco.

### User Story 2 - Navegar por páginas (Priority: P1)

**Acceptance Scenarios**:

1. **Given** mais registros que o tamanho da página (10), **Then** a listagem mostra só a página
   atual, "Mostrando 11–20 de 23" e os botões "Anterior" e "Próxima".
2. **Given** a primeira página, **Then** "Anterior" fica indisponível; na última, "Próxima".
   Os botões indisponíveis continuam focáveis (o foco não se perde ao chegar no fim).
3. **Given** uma busca nova, **Then** a listagem volta para a página 1.
4. **Given** a remoção de registros que esvazia a página atual, **Then** a listagem passa para a
   última página existente.
5. **Given** uma página só, **Then** os botões de página não aparecem, mas a contagem sim.

### Edge Cases

- Listagem vazia (sem registros): mantém o estado vazio atual, sem caixa de busca.
- Colunas de ações (botões) não entram na busca.
- Celular: busca e paginação usáveis em 320 px, sem rolagem horizontal; alvos ≥ 44 px.
- Várias listagens na mesma tela: cada busca tem nome acessível próprio ("Buscar em Turmas da
  edição").

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Toda listagem de registros tem busca que filtra enquanto se digita.
- **FR-002**: A busca ignora maiúsculas, acentos e espaços extras; várias palavras combinam com E.
- **FR-003**: Toda listagem é paginada (10 por página por padrão), com contagem e navegação.
- **FR-004**: Busca e paginação valem para a tabela no computador e para os cartões no celular.
- **FR-005**: A busca considera o texto exibido nas células, inclusive rótulos de situação.

### Fora do escopo

- Paginação no servidor: as listagens atuais carregam poucos registros por edição; a busca e a
  paginação são feitas no navegador sobre os dados já autorizados pela RLS (nenhum dado novo é
  exposto). Rever quando houver volume que justifique.
- Resumos dos painéis iniciais (pendências, próximos encontros, comunicados): são prévias com
  link para a tela completa, não listagens.

## Success Criteria _(mandatory)_

- **SC-001**: Todas as tabelas do sistema exibem busca e paginação sem alteração nas páginas além
  de marcar colunas de ações.
- **SC-002**: Testes automatizados cobrem normalização, combinação de palavras, limites de página,
  anúncio de resultados e acessibilidade (axe).
