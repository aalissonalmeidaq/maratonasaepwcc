# Módulo: Resultado oficial

**Responsabilidade:** registro da prova oficial, ocorrências com manifestação e decisão,
prévia dos pontos oficiais calculados no servidor, publicação versionada do ranking por turma
(em lote), premiação por turma com decisão de empate, pedidos de revisão em até 24 h e avisos
no aplicativo (RF13–RF16, HU04–HU06; [spec 007](../../../specs/007-resultado-oficial-ranking/spec.md)
e [spec 012](../../../specs/012-ranking-por-turma/spec.md), ADR 0012). As publicações por
categoria anteriores ficam só para consulta da coordenação.

- `domain/`: tipos do contrato, prazos, rótulos e a regra da premiação por turma
  (`premiacaoDaTurma`, espelho de `app.premiacao_da_turma`) em TypeScript puro.
- `data/`: repositório Supabase; evidência em duas etapas (Storage privado `evidencias` + RPC)
  e toda escrita por RPC transacional, idempotente e auditada.
- `ui/`: prova oficial, ocorrências, decisão, lista de turmas e publicação em lote, ranking,
  premiação, revisão, avisos e prévia.

O cálculo oficial roda no banco (`app.calcular_encontro`); o núcleo TS de `@/modules/pontuacao`
é a referência dos casos de contrato (ADR 0011).
