# Implementation Plan: Organização da maratona

**Branch**: `002-organizacao-maratona` | **Date**: 2026-10-29 (revisado em 2026-10-30) |
**Spec**: [spec.md](./spec.md)

## Summary

Migration com ambientes, encontros, duplas e integrantes (com histórico), funções RPC
transacionais para duplas, gatilhos de validação/auditoria e RLS; testes pgTAP escritos antes.
Regras puras de composição de dupla e de encontro no domínio TypeScript (TDD) para validar
formulários antes de enviar (o servidor continua sendo a autoridade). Camada de repositórios
por módulo com implementação Supabase e de demonstração, servida por contexto e consumida com
TanStack Query. Telas de coordenação passam a gravar no servidor; docente e aluno passam a ler.
Edge Function `criar-conta` para RF03 (P3).

**Revisão 2026-10-30 (esclarecimentos)**: já entregues a edição de curso/turma, o bloqueio de
troca de curso com dupla ativa e a edição/remoção de ambientes (T060–T063, T067). Depois, o novo
ciclo de contas (entregue em 2026-10-30, T070–T104): toda conta nasce **sem senha** e recebe por e-mail um **convite próprio de 7
dias** (token com hash em `convites_acesso`, consumido por uma função pública); recuperação de
senha pelo fluxo padrão do Auth (1 hora); situação "Aguardando primeiro acesso" / "Acesso ativo"
com reenvio e correção de e-mail; importação de alunos por CSV com prévia no navegador e
processamento linha a linha no servidor. Decisões em [research.md](./research.md).

## Technical Context

Mesma stack da spec 001, acrescida de **@tanstack/react-query 5** (cache de consultas e
invalidação após gravações; não persiste nada em disco). Edge Functions em Deno (runtime do
Supabase) com `@supabase/server`. Testes: Vitest/Testing Library, pgTAP, Playwright (projeto
opcional contra Supabase local).

Revisão 2026-10-30:

- **E-mail**: interface `EnviadorDeEmail` (Edge Functions); adaptador Mailpit (HTTP, local
  `127.0.0.1:54424`) para desenvolvimento/E2E. Provedor de produção: **a definir pela unidade**
  (pendência registrada; não bloqueia o desenvolvimento local).
- **Tokens**: `crypto.getRandomValues` (32 bytes) + SHA-256 (`crypto.subtle`) no Deno.
- **Prazos**: convite 7 dias (tabela própria); recuperação 1 h (`otp_expiry = 3600`, já
  configurado). Senha mínima de 10 caracteres (`minimum_password_length = 10`, já configurado).
- **CSV**: analisador próprio em TypeScript puro (sem dependência nova).
- **Volume**: até 500 linhas por importação; turmas de dezenas de alunos.

## Constitution Check

| Princípio           | Atendimento                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 002 com esclarecimentos; tarefas T063–T069 ligadas a FR/US                                                   |
| II TDD              | pgTAP (convites, situação de acesso) e analisador CSV escritos e vistos falhando antes do código                  |
| III Modular         | Analisador em `modules/organizacao/domain`; funções compartilhadas em `supabase/functions/_shared`                |
| V Servidor          | Cliente administrativo só nas Edge Functions; `convites_acesso` com RLS e sem políticas; token só como hash       |
| VI Dados            | E-mail visível só à coordenação (função `security definer`); CSV não é armazenado; resposta neutra na recuperação |
| VII Confirmação     | Sucesso só após o servidor; falha de e-mail informada (`conviteEnviado: false`), nunca omitida                    |
| X Nada inventado    | Provedor de e-mail de produção e domínio do remetente ficam como pendência da unidade                             |

Resultado (pré e pós-design): aprovado.

## Project Structure

```text
supabase/migrations/20261029130000_organizacao_duplas_encontros.sql
supabase/migrations/20261030120000_regras_turma_ambiente.sql          # T063, T067 (entregue)
supabase/migrations/20261030130000_convites_acesso.sql                # T065: tabela, funções, RLS
supabase/tests/002_organizacao.test.sql
supabase/tests/003_regras_organizacao.test.sql
supabase/tests/004_convites_acesso.test.sql                           # T065
supabase/functions/_shared/{convites,email}.ts                        # token, hash, EnviadorDeEmail
supabase/functions/criar-conta/index.ts                               # sem senha + convite
supabase/functions/reenviar-convite/index.ts
supabase/functions/definir-senha-inicial/index.ts                     # pública (verify_jwt = false)
supabase/functions/importar-alunos/index.ts                           # T069
src/shared/dados/                 # QueryClient, provedor de repositórios, erros do Supabase
src/modules/organizacao/{domain,data,ui}   # + domain/importacao.ts, ui/ImportarAlunos.tsx
src/modules/auth/ui/              # páginas públicas: primeiro acesso, esqueci/redefinir senha
src/modules/duplas/{domain,data,ui}
src/modules/encontros/{domain,data,ui}
src/modules/demo/repositorios.ts  # implementação de leitura com dados fictícios
```

Artefatos de design: [data-model.md](./data-model.md), [contracts/](./contracts/),
[quickstart.md](./quickstart.md).

## Riscos e dependências

- Resolvido: as rotas públicas e o link "Esqueci minha senha" entraram depois de incorporar o
  trabalho da sessão que editava `rotas.tsx` e `comum.tsx`.
- Produção depende do provedor de e-mail dos convites e do SMTP do Auth **[validar]**.
- Contas existentes (seed e já criadas com senha) aparecem como "Acesso ativo" sem migração.
- A formação de equipes passou para a spec 003; o formulário "Formar dupla" da coordenação será
  removido lá, não aqui.

## Complexity Tracking

Nenhuma violação. A tabela própria de convites é a menor solução que atende 7 dias para o
primeiro acesso e 1 hora para a recuperação ao mesmo tempo (ver research R1).
