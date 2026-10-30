# Módulo: Equipes (duplas e trios) e integrantes

**Responsabilidade:** formação de equipes por convite entre alunos, formação por docente/mentor
com quem sobrou, alterações justificadas pela gestão, nome escolhido pela equipe e histórico de
composição (RF04, HU01, spec 003).

**Situação:** spec 002 (histórico e alterações) e spec 003 (convites, trio, nome, gestão).

- `domain/`: regras puras — nome de exibição, trio permitido, validação de convite e de nome.
- `data/`: repositório Supabase; toda escrita passa por RPC transacional (ADR 0010).
- `ui/`: `ConvitesEquipe` (aluno), `NomeEquipe` (aluno), `AcoesDupla` e `FormEquipeDocente`
  (gestão), `ContadorConvites` (menu e painel do aluno).

As tabelas continuam `duplas` e `dupla_integrantes`; "equipe" é o termo de domínio e de tela.
