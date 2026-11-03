# Contratos RPC: comunicados

## Regras gerais

- **Execução:** todas as funções são `security definer` com `search_path = ''`; nenhuma é
  executável por `anon`.
- **Códigos de erro**, os mesmos das specs anteriores:
  - `42501`: sem papel, sem vínculo ou sem autoria, com mensagem em português;
  - `23514`: regra violada (campo inválido, estado errado, edição encerrada, justificativa curta);
  - `P0002`: comunicado ou edição não encontrados (ou não visíveis para quem chama).
- **Edição encerrada:** escritas recusadas com `23514`; leituras funcionam.
- **Justificativa:** mínimo de 10 caracteres (`app.exigir_justificativa`).

## Escrita

| Função                                                                                                                    | Quem chama                                      | Retorno                                   | Regras                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `salvar_comunicado(p_chave uuid, p_id uuid, p_edicao uuid, p_titulo text, p_texto text, p_publico text, p_turmas uuid[])` | coordenação, docente ou mentor                  | `uuid`                                    | `p_id` nulo cria rascunho (mesma `p_chave` devolve o mesmo id). Com `p_id`, só o autor ou a coordenação, e só em rascunho. Autoria e turmas conforme R2: docente/mentor com turmas obrigatórias em que atua. Turma de outra edição: `42501`. |
| `apagar_rascunho(p_id uuid)`                                                                                              | autor ou coordenação                            | `void`                                    | Só em `rascunho`; publicado: `23514`.                                                                                                                                                                                                        |
| `publicar_comunicado(p_id uuid)`                                                                                          | autor ou coordenação                            | `jsonb` `{ publicadoEm, avisos }`         | Trava a linha. Já publicado: devolve o mesmo `publicadoEm` e `avisos = 0`. Retirado: `23514`. Gera `comunicado_publicado` para `app.destinatarios_do_comunicado`.                                                                            |
| `corrigir_comunicado(p_id uuid, p_titulo text, p_texto text, p_justificativa text)`                                       | autor (ainda atuando nas turmas) ou coordenação | `jsonb` `{ versao, corrigidoEm, avisos }` | Só em `publicado`. Mesmos título e texto: nada muda, `avisos = 0`. Senão `versao + 1`, auditoria com justificativa e `comunicado_atualizado` para o público.                                                                                 |
| `retirar_comunicado(p_id uuid, p_justificativa text)`                                                                     | autor (ainda atuando nas turmas) ou coordenação | `void`                                    | Só de `publicado`; já retirado: sem mudança. Não gera aviso.                                                                                                                                                                                 |
| `marcar_comunicado_lido(p_id uuid)`                                                                                       | quem pode ler                                   | `int`                                     | Marca como lidos os avisos de `comunicado_*` da pessoa com aquele `comunicadoId`.                                                                                                                                                            |

## Leitura

| Função                                    | Quem chama                   | Retorno                | Regras                                                                                                                                                                                                 |
| ----------------------------------------- | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `comunicados_para_mim(p_edicao uuid)`     | estudante, docente, mentor   | `ComunicadoRecebido[]` | Só os legíveis por `app.pode_ler_comunicado` (publicados, não retirados, público e turma ativos). Ordem: `publicado_em desc`. `novo` = há aviso não lido do comunicado. Sem e-mail nem ids de pessoas. |
| `comunicados_que_gerencio(p_edicao uuid)` | coordenação, docente, mentor | `ComunicadoGerido[]`   | Coordenação: todos da edição em qualquer estado. Docente/mentor: só os de sua autoria. Inclui turmas, estado, versão, justificativa da retirada e `podeEditar`.                                        |

### Formatos

```text
ComunicadoRecebido = {
  id, titulo, texto, publico, turmas: [{ id, nome }],
  autor: { nome, papel }, publicadoEm, corrigidoEm | null, novo: boolean
}
ComunicadoGerido = ComunicadoRecebido sem `novo` + {
  estado, versao, retiradoEm | null, justificativaRetirada | null, podeEditar: boolean
}
```

## Funções internas (`app.`)

- `exigir_autoria_comunicado(p_edicao, p_publico, p_turmas)` — R2.
- `exigir_gestor_do_comunicado(p_id)` — autor ainda vinculado ou coordenação; devolve a linha.
- `pode_ler_comunicado(p_id)` e `destinatarios_do_comunicado(p_id)` — R3, R4.
- `exigir_edicao_aberta_para_comunicados(p_edicao)` — R6.
