# Data Model: Painel da turma

Nenhuma tabela nova. O painel lê `turmas`, `cursos`, `atribuicoes`, `perfis`, `duplas`,
`dupla_integrantes`, `convites_equipe` e `encontros` (specs 002 e 003), por meio da RPC
`painel_da_turma`.

## PainelTurma (projeção de leitura)

| Campo               | Tipo                        | Origem e regra                                                                             |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `visao`             | `'gestao' \| 'aluno'`       | `gestao` para coordenação da edição e docente/mentor da turma; `aluno` para aluno ativo    |
| `turma`             | `TurmaDoPainel`             | turma + curso                                                                              |
| `alunos`            | `AlunoDoPainel[]`           | atribuições `aluno` ativas da turma, ordenadas por nome                                    |
| `equipes`           | `EquipeDoPainel[]`          | `duplas` ativas da turma, com integrantes ativos (`saida_em is null`), ordenadas pelo nome |
| `convitesPendentes` | `number \| null`            | convites `pendente` da turma; `null` na visão `aluno`                                      |
| `pontuacao`         | `PontuacaoDoPainel \| null` | `null` no servidor até os Incrementos 3/4; preenchida só pela demonstração                 |
| `encontros`         | `EncontroDoPainel[]`        | encontros da edição da turma, ordenados por data e número                                  |

### TurmaDoPainel

`id`, `nome`, `anoLetivo: number | null`, `cursoNome`, `categoria`, `edicaoId`.

### AlunoDoPainel

`id`, `nome`, `temEquipe: boolean`. Não inclui e-mail, situação de acesso nem outros dados
pessoais (FR-003).

### EquipeDoPainel

`id`, `nome: string | null` (o nome de exibição segue `nomeDeExibicao` da spec 003) e
`integrantes: { estudanteId, nome, integranteInativo }[]`. Na visão `aluno`,
`integranteInativo` é sempre `false`.

### EncontroDoPainel

`id`, `numero`, `titulo`, `data` (AAAA-MM-DD), `inicio`/`fim` (HH:MM ou `null`), `estado`
(`agendado | realizado | cancelado`) e `ambienteNome`.

### PontuacaoDoPainel (somente demonstração por enquanto)

- `ficticia: boolean`: `true` na demonstração; a interface exibe o selo "Dados fictícios".
- `estado: 'parcial' | 'provisorio' | 'definitivo'`: o estado da classificação da categoria.
- `equipes: { equipeId, nome, total, posicao, compartilhada, pendente }[]`: as equipes da turma,
  ordenadas pela posição na categoria. Inclui só o total, sem componentes nem notas individuais.
- `publicada: boolean`: `estado` diferente de `parcial`. Na visão do aluno, `equipes` fica vazio
  quando `publicada = false`.

## Derivados no domínio (`domain/painel.ts`)

- `indicadores(p)`:
  - `alunosAtivos` = `alunos.length`;
  - `comEquipe` = quantidade com `temEquipe`;
  - `semEquipe` = `alunosAtivos − comEquipe`;
  - `equipes` = `equipes.length`;
  - `convitesPendentes` = valor recebido.
- `alunosSemEquipe(p)`: os alunos com `temEquipe = false`, na ordem recebida.
- `agruparEncontros(encontros, hoje)`: `{ proximo, agendados, realizados, cancelados }`.
