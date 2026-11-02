# Data Model: Resultado oficial, ocorrências e ranking

Migration: `supabase/migrations/20261101120000_resultado_oficial_ranking.sql`.

Regras comuns a todas as tabelas novas:

- Todas têm RLS.
- Nenhuma tem `insert`, `update` ou `delete` para `authenticated`. Toda escrita passa por RPC
  `security definer`.
- Todas têm o gatilho `app.registrar_auditoria`.

## Tipos

```sql
create type public.realizacao_prova as enum ('confirmada', 'pendente', 'nao_realizou');
create type public.estado_nota_prova as enum ('pendente', 'confirmada', 'indisponivel');
create type public.estado_ocorrencia as enum ('registrada', 'manifestada', 'confirmada', 'arquivada');
create type public.estado_ranking as enum ('parcial', 'provisorio', 'definitivo');
create type public.objeto_prazo as enum ('manifestacao', 'revisao');
create type public.objeto_revisao as enum ('ocorrencia', 'publicacao');
create type public.estado_revisao as enum ('aberto', 'deferido', 'indeferido');
```

## Regras da edição (acréscimos em `edicoes.regras`, R3)

```jsonc
"penalidades": {
  "tetoDescontosPorEncontro": 10,
  "tipos": [
    { "id": "reincidencia", "rotulo": "Reincidência após orientação registrada", "pontos": 2 },
    { "id": "desrespeito", "rotulo": "Desrespeito com responsabilidade da equipe", "pontos": 5 },
    { "id": "uso_nao_autorizado", "rotulo": "Uso não autorizado", "pontos": 5 },
    { "id": "plagio", "rotulo": "Plágio comprovado", "zeraEntrega": true }
  ]
},
"prazos": { "manifestacaoHoras": 24, "revisaoHoras": 24 }
```

## Tabelas

### `resultados_prova` (US1, FR-001 a FR-004)

| Coluna                                        | Tipo              | Regras                                                                                                        |
| --------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `encontro_id`                                 | uuid FK encontros | O encontro precisa ter `avaliacao_objetiva = 'prova_oficial'`. Faz parte da PK.                               |
| `estudante_id`                                | uuid FK perfis    | Faz parte da PK.                                                                                              |
| `dupla_id`                                    | uuid FK duplas    | Equipe ativa do estudante no registro. Fica fixa mesmo se o estudante sair depois.                            |
| `realizacao`                                  | realizacao_prova  | Obrigatória.                                                                                                  |
| `nota`                                        | numeric null      | Entre 0 e 100. Só pode existir com `realizacao = 'confirmada'`.                                               |
| `nota_estado`                                 | estado_nota_prova | Vale `confirmada` só com nota, `escala_confirmada` e `autorizacao_confirmada`; sem isso fica `pendente` (R4). |
| `fonte`                                       | text ≤ 300        | Obrigatória quando há nota.                                                                                   |
| `escala_confirmada`, `autorizacao_confirmada` | boolean           | Padrão `false`.                                                                                               |
| `autor_id`, `registrado_em`                   |                   | Preenchidos pelo servidor.                                                                                    |

- **RLS**: só a coordenação da edição lê (`app.e_coordenacao`). A nota nunca sai para outro
  perfil (FR-003). Os pontos chegam aos outros perfis só pelas RPCs de pontos.

### `ocorrencias` (US2, FR-005 a FR-011)

| Coluna                                 | Tipo                  | Regras                                                                                                |
| -------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                                   | uuid PK               |                                                                                                       |
| `edicao_id`, `encontro_id`, `dupla_id` | FKs                   | O encontro precisa ser da edição, e a equipe da turma de quem registra.                               |
| `desafio_id`                           | uuid null FK desafios | Obrigatório quando o tipo tem `zeraEntrega`.                                                          |
| `tipo`                                 | text                  | Precisa existir em `regras.penalidades.tipos[].id`.                                                   |
| `fato`                                 | text 10–4000          |                                                                                                       |
| `fato_chave`                           | text                  | Padrão: o próprio `id`. Ocorrências com a mesma chave na mesma equipe e encontro contam como um fato. |
| `evidencia`                            | text 1–4000           |                                                                                                       |
| `evidencia_path`, `evidencia_nome`     | text null             | Objeto no bucket `evidencias`.                                                                        |
| `integrantes`                          | jsonb                 | Quem compunha a equipe no registro.                                                                   |
| `estado`                               | estado_ocorrencia     | Transições abaixo.                                                                                    |
| `prazo_manifestacao`                   | timestamptz           | `criado_em + regras.prazos.manifestacaoHoras`.                                                        |
| `justificativa_decisao`                | text null 10–2000     |                                                                                                       |
| `apresentacao_dependente`              | boolean               | Padrão `false`. Só vale para o plágio.                                                                |
| `decidido_por`, `decidido_em`          | null                  |                                                                                                       |
| `chave_envio`                          | uuid unique           | Torna o registro idempotente.                                                                         |
| `autor_id`, `criado_em`                |                       |                                                                                                       |

