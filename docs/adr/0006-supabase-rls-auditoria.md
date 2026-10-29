# ADR 0006 — Supabase local, RLS e auditoria

- **Status:** aceita (2026-10-29)
- **Decisão:**
  - Migrations versionadas em `supabase/migrations`; seed só com dados fictícios.
  - RLS em todas as tabelas de `public`; funções auxiliares `security definer` com
    `search_path = ''` no schema `app` (não exposto pela API).
  - Papéis por edição e turma na tabela `atribuicoes`; coordenação gerencia atribuições de
    outras pessoas, nunca as próprias; apoio/analista não recebem acesso amplo.
  - Auto-cadastro desligado (`[auth] enable_signup = false`); contas criadas pela coordenação.
    Atenção: `[auth.email] enable_signup` deve ficar `true`, senão o login por e-mail é desativado.
  - Auditoria por gatilhos (`app.registrar_auditoria`) com autor (`auth.uid()`), horário do
    servidor e justificativa opcional (`set local app.justificativa`); tabela somente leitura.
  - Testes de autorização em pgTAP (`supabase test db`) com usuários de perfis distintos.
  - Portas locais 5442x para não conflitar com outros projetos Supabase da máquina.
- **Consequências:** toda nova tabela exige políticas e testes pgTAP na mesma mudança.
