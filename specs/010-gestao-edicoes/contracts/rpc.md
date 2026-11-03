# Contrato das RPCs: gestão de edições, turmas e vínculos

Todas `security definer`, `search_path = ''`, executáveis só por `authenticated`. Erros: `42501`
(sem permissão), `23514` (regra violada, mensagem em português), `P0002` (não encontrado).
Justificativa mínima: 10 caracteres (`app.registrar_justificativa`).

## Edições

| Função                                                                                   | Quem chama                  | Retorno                                                                    | Regras                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `criar_edicao(p_chave uuid, p_nome text, p_inicio date, p_fim date, p_base_edicao uuid)` | quem coordena alguma edição | `uuid`                                                                     | Base nula = `app.regras_piloto()`; senão, edição que a pessoa coordena (copia `regras` e `regras_versao`). Cria em rascunho e a atribuição de coordenação da criadora. Mesma chave: devolve o id existente. |
| `alterar_edicao(p_id uuid, p_nome text, p_inicio date, p_fim date)`                      | coordenação da edição       | `void`                                                                     | Rascunho ou ativa; ativa não fica sem início ou fim. Mesmos valores: nada grava.                                                                                                                            |
| `ativar_edicao(p_id uuid)`                                                               | coordenação da edição       | `{ativadaEm}`                                                              | Só de rascunho; exige início, fim e uma turma vinculada (a mensagem lista o que falta). Já ativa: devolve sem gravar.                                                                                       |
| `pendencias_da_edicao(p_id uuid)`                                                        | coordenação da edição       | `{ocorrenciasSemDecisao, revisoesAbertas, categoriasSemRanking: string[]}` | Leitura para a confirmação do encerramento.                                                                                                                                                                 |
| `encerrar_edicao(p_id uuid, p_justificativa text)`                                       | coordenação da edição       | `{encerradaEm, pendencias}`                                                | Só de ativa; grava as pendências recalculadas. Já encerrada: devolve sem gravar.                                                                                                                            |
| `apagar_edicao(p_id uuid)`                                                               | coordenação da edição       | `void`                                                                     | Só rascunho sem turmas vinculadas nem atribuições além da própria.                                                                                                                                          |
| `edicoes_que_coordeno()`                                                                 | quem coordena alguma edição | `EdicaoGerida[]`                                                           | Ordem: ativa, rascunho, encerrada; início desc.                                                                                                                                                             |

## Cadastro permanente

| Função                                                                             | Quem chama                  | Retorno             | Regras                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | --------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cadastro()`                                                                       | quem coordena alguma edição | `CursoDoCadastro[]` | Cursos com turmas e, por turma, as edições em que participa (nome e estado).                                                                                    |
| `salvar_curso_do_cadastro(p_id uuid, p_nome text, p_categoria text)`               | idem                        | `uuid`              | `p_id` nulo cria; nome único sem caixa (repetido: `23514` "Já existe um curso com esse nome no cadastro."). Correção chega sozinha só às edições em preparação. |
| `salvar_turma_do_cadastro(p_id uuid, p_curso uuid, p_nome text, p_ano_letivo int)` | idem                        | `uuid`              | Nome único no curso, sem caixa (repetido: `23514` "Já existe uma turma com esse nome neste curso."). Correção chega sozinha só às edições em preparação.        |
| `apagar_do_cadastro(p_tipo text, p_id uuid)`                                       | idem                        | `void`              | `curso` ou `turma`; recusado se participa ou participou de alguma edição (ou curso com turmas).                                                                 |

## Turmas na edição e vínculos

| Função                                                      | Quem chama            | Retorno                        | Regras                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------- | --------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vincular_turmas(p_edicao uuid, p_turmas uuid[])`           | coordenação da edição | `{turmaId, cadastroTurmaId}[]` | Turmas do cadastro; cria curso e turma na edição que faltarem; cria derivadas para os mentores ativos do curso. Já vinculadas: devolve sem gravar.                                                                                                       |
| `atualizar_do_cadastro(p_edicao uuid)`                      | coordenação da edição | `{cursos: int, turmas: int}`   | Edição ativa; aplica nome e categoria do cadastro aos cursos e turmas na edição que diferem. Sem diferença: nada grava.                                                                                                                                  |
| `desvincular_turma(p_turma uuid)`                           | coordenação da edição | `void`                         | Recusado se houver atribuições de aluno ou docente (ativas ou não) ou registros; a mensagem diz o que impede. Derivadas de mentor saem junto. Curso que fica sem turmas: apagado se não tiver mentores; senão, mentores inativos e curso fora da edição. |
| `pessoas_para_vincular(p_edicao uuid, p_busca text)`        | coordenação da edição | `{usuarioId, nome}[]`          | Contas ativas que participam ou participaram de edições que a pessoa coordena; até 20; sem e-mail. **[validar]**                                                                                                                                         |
| `atribuir_coordenacao(p_edicao uuid, p_usuario uuid)`       | coordenação da edição | `void`                         | Cria ou reativa; já ativa: nada grava. Não vale para si mesma (`42501`).                                                                                                                                                                                 |
| `desativar_coordenacao(p_edicao uuid, p_usuario uuid)`      | coordenação da edição | `void`                         | Já inativa: nada grava. Não vale para si mesma nem para a última ativa (gatilho, FR-014).                                                                                                                                                                |
| `vincular_mentor_ao_curso(p_curso uuid, p_usuario uuid)`    | coordenação da edição | `void`                         | Cria ou reativa o vínculo ao curso e as derivadas. Já ativo: nada grava. Curso sem turma na edição: `23514` "Vincule uma turma deste curso antes de vincular mentores.".                                                                                 |
| `desvincular_mentor_do_curso(p_curso uuid, p_usuario uuid)` | coordenação da edição | `void`                         | Desativa o vínculo ao curso e as derivadas.                                                                                                                                                                                                              |

Vínculos de aluno e docente continuam pelas políticas de `atribuicoes` (spec 001),
agora com os gatilhos da [data-model](../data-model.md); a Edge Function `criar-conta` passa a
recusar `papel = 'mentor'` com turma e a aceitar `cursoId` para mentor.

## Funções internas (`app`)

`app.coordena_alguma_edicao()`, `app.regras_piloto()` (cópia de `REGRAS_PILOTO`, com teste de
paridade), `app.bloquear_edicao_encerrada()`, `app.sincronizar_mentor_do_curso()`,
`app.proteger_derivadas()`, `app.garantir_coordenacao_ativa()`, `app.sincronizar_cadastro()`.

## Formatos

```text
EdicaoGerida    = { id, nome, inicio: date|null, fim: date|null, estado, regrasVersao }
CursoDoCadastro = { id, nome, categoria, turmas: { id, nome, anoLetivo: int|null, edicoes: { id, nome, estado }[] }[] }
```
