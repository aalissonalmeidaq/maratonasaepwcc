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
- **Atualização (2026-10-30):** a conta passa a nascer **sem senha**; a pessoa recebe um
  convite por e-mail para criar a própria senha (ver ADR 0009). A senha provisória foi
  removida. Funções novas no mesmo padrão: `reenviar-convite` (com correção de e-mail),
  `definir-senha-inicial` (pública) e `importar-alunos` (CSV, linha a linha, até 500).
