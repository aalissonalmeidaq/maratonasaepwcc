# Data Model: Painéis com dados reais e relatórios CSV

Migration: `supabase/migrations/20261102120000_paineis_relatorios.sql`. Esta spec cria uma
tabela nova e só lê o resto.

## Tabela nova

### `exportacoes_relatorio` (FR-009)

| Coluna      | Tipo            | Regras                                                                                  |
| ----------- | --------------- | --------------------------------------------------------------------------------------- |
| `id`        | uuid PK         |                                                                                         |
| `edicao_id` | uuid FK edicoes |                                                                                         |
| `tipo`      | text            | `pontos`, `presenca`, `entregas`, `ocorrencias` ou `revisoes`                           |
| `filtros`   | jsonb           | Objeto `{ categoria, turmaId, encontroId }`, com valores nulos quando não houver filtro |
| `linhas`    | int ≥ 0         | Quantidade de linhas devolvidas                                                         |
| `autor_id`  | uuid FK perfis  | Preenchido pelo servidor com `auth.uid()`                                               |
| `criado_em` | timestamptz     | Horário do servidor                                                                     |

- **RLS**: a coordenação da edição lê todas; cada pessoa lê as próprias exportações.
- **Escrita**: não há escrita direta para `authenticated`. Só a RPC `relatorio` insere.
- **Auditoria**: o gatilho `app.registrar_auditoria` também registra a inserção.

## Funções derivadas

| Função                                                      | Retorno                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `app.encontro_realizado(encontro)`                          | boolean (R2)                                                        |
| `app.pendencias_realizadas_da_categoria(edicao, categoria)` | Como `app.pendencias_da_categoria`, mas só com encontros realizados |
| `app.turmas_do_relatorio(edicao, turma)`                    | Turmas que quem chama pode exportar; recusa turma não permitida     |

## Formatos de leitura (camelCase)

- **`PainelDoAluno`**:
  - `equipe`: `{ id, nome }` ou `null`;
  - `previa`: `{ total, pendente }` ou `null`;
  - `ranking`: `{ estado, versao, posicao, compartilhada, publicadoEm }` ou `null`;
  - `proximoEncontro`: `{ id, numero, titulo, data, inicio }` ou `null`;
  - `proximoPrazo`: `{ tipo: 'desafio' | 'lista', id, titulo, prazo }` ou `null`;
  - `acoes`: lista de `{ tipo: 'manifestacao' | 'revisao_ocorrencia' | 'revisao_publicacao', titulo, prazo, caminho }`;
  - `avisosNaoLidos`.
- **`PainelDaGestao`**:
  - `proximoEncontro`;
  - `turmas`: lista de `{ id, nome, categoria, equipes, equipesPendentes, pendencias: [{ tipo: 'presenca' | 'participacao' | 'avaliacao' | 'ocorrencia', encontroNumero, descricao, caminho }] }`.
- **`PainelDaCoordenacao`**:
  - `indicadores`: `{ cursos, turmas, equipes, estudantes, encontrosRealizados, encontrosTotal }`;
  - `categorias`: lista de `{ categoria, componentesPendentes, provasPendentes, ocorrenciasSemDecisao, revisoesAbertas, publicacao: { estado, versao, publicadoEm } | null }`.
- **`Relatorio`**:
  - `colunas`: lista de `{ id, rotulo, tipo: 'texto' | 'numero' | 'data_hora' | 'sim_nao' }`;
  - `linhas`: lista de objetos com chave igual ao `id` da coluna.
