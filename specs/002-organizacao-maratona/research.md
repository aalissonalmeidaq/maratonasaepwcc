# Research: contas sem senha, convite de 7 dias, recuperação e importação CSV

Spec 002 — revisão de 2026-10-30 (FR-011, FR-014, FR-015; US6 cenários 1, 3–6).

## R1. Como garantir um link de primeiro acesso válido por 7 dias

- **Decision**: convite próprio. Token aleatório de 32 bytes (base64url) enviado só no e-mail; o
  banco guarda apenas o hash SHA-256 em `public.convites_acesso`, com `expira_em = criado_em + 7
dias`, uso único e revogação no reenvio. Uma Edge Function pública (`definir-senha-inicial`)
  consome o token de forma atômica e define a senha com o cliente administrativo do servidor.
- **Rationale**: o prazo dos links de e-mail do Supabase Auth (`[auth.email] otp_expiry`) é um
  valor único para convite, recuperação e confirmação, limitado a 24 h; não atende 7 dias para o
  convite e 1 h para a recuperação ao mesmo tempo. Guardar só o hash impede que uma leitura do
  banco revele links válidos.
- **Alternatives considered**: `auth.admin.inviteUserByEmail` (prazo global ≤ 24 h, mesmo valor
  da recuperação); `generateLink` (mesma limitação); senha provisória (descartada na spec).

## R2. Envio do e-mail de convite

- **Decision**: interface `EnviadorDeEmail` em `supabase/functions/_shared/`, com adaptador
  **Mailpit** (API HTTP `POST /api/v1/send`, disponível no Supabase local: Mailpit v1.30 em
  `127.0.0.1:54424`) para desenvolvimento e testes. O provedor de homologação/produção é
  escolhido pela unidade e entra como outro adaptador HTTP configurado por segredos do servidor.
- **Rationale**: testável de ponta a ponta no ambiente local sem enviar e-mails reais; envio por
  HTTP evita SMTP nas Edge Functions hospedadas (o Supabase documenta bloqueio de saída nas portas
  25 e 587 — **confirmar** na homologação).
- **Alternatives considered**: SMTP direto (portas bloqueadas no ambiente hospedado; biblioteca
  extra no Deno); usar o e-mail do Supabase Auth (não permite prazo próprio, ver R1).
- **Pendente [validar]**: provedor de e-mail da unidade (domínio, remetente, cota). Não inventado.

## R3. Recuperação de senha (1 hora)

- **Decision**: fluxo padrão do Supabase Auth: `resetPasswordForEmail(email, { redirectTo:
<site>/redefinir-senha })`, página que recebe a sessão de recuperação e chama
  `updateUser({ password })`. `otp_expiry = 3600` (já configurado). A tela sempre responde "Se o
  e-mail estiver cadastrado, você receberá um link" — o Auth não revela se a conta existe.
- **Rationale**: sem código novo no servidor; o limite de envio (`[auth.rate_limit]`) e o
  `max_frequency` do Auth já existem. Recuperar a senha de uma conta que nunca fez o primeiro
  acesso também a ativa (é a forma prevista na spec para link vencido).
- **Alternatives considered**: token próprio também para recuperação (duplicaria o que o Auth já
  faz bem).

## R4. Situação "Aguardando primeiro acesso" / "Acesso ativo"

- **Decision**: função `public.situacao_de_acesso(p_edicao)` (`security definer`, só coordenação
  da edição) que devolve, por pessoa vinculada à edição, o e-mail (de `auth.users`), a situação e
  o vencimento do convite pendente. **Aguardando primeiro acesso** = o convite mais recente da
  pessoa não foi usado **e** não houve login (`auth.users.last_sign_in_at`) depois da criação
  desse convite; senão **Acesso ativo** (inclui contas antigas sem convite e quem ativou a conta
  pela recuperação de senha).
- **Verificado em 2026-10-30 (T071)**: conta criada sem senha pelo Auth local recebe senha
  aleatória — `encrypted_password` não fica vazio nem nulo, então não serve de critério.
- **Rationale**: o e-mail fica restrito à coordenação (constituição VI) e não é duplicado.
- **Alternatives considered**: `encrypted_password` vazio (descartado pela verificação);
  coluna `perfis.email` (duplicação de dado pessoal); gatilho em `auth.users` (acoplamento).

## R5. Importação CSV

- **Decision**: o arquivo é lido e validado **no navegador** por um analisador puro
  (`modules/organizacao/domain/importacao.ts`, TDD) para a prévia: separador `,` ou `;`, BOM
  UTF-8, aspas, cabeçalho `nome,email` opcional, e-mail válido, nome 2–160, duplicados no arquivo,
  máximo de 500 linhas. Ao confirmar, só as linhas válidas vão para a Edge Function
  `importar-alunos`, que **revalida tudo** e processa linha a linha: conta existente → vínculo de
  aluno na turma; nova → conta sem senha + convite; recusas com motivo (inclusive "já ativo em
  outra turma desta edição", pela restrição `atribuicoes_aluno_uma_turma`).
- **Rationale**: prévia imediata sem enviar dados ao servidor antes da confirmação; servidor
  continua sendo a autoridade (constituição V).
- **Alternatives considered**: upload do arquivo para o Storage e processamento no servidor
  (mais peças, e o arquivo com dados pessoais ficaria armazenado); colar lista (recusado na spec).

## R6. Concorrência e falhas parciais

- **Decision**: consumo do token com `update ... where usado_em is null and revogado_em is null
and expira_em > now() returning` (atômico); se o Auth recusar a senha, o consumo é desfeito.
  Na criação de conta, falha no envio do e-mail **não** desfaz a conta: a resposta informa
  `conviteEnviado: false` e a tela diz "Conta criada, mas o e-mail não foi enviado — use Reenviar
  convite" (nunca sucesso silencioso, constituição VII). Na importação, cada linha é
  independente; o relatório final reflete o que o servidor gravou.
- **Alternatives considered**: transação única para toda a importação (uma linha ruim
  bloquearia as demais — contrário à spec).
