# Data Model: Comunicados e regulamento (spec 009)

Migration: `supabase/migrations/20261103120000_comunicados.sql`.

## `public.comunicados` (nova)

| Coluna                   | Tipo        | Regras                                                          |
| ------------------------ | ----------- | --------------------------------------------------------------- |
| `id`                     | uuid PK     | `gen_random_uuid()`                                             |
| `edicao_id`              | uuid FK     | `edicoes(id)`, not null                                         |
| `autor_id`               | uuid FK     | `perfis(id)`, not null                                          |
| `autor_papel`            | text        | `coordenacao`, `docente` ou `mentor` (R2)                       |
| `titulo`                 | text        | 1–200 caracteres após `btrim` **[validar]**                     |
| `texto`                  | text        | 1–5.000 caracteres após `btrim` **[validar]**                   |
| `publico`                | text        | `todos`, `estudantes` ou `equipe_docente`                       |
| `estado`                 | text        | `rascunho`, `publicado` ou `retirado`; default `rascunho`       |
| `versao`                 | int         | começa em 1; +1 a cada correção de comunicado publicado         |
| `chave_envio`            | uuid unique | idempotência da criação (R5)                                    |
| `criado_em`              | timestamptz | `now()`                                                         |
| `publicado_em`           | timestamptz | preenchido na publicação; obrigatório se `estado <> 'rascunho'` |
| `corrigido_em`           | timestamptz | última correção depois de publicado ("Atualizado em")           |
| `retirado_em`            | timestamptz | obrigatório se `estado = 'retirado'`                            |
| `justificativa_retirada` | text        | obrigatória se `estado = 'retirado'`                            |

Índices: `(edicao_id, estado, publicado_em desc)`, `(autor_id)`.
Gatilho de auditoria `app.registrar_auditoria`. RLS: leitura por `app.e_coordenacao(edicao_id)`,
`autor_id = auth.uid()` ou `app.pode_ler_comunicado(id)`; sem insert/update/delete diretos.

## `public.comunicado_turmas` (nova)

| Coluna          | Tipo    | Regras                                         |
| --------------- | ------- | ---------------------------------------------- |
| `comunicado_id` | uuid FK | `comunicados(id) on delete cascade`            |
| `turma_id`      | uuid FK | `turmas(id)`; mesma edição do comunicado (RPC) |

PK `(comunicado_id, turma_id)`. Sem turmas = público na edição inteira (só coordenação).
RLS: leitura se o comunicado é legível; sem escrita direta. Auditoria.

## `public.avisos` (alterada)

`check` de `tipo` ganha `comunicado_publicado` e `comunicado_atualizado`. Referência:
`{ "comunicadoId": "<uuid>" }`.

## Transições de estado

```text
rascunho ──publicar──▶ publicado ──retirar (justificativa)──▶ retirado
   │                      └──corrigir (justificativa)──▶ publicado (versao + 1, aviso)
   └──apagar──▶ (removido)
```

- O público e as turmas só mudam em rascunho.
- `retirado` é final; não há republicação (publica-se um comunicado novo).
- Toda escrita é recusada com a edição encerrada.

## Domínio TS (`src/modules/comunicados/domain`)

- `Comunicado`: `id`, `titulo`, `texto`, `publico`, `turmas` (`{ id, nome }[]`), `estado`,
  `autor` (`{ nome, papel }`), `publicadoEm`, `corrigidoEm`, `retiradoEm`,
  `justificativaRetirada`, `versao`, `novo` (só na leitura).
- `validarComunicado(entrada)`: mensagens de campo para título, texto, público e turmas.
- `resumoDoRegulamento(regras: unknown)`: itens do resumo com valor ou `null` (R8).
