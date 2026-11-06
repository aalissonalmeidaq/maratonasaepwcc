# Modelo de dados: Unidades, usuário master e gestão da unidade

## Novas tabelas

### `public.unidades`

| Campo                       | Tipo          | Regra                                                 |
| --------------------------- | ------------- | ----------------------------------------------------- |
| `id`                        | `uuid`        | PK                                                    |
| `nome`                      | `text`        | 2–120 caracteres; único por `lower(btrim(nome))`      |
| `ativa`                     | `boolean`     | `not null default true`                               |
| `desativada_em`             | `timestamptz` | preenchido ao desativar; limpo ao reativar            |
| `justificativa_desativacao` | `text`        | obrigatória ao desativar (`app.exigir_justificativa`) |
| `criado_em`                 | `timestamptz` | `default now()`                                       |

### `public.masters`

| Campo        | Tipo          | Regra                   |
| ------------ | ------------- | ----------------------- |
| `usuario_id` | `uuid`        | PK, FK `perfis(id)`     |
| `ativo`      | `boolean`     | `not null default true` |
| `criado_em`  | `timestamptz` | `default now()`         |

- Ao menos um master ativo; ninguém desativa a si mesmo.

### `public.funcoes_unidade`

| Campo        | Tipo                  | Regra                                                    |
| ------------ | --------------------- | -------------------------------------------------------- |
| `usuario_id` | `uuid`                | FK `perfis(id)`; a conta precisa ter `unidade_id`        |
| `funcao`     | enum `funcao_unidade` | `gestao`, `coordenacao`, `docente`, `mentor`, `analista` |
| `ativa`      | `boolean`             | `not null default true`                                  |
| `criado_em`  | `timestamptz`         | `default now()`                                          |

- PK (`usuario_id`, `funcao`). A unidade é `perfis.unidade_id`.
- A última `gestao` ativa de uma unidade que já teve gestão não é desativada.

Todas as três: RLS ligada; sem políticas de escrita; leitura e escrita por RPC; gatilho de
auditoria (`app.registrar_auditoria`).

## Colunas novas

| Tabela            | Coluna       | Regra                                                                          |
| ----------------- | ------------ | ------------------------------------------------------------------------------ |
| `perfis`          | `unidade_id` | FK `unidades`; `null` só em master; não muda depois de definida (gatilho)      |
| `edicoes`         | `unidade_id` | FK `unidades`, `not null`; não muda                                            |
| `cadastro_cursos` | `unidade_id` | FK `unidades`, `not null`; nome único por (`unidade_id`, `lower(btrim(nome))`) |

## Regras de integridade (gatilhos)

- `atribuicoes`: `perfis.unidade_id` da conta = `edicoes.unidade_id` da edição; papel
  `coordenacao`, `docente` ou `mentor` exige a função de mesmo nome ativa na unidade.
- Vínculo de turma do cadastro à edição (`vincular_turmas`, spec 010): mesma unidade.
- `masters` × `perfis.unidade_id`: master não tem unidade; conta com unidade não vira master.

## Migração (unidade inicial)

```text
unidades ← ('SENAI Juazeiro do Norte', ativa)
edicoes.unidade_id, cadastro_cursos.unidade_id ← unidade inicial
perfis.unidade_id ← unidade inicial (todas as contas existentes)
funcoes_unidade ← atribuições ativas (coordenacao, docente, mentor, analista), sem duplicar
nenhuma gestão, nenhum master
premissas: P25 resolvida_por = 'spec 016'
```

## Estados

```text
Unidade: ativa ⇄ inativa (justificativa ao desativar)
Função na unidade: ativa ⇄ inativa (justificativa)
Master: ativo → inativo (nunca o último; nunca a si mesmo); reativável por outro master
```

## Tipos no front

```text
Area = 'master' | 'gestao' | 'coordenacao' | 'docente' | 'analista' | 'aluno'
FuncaoUnidade = 'gestao' | 'coordenacao' | 'docente' | 'mentor' | 'analista'
Sessao += { master: boolean; unidade: { id; nome; ativa } | null; funcoes: FuncaoUnidade[] }
Unidade { id; nome; ativa; desativadaEm; justificativaDesativacao; gestao: ContaResumo[] }
ContaResumo { usuarioId; nome; email?; situacaoAcesso; ativa }       // e-mail só para master/gestão
MembroDaUnidade { usuarioId; nome; email; funcoes: FuncaoUnidade[]; situacaoAcesso; ativo }
```
