# Orientações para o agente — Maratona SAEP

- Leia `.specify/memory/constitution.md` antes de qualquer mudança; ela prevalece.
- Fluxo: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`, com TDD
  (teste falhando antes do código). Uma spec por incremento em `specs/NNN-nome/`.
- Documentação, UI e specs em português do Brasil. Não invente regras, dados, prêmios ou marcas;
  registre lacunas em `docs/decisoes-e-pendencias.md`.
- Módulos em `src/modules/<m>` só se importam via `@/modules/<m>` (index.ts). `domain/` é TS puro.
- Segurança no banco: toda tabela nova tem RLS + teste pgTAP em `supabase/tests/`.
- Nunca use `service_role`/segredos no frontend; nunca conecte bancos remotos nem rode seed fora do local.
- Não marque envio/registro como concluído sem resposta do servidor; nada autenticado no cache do SW.
- Antes de concluir: `npm run verify`, `npm run test:e2e` e, com Docker, `npm run test:db`.
- Portas do Supabase local: 5442x (outro projeto da máquina usa as padrão).
