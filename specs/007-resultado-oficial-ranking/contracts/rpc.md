# Contratos RPC: resultado oficial, ocorrências e ranking

## Regras gerais

- **Execução:** todas as funções são `security definer` e usam `search_path = ''`. Nenhuma pode
  ser executada por `anon`; todas podem ser executadas por `authenticated`.
- **Códigos de erro**, os mesmos da spec 006:
  - `42501`: sem papel ou sem vínculo, com a mensagem em português;
  - `23514`: violação de regra ou de prazo;
  - `P0002`: registro inexistente.
- **Justificativa:** obrigatória em correções, decisões, respostas, exceções e publicações a
  partir da segunda versão. Precisa ter pelo menos 10 caracteres e vai para a auditoria via
  `app.registrar_justificativa`.
- **Repetição:** repetir uma chamada com os mesmos valores é um sucesso sem efeito. Não grava
  linha nem auditoria e devolve o mesmo resultado (FR-024).
- **Pedido de revisão:** o parâmetro `p_pedido uuid default null` liga a correção a um pedido
  aberto da mesma equipe (R7). Ele também é aceito por `registrar_presencas`,
  `registrar_participacao` e `registrar_avaliacao` da spec 006, que são recriadas sem outra
  mudança.
- **Horário:** todos os horários de prazo vêm de `now()` no servidor.

## Prova oficial (coordenação da edição)

| Função                                                                                                 | Retorno                                                                                   | Regras                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registrar_resultados_prova(p_encontro uuid, p_resultados jsonb, p_justificativa text, p_pedido uuid)` | `int`, o número de linhas gravadas                                                        | `p_resultados` é uma lista de objetos `{ estudanteId, realizacao, nota?, fonte?, escalaConfirmada, autorizacaoConfirmada, notaIndisponivel? }`. O encontro precisa ser de prova oficial. O estudante precisa estar numa equipe ativa da edição. Corrigir um valor já gravado exige justificativa. |
| `resultados_prova(p_encontro uuid)`                                                                    | `jsonb`, uma lista com estudante, equipe, turma, realização, nota, estado da nota e fonte | Só para a coordenação. É a única leitura que traz a nota individual (FR-003).                                                                                                                                                                                                                     |

## Ocorrências

| Função                                                                                                                                                                                           | Retorno                                                          | Quem chama                                             | Regras                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registrar_ocorrencia(p_chave uuid, p_encontro uuid, p_dupla uuid, p_tipo text, p_fato text, p_evidencia text, p_desafio uuid, p_fato_chave text, p_evidencia_path text, p_evidencia_nome text)` | `jsonb { id, prazoManifestacao }`                                | Docente ou mentor da turma da equipe, ou a coordenação | O tipo precisa existir nas regras. O plágio exige desafio da mesma turma. A evidência em arquivo segue o R9. Avisa os integrantes.                                                  |
| `enviar_manifestacao(p_ocorrencia uuid, p_texto text)`                                                                                                                                           | `jsonb { enviadaEm }`                                            | Integrante ativo da equipe                             | Só uma por ocorrência, dentro do prazo efetivo. Uma repetição com o mesmo texto devolve o horário original.                                                                         |
| `decidir_ocorrencia(p_ocorrencia uuid, p_resultado text, p_justificativa text, p_apresentacao_dependente bool, p_pedido uuid)`                                                                   | void                                                             | Coordenação                                            | O resultado é `confirmada` ou `arquivada`. A primeira decisão só é aceita depois da manifestação ou do fim do prazo (FR-009). Uma redecisão exige `p_pedido`. Avisa os integrantes. |
| `registrar_excecao_prazo(p_dupla uuid, p_objeto text, p_ocorrencia uuid, p_publicacao uuid, p_novo_prazo timestamptz, p_justificativa text)`                                                     | `uuid`                                                           | Coordenação                                            | Exatamente um alvo, e o novo prazo precisa ser futuro.                                                                                                                              |
| `ocorrencias_visiveis(p_edicao uuid, p_turma uuid)`                                                                                                                                              | `jsonb`, uma lista de ocorrências com a manifestação e a decisão | Conforme a RLS                                         | O aluno vê só as da própria equipe. A equipe docente vê as das suas turmas. A coordenação vê todas, e pode filtrar por `p_turma`.                                                   |

