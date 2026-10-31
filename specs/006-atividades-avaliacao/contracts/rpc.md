# Contratos RPC: atividades, entregas, presença e avaliação

## Regras gerais

- Todas as funções são `security definer` e usam `search_path = ''`.
- Nenhuma função pode ser executada por `anon`; todas podem ser executadas por `authenticated`.
- Os erros usam estes códigos:
  - `42501`: sem vínculo ou sem papel adequado;
  - `23514`: violação de regra, com a mensagem em português;
  - `P0002`: registro inexistente.
- Uma correção exige `p_justificativa` com pelo menos 10 caracteres. A justificativa vai para a
  auditoria via `set_config('app.justificativa', …, true)`.
- **Idempotência (Constituição V):** `registrar_presencas`, `registrar_participacao`,
  `registrar_avaliacao`, `registrar_prorrogacao`, `registrar_entrega` e `enviar_respostas`
  podem ser repetidas com segurança. Reenviar os mesmos valores já gravados é um sucesso sem
  efeito: não cria linha nova, não gera auditoria e não exige justificativa. A função devolve o
  mesmo resultado da primeira vez. Só um valor diferente do gravado conta como correção.

## Desafios (docente ou mentor da turma)

| Função                                                                                                                                                                          | Retorno | Regras                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `salvar_desafio(p_id uuid, p_encontro uuid, p_turmas uuid[], p_titulo, p_enunciado, p_recursos, p_politica_ia, p_prazo timestamptz, p_aceita_arquivo bool, p_aceita_link bool)` | `uuid`  | Cria (`p_id` nulo) ou edita. Docente ou mentor de todas as turmas; encontro da mesma edição; sem entrega registrada. |
| `publicar_desafio(p_id)`                                                                                                                                                        | void    | Muda o estado de rascunho para publicado. Pode haver vários desafios no mesmo encontro e turma (FR-026).             |
| `encerrar_desafio(p_id)`                                                                                                                                                        | void    | Muda o estado de publicado para encerrado.                                                                           |
| `registrar_prorrogacao(p_desafio, p_dupla, p_novo_prazo, p_justificativa)`                                                                                                      | void    | Pode ser feita por docente ou mentor da turma da equipe ou pela coordenação.                                         |

## Entregas (integrante de equipe ativa)

| Função                                                                                              | Retorno                                                                    | Regras                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registrar_entrega(p_desafio uuid, p_chave uuid, p_arquivo text, p_arquivo_nome text, p_link text)` | `jsonb { protocolo, recebidaEm, versao, atrasoMinutos, descontoPrevisto }` | `p_chave` é gerada pelo navegador uma vez por tentativa de envio e reaproveitada nas repetições. Se a chave já foi registrada para a mesma equipe, a função devolve o comprovante original, sem criar versão nova. O desafio precisa estar publicado na turma do aluno, e o aluno precisa estar numa equipe ativa. Exatamente um entre arquivo e link, conforme o que o desafio aceita. Um arquivo precisa existir no bucket, no prefixo `{desafio}/{dupla}/`, ter sido enviado pelo autor e respeitar tipo e tamanho. Um link precisa começar com `http(s)://`. O atraso é calculado como no research R2. |
| `entregas_da_equipe(p_desafio)`                                                                     | conjunto de linhas                                                         | As versões da equipe do aluno, ou de todas as equipes quando chamada pela gestão.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Presença e participação (docente ou mentor da turma; a coordenação só corrige)

| Função                                                                                                                     | Retorno                 | Regras                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `registrar_presencas(p_encontro, p_turma, p_registros jsonb [{estudanteId, presente, observacao?}], p_justificativa text)` | `int` (linhas gravadas) | Cada aluno precisa ser ativo na turma. Alterar um valor existente exige justificativa. |
| `registrar_participacao(p_encontro, p_dupla, p_notas jsonb, p_justificativa)`                                              | void                    | Os critérios e limites vêm de `regras.participacao`. Uma correção exige justificativa. |

## Avaliação (docente ou mentor da turma; a coordenação só corrige)

