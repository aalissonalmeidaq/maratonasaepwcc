# Contrato: RPCs e Edge Function

Todas: `security definer`, `search_path = ''`, `revoke` de `public`/`anon`, `grant` a
`authenticated` (exceto `app.promover_master`). Recusas: `42501` (permissão), `23514` (regra),
`40001` (concorrência). Mensagens em português.

## Sessão

### `public.minha_conta() → jsonb`

`{ "nome", "master": bool, "unidade": { "id", "nome", "ativa" } | null, "funcoes": [..],
"papeis": [..] }` — `papeis` das atribuições ativas (como hoje); `funcoes` ativas na unidade.

## Master

| RPC                                                        | Quem                      | Efeito                                                                                                                               |
| ---------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `app.promover_master(p_email text)`                        | só administração do banco | torna master a conta existente sem unidade, ou cria o registro para a conta já convidada                                             |
| `unidades_da_rede()`                                       | master                    | lista unidades: `id, nome, ativa, desativadaEm, justificativaDesativacao, gestao: [{usuarioId, nome, email, situacaoAcesso, ativa}]` |
| `cadastrar_unidade(p_chave uuid, p_nome text)`             | master                    | cria a unidade (reenvio com a mesma chave devolve o mesmo id); nome repetido → `23514` "Já existe uma unidade com esse nome."        |
| `renomear_unidade(p_id, p_nome)`                           | master                    | nome único                                                                                                                           |
| `definir_situacao_unidade(p_id, p_ativa, p_justificativa)` | master                    | desativar exige justificativa                                                                                                        |
| `definir_gestao(p_usuario, p_ativa, p_justificativa)`      | master                    | ativa/desativa a função `gestao`; recusa desativar a última gestão ativa da unidade                                                  |
| `masters_da_rede()`                                        | master                    | `usuarioId, nome, email, situacaoAcesso, ativo`                                                                                      |
| `definir_master(p_usuario, p_ativo, p_justificativa)`      | master                    | recusa a si mesmo e o último master ativo                                                                                            |

O master não lê dados de edição: nenhuma RPC de edição o aceita (FR-004).

## Gestão da unidade

| RPC                                                                                 | Quem                                       | Efeito                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `equipe_da_unidade()`                                                               | gestão                                     | contas com função na unidade: `usuarioId, nome, email, funcoes, situacaoAcesso, ativo`; sem estudantes                                           |
| `definir_funcoes(p_usuario, p_funcoes funcao_unidade[], p_justificativa)`           | gestão                                     | troca as funções (sem `gestao`, que só o master define); recusa tirar `coordenacao` de quem é a última coordenação ativa de edição não encerrada |
| `desativar_membro(p_usuario, p_justificativa)` / `reativar_membro(p_usuario)`       | gestão                                     | mesma regra da última coordenação                                                                                                                |
| `criar_edicao(p_chave, p_nome, p_inicio, p_fim, p_base_edicao, p_coordenacao uuid)` | gestão ou coordenação da unidade           | edição na unidade de quem chama; `p_coordenacao` obrigatória se quem chama não é coordenação; precisa ter a função `coordenacao`                 |
| `definir_coordenacao_da_edicao(p_edicao, p_usuario, p_ativa, p_justificativa)`      | gestão da unidade ou coordenação da edição | edição não encerrada; mantém ao menos uma coordenação ativa                                                                                      |
| `edicoes_da_unidade()`                                                              | gestão                                     | edições da unidade com estado e coordenações (nome) — sem dados de estudantes                                                                    |

## Analista

`painel_da_coordenacao(p_edicao)` e `relatorio(...)` aceitam também `app.e_analista_da_edicao`.
`edicoes` visíveis ao analista: as da sua unidade.

## Premissas (alteração da spec 015)

- `responder_premissa`: exige `app.e_master()`; demais → `42501` "Somente o master registra
  respostas às premissas.".
- `premissas_em_validacao`: master (`podeResponder: true`); gestão, coordenação, docente, mentor
  (`false`); analista, estudante, visitante → `42501`.

## Regulamento público (alteração da spec 014)

Cada edição ganha `"unidade": "<nome>"`.

## Edge Function `contas-da-rede` (POST, autenticada)

```json
{ "acao": "master" | "gestao" | "equipe", "nome": "...", "email": "...",
  "unidadeId": "uuid (gestao)", "funcoes": ["coordenacao", "docente"] }
```

- `master`: quem chama é master; cria conta sem unidade + registro em `masters`.
- `gestao`: master; cria conta na unidade + função `gestao`.
- `equipe`: gestão da unidade; cria conta na unidade de quem chama + funções (não `gestao`).
- Resposta `201 { usuarioId, convite: "enviado" | "falhou" }`; `403` sem permissão; `409`
  e-mail já cadastrado; em falha ao gravar funções, a conta criada é removida.
