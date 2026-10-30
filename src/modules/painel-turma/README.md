# Módulo: Painel da turma

**Responsabilidade:** visão consolidada de uma turma — identificação, indicadores, equipes,
alunos sem equipe, encontros e (futuramente) pontuação (spec 004).

- `domain/`: tipos da projeção e regras puras — indicadores derivados das listas (SC-003) e
  agrupamento de encontros (mesma regra de `situacaoEncontro`).
- `data/`: repositório Supabase; uma chamada à RPC `painel_da_turma`, que decide o acesso no
  servidor e entrega ao aluno só dados coletivos.
- `ui/`: `PainelTurma` (somente leitura; alterações de equipe continuam nas telas da spec 003).

Pontuação e ranking aguardam os Incrementos 3/4: o bloco mostra só o aviso, sem números.
