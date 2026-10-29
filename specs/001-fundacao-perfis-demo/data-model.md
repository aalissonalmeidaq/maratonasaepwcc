# Data Model — Spec 001 (esquema inicial)

Migration: `supabase/migrations/20261029120000_identidade_acesso_organizacao.sql`.
Todas as tabelas no schema `public` têm RLS habilitado. Ver também `docs/arquitetura.md`.

| Tabela        | Campos principais                                                                                                            | Observações                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `perfis`      | `id` (= `auth.users.id`), `nome`, `ativo`, timestamps                                                                        | 1:1 com usuário do Auth                                                                                 |
| `edicoes`     | `id`, `nome`, `inicio`, `fim`, `estado` (`rascunho`/`ativa`/`encerrada`), `regras` jsonb, `regras_versao`, `premiacao` jsonb | regras versionadas por edição                                                                           |
| `cursos`      | `id`, `edicao_id`, `nome`, `categoria`                                                                                       | categoria define o ranking                                                                              |
| `turmas`      | `id`, `curso_id`, `nome`, `ano_letivo`                                                                                       |                                                                                                         |
| `atribuicoes` | `id`, `usuario_id`, `edicao_id`, `papel`, `turma_id?`, `concedido_por`, `ativo`                                              | papel ∈ coordenacao, docente, mentor, aluno, apoio, analista; único por (usuário, edição, papel, turma) |
| `auditoria`   | `id`, `ocorrido_em` (servidor), `autor_id`, `acao`, `tabela`, `registro_id`, `antes`, `depois`, `justificativa`              | somente inserção via gatilho; leitura só coordenação                                                    |

## Funções auxiliares (security definer, `search_path` vazio)

- `app.tem_papel(edicao, papel)` — o usuário atual possui o papel ativo na edição.
- `app.e_coordenacao(edicao)`.
- `app.vinculado_a_turma(turma)` — docente/mentor/aluno com atribuição ativa na turma.

## Políticas (resumo)

- `perfis`: cada pessoa lê o próprio; coordenação lê/edita perfis das suas edições;
  docente lê perfis de alunos das turmas vinculadas.
- `edicoes`, `cursos`, `turmas`: leitura por quem tem atribuição na edição (turmas: por
  vínculo, coordenação vê todas); escrita só coordenação.
- `atribuicoes`: pessoa lê as próprias; coordenação gerencia, exceto conceder a si mesma
  papéis sem registro (auditado).
- `auditoria`: sem `insert/update/delete` para `authenticated`; `select` só coordenação.

## Estados (PRD §11)

Atividade rascunho → publicada → encerrada; entrega rascunho → enviada → avaliada;
ocorrência registrada → manifestação → decisão → revisão; ranking parcial → provisório →
definitivo. Implementados nos incrementos 3 e 4.
