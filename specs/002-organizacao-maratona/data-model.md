# Data Model — revisão de 2026-10-30 (contas e convites)

Complementa as entidades da spec 002 (cursos, turmas, atribuições, ambientes, encontros, duplas).
Somente o que muda para FR-011, FR-014 e FR-015.

## `public.convites_acesso` (nova)

| Campo         | Tipo        | Regras                                                     |
| ------------- | ----------- | ---------------------------------------------------------- |
| `id`          | uuid PK     | `gen_random_uuid()`                                        |
| `usuario_id`  | uuid        | FK `auth.users(id)` on delete cascade                      |
| `edicao_id`   | uuid        | FK `public.edicoes(id)` on delete cascade                  |
| `token_hash`  | text        | único; SHA-256 hex do token (o token puro nunca é gravado) |
| `criado_em`   | timestamptz | default `now()`                                            |
| `criado_por`  | uuid        | FK `public.perfis(id)` — coordenação que criou/reenviou    |
| `expira_em`   | timestamptz | `criado_em + interval '7 days'`                            |
| `usado_em`    | timestamptz | nulo até o primeiro acesso                                 |
| `revogado_em` | timestamptz | preenchido quando um reenvio substitui o convite           |

- Restrição: `not (usado_em is not null and revogado_em is not null)`.
- Índice parcial: no máximo **um convite válido** por pessoa
  (`unique (usuario_id) where usado_em is null and revogado_em is null`).
- **RLS habilitada, sem políticas** para `anon`/`authenticated`: só funções do servidor acessam.
  Auditoria pelo gatilho genérico existente (sem o `token_hash` no registro).

### Estados

```text
pendente ──(primeiro acesso)──▶ usado
   │
   ├──(reenvio)──▶ revogado  (novo convite pendente é criado)
   └──(7 dias)───▶ vencido   (derivado: expira_em < now(); não é gravado)
```

## Funções no banco

| Função                                | Quem executa                                         | Faz                                                                               |
| ------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `public.situacao_de_acesso(p_edicao)` | `authenticated` (coordenação da edição; senão 42501) | Lista pessoas da edição com `email`, `acesso_ativo`, `convite_expira_em`          |
| `app.registrar_convite(...)`          | somente `service_role`                               | Revoga convite pendente da pessoa e grava o novo (atômico)                        |
| `app.consumir_convite(p_token_hash)`  | somente `service_role`                               | Marca `usado_em` se válido e devolve `usuario_id`; nada se inválido/vencido/usado |
| `app.desfazer_consumo(p_convite_id)`  | somente `service_role`                               | Volta `usado_em` para nulo quando o Auth recusa a senha                           |

## Entidades derivadas (sem tabela)

- **Situação de acesso**: `Acesso ativo` quando a conta já tem senha definida (pelo convite ou
  pela recuperação); senão `Aguardando primeiro acesso` (com vencimento do convite, se houver).
- **Linha de importação** (navegador e servidor): `{ linha, nome, email }` →
  `criada | vinculada | recusada(motivo)`.

## Alterações em entidades existentes

- `public.perfis`: **sem mudança** (o e-mail continua só em `auth.users`).
- `public.atribuicoes`: sem mudança; a restrição `atribuicoes_aluno_uma_turma` gera a recusa
  "já ativo em outra turma desta edição" na importação.
