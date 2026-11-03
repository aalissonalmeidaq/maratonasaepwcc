# Data Model: Regras da edição e das turmas

## `versoes_regras` (nova)

| Coluna          | Tipo        | Regra                                                                     |
| --------------- | ----------- | ------------------------------------------------------------------------- |
| `id`            | uuid        | chave                                                                     |
| `edicao_id`     | uuid        | FK `edicoes` (cascade)                                                    |
| `rotulo`        | text        | 1 a 60 caracteres; único por edição                                       |
| `regras`        | jsonb       | objeto válido por `app.validar_regras` (R4); `regras->>'versao' = rotulo` |
| `vale_desde`    | timestamptz | `-infinity` na versão inicial; `now()` nas seguintes; único por edição    |
| `autor_id`      | uuid, nulo  | FK `perfis`; nulo na versão inicial migrada                               |
| `justificativa` | text, nulo  | 10 a 2000 caracteres nas seguintes; nula só na inicial                    |
| `criado_em`     | timestamptz | `now()`                                                                   |

- RLS: leitura por quem participa da edição; sem escrita direta. Auditoria por gatilho. Bloqueio de
  edição encerrada (gatilho da spec 010, coluna `edicao_id`).

## `ajustes_regras_turma` (nova)

| Coluna          | Tipo        | Regra                                                                         |
| --------------- | ----------- | ----------------------------------------------------------------------------- |
| `id`            | uuid        | chave                                                                         |
| `turma_id`      | uuid        | FK `turmas` (turma na edição; cascade)                                        |
| `grupos`        | jsonb       | objeto só com grupos ajustáveis (R2), cada um válido por `app.validar_regras` |
| `vale_desde`    | timestamptz | `now()`; único por turma                                                      |
| `autor_id`      | uuid        | FK `perfis`                                                                   |
| `papel_autor`   | text        | `coordenacao` ou `mentor`                                                     |
| `justificativa` | text        | 10 a 2000 caracteres                                                          |
| `criado_em`     | timestamptz | `now()`                                                                       |

- RLS: leitura por quem participa da turma ou coordena a edição; sem escrita direta. Auditoria.
  Bloqueio de edição encerrada (coluna `turma_id`).
- Conjunto vazio (`{}`) significa "tudo herdado" a partir daquele instante.

## `encontros_fora_da_turma` (nova)

| Coluna        | Tipo        | Regra                                  |
| ------------- | ----------- | -------------------------------------- |
| `id`          | uuid        | chave (para a auditoria)               |
| `turma_id`    | uuid        | FK `turmas` (cascade)                  |
| `encontro_id` | uuid        | FK `encontros` (cascade), mesma edição |
| `criado_em`   | timestamptz | `now()`                                |

- `(turma_id, encontro_id)` único. Sem linha, a turma participa do encontro. RLS de leitura por quem
  participa da turma; escrita por RPC. Auditoria e bloqueio de encerrada.

## Funções de leitura das regras (`app`)

- `inicio_do_encontro(encontro)`, `regras_vigentes(turma, instante)`,
  `regras_do_encontro(encontro, turma)`, `encontro_da_turma(encontro, turma)`,
  `maximo_do_encontro(regras, avaliacao_objetiva)`, `maximo_da_turma(turma)`.

## Regras vigentes

```text
regras(turma, instante) = versão da edição (maior vale_desde ≤ instante)
                          || grupos do ajuste da turma (maior vale_desde ≤ instante)
regras(encontro, turma) = regras(turma, início do encontro)
```

## Mudanças em funções existentes

- `app.regras_da_edicao` continua (vigente da edição); as funções ligadas a encontro e turma
  passam a usar `app.regras_do_encontro` (research R3).
- `app.totais_da_equipe` considera só os encontros da turma da equipe (R6).
- `criar_edicao` cria a versão inicial.
