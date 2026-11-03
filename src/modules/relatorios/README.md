# Módulo: Relatórios e acompanhamento

**Responsabilidade:** painéis iniciais filtrados por permissão e exportação CSV (RF17;
[spec 008](../../../specs/008-paineis-relatorios/spec.md)).

**Situação:** spec 008 (Incremento 5).

- `domain/`: tipos dos painéis e dos relatórios e `gerarCsv` (TypeScript puro, padrão pt-BR).
- `data/`: repositório Supabase (`painel_do_aluno`, `painel_da_gestao`, `painel_da_coordenacao`
  e `relatorio`). Os dados são autorizados e montados no servidor; cada exportação fica
  registrada em `exportacoes_relatorio`.
- `ui/`: painéis do aluno, da equipe docente e da coordenação e o formulário de exportação.

Nenhum painel ou relatório traz nota individual da prova, e-mail ou identificador de pessoa.
