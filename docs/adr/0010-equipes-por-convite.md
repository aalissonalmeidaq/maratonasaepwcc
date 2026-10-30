# ADR 0010 — Equipes por convite com bloqueio por turma

- **Status:** aceita (2026-10-30)
- **Contexto:** a spec 003 troca a formação de duplas pela coordenação por convites entre
  alunos (dupla, ou um trio por turma ímpar), com formação por docente/mentor para quem sobrar,
  nome escolhido uma vez pela equipe e edição encerrada somente para leitura. Aceites
  simultâneos não podem gerar aluno em duas equipes nem dois trios na turma.
- **Decisão:**
  1. manter as tabelas `duplas` e `dupla_integrantes` (equipe é o termo de domínio e de tela);
     `duplas.nome` passa a aceitar nulo até a equipe escolher, com `nome_definido_em`;
  2. convites em `convites_equipe` e `convite_equipe_convidados`, com RLS de leitura e sem
     escrita direta: toda mudança passa por funções `security definer`;
  3. toda RPC de escrita de equipe bloqueia primeiro a linha da turma (`for update`), depois
     convite/equipe e integrantes; em seguida revalida permissão, edição aberta, elegibilidade
     e paridade. O índice único `integrantes_um_por_edicao` continua como última barreira;
  4. o cadastro, a importação e a ativação de alunos (spec 002) **não** passam a bloquear a
     turma: uma mudança de paridade concorrente com a formação de um trio produz o mesmo estado
     que o FR-013 já admite (trio preservado, aviso à gestão);
  5. permissões distintas: alunos formam por convite; docente/mentor da turma formam com quem
     sobrou e renomeiam; coordenação altera (incluir, remover de trio, substituir, desfazer),
     mas não forma nem renomeia; o primeiro nome é só dos integrantes atuais;
  6. a RPC `formar_dupla` (coordenação) é removida.
- **Consequências:** formações da mesma turma ficam serializadas (volume baixo por turma);
  avisos de "integrante inativo" e "trio em turma par" são calculados na leitura de gestão, sem
  estado duplicado. Testes: `supabase/tests/005_equipes_por_convite.test.sql`,
  `e2e-supabase/equipes.spec.ts` e o teste de duas conexões em
  `scripts/testar-concorrencia-equipes.mjs`.