- **Transições**:
  - `registrada` → `manifestada`, quando a equipe envia a manifestação;
  - `registrada` → `confirmada` ou `arquivada`, quando a coordenação decide depois de vencido o
    prazo efetivo;
  - `manifestada` → `confirmada` ou `arquivada`, quando a coordenação decide;
  - `confirmada` ↔ `arquivada`, só como redecisão com justificativa, ligada a um pedido de
    revisão.
- **RLS de leitura**:
  - integrantes ativos da equipe e integrantes registrados em `integrantes`;
  - equipe docente da turma da equipe (`app.e_gestao_da_turma`);
  - coordenação.

### `manifestacoes`

| Coluna          | Tipo                   | Regras                                          |
| --------------- | ---------------------- | ----------------------------------------------- |
| `ocorrencia_id` | uuid PK FK ocorrencias | Uma manifestação por ocorrência.                |
| `autor_id`      | uuid                   | Integrante ativo da equipe.                     |
| `texto`         | text 10–4000           |                                                 |
| `enviada_em`    | timestamptz            | Precisa ser anterior ou igual ao prazo efetivo. |

- **RLS**: as mesmas regras de leitura da ocorrência.

### `excecoes_prazo` (FR-021)

| Coluna                  | Tipo         | Regras                                                                            |
| ----------------------- | ------------ | --------------------------------------------------------------------------------- |
| `id`                    | uuid PK      |                                                                                   |
| `dupla_id`              | uuid         |                                                                                   |
| `objeto`                | objeto_prazo |                                                                                   |
| `ocorrencia_id`         | uuid null    | Preenchido quando o objeto é a manifestação ou a revisão de uma decisão.          |
| `publicacao_id`         | uuid null    | Preenchido quando o objeto é a revisão de uma publicação. Exatamente um dos dois. |
| `novo_prazo`            | timestamptz  | Maior que `now()`.                                                                |
| `justificativa`         | text 10–1000 |                                                                                   |
| `autor_id`, `criado_em` |              |                                                                                   |

- **Escrita**: só a coordenação.
- **Prazo efetivo**: vale a exceção mais recente para o mesmo objeto
  (`app.prazo_manifestacao_efetivo`, `app.prazo_revisao_efetivo`).
- **Leitura**: a equipe e a coordenação.

### `publicacoes_ranking` e `publicacao_posicoes` (US4, FR-015 a FR-019)

`publicacoes_ranking`:

| Coluna                          | Tipo             | Regras                                   |
| ------------------------------- | ---------------- | ---------------------------------------- |
| `id`                            | uuid PK          |                                          |
| `edicao_id`                     | uuid             | `unique (edicao_id, categoria, versao)`. |
| `categoria`                     | text             |                                          |
| `versao`                        | int ≥ 1          |                                          |
| `estado`                        | estado_ranking   |                                          |
| `justificativa`                 | text null        | Obrigatória quando `versao > 1`.         |
| `regras_versao`                 | text             |                                          |
| `revisao_ate`                   | timestamptz null | Só no estado provisório (R6).            |
| `publicado_por`, `publicado_em` |                  |                                          |

`publicacao_posicoes`:

