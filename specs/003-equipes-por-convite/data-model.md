# Data model — spec 003

## Alterações em tabelas existentes

### `duplas` (equipe)

| Campo              | Mudança                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `nome`             | passa a aceitar nulo (check de 2–80 caracteres só quando informado) |
| `nome_definido_em` | novo, `timestamptz` — quando a equipe escolheu o nome               |

O índice `duplas_nome_ativo_por_turma` continua valendo (nulos não colidem).

## Novas tabelas

### `convites_equipe`

| Campo        | Tipo                       | Regra                                                       |
| ------------ | -------------------------- | ----------------------------------------------------------- |
| id           | uuid PK                    |                                                             |
| edicao_id    | uuid → edicoes             |                                                             |
| turma_id     | uuid → turmas              | turma do remetente                                          |
| remetente_id | uuid → perfis              | aluno ativo da turma, sem equipe ativa                      |
| tipo         | `dupla` \| `trio`          | dupla = 1 convidado; trio = 2                               |
| situacao     | enum `situacao_convite_eq` | `pendente` → `formado` \| `recusado` \| `cancelado`         |
| motivo       | text                       | obrigatório quando `cancelado` ou `recusado` (código de R5) |
| dupla_id     | uuid → duplas, nulo        | preenchido quando `formado`                                 |
| criado_em    | timestamptz                | default `now()`                                             |
| encerrado_em | timestamptz, nulo          | preenchido quando sai de `pendente`                         |

Índice: `(turma_id, situacao)`; `(remetente_id) where situacao = 'pendente'`.

### `convite_equipe_convidados`

| Campo         | Tipo                                 | Regra                                   |
| ------------- | ------------------------------------ | --------------------------------------- |
| convite_id    | uuid → convites_equipe               | PK composta com convidado_id            |
| convidado_id  | uuid → perfis                        | aluno ativo da mesma turma, ≠ remetente |
| resposta      | `pendente` \| `aceito` \| `recusado` |                                         |
| respondido_em | timestamptz, nulo                    |                                         |

Convite repetido: o servidor recusa novo convite pendente do mesmo remetente para o mesmo
convidado.

## Transições

```text
convite: pendente ──(todos aceitam)──► formado (cria equipe)
         pendente ──(um recusa)──────► recusado
         pendente ──(remetente cancela | formação/inclusão de envolvido | trio formado na
                     turma (só convites de trio) | aluno inativo | aceite retirado)──► cancelado
equipe:  (sem nome) ──(integrante define)──► nomeada ──(docente/mentor renomeia c/ justificativa)──► …
```

## RLS

- `convites_equipe` / `convite_equipe_convidados`: SELECT para remetente, convidados,
  coordenação da edição e docente/mentor da turma; nenhuma escrita direta para `authenticated`.
- Auditoria (`app.registrar_auditoria`) nas duas tabelas.

## Integridade e projeções de gestão

- `nome_definido_em` permanece preenchido após renomeação. Nenhuma operação apaga o nome para
  reabrir a escolha inicial. Nomes legados são preservados como já definidos.
- Equipe ativa mantém 2 ou 3 participações sem `saida_em`; vínculo escolar inativo não é saída
  da equipe. `integranteInativo` deriva da ausência de atribuição de aluno ativa naquela turma.
- `trioEmTurmaPar` deriva de três participações atuais e contagem par de alunos ativos; é aviso
  para gestão, não erro que impeça alteração cadastral.
- Retirada de aceite encerra o convite com `motivo = aceite_retirado`, preservando respostas e
  horários anteriores para histórico; não é necessário novo estado individual de resposta.
- Todas as mutações de equipe mantêm o índice único por estudante/edição e validam a mesma
  turma. Substituição não transfere estudante de outra equipe; remoção de dupla é recusada.
- Projeção de gestão: `equipes_da_turma_gestao(p_turma uuid)` retorna equipes ativas, integrantes
  atuais com nome e `integranteInativo`, e `trio_em_turma_par`; formato e permissões em
  [contracts/rpc.md](contracts/rpc.md). Campos de aviso são calculados, não novas colunas.
