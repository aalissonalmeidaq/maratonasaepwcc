# Pesquisa: transferência de conta entre unidades

## R1 — Como mudar a unidade do perfil com segurança

Hoje o gatilho `perfis_unidade_fixa` (migration 016) recusa qualquer mudança de `unidade_id`.

- **Decisão**: a migration nova substitui a função do gatilho por uma versão que aceita a mudança
  **somente** quando a RPC de transferência ligou um marcador de transação
  (`set_config('app.transferencia_em_curso', 'on', true)`); fora disso, continua recusando. A RPC
  liga o marcador e o desliga no fim.
- **Racional**: um único caminho para mudar a unidade. O cliente não altera `perfis` diretamente
  (não há política de `update` de `unidade_id`) e o marcador só vale dentro da transação da RPC. O
  pgTAP prova as duas coisas: update direto recusado e transferência pela RPC aceita.
- **Alternativas**: remover o gatilho — descartado (perde a proteção); `service_role` — descartado
  (segredo fora do desenho).

## R2 — O que acontece com funções e vínculos

- `atribuicoes`: as linhas **diretas** da conta (`origem_id is null`; qualquer papel, qualquer edição,
  inclusive encerradas) passam a `ativo = false`. As derivadas de mentor **não** são alteradas
  diretamente (a trigger `proteger_derivadas` recusa); elas acompanham pela trigger
  `sincronizar_mentor_do_curso`, que replica o `ativo` do vínculo ao curso. Nada é apagado. O
  teste confere que não resta nenhum vínculo ativo, derivado ou não. O gatilho
  `validar_atribuicao_na_unidade` retorna cedo quando `ativo` é falso.
- **Última coordenação**: a trigger `garantir_coordenacao_ativa` recusa desativar a última coordenação
  de qualquer edição, inclusive encerrada. A migration substitui essa função para ignorar o caso
  quando `app.transferencia_em_curso = 'on'`: as edições não encerradas já foram validadas antes
  pela RPC (recusa "Indique outra coordenação antes") e, nas encerradas, o vínculo vira histórico.
- `funcoes_unidade`: todas as linhas da conta passam a `ativa = false` e `desativada_com_conta =
false` (assim `reativar_membro` não as reativa no destino). As linhas permanecem. Como a tabela não
  tem coluna de unidade, o contexto de qual unidade eram fica no registro da transferência
  (`funcoes_anteriores`, um instantâneo). No destino, `definir_funcoes` as reativa por `upsert` quando
  a gestão atribui a mesma função, o que é inofensivo.
- Isolamento: com `atribuicoes` inativas e sem funções ativas, nenhuma política baseada em
  `tem_papel`/`atribuicoes` dá acesso à origem nem ao destino.
- **Alternativa**: apagar as funções antigas — descartado (a decisão do usuário é preservar).

## R3 — Registro e auditoria

- **Decisão**: tabela `transferencias_de_conta`, imutável e só alterada por RPC, com conta, origem,
  destino, justificativa, autor (`auth.uid()`), horário (servidor), chave de idempotência e
  instantâneo das funções; com o gatilho padrão `app.registrar_auditoria` (entra na auditoria geral
  com a justificativa). Leitura só do master (RLS).
- **Racional**: `perfis` não tem gatilho de auditoria; um registro próprio guarda origem e destino de
  forma consultável e dá exatamente 1 registro por transferência (SC-005).

## R4 — Quem é "conta de equipe" e as recusas

- **Equipe**: conta com ao menos uma linha em `funcoes_unidade`. **Estudante**: conta com qualquer
  vínculo de papel `aluno` → recusada. **Master** → recusada. Conta sem função alguma → recusada
  ("não é conta de equipe").
- **Recusas** (mensagens em português): `42501` quem chama não é master; `23514` para as demais:
  origem = destino, unidade desativada (origem ou destino), conta desativada, justificativa fora de 10
  a 2.000 caracteres, última gestão ativa da unidade, última coordenação ativa de edição não
  encerrada (reuso de `app.e_ultima_coordenacao`), estudante, master, conta que não é da unidade de
  origem informada.
- **Última gestão**: nova verificação (não existe outra conta com função `gestao` ativa na unidade).

## R5 — Concorrência e idempotência

- A RPC trava a linha do perfil (`for update`) e relê a unidade; se já mudou, recusa informando que a
  conta já mudou de unidade.
- `p_chave uuid` (padrão de `cadastrar_unidade`): se já existe transferência com a chave, devolve o
  mesmo id sem refazer nada.

## R6 — Lista de contas para o master escolher

O master hoje só vê a gestão de cada unidade (`unidades_da_rede`). Para escolher a conta, precisa ver
a equipe da unidade de origem, sem estudantes.

- **Decisão**: RPC de leitura `equipe_de_unidade_da_rede(p_unidade uuid)`, só master: nome, e-mail,
  funções ativas, situação do acesso e se está ativa, apenas de contas com função de equipe.
- **Racional**: dado mínimo para a operação; segue a regra de o master não ler dados de estudantes
  nem de edições. Entra na varredura de segurança (guarda de conta ativa).

## R7 — Tela e demonstração

- **Decisão**: em Rede › Unidades, cada unidade ganha "Ver equipe", que mostra a lista; cada conta
  tem "Transferir…", que abre um diálogo com a unidade de destino (lista de unidades ativas) e a
  justificativa (reaproveita `DialogoDeJustificativa`). O sucesso só aparece depois da resposta do
  servidor. Demonstração: equipe fictícia por unidade e transferência em memória.
- **Alternativa**: página própria — descartada (mais navegação sem ganho).

## R8 — Sessão da pessoa transferida

Quem está logado durante a transferência mantém o token, mas as leituras seguintes usam
`minha_conta()` do servidor, que já reflete a nova unidade e a ausência de funções; ao recarregar ou
na próxima consulta, cai em "aguardando permissão". Nenhum dado autenticado fica no cache do
service worker (regra já vigente).
