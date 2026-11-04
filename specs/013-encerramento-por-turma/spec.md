# Feature Specification: Encerramento da edição por turma

**Feature Branch**: `013-encerramento-por-turma`
**Created**: 2026-11-04
**Status**: Draft
**Input**: User description: "Spec 013 — encerramento da edição por turma. Pendência deixada pela
spec 012 (docs/decisoes-e-pendencias.md §6.10): o encerramento da edição (spec 010, FR-011) ainda
mostra "categorias sem ranking publicado", e qualquer publicação de uma turma conta para a
categoria inteira. Com o ranking por turma (spec 012), as pendências de ranking mostradas antes de
encerrar passam a ser as turmas da edição cuja última publicação não é a definitiva (ou sem
publicação), com o estado atual de cada uma. Decisões do usuário (2026-11-04): mostrar "turmas sem
definitiva"; essas pendências NÃO impedem o encerramento (mantém a decisão da spec 010: a
coordenação vê, confirma com justificativa e a lista fica guardada na auditoria/no registro do
encerramento). Edições já encerradas guardaram a lista antiga por categoria e devem continuar
legíveis como foram registradas. Turmas sem equipes ativas não entram na lista."

**Rastreabilidade**: PRD RF02 (edições), RF16 (ranking por estado); spec 010 (US5, FR-011:
pendências antes de encerrar, sem impedir), spec 012 (ranking por turma, ADR 0012). Constituição V,
VII, IX, X.

## Clarifications

### Session 2026-11-04

- Q: O que aparece como pendência de ranking ao encerrar, com o ranking por turma? → A: As turmas
  cuja última publicação não é a definitiva (ou sem publicação), com o estado atual de cada uma.
- Q: Essas pendências impedem o encerramento? → A: Não; mantém a decisão da spec 010: a
  coordenação vê, confirma com justificativa e a lista fica registrada no encerramento.
- Q: A edição encerrada deve mostrar na tela as pendências registradas no encerramento? → A: Sim,
  como foram gravadas: turmas sem definitiva nos encerramentos novos e categorias sem ranking nos
  anteriores, com as contagens de ocorrências e revisões.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Coordenação vê as turmas sem ranking definitivo antes de encerrar (Priority: P1)

Ao pedir para encerrar a edição, a coordenação vê, além das ocorrências sem decisão e dos pedidos
de revisão abertos, a lista das turmas cujo ranking ainda não foi fechado: as que não têm
publicação e as que têm só parcial ou provisória, com o estado atual de cada uma. Pode encerrar
mesmo assim, com justificativa; a lista mostrada fica registrada junto do encerramento.

**Why this priority**: é a pendência deixada pela spec 012 — hoje uma única turma publicada faz a
categoria inteira parecer resolvida, e a coordenação pode encerrar sem perceber turmas em aberto.

**Independent Test**: numa edição com três turmas com equipes — uma com definitiva, uma com
provisória e uma sem publicação — pedir para encerrar e ver só as duas últimas na lista, com
"Provisório" e "Sem publicação"; encerrar com justificativa e conferir que a lista ficou
registrada no encerramento.

**Acceptance Scenarios**:

1. **Given** turmas com equipes ativas cuja última publicação não é a definitiva, **When** a
   coordenação pede para encerrar, **Then** vê cada uma com o nome, a categoria e o estado atual
   ("Sem publicação", "Parcial" ou "Provisório").
2. **Given** uma turma cuja última publicação é a definitiva, **When** a coordenação pede para
   encerrar, **Then** essa turma não aparece na lista.
3. **Given** uma turma que já teve a definitiva e depois recebeu uma parcial, **When** a
   coordenação pede para encerrar, **Then** a turma aparece como "Parcial" (vale a última
   publicação).
4. **Given** uma turma sem equipes ativas, **When** a coordenação pede para encerrar, **Then** a
   turma não aparece na lista.
5. **Given** todas as turmas com a definitiva, **When** a coordenação pede para encerrar, **Then**
   vê "Todas as turmas têm o ranking definitivo".
