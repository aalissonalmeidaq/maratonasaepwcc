# ADR 0009 — Convite próprio de primeiro acesso

- **Status:** aceita (2026-10-30)
- **Contexto:** a spec 002 decidiu que toda conta nasce sem senha conhecida e que a pessoa cria a
  própria senha por um link enviado ao e-mail, válido por **7 dias** e de uso único; a
  recuperação de senha vale **1 hora**. No Supabase Auth, o prazo dos links de e-mail
  (`[auth.email] otp_expiry`) é um valor único, limitado a 24 h, para convite e recuperação.
- **Decisão:**
  1. tabela `public.convites_acesso` com o **hash SHA-256** do token (o token só existe no
     e-mail), `expira_em` = criação + 7 dias, uso único e revogação no reenvio; RLS habilitada
     sem políticas — só as Edge Functions (`service_role`) acessam;
  2. o link leva o token no fragmento (`/primeiro-acesso#t=…`), que o navegador não envia ao
     servidor; a página o remove da barra de endereço ao abrir;
  3. a função pública `definir-senha-inicial` consome o convite de forma atômica e define a
     senha com o cliente administrativo; se o Auth recusar a senha, o consumo é desfeito;
     token inexistente, usado, revogado ou vencido recebem a mesma resposta;
  4. a recuperação (1 h) usa o fluxo padrão do Auth (`resetPasswordForEmail`);
  5. "Aguardando primeiro acesso" = convite mais recente não usado e sem login depois dele
     (uma conta criada sem senha recebe senha aleatória do Auth, então o campo de senha não
     serve de critério).
- **E-mail:** interface `EnviadorDeEmail` com adaptador Mailpit (API HTTP) no ambiente local.
  O provedor de homologação/produção é decisão da unidade **[validar]**.
- **Consequências:** mais uma tabela e três funções do servidor; em troca, prazos independentes
  e nenhum segredo de convite legível no banco. Testes: `supabase/tests/004_convites_acesso.test.sql`
  e `e2e-supabase/contas.spec.ts`.
