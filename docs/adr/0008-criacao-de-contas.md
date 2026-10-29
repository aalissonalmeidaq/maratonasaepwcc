# ADR 0008 — Criação de contas por Edge Function

- **Status:** aceita (2026-10-29)
- **Contexto:** criar usuários no Supabase Auth exige a chave secreta, que não pode ir ao navegador.
- **Decisão:** Edge Function `criar-conta` (`supabase/functions/criar-conta`), com
  `@supabase/server` 1.x:
  1. autorização verificada com o cliente **sujeito à RLS** de quem chama (coordenação ativa
     da edição);
  2. criação do usuário com o cliente administrativo, somente no servidor;
  3. atribuição gravada como a própria coordenação (RLS e auditoria valem); em falha, a conta
     é removida (compensação).
- **Pendente [validar]:** entrega da senha provisória e troca obrigatória no primeiro acesso;
  importação em lote (CSV) de estudantes.