| Coluna                                               | Tipo    | Regras                                                            |
| ---------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `publicacao_id`, `dupla_id`                          | PK      |                                                                   |
| `nome`                                               | text    | Nome da equipe no momento da publicação.                          |
| `posicao`                                            | int     |                                                                   |
| `compartilhada`                                      | boolean | Indica empate persistente.                                        |
| `total`, `entrega`, `avaliacao_objetiva`, `presenca` | numeric |                                                                   |
| `pendente`                                           | boolean |                                                                   |
| `detalhe`                                            | jsonb   | Pontos por encontro e componente. Nunca contém notas individuais. |

- **Imutabilidade**: um gatilho recusa `update` e `delete` nas duas tabelas.
- **Leitura**: só pela RPC `ranking_publicado`. A RLS de `select` direto fica restrita à
  coordenação.

### `pedidos_revisao` (US5, FR-020 a FR-022)

| Coluna                            | Tipo              | Regras                                                                                                     |
| --------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `id`                              | uuid PK           |                                                                                                            |
| `dupla_id`                        | uuid              |                                                                                                            |
| `objeto`                          | objeto_revisao    |                                                                                                            |
| `ocorrencia_id`                   | uuid null         | Precisa estar decidida e ser da equipe.                                                                    |
| `publicacao_id`                   | uuid null         | Precisa estar no estado provisório e incluir a equipe. Exatamente um dos dois.                             |
| `componente`                      | text null         | Obrigatório para publicação: `presenca`, `participacao`, `avaliacaoObjetiva`, `entrega` ou `apresentacao`. |
| `encontro_id`                     | uuid null         |                                                                                                            |
| `justificativa`                   | text 10–2000      |                                                                                                            |
| `estado`                          | estado_revisao    |                                                                                                            |
| `resposta`                        | text null 10–2000 |                                                                                                            |
| `respondido_por`, `respondido_em` |                   |                                                                                                            |
| `chave_envio`                     | uuid unique       |                                                                                                            |
| `autor_id`, `criado_em`           |                   |                                                                                                            |

- **Unicidade**: um pedido aberto por objeto, componente e encontro.
- **Leitura**: a equipe e a coordenação.

### `avisos` (FR-026)

| Coluna            | Tipo             | Regras                                                                                                         |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `id`              | uuid PK          |                                                                                                                |
| `destinatario_id` | uuid FK perfis   |                                                                                                                |
| `tipo`            | text             | `ocorrencia_registrada`, `ocorrencia_decidida`, `ranking_publicado`, `revisao_pedida` ou `revisao_respondida`. |
| `titulo`          | text ≤ 200       |                                                                                                                |
| `referencia`      | jsonb            | Ids, sem dados pessoais de terceiros.                                                                          |
| `criado_em`       | timestamptz      |                                                                                                                |
| `lido_em`         | timestamptz null |                                                                                                                |

- **Leitura**: só o destinatário.
- **Escrita**: só pelas RPCs. A marcação de lido usa `marcar_avisos_lidos`.

### Alteração em `auditoria`

- Nova coluna `pedido_revisao_id uuid null`, preenchida por `app.registrar_auditoria` a partir
  de `current_setting('app.pedido_revisao', true)` (R7).

### Storage

- Bucket privado `evidencias`:
  - tipos aceitos: `application/pdf`, `application/zip`, `image/png` e `image/jpeg`;
  - tamanho máximo: 50 MB.
- Políticas:
  - `evidencias_enviar` (insert): gestão da turma da equipe indicada no caminho, ou coordenação;
  - `evidencias_baixar` (select): a gestão, a coordenação e os integrantes da equipe.

## Valores derivados (não armazenados)

| Função                                           | Retorno                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `app.lancamentos_oficiais(dupla, encontro)`      | `LancamentosDoEncontro`, com o componente objetivo já em média quando há várias listas (R1).      |
| `app.calcular_encontro(lancamentos, regras)`     | `PontuacaoDoEncontro`, igual ao TS.                                                               |
| `app.pontos_do_encontro(dupla, encontro)`        | As duas funções acima combinadas.                                                                 |
| `app.totais_da_equipe(dupla)`                    | `TotaisDaDupla` (total, entrega, avaliacaoObjetiva, presenca, pendente) e o detalhe por encontro. |
| `app.classificar(totais jsonb)`                  | Posições com desempate e empate compartilhado, igual a `classificar` do TS.                       |
| `app.pendencias_da_categoria(edicao, categoria)` | Componentes pendentes, ocorrências não decididas e revisões abertas.                              |