## Pontos oficiais

| Função                                                     | Retorno                                                                                                 | Quem chama                             | Regras                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| `pontos_da_minha_equipe(p_edicao uuid)`                    | `jsonb { equipe, encontros: [{ encontroId, numero, titulo, pontuacao: PontuacaoDoEncontro }], totais }` | Aluno em equipe ativa                  | Mostrada como prévia na interface (FR-019). |
| `pontos_da_turma(p_turma uuid)`                            | `jsonb`, uma lista de equipes com encontros e totais                                                    | Equipe docente da turma ou coordenação | Sem nota individual da prova (FR-019a).     |
| `pendencias_da_categoria(p_edicao uuid, p_categoria text)` | `jsonb { componentes: [{ equipe, encontro, componente }], ocorrencias: [...], revisoes: [...] }`        | Coordenação                            | Lista o que impede a publicação definitiva. |

## Ranking

| Função                                                                                   | Retorno                                                                                                                                                           | Quem chama                      | Regras                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publicar_ranking(p_edicao uuid, p_categoria text, p_estado text, p_justificativa text)` | `jsonb { id, versao, estado, publicadoEm, revisaoAte }`                                                                                                           | Coordenação                     | Trava a categoria durante a operação. A partir da segunda versão, exige justificativa. O estado definitivo é recusado com a lista de pendências (`23514`). Repetir o mesmo estado com as mesmas posições devolve a última versão. Avisa alunos e equipe docente. |
| `ranking_publicado(p_edicao uuid, p_categoria text)`                                     | `jsonb { categoria, versao, estado, publicadoEm, revisaoAte, posicoes: [{ duplaId, nome, posicao, compartilhada, total, pendente, minha, detalhe? }] }` ou `null` | Qualquer participante da edição | O aluno vê só a própria categoria, e `detalhe` vem só na linha da própria equipe. A equipe docente vê a categoria das suas turmas, e a coordenação vê qualquer categoria. Devolve `null` se não houver publicação.                                               |
| `historico_publicacoes(p_edicao uuid, p_categoria text)`                                 | `jsonb`, uma lista de versões                                                                                                                                     | Coordenação                     | Mostra todas as versões, com autor e justificativa.                                                                                                                                                                                                              |

## Revisão

| Função                                                                                                                                       | Retorno                                                                     | Quem chama                                          | Regras                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pedir_revisao(p_chave uuid, p_objeto text, p_ocorrencia uuid, p_publicacao uuid, p_componente text, p_encontro uuid, p_justificativa text)` | `jsonb { id, criadoEm }`                                                    | Integrante ativo da equipe                          | Precisa estar dentro do prazo efetivo (R7). Recusa publicação parcial ou definitiva. Aceita um pedido aberto por objeto. Avisa a coordenação. |
| `responder_revisao(p_pedido uuid, p_resposta text, p_justificativa text)`                                                                    | void                                                                        | Coordenação                                         | A resposta é `deferido` ou `indeferido`. Avisa a equipe.                                                                                      |
| `pedidos_revisao(p_edicao uuid)`                                                                                                             | `jsonb`, uma lista com as correções ligadas (`auditoria.pedido_revisao_id`) | Equipe (os próprios pedidos) ou coordenação (todos) |                                                                                                                                               |

## Avisos

| Função                                 | Retorno                     | Regras                                                              |
| -------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `meus_avisos(p_limite int default 50)` | `jsonb { naoLidos, itens }` | Só os avisos da pessoa que chama.                                   |
| `marcar_avisos_lidos(p_ids uuid[])`    | `int`                       | Só marca avisos da pessoa que chama. Marcar de novo não tem efeito. |

## Funções internas (`app.`)

- `app.calcular_encontro(jsonb, jsonb)` é `immutable` e pura. Não é exposta: o teste de
  paridade a chama como `postgres` (R2).
- Também são internas: `app.lancamentos_oficiais`, `app.pontos_do_encontro`,
  `app.totais_da_equipe`, `app.classificar`, `app.pendencias_da_categoria`,
  `app.prazo_manifestacao_efetivo`, `app.prazo_revisao_efetivo`, `app.avisar` e
  `app.vincular_pedido` (valida o pedido e grava `app.pedido_revisao`).
