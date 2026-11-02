# Módulo: Resultado oficial

**Responsabilidade:** registro da prova oficial, ocorrências com manifestação e decisão,
prévia dos pontos oficiais calculados no servidor, publicação versionada do ranking por
categoria, pedidos de revisão em até 24 h e avisos no aplicativo (RF13–RF16, HU04–HU06;
[spec 007](../../../specs/007-resultado-oficial-ranking/spec.md)).

- `domain/`: tipos do contrato, prazos e rótulos (TypeScript puro).
- `data/`: repositório Supabase; evidência em duas etapas (Storage privado `evidencias` + RPC)
  e toda escrita por RPC transacional, idempotente e auditada.
- `ui/`: prova oficial, ocorrências, decisão, publicação, ranking, revisão, avisos e prévia.

O cálculo oficial roda no banco (`app.calcular_encontro`); o núcleo TS de `@/modules/pontuacao`
é a referência dos casos de contrato (ADR 0011).
