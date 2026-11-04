# Contrato das RPCs: encerramento da edição por turma

Todas `security definer`, `search_path = ''`, executáveis só por `authenticated`. Erros como na
spec 010: `42501` (sem permissão), `23514` (regra violada, mensagem em português).

## Mudanças em RPCs existentes

| Função                                             | Quem chama            | Mudança                                                                                                                                                                                            |
| -------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pendencias_da_edicao(p_id uuid)`                  | coordenação da edição | Resposta com `turmasSemDefinitiva` (ver [data-model.md](../data-model.md)) no lugar de `categoriasSemRanking`.                                                                                     |
| `encerrar_edicao(p_id uuid, p_justificativa text)` | coordenação da edição | Sem mudança de regra: as pendências não impedem; grava o formato novo em `pendencias_no_encerramento` e o devolve em `pendencias`. Reenvio sobre a edição já encerrada devolve o registro gravado. |
| `edicoes_que_coordeno()`                           | coordenação           | Cada edição ganha `pendenciasNoEncerramento` (JSON gravado ou `null`).                                                                                                                             |

Nenhuma RPC nova.
