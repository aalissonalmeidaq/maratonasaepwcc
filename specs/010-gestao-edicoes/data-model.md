# Data Model: Gestão de edições, turmas e vínculos

## `cadastro_cursos` (nova)

| Coluna      | Tipo        | Regra                                     |
| ----------- | ----------- | ----------------------------------------- |
| `id`        | uuid        | chave                                     |
| `nome`      | text        | 2 a 160 caracteres; único (sem caixa)     |
| `categoria` | text        | 1 a 120 caracteres (categoria de ranking) |
| `criado_em` | timestamptz | `now()`                                   |

## `cadastro_turmas` (nova)

| Coluna              | Tipo        | Regra                                          |
| ------------------- | ----------- | ---------------------------------------------- |
| `id`                | uuid        | chave                                          |
| `cadastro_curso_id` | uuid        | FK `cadastro_cursos` (restrict)                |
| `nome`              | text        | 1 a 120 caracteres; único no curso (sem caixa) |
| `ano_letivo`        | int, nulo   | 2000 a 2100                                    |
| `criado_em`         | timestamptz | `now()`                                        |

- RLS das duas: leitura e escrita só por quem coordena alguma edição (`app.coordena_alguma_edicao`);
  escrita por RPC; auditoria por gatilho. Apagar é recusado quando há curso/turma na edição
  ligado (FK `restrict`).

## `cursos` → curso na edição (existente, alterada)

- **Nova** `cadastro_curso_id uuid not null` (FK `cadastro_cursos`, restrict); único por
  `(edicao_id, cadastro_curso_id)`. `nome` e `categoria` continuam como cópia: sincronizada sozinha em edição em preparação; em edição ativa, só por `atualizar_do_cadastro` (R4).
- Políticas `cursos_gerenciar` (`for all`) removidas: escrita só pelas RPCs de vínculo.

## `turmas` → turma na edição (existente, alterada)

- **Nova** `cadastro_turma_id uuid not null` (FK `cadastro_turmas`, restrict); único por curso na
  edição (uma turma do cadastro aparece no máximo uma vez por edição). `nome` e `ano_letivo`
  copiados, com a mesma regra de sincronia dos cursos (R4).
- Políticas `turmas_gerenciar` (`for all`) removidas.

## `edicoes` (existente, alterada)

| Coluna nova                  | Tipo              | Regra                                             |
| ---------------------------- | ----------------- | ------------------------------------------------- |
| `chave_envio`                | uuid único, nulo  | idempotência da criação (FR-013)                  |
| `ativada_em`, `encerrada_em` | timestamptz, nulo | horários das transições                           |
| `justificativa_encerramento` | text, nulo        | obrigatória quando `estado = 'encerrada'` (check) |
| `pendencias_no_encerramento` | jsonb, nulo       | lista apresentada ao encerrar (FR-011)            |

- RLS: leitura como hoje (`app.participa_da_edicao`). Política `edicoes_atualizar` removida;
  `insert`, `update` e `delete` revogados de `authenticated` (R1).

## `atribuicoes` (existente, alterada)

| Coluna nova | Tipo       | Regra                                                                 |
| ----------- | ---------- | --------------------------------------------------------------------- |
| `curso_id`  | uuid, nulo | FK `cursos` (curso na edição); só para o vínculo de mentor ao curso   |
| `origem_id` | uuid, nulo | FK `atribuicoes`; preenchida nas linhas derivadas de mentor por turma |

- Checks:
  - mentor: `(curso_id is not null and turma_id is null and origem_id is null)` (vínculo ao curso)
    ou `(turma_id is not null and origem_id is not null and curso_id is null)` (derivada);
  - outros papéis: `curso_id is null and origem_id is null`.
- Unicidade passa a `(usuario_id, edicao_id, papel, turma_id, curso_id)` com `nulls not distinct`.
- Gatilhos novos:
  - `app.sincronizar_mentor_do_curso()` mantém as derivadas (R6);
  - `app.proteger_derivadas()` recusa escrita direta em linhas com `origem_id`, exceto quando a
    escrita vem dos próprios gatilhos de sincronia ou da remoção da turma na edição
    (`desvincular_turma`), sinalizadas por uma configuração local da transação;
  - `app.garantir_coordenacao_ativa()` (R9).

## Bloqueio de edição encerrada (R8)

`app.bloquear_edicao_encerrada()` como gatilho `before insert or update or delete` em: `cursos`,
`turmas`, `atribuicoes`, `ambientes` (`edicao_id`), `encontros`, `duplas`,
`dupla_integrantes`, `convites_equipe`, `convite_equipe_convidados`, `desafios`, `desafio_turmas`,
`entregas`, `prorrogacoes`, `presencas`, `participacoes`, `avaliacoes`, `listas_questoes`,
`lista_turmas`, `questoes`, `alternativas`, `submissoes_questoes`, `resultados_prova`,
`ocorrencias`, `manifestacoes`, `excecoes_prazo`, `publicacoes_ranking`, `publicacao_posicoes`,
`pedidos_revisao`, `comunicados`, `comunicado_turmas`. A coluna que leva à edição é conferida na
implementação, tabela por tabela.

## Transições de estado da edição

```text
em preparação (rascunho) ──ativar_edicao──▶ ativa ──encerrar_edicao──▶ encerrada (final)
   │
   └──apagar_edicao (sem turmas vinculadas nem outras atribuições) ──▶ (apagada)
```

- **Ativar:** exige início, fim e pelo menos uma turma vinculada.
- **Encerrar:** exige justificativa ≥ 10 caracteres; grava as pendências.
- **Encerrada:** não volta nem aceita escrita em nenhuma tabela da edição.