| Função                                                                                                                                                                 | Retorno | Regras                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registrar_avaliacao(p_desafio, p_dupla, p_notas_entrega jsonb, p_notas_apresentacao jsonb, p_apresentacao_nao_avaliavel bool, p_feedback text, p_justificativa text)` | void    | Com entrega, as notas de entrega são obrigatórias e o feedback também. Sem entrega, `p_notas_entrega` precisa ser nulo e a prática vale 0. A apresentação recebe notas ou é marcada como não avaliável. Os limites vêm de `regras.entrega` e `regras.apresentacao`. Uma correção exige justificativa. |

## Questões

| Função                                                                                                                                                           | Quem chama        | Retorno                          | Regras                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `salvar_lista(p_id, p_encontro, p_turmas uuid[], p_titulo, p_prazo, p_questoes jsonb [{enunciado, justificativa, capacidade, alternativas:[{texto, correta}]}])` | Docente ou mentor | `uuid`                           | O encontro precisa ter `avaliacao_objetiva = 'questoes'`. Exige pelo menos 1 questão; cada questão com pelo menos 2 alternativas e exatamente 1 correta. Não pode haver submissão registrada. A versão aumenta em 1.                                                                                                                                            |
| `publicar_lista(p_id)` / `encerrar_lista(p_id)`                                                                                                                  | Docente ou mentor | void                             | Pode haver várias listas no mesmo encontro e turma (FR-026).                                                                                                                                                                                                                                                                                                    |
| `lista_para_equipe(p_lista)`                                                                                                                                     | Aluno da turma    | `jsonb`                          | Ver abaixo.                                                                                                                                                                                                                                                                                                                                                     |
| `enviar_respostas(p_lista, p_chave uuid, p_respostas jsonb)`                                                                                                     | Integrante        | `jsonb { enviadaEm, autorNome }` | Se a equipe já tem submissão com a mesma `p_chave`, a função devolve a confirmação original (repetição segura). Com outra chave, recusa com quem enviou e quando. A lista precisa estar publicada, dentro do prazo, e a equipe sem submissão. Respostas para questões ou alternativas de outra lista são recusadas. Acertos e total são calculados no servidor. |

A resposta de `lista_para_equipe` traz:

- `{ id, titulo, prazo, encerrada, versao, questoes:[{id, enunciado, capacidade, alternativas:[{id, texto}]}], submissao: {autorNome, enviadaEm} | null }`;
- quando `encerrada` (o prazo passou), também `gabarito` e `justificativa` por questão, as respostas da equipe e `acertos`/`total`.

## Leitura consolidada

| Função                                    | Quem chama      | Retorno                                                                                                                                                                                                                                         |
| ----------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `atividades_da_turma(p_turma)`            | Aluno ou gestão | `jsonb { regras, desafios:[…], listas:[{id, titulo, prazo, estado, encontroId}] }`, só com publicados e encerrados para o aluno                                                                                                                 |
| `lancamentos_da_minha_equipe(p_edicao)`   | Aluno           | `jsonb { regras, equipe, encontros:[{encontroId, avaliacaoObjetiva, presencas:[{estudanteId, presente}], participacao, questoes:{acertos, total}\|null, avaliacao:{…}\|null, entrega:{atrasoMinutos, prorrogada}\|null, desafioPrazoPassou}] }` |
| `painel_avaliacao(p_desafio)`             | Gestão          | `jsonb { regras, desafio, equipes:[{ultimaEntrega, versoes, avaliacao, prorrogacao}] }`; `regras` = `edicoes.regras` da edição do desafio (critérios e limites dos formulários, FR-025)                                                         |
| `presencas_da_turma(p_encontro, p_turma)` | Gestão          | `jsonb { regras, alunos:[{estudanteId, nome, duplaId, presente, observacao}], participacoes:[{duplaId, notas}] }`                                                                                                                               |

## Notas de implementação (2026-10-30)

- `entregas_da_equipe` não existe como RPC: as versões vêm em `atividades_da_turma` e
  `painel_avaliacao`.
- A gestão lê listas, questões e alternativas diretamente pela RLS (`app.pode_gerir_lista`); não
  há `listas_da_gestao`. O aluno não tem leitura direta dessas tabelas (SC-005).
