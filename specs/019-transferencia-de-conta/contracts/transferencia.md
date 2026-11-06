# Contrato: RPCs e tela da transferência

Todas: `security definer`, `search_path = ''`, `revoke` de `public`/`anon`, `grant` a `authenticated`,
guarda de conta ativa (`app.exigir_conta_ativa`) e `app.exigir_master`. Recusas: `42501` (permissão) e
`23514` (regra). Mensagens em português.

## `public.transferir_conta(p_chave uuid, p_usuario uuid, p_unidade_origem uuid, p_unidade_destino uuid, p_justificativa text) → uuid`

Devolve o `id` da transferência. Reenvio com a mesma `p_chave` devolve o mesmo `id` sem alterar nada.

| Condição                                         | Resultado                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| quem chama não é master                          | `42501` "Somente o master transfere contas."                                       |
| conta não é da unidade de origem informada       | `23514` "Esta conta não é da unidade de origem." (cobre transferência concorrente) |
| origem igual ao destino                          | `23514` "A unidade de destino deve ser outra."                                     |
| origem ou destino desativada                     | `23514` "Unidade desativada."                                                      |
| conta desativada                                 | `23514` "Reative a conta antes de transferi-la."                                   |
| conta de master                                  | `23514` "Contas de master não são transferidas."                                   |
| conta de estudante (qualquer vínculo `aluno`)    | `23514` "Contas de estudante não são transferidas."                                |
| conta sem função de equipe                       | `23514` "Esta não é uma conta de equipe."                                          |
| última gestão ativa da origem                    | `23514` "Indique outra gestão antes."                                              |
| última coordenação ativa de edição não encerrada | `23514` "Indique outra coordenação antes."                                         |
| justificativa fora de 10 a 2.000 caracteres      | `23514` "Justifique com 10 a 2.000 caracteres."                                    |

Efeitos (numa transação): trava o perfil; grava `transferencias_de_conta` (com instantâneo das
funções e contagem de vínculos); inativa funções e vínculos; muda `perfis.unidade_id`; desliga o
marcador. Tudo ou nada.

## `public.equipe_de_unidade_da_rede(p_unidade uuid) → jsonb`

Só master. Lista de contas de equipe da unidade (nunca estudantes):

```json
[
  {
    "usuarioId": "uuid",
    "nome": "texto",
    "email": "texto",
    "funcoes": ["docente"],
    "situacaoAcesso": "ativo|pendente|…",
    "ativo": true
  }
]
```

## Tela (área do master › Rede › Unidades)

- Cada unidade ativa tem o botão "Ver equipe"; a lista mostra nome, e-mail, funções e situação.
- Cada conta ativa da lista tem "Transferir…" (a gestão não aparece como transferível se for a última;
  a recusa do servidor é a fonte da verdade e aparece no diálogo).
- Diálogo "Transferir <nome>": seletor "Unidade de destino" (unidades ativas, exceto a de origem),
  campo "Justificativa" (mínimo 10 caracteres, validado no cliente e no servidor), botões "Transferir"
  e "Cancelar"; foco devolvido ao botão de origem ao fechar; sucesso só após a resposta do servidor,
  com aviso "Conta transferida. A gestão da unidade de destino define as funções." e a lista
  atualizada.
- Acessível: rótulos, erros associados, axe sem violações em desktop e celular.
