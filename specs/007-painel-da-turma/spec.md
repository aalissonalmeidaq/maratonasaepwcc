# Feature Specification: Painel da turma

**Feature Branch**: `007-painel-da-turma`
**Created**: 2026-10-30
**Status**: Draft
**Input**: User description: "Cada turma terá uma dashboard própria com os dados da turma."

**Rastreabilidade**: specs 002 (turmas, encontros) e 006 (equipes por convite); pontuação e
ranking dependem do Incremento 3/4. Constituição V, VI, VIII.

## Clarifications

### Session 2026-10-30

- Q: Quem pode ver o painel de uma turma? → A: Coordenação (qualquer turma da edição), docente e
  mentor (turmas vinculadas) e os alunos da própria turma; alunos veem só dados coletivos.
- Q: Quais dados o painel mostra? → A: Alunos e equipes, encontros, pontuação e ranking.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Equipe docente acompanha a turma (Priority: P1)

Docente, mentor e coordenação abrem o painel de uma turma e veem, num só lugar, a situação das
equipes e dos encontros.

**Independent Test**: como docente da turma A, abrir o painel da turma A e ver totais e listas;
tentar abrir o da turma B (não vinculada) e ser recusado pelo servidor.

**Acceptance Scenarios**:

1. **Given** a docente da turma A, **When** abre o painel da turma A, **Then** vê: total de
   alunos ativos, quantos têm equipe, quem está sem equipe, número de convites pendentes, a
   lista de equipes (dupla/trio, integrantes) e o próximo encontro.
2. **Given** a docente da turma A, **When** tenta abrir o painel da turma B, **Then** o servidor
   não entrega os dados e a tela informa "Você não tem acesso a esta turma".
3. **Given** a coordenação, **When** abre o painel de qualquer turma da edição, **Then** vê os
   mesmos dados e tem acesso às ações de alterar equipes (spec 006).
4. **Given** uma turma sem alunos ou sem equipes, **Then** cada bloco mostra um estado vazio que
   orienta o próximo passo (ex.: "Nenhum aluno cadastrado — cadastre em Organização").

---

### User Story 2 - Aluno vê o painel da própria turma (Priority: P1)

**Acceptance Scenarios**:

1. **Given** um aluno da turma A, **When** abre "Minha turma", **Then** vê o nome da turma e do
   curso, o total de alunos e de equipes, as equipes formadas (nomes e integrantes), os colegas
   ainda sem equipe (para convidar, spec 006) e os encontros.
2. **Given** um aluno, **Then** NÃO vê convites de outras pessoas, presenças, entregas, notas,
   ocorrências ou dados de contato de colegas, nem o painel de outras turmas.

---

### User Story 3 - Pontuação e ranking da turma (Priority: P2) — depende do Incremento 3/4

**Acceptance Scenarios**:

1. **Given** pontuação lançada, **When** a equipe docente abre o painel, **Then** vê a pontuação
   de cada equipe da turma e a posição na categoria, marcando lançamentos pendentes.
2. **Given** um aluno, **Then** vê a classificação das equipes da turma somente depois que o
   ranking for publicado; antes disso, vê "Classificação ainda não publicada". Nunca vê notas
   individuais da prova oficial.
3. **Given** que o Incremento 3/4 ainda não existe, **Then** o bloco mostra "Pontuação disponível
   a partir dos lançamentos de avaliação" e nenhum número fictício fora do modo demonstração.

### Edge Cases

- Aluno desativado na turma perde o acesso ao painel dela.
- Docente vinculado a várias turmas: escolhe a turma numa lista; o painel indica qual está
  aberta.
- Turma removida ou de outra edição → "Turma não encontrada".
- Celular (320 px): blocos empilhados, sem rolagem horizontal; listas com busca e paginação
  (spec 005).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Cada turma MUST ter um painel com: identificação (turma, curso, categoria, ano),
  indicadores (alunos ativos, alunos com equipe, alunos sem equipe, equipes, convites pendentes
  para a equipe docente), lista de equipes, alunos sem equipe e encontros (próximo, realizados,
  agendados).
- **FR-002**: Acesso MUST ser verificado no servidor (RLS): coordenação da edição, docente e
  mentor vinculados à turma e alunos ativos da turma.
- **FR-003**: Para alunos, o painel MUST conter apenas dados coletivos e nomes de colegas da
  própria turma (FR-005 da spec 006); nada individual além disso.
- **FR-004**: Indicadores MUST vir de dados do servidor, com estados de carregamento, erro e
  vazio; nenhum número fictício fora do modo demonstração.
- **FR-005**: Pontuação e ranking MUST aparecer quando existirem; para alunos, só após a
  publicação do ranking.
- **FR-006**: Entradas: "Minhas turmas" (docente/mentor) e "Organização → Turmas" (coordenação)
  levam ao painel; o aluno acessa por "Minha turma" no menu.

### Key Entities

- Nenhuma tabela nova prevista: o painel lê turmas, atribuições, equipes, convites e encontros
  (specs 002 e 006). Indicadores agregados podem vir de uma função/visão no servidor com RLS.

## Success Criteria _(mandatory)_

- **SC-001**: A equipe docente chega ao painel da turma em até 2 interações a partir do início.
- **SC-002**: 100% dos cenários de acesso (incluindo aluno de outra turma e docente não
  vinculado) têm teste pgTAP.
- **SC-003**: Os indicadores batem com as listas do mesmo painel (teste automatizado).

## Assumptions

- Depende da spec 006 para equipes, alunos sem equipe e convites; até lá, usa as duplas atuais.
- O painel não substitui o painel inicial do perfil; é uma tela por turma.
- Dados de presença e entregas não fazem parte deste painel (não solicitados).
