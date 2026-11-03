# Contrato das RPCs: regras da edição e das turmas

Todas `security definer`, `search_path = ''`, executáveis só por `authenticated`. Erros: `42501`
(sem permissão), `23514` (regra violada, mensagem em português), `P0002` (não encontrado).
Justificativa por `app.registrar_justificativa` (10 a 2000 caracteres).

## Escrita

| Função                                                                                                  | Quem chama                                                            | Retorno                       | Regras                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gravar_regras(p_edicao uuid, p_versao_base text, p_rotulo text, p_regras jsonb, p_justificativa text)` | coordenação da edição                                                 | `{rotulo, valeDesde, nova}`   | Rascunho ou ativa. Trava a edição; base diferente da vigente: `23514` "As regras mudaram desde que você abriu a tela; recarregue.". `app.validar_regras(p_regras, 'edicao')`; `provaOficial` igual ao piloto; rótulo único. Reenvio idêntico: `nova = false`. Atualiza `edicoes.regras` e `regras_versao`. |
| `gravar_ajustes_turma(p_turma uuid, p_ajuste_base uuid, p_grupos jsonb, p_justificativa text)`          | coordenação (qualquer grupo) ou mentor do curso (grupos de avaliação) | `{ajusteId, valeDesde, novo}` | Trava a turma; base diferente da vigente: `23514` (mesma mensagem). Só grupos ajustáveis; cada grupo validado; mentor com `penalidades` ou `prazos`: `42501`. `{}` desfaz todos os ajustes. Igual ao vigente: `novo = false`.                                                                              |
| `definir_encontros_da_turma(p_turma uuid, p_excluidos uuid[])`                                          | coordenação da edição                                                 | `void`                        | Encontros da mesma edição; excluir encontro com lançamentos da turma: `23514` com o que impede. Conjunto igual: nada grava.                                                                                                                                                                                |

## Leitura

| Função                                          | Quem chama                                   | Retorno                                                                                                                                              | Regras                                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regras_da_turma(p_turma uuid)`                 | quem participa da turma ou coordena a edição | `{regras, gruposAjustados: string[], ajusteId: uuid\|null, versao, maximo, encontrosExcluidos: uuid[], podeAjustar: string[], encontrosBloqueados?}` | Regras vigentes agora para a turma. `podeAjustar`: grupos que quem chama pode ajustar (coordenação: todos os ajustáveis; mentor do curso: os de avaliação; demais: vazio). `encontrosBloqueados` (só coordenação): `{encontroId, motivo}` dos encontros com lançamentos da turma. |
| `regras_da_edicao_vigentes(p_edicao uuid)`      | quem participa da edição                     | `{regras, rotulo, sugestao}`                                                                                                                         | `sugestao` = próximo rótulo sugerido.                                                                                                                                                                                                                                             |
| `historico_regras(p_edicao uuid, p_turma uuid)` | coordenação; mentor da turma (com `p_turma`) | `ItemHistorico[]`                                                                                                                                    | Versões da edição e, com turma, ajustes da turma; mais recentes primeiro.                                                                                                                                                                                                         |

## Mudanças em RPCs existentes

- `lancamentos_da_minha_equipe`, `atividades_da_turma`, `presencas_da_turma`, `painel_avaliacao`:
  passam a devolver as regras de cada encontro para a turma (`regras` por encontro), mantendo o
  campo atual com as regras vigentes.
- `pontos_da_minha_equipe`, `pontos_da_turma`: acrescentam `maximo` (pontuação máxima da turma).
- `criar_edicao`: cria a versão inicial em `versoes_regras`.

## Formatos

```text
ItemHistorico = { tipo: 'edicao'|'turma', rotulo: string|null, valeDesde: timestamptz|null,
                  autor: string|null, papel: 'coordenacao'|'mentor'|null,
                  justificativa: string|null, grupos: string[] }
```
