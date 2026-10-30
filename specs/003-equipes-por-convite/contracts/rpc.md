# Contrato — funções RPC (spec 003)

Todas `security definer`, `search_path = ''`, `execute` só para `authenticated`. Erros de regra
com `errcode 23514` e mensagem em português; falta de permissão com `42501`.

| Função                                                                                                                                                                    | Quem                                      | Efeito / regras                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enviar_convite_equipe(p_turma uuid, p_convidados uuid[]) → uuid`                                                                                                         | aluno ativo de `p_turma` sem equipe       | 1 ou 2 convidados distintos, ≠ remetente, alunos ativos da turma sem equipe; 2 só em turma ímpar sem trio; recusa convite pendente repetido ao mesmo convidado.                                                                                                            |
| `responder_convite_equipe(p_convite uuid, p_aceitar boolean) → uuid`                                                                                                      | convidado ativo com resposta pendente     | Bloqueia a turma antes de alterar convite. Recusar ⇒ convite `recusado`. Aceitar ⇒ revalida elegibilidade, marca `aceito` e, se todos aceitaram, forma a equipe, cancelando convites pendentes dos envolvidos (e de trio da turma, se trio). Devolve id da equipe ou nulo. |
| `retirar_aceite_convite_equipe(p_convite uuid) → void`                                                                                                                    | convidado que aceitou trio ainda pendente | Cancela convite inteiro (`aceite_retirado`); preserva outros convites. Equipe já formada ⇒ recusa.                                                                                                                                                                         |
| `cancelar_convite_equipe(p_convite uuid) → void`                                                                                                                          | remetente                                 | Só convite `pendente`.                                                                                                                                                                                                                                                     |
| `colegas_da_turma(p_turma uuid) → table(id, nome, tem_equipe)`                                                                                                            | aluno ativo da turma; gestão da turma     | Somente leitura.                                                                                                                                                                                                                                                           |
| `meus_convites_equipe(p_edicao uuid) → table(id, tipo, situacao, motivo, remetente_id, remetente_nome, convidados jsonb, criado_em, encerrado_em, sou_remetente boolean)` | aluno (somente os próprios convites)      | Somente leitura; `convidados` = `[{ id, nome, resposta }]`.                                                                                                                                                                                                                |
| `definir_nome_equipe(p_dupla uuid, p_nome text) → void`                                                                                                                   | integrante ativo                          | Só se a equipe ainda não tem nome; 2–80 caracteres; único entre equipes ativas da turma.                                                                                                                                                                                   |
| `renomear_equipe(p_dupla uuid, p_nome text, p_justificativa text) → void`                                                                                                 | somente docente/mentor ativo da turma     | Exige nome próprio já definido e justificativa ≥ 10; coordenação e aluno são recusados. Mantém validação e unicidade do nome.                                                                                                                                              |
| `formar_equipe_docente(p_turma uuid, p_estudantes uuid[], p_justificativa text) → uuid`                                                                                   | somente docente/mentor ativo da turma     | 2 alunos ativos distintos sem equipe, ou 3 em turma ímpar sem trio; justificativa ≥ 10; forma sem nome, cancela convites dos envolvidos e, se trio, demais convites de trio da turma; histórico atômico. Coordenação recusada.                                             |
| `incluir_integrante(p_dupla, p_estudante, p_justificativa) → void`                                                                                                        | gestão da turma                           | Aluno ativo da turma sem equipe; resultado ≤ 3; trio só em turma ímpar sem outro trio. Cancela convites pendentes do aluno.                                                                                                                                                |
| `remover_integrante(p_dupla, p_estudante, p_justificativa) → void`                                                                                                        | gestão da turma                           | Só em trio (fica dupla).                                                                                                                                                                                                                                                   |
| `substituir_integrante(...)`                                                                                                                                              | gestão da turma (antes: só coordenação)   | Inalterada na regra; cancela convites do aluno que entra.                                                                                                                                                                                                                  |
| `desfazer_dupla(...)`                                                                                                                                                     | gestão da turma (antes: só coordenação)   | Inalterada.                                                                                                                                                                                                                                                                |
| ~~`formar_dupla`~~                                                                                                                                                        | —                                         | Removida (FR-007).                                                                                                                                                                                                                                                         |

"Gestão da turma" = coordenação da edição da turma ou docente/mentor com vínculo ativo nela.

## Garantias comuns

- Todas as RPCs de escrita de equipe e convite (`enviar_convite_equipe`,
  `responder_convite_equipe`, `retirar_aceite_convite_equipe`, `cancelar_convite_equipe`,
  `definir_nome_equipe`, `renomear_equipe`, `formar_equipe_docente`, `incluir_integrante`,
  `remover_integrante`, `substituir_integrante`, `desfazer_dupla`) chamam
  `app.exigir_edicao_aberta(p_edicao)` depois do bloqueio da turma: edição `encerrada` ⇒
  `23514` "A edição está encerrada; as equipes não podem mais ser alteradas." Estados
  `rascunho` e `ativa` permitem (FR-017). As RPCs de leitura continuam disponíveis.
- Recusa de qualquer convidado encerra o convite inteiro como `recusado`, com motivo
  `recusado` e `encerrado_em` preenchido; registra a resposta individual e preserva respostas
  anteriores. Não forma equipe nem permite novos aceites nesse convite. `cancelado` fica
  reservado a cancelamento pelo remetente, retirada de aceite e cancelamentos automáticos.

- `definir_nome_equipe` exige participação atual (`saida_em is null`) e vínculo de aluno ativo;
  não reutilizar sem ajuste a função histórica `app.e_integrante`. Coordenação/docente/mentor
  sem participação de aluno elegível não podem escolher o primeiro nome.
- Substituição mantém assinatura existente (`p_dupla`, `p_sai`, `p_entra`,
  `p_justificativa`); aluno que entra precisa estar ativo, na mesma turma e sem equipe na edição.
- Inclusão e substituição cancelam convites pendentes de quem entra; se inclusão forma trio,
  cancelar também demais convites de trio da turma.
- Bloqueio comum: turma primeiro; depois convite/equipe e integrantes em ordem estável.
  Todas as RPCs revalidam estado e permissão após bloqueio; nenhuma gravação parcial.
- Cadastro, importação, ativação e desativação de alunos seguem a spec 002 sem bloqueio da
  turma; o gatilho de desativação só cancela convites pendentes do aluno (FR-011).
- Retentativa de aceite confirmado retorna o resultado existente apenas ao participante
  autorizado, sem criar nova equipe; convite cancelado/recusado devolve erro de estado claro.
- Leitura de gestão retorna avisos `integranteInativo` e `trioEmTurmaPar`; o aluno continua
  recebendo apenas nomes e situação de equipe dos colegas, sem dados administrativos.

## Leitura de equipes para gestão (FR-005/011/013)

RPC `equipes_da_turma_gestao(p_turma uuid) → table` somente leitura, `stable`,
`security definer`, `search_path = ''`. EXECUTE apenas para `authenticated`; verifica
coordenação ativa da edição ou docente/mentor com vínculo ativo na turma. Usuário sem essa
autorização (inclusive aluno), turma inexistente ou inacessível recebe `42501` com mensagem
neutra, sem revelar nomes ou existência de dados. Turma autorizada sem equipes retorna `[]`.

Uma linha por equipe ativa da turma, ordenada por `id`; somente integrantes atuais
(`saida_em is null`) no array, ordenados por `estudanteId`. Histórico continua no contrato
existente e não faz parte desta projeção. Toda leitura usa um único snapshot SQL.

| Campo de retorno    | Tipo         | Regra                                                                        |
| ------------------- | ------------ | ---------------------------------------------------------------------------- |
| `id`                | uuid         | Identificador da equipe                                                      |
| `turma_id`          | uuid         | Igual a `p_turma`                                                            |
| `nome`              | text ou null | Nome próprio atual, sem fabricar nome provisório                             |
| `ativa`             | boolean      | Sempre true nesta consulta                                                   |
| `integrantes`       | jsonb array  | Objetos `{ estudanteId: uuid, nome: string, integranteInativo: boolean }`    |
| `trio_em_turma_par` | boolean      | Três integrantes atuais e número par de atribuições de aluno ativas na turma |

`integranteInativo` é verdadeiro quando não existe atribuição de aluno ativa da pessoa naquela
turma. O nome continua disponível à gestão mesmo com vínculo inativo; a consulta não retorna
e-mail, outros papéis, convites ou dados de outras turmas. O repositório mapeia `turma_id` para
`turmaId` e `trio_em_turma_par` para `trioEmTurmaPar`, expondo
`equipesGestao(turmaId: string): Promise<EquipeGestao[]>` em `RepositorioDuplas`.
`EquipeGestao` contém os campos mapeados desta tabela. A leitura do aluno mantém o caminho
existente e não recebe os avisos administrativos.

Testes pgTAP: coordenação da edição e docente/mentor da turma autorizados; aluno, anônimo e
gestão de outra turma/edição recusados; turma vazia; nome de inativo preservado; avisos
recalculados após desativação, reativação e ajuste da equipe. Teste do repositório valida o
mapeamento e propagação de erros; invalidar esta consulta após alterações de equipe ou vínculo.