6. **Given** turmas pendentes na lista, **When** a coordenação confirma o encerramento com
   justificativa, **Then** a edição é encerrada e a lista de turmas pendentes fica registrada no
   encerramento, como as demais pendências.
7. **Given** uma edição encerrada depois desta mudança, **When** a coordenação a abre, **Then** vê,
   além da data e da justificativa, as pendências registradas no encerramento: ocorrências sem
   decisão, pedidos de revisão abertos e as turmas sem ranking definitivo com o estado de então.
8. **Given** uma edição encerrada antes desta mudança, **When** a coordenação a abre, **Then** vê o
   registro como foi gravado, com as "categorias sem ranking publicado" de então.
9. **Given** uma edição encerrada sem registro de pendências (encerrada antes da spec 010 gravar o
   registro), **When** a coordenação a abre, **Then** vê "Pendências do encerramento não
   registradas".

### Edge Cases

- Edição sem turmas com equipes: a lista de ranking fica vazia e aparece "Todas as turmas têm o
  ranking definitivo".
- Publicação por categoria anterior à spec 012: não conta como publicação da turma; a turma
  aparece como "Sem publicação" se não tiver publicação própria.
- Turma que ganhou equipes depois da última publicação: vale a última publicação da turma.
- Reenvio do pedido de encerramento: o encerramento já feito é devolvido como estava (spec 010).
- Aplicação offline: consultar as pendências e encerrar exigem conexão.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Antes de encerrar, a lista de pendências MUST trazer as turmas da edição com equipes
  ativas cuja última publicação do ranking não é a definitiva, cada uma com nome, categoria e
  estado atual: sem publicação, parcial ou provisório.
- **FR-002**: Turmas cuja última publicação é a definitiva e turmas sem equipes ativas MUST NOT
  aparecer na lista.
- **FR-003**: A lista "categorias sem ranking publicado" MUST deixar de ser usada no encerramento
  de edições não encerradas.
- **FR-004**: As pendências MUST NOT impedir o encerramento (spec 010, FR-011); o encerramento
  continua exigindo edição ativa e justificativa.
- **FR-005**: O encerramento MUST registrar a lista de turmas pendentes mostrada, junto das demais
  pendências, com o horário do servidor.
- **FR-006**: Encerramentos já registrados MUST NOT ser alterados e continuam legíveis como foram
  gravados.
- **FR-006a**: A tela da edição encerrada MUST mostrar as pendências registradas no encerramento,
  no formato em que foram gravadas: turmas sem ranking definitivo (com o estado de então) nos
  encerramentos novos e categorias sem ranking publicado nos anteriores, com as contagens de
  ocorrências sem decisão e de pedidos de revisão abertos; sem registro, "Pendências do
  encerramento não registradas".
- **FR-007**: Só a coordenação da edição MUST poder consultar essas pendências e encerrar
  (autorização no servidor, validada com perfis distintos).
- **FR-008**: A tela MUST estar em português do Brasil, funcionar em celular e desktop e ser
  operável por teclado; o estado de cada turma é comunicado por texto.

### Key Entities _(include if feature involves data)_

- **Pendências do encerramento**: ocorrências sem decisão, pedidos de revisão abertos (como na
  spec 010) e, agora, turmas sem ranking definitivo (turma, categoria, estado atual).
- **Registro do encerramento**: já existente (spec 010): horário, justificativa e as pendências
  vistas, imutável depois de gravado.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em 100% dos casos, uma turma com equipes cuja última publicação não é a definitiva
  aparece na lista antes de encerrar, e nenhuma turma com a definitiva aparece.
- **SC-002**: A publicação de uma turma nunca faz outra turma da mesma categoria sair da lista.
- **SC-003**: 100% dos encerramentos feitos depois da mudança registram as turmas pendentes que a
  coordenação viu.
- **SC-004**: 100% dos encerramentos anteriores continuam com o registro original e aparecem na
  tela como foram gravados.

## Assumptions

- Os nomes dos estados seguem os do ranking ("Parcial", "Provisório"); "Sem publicação" para a
  turma que nunca foi publicada.
- A demonstração mostra as pendências fictícias pela mesma regra.
