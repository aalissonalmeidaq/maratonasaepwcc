# Contrato — Edge Functions de contas (spec 002, revisão 2026-10-30)

Todas recebem e devolvem JSON. Erros: `{ "erro": "<mensagem em português>" }`. Nenhuma devolve
token, hash ou senha. Chaves privadas e credenciais do provedor de e-mail existem só no
servidor (segredos das funções).

## `POST /functions/v1/criar-conta` (alterada) — JWT obrigatório

Pedido:

```json
{
  "edicaoId": "uuid",
  "nome": "Ana Exemplo",
  "email": "ana@exemplo.invalid",
  "papel": "aluno|docente|mentor|apoio|analista",
  "turmaId": "uuid|null"
}
```

- **Removido**: `senhaProvisoria` (pedido com esse campo → 400 "Campo não aceito").
- 201 `{ "usuarioId": "uuid", "conviteEnviado": true }` — conta sem senha, vínculo e convite
  de 7 dias criados; e-mail enviado.
- 201 `{ "usuarioId": "uuid", "conviteEnviado": false }` — conta e vínculo criados, e-mail
  falhou; a tela orienta "Reenviar convite".
- 400 validação · 401 sem login · 403 não é coordenação da edição · 409 e-mail já tem conta.

## `POST /functions/v1/reenviar-convite` — JWT obrigatório

```json
{ "edicaoId": "uuid", "usuarioId": "uuid", "novoEmail": "opcional@exemplo.invalid" }
```

- 200 `{ "conviteEnviado": true }` — convite anterior revogado, novo criado e enviado; se
  `novoEmail` veio, o e-mail da conta foi corrigido antes.
- 409 "Esta pessoa já fez o primeiro acesso." (não reenvia nem troca e-mail) · 409 e-mail novo
  já usado por outra conta · 403 não é coordenação da edição ou a pessoa não está na edição.

## `POST /functions/v1/definir-senha-inicial` — **pública** (sem JWT)

```json
{ "token": "<valor do link>", "senha": "mínimo de 10 caracteres" }
```

- 200 `{ "email": "ana@exemplo.invalid" }` — senha definida, convite usado; a tela leva ao login
  com o e-mail preenchido.
- 400 "Link inválido ou vencido. Peça um novo à coordenação ou use “Esqueci minha senha”." —
  mesma resposta para token inexistente, usado, revogado ou vencido.
- 422 "A senha deve ter pelo menos 10 caracteres." (ou recusa do Auth; o convite volta a valer).

## `POST /functions/v1/importar-alunos` — JWT obrigatório

```json
{
  "edicaoId": "uuid",
  "turmaId": "uuid",
  "linhas": [{ "linha": 2, "nome": "Ana Exemplo", "email": "ana@exemplo.invalid" }]
}
```

- Máximo de 500 linhas (413 acima disso). O servidor revalida cada linha.
- 200:

```json
{
  "criadas": [{ "linha": 2, "email": "...", "conviteEnviado": true }],
  "vinculadas": [{ "linha": 3, "email": "..." }],
  "recusadas": [{ "linha": 4, "email": "...", "motivo": "Já ativo em outra turma desta edição." }]
}
```

- 403 não é coordenação da edição · 400 turma de outra edição.

## Supabase Auth (sem função própria)

- `resetPasswordForEmail(email, { redirectTo: "<site>/redefinir-senha" })` — link de 1 hora
  (`otp_expiry = 3600`); a tela sempre mostra a mesma resposta.
- Na página de redefinição: `updateUser({ password })` com a sessão de recuperação.

## RPC no PostgREST

- `rpc('situacao_de_acesso', { p_edicao })` → `[{ usuario_id, email, acesso_ativo,
convite_expira_em }]`; 42501 para quem não é coordenação da edição.
