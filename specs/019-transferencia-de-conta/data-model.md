# Modelo de dados: transferência de conta entre unidades

## Nova tabela `public.transferencias_de_conta`

Registro imutável de cada transferência. RLS ligada; leitura só do master; escrita só pela RPC
`transferir_conta`; gatilho de imutabilidade (sem `update`/`delete`) e gatilho padrão de auditoria.

| Campo                 | Tipo                                          | Regra                                                                                     |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `id`                  | `uuid`, chave primária, `gen_random_uuid()`   |                                                                                           |
| `chave_envio`         | `uuid`, único, não nulo                       | idempotência do pedido                                                                    |
| `usuario_id`          | `uuid`, não nulo, referência a `perfis(id)`   | conta transferida                                                                         |
| `unidade_origem`      | `uuid`, não nulo, referência a `unidades(id)` |                                                                                           |
| `unidade_destino`     | `uuid`, não nulo, referência a `unidades(id)` | diferente da origem (`check`)                                                             |
| `justificativa`       | `text`, não nulo                              | `char_length` entre 10 e 2000, sem espaços nas pontas                                     |
| `funcoes_anteriores`  | `jsonb`, não nulo                             | instantâneo das funções (ativas e inativas) na origem, por exemplo `["docente","mentor"]` |
| `vinculos_encerrados` | `integer`, não nulo                           | quantidade de vínculos (`atribuicoes`) que passaram a inativos, `>= 0`                    |
| `autor_id`            | `uuid`, padrão `auth.uid()`                   | quem transferiu                                                                           |
| `criado_em`           | `timestamptz`, padrão `now()`                 | horário do servidor                                                                       |

Índice em `(usuario_id, criado_em)`.

## Tabelas alteradas (só dados, sem mudança de estrutura)

| Tabela            | Efeito de uma transferência                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `perfis`          | `unidade_id` passa para a unidade de destino (único caminho: a RPC)                                            |
| `funcoes_unidade` | todas as linhas da conta: `ativa = false`, `desativada_com_conta = false`; nenhuma apagada                     |
| `atribuicoes`     | todas as linhas da conta (qualquer edição, inclusive encerradas e derivadas): `ativo = false`; nenhuma apagada |

## Funções

| Objeto                                                  | Mudança                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.proteger_unidade_do_perfil()`                      | substituída: aceita a mudança de `unidade_id` apenas com o marcador de transação `app.transferencia_em_curso = 'on'`; fora disso recusa como hoje |
| `public.transferir_conta(uuid, uuid, uuid, uuid, text)` | nova (só master)                                                                                                                                  |
| `public.equipe_de_unidade_da_rede(uuid)`                | nova (só master)                                                                                                                                  |

## Estados e invariantes

- Antes: conta com unidade A e funções/vínculos ativos. Depois: conta com unidade B, nenhuma função
  ativa, nenhum vínculo ativo, exatamente 1 linha em `transferencias_de_conta`.
- A contagem total de linhas em `funcoes_unidade` e `atribuicoes` não muda.
- `perfis.unidade_id` nunca fica nulo para contas de equipe; masters continuam sem unidade e fora
  desta operação.
- Reaplicar o mesmo pedido (mesma `chave_envio`) devolve o mesmo `id` e não altera nada.
