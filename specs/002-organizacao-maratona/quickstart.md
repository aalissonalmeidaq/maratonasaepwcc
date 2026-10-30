# Quickstart — validar contas sem senha, convite, recuperação e importação

Somente ambiente local (portas 5442x). Dados fictícios.

## Pré-requisitos

```bash
supabase start && supabase db reset     # migrations + seed fictício
supabase functions serve                # se as funções não subirem com o start
```

- Caixa de e-mail de teste (Mailpit): http://127.0.0.1:54424
- `.env.local` com `VITE_SUPABASE_URL=http://127.0.0.1:54421` e a chave **pública** de
  `supabase status`; `npm run dev`.

## Cenários

1. **Criar conta (US6.1, US6.3)** — como `coordenacao@exemplo.invalid`, criar a conta de
   `nova@exemplo.invalid` (aluno, 3º ano A). Esperado: sucesso com "convite enviado"; e-mail no
   Mailpit com link `/primeiro-acesso#t=…`; em "Pessoas e vínculos", "Aguardando primeiro acesso".
   Abrir o link, definir senha de 10+ caracteres, entrar. A situação vira "Acesso ativo". Abrir
   o mesmo link de novo → "Link inválido ou vencido".
2. **Reenviar e corrigir e-mail (US6.6)** — criar outra conta, "Corrigir e-mail" e reenviar.
   Esperado: o link do primeiro e-mail deixa de valer; o novo funciona.
3. **Esqueci minha senha (US6.4)** — em `/esqueci-senha`, informar um e-mail cadastrado e um
   inexistente. Esperado: mesma mensagem nos dois; só o cadastrado recebe e-mail; o link redefine
   a senha.
4. **Importação (US6.5)** — importar para a turma 3º ano A um CSV com: 2 alunos novos, 1 e-mail
   já cadastrado sem turma na edição, 1 aluno ativo de outra turma, 1 e-mail inválido e 1 linha
   duplicada. Esperado na prévia: 4 válidas, 2 recusadas; no relatório: 2 criadas (convites no
   Mailpit), 1 vinculada, 1 recusada pelo servidor ("já ativo em outra turma").
5. **Autorização** — como `docente@exemplo.invalid`, chamar `criar-conta`,
   `reenviar-convite`, `importar-alunos` e `rpc('situacao_de_acesso')` → recusados.

## Comandos de verificação

```bash
npm run test:db              # pgTAP: convites_acesso sem acesso direto, situacao_de_acesso só coordenação
npm run verify               # domínio (analisador CSV), componentes, build
npm run test:e2e             # regressão em modo demonstração
npm run test:e2e:supabase    # cenários 1–5 automatizados (lê o Mailpit pela API HTTP local)
```
