# Research: Resultado oficial, ocorrências e ranking

Decisões técnicas da spec 007. Nenhum item ficou como NEEDS CLARIFICATION. Os valores de regra
citados (pontos, prazos e tetos) vêm do PRD e de `docs/decisoes-e-pendencias.md` §3 e ficam em
`edicoes.regras`, nunca fixos no código.

## R1. Onde o cálculo oficial roda

- **Decision**: em PL/pgSQL, no próprio banco, como duas camadas.
  - `app.calcular_encontro(p_lancamentos jsonb, p_regras jsonb) returns jsonb` é pura e
    `immutable`. Ela recebe o mesmo formato de `LancamentosDoEncontro` do núcleo TS e devolve o
    mesmo formato de `PontuacaoDoEncontro`.
  - `app.lancamentos_oficiais(p_dupla uuid, p_encontro uuid) returns jsonb` lê as tabelas e monta
    esses lançamentos. Ela inclui a média simples por componente (FR-026 da spec 006), a prova
    oficial, as ocorrências confirmadas e o plágio.
  - `app.pontos_do_encontro(p_dupla, p_encontro)` combina as duas.
  - `app.totais_da_equipe(p_dupla)` acumula os encontros como `acumularEncontros`.
- **Rationale**: a Constituição V exige que pontos e classificação sejam calculados e gravados
  no servidor, de forma atômica. Em SQL o cálculo roda na mesma transação da publicação, sem
  Edge Function, sem `service_role` e sem infraestrutura nova. A função pura recebe JSON no mesmo
  formato do TS, então os dois cálculos podem ser comparados caso a caso.
- **Alternatives considered**:
  - Edge Function em Deno importando o núcleo TS: reaproveita o código, mas exige segredo no
    servidor, implantação separada e uma chamada fora da transação da publicação. Rejeitada.
  - Calcular no navegador e gravar o resultado: viola a Constituição V e o FR-012. Rejeitada.

## R2. Paridade entre TS e SQL (FR-013, SC-001)

- **Decision**: os casos de contrato passam a viver num arquivo de dados compartilhado,
  `src/modules/pontuacao/domain/casos-contrato.json`. Cada caso tem regras, lançamentos e o
  resultado esperado.
  - O Vitest confere `calcularEncontro` contra cada caso. Os testes atuais de `calculo.test.ts`
    continuam, e os casos de pontuação do encontro também vão para o JSON.
  - O script `scripts/testar-paridade-calculo.mjs` envia cada caso a `app.calcular_encontro`
    no banco local e compara com o esperado. Ele roda ao lado de `npm run test:db`, como os
    scripts de concorrência.
  - Casos de ranking (desempate e posição compartilhada) seguem o mesmo esquema, em
    `casos-ranking.json`, comparados com `classificar` e `app.classificar`.
  - O pgTAP cobre a montagem dos lançamentos a partir das tabelas: média, plágio, prova e
    deduplicação.
- **Rationale**: um único conjunto de esperados para as duas implementações. Uma divergência
  aparece como teste vermelho, sem depender de revisão manual.
- **Alternatives considered**: copiar os casos para dentro do pgTAP. Isso duplica os esperados,
  e as duas cópias podem divergir com o tempo. Rejeitada.

## R3. Regras novas na configuração da edição

- **Decision**: `RegrasDaEdicao` e `edicoes.regras` ganham estes campos:
  - `penalidades.tipos`: `[{ id, rotulo, pontos }]` para os descontos gerais e
    `[{ id, rotulo, zeraEntrega: true }]` para o plágio. No piloto: reincidência após orientação
    registrada (2), desrespeito com responsabilidade da equipe (5), uso não autorizado (5) e
    plágio comprovado (zera a entrega).
  - `prazos`: `{ manifestacaoHoras: 24, revisaoHoras: 24 }`.

  `REGRAS_PILOTO` e o seed recebem esses valores. A migration completa as edições existentes
  que ainda não têm as chaves, sem alterar as outras chaves; só edições não encerradas, com o
  sufixo `+inc4` no `regras_versao`. A mudança fica registrada em
  `docs/decisoes-e-pendencias.md`.

- **Rationale**: a Constituição X diz que regras são configuração versionada, e por isso o
  SQL não pode ter valores padrão fixos.
- **Alternatives considered**: um `coalesce(..., 24)` no SQL. Isso esconde uma regra no código.
  Rejeitada.

## R4. Nota da prova "indisponível"

- **Decision**: `NotaOficial` ganha o estado `{ estado: 'indisponivel' }`, que não dá bônus nem
  deixa o componente pendente (cenário 1 da US1). A nota só conta como confirmada quando tem
  valor e quando a escala e a autorização estão confirmadas. Sem essas confirmações, o
  servidor grava a nota como pendente (caso de borda: nenhuma conversão de escala).
- **Rationale**: a spec distingue "pendente" de "registrada como indisponível". Sem o terceiro
  estado, uma prova sem nota impediria para sempre a publicação definitiva.
- **Alternatives considered**: tratar a ausência de nota como "não realizou". Isso retiraria os
  5 pontos da realização. Rejeitada.

## R5. Ocorrências: estados, prazos e deduplicação

- **Decision**:
  - **Estados:** `registrada` → `manifestada` → `confirmada` ou `arquivada`, com a decisão
    guardada na própria linha. O histórico de redecisões, depois de uma revisão, fica na
    auditoria.
  - **Prazo de manifestação:** `prazo_manifestacao = criado_em + prazos.manifestacaoHoras`,
    gravado no registro. Uma exceção de prazo da coordenação prevalece sobre esse valor.
  - **Quando decidir:** `decidir_ocorrencia` recusa a decisão enquanto o estado for `registrada`
    e o prazo efetivo não tiver passado (FR-009).
  - **Deduplicação:** `fato_chave` é o identificador do fato, e por padrão vale o id da própria
    ocorrência. O cálculo envia uma penalidade por ocorrência confirmada com
    `fatoId = fato_chave`, e `consolidarPenalidades` aplica cada fato uma vez só, mantendo o
    primeiro por `criado_em`.
  - **Plágio:** exige `desafio_id`. A entrega daquele desafio vale zero antes da média, fora do
    teto. A apresentação também vale zero quando `apresentacao_dependente` é verdadeiro.
  - **Integrantes:** o registro guarda quem compunha a equipe no momento do fato (caso de borda).
- **Rationale**: segue o RF15, a HU06 e o esclarecimento sobre decidir antes do prazo.
- **Alternatives considered**: uma tabela separada para a decisão. Não acrescenta nada, porque
  a auditoria já guarda o histórico. Rejeitada.

## R6. Publicação do ranking: versão imutável

- **Decision**:
  - **Versões:** `publicacoes_ranking` guarda edição, categoria, versão, estado, justificativa,
    autor, horário, `regras_versao` e `revisao_ate`. O campo `revisao_ate` só é preenchido no
    estado provisório: `publicado_em + prazos.revisaoHoras`.
  - **Posições congeladas:** ficam em `publicacao_posicoes`, com equipe, nome, posição, indicação
    de empate, totais por critério, `pendente` e o detalhe por encontro em JSON. A RPC de leitura
    só entrega esse detalhe à própria equipe.
  - **Imutabilidade:** as duas tabelas não têm update nem delete para `authenticated`, e um
    gatilho recusa alterações.
  - **Numeração:** `publicar_ranking` usa `pg_advisory_xact_lock` por edição e categoria para
    numerar as versões sem corrida.
  - **Recusa do definitivo:** a publicação definitiva é recusada se existir componente pendente,
    ocorrência não decidida ou pedido de revisão aberto na categoria (FR-017). A recusa devolve
    a lista de pendências.
  - **Repetição:** publicar de novo com o mesmo estado e as mesmas posições da última versão
    devolve a versão existente (FR-024).
  - **Justificativa:** obrigatória a partir da segunda versão.
- **Rationale**: atende o FR-015 ao FR-018, a imutabilidade e a Constituição V.
- **Alternatives considered**: uma view materializada. Ela não guarda versões e não é imutável.
  Rejeitada.

## R7. Pedidos de revisão e correções ligadas

- **Decision**:
  - **Objeto do pedido:** `pedidos_revisao` aponta para uma ocorrência decidida ou para uma
    publicação provisória. Neste segundo caso, indica o componente e, opcionalmente, o encontro.
  - **Prazo:** conta de `decidido_em + revisaoHoras` ou do `revisao_ate` da publicação. Uma
    exceção registrada em `excecoes_prazo` prevalece.
  - **Recusas:** pedidos sobre publicação parcial ou definitiva são recusados.
  - **Ligação com a correção:** `auditoria` ganha a coluna `pedido_revisao_id`, preenchida pelo
    gatilho `app.registrar_auditoria` a partir de `current_setting('app.pedido_revisao', true)`.
    As RPCs de correção recebem o parâmetro opcional `p_pedido uuid default null`:
    `registrar_presencas`, `registrar_participacao` e `registrar_avaliacao` da spec 006, mais
    `registrar_resultados_prova` e `decidir_ocorrencia` desta spec. Com esse parâmetro, a RPC
    confere se o pedido está aberto e é da mesma equipe e grava o vínculo. As três da spec 006
    precisam ser recriadas na nova migration, com a mesma semântica.
  - **Resposta:** `responder_revisao` grava deferido ou indeferido com justificativa. Num
    deferimento, a tela mostra as correções já ligadas ao pedido, lidas da auditoria.
  - **Sem ajuste manual:** não existe "ajuste de pontos" (esclarecimento de 2026-11-01).
- **Rationale**: a correção passa pelo caminho que já tem justificativa e histórico, e o pedido
  fica rastreável até a mudança de pontos.
- **Nova versão provisória com pedido aberto**: o pedido sobre a versão N continua válido e é
  respondido normalmente; a versão N+1 abre prazo próprio para novos pedidos (U2).
- **Alternatives considered**: deixar a coordenação escolher as linhas de auditoria depois da
  correção. É frágil e não fica na mesma transação. Rejeitada.
- **Lacuna**: a spec 006 não tem correção de submissão de questões nem de gabarito. Um pedido
  sobre questões pode ser respondido, mas ainda não existe correção de origem para ele. Isso
  fica registrado como pendência em `docs/decisoes-e-pendencias.md`.

## R8. Avisos no aplicativo (FR-026)

- **Decision**:
  - **Tabela:** `avisos` com destinatário, tipo, título, referência em JSON, `criado_em` e
    `lido_em`. As linhas são criadas pelas próprias RPCs, na mesma transação.
  - **Quem recebe cada aviso:**

    | Evento                   | Destinatários                                                  |
    | ------------------------ | -------------------------------------------------------------- |
    | Ocorrência registrada    | integrantes da equipe                                          |
    | Ocorrência decidida      | integrantes da equipe                                          |
    | Publicação               | alunos ativos das turmas da categoria e a equipe docente delas |
    | Pedido de revisão criado | coordenação da edição                                          |
    | Pedido respondido        | integrantes da equipe                                          |

  - **Acesso:** a RLS deixa cada pessoa ler só os próprios avisos, e `marcar_avisos_lidos`
    atualiza o `lido_em`. O cabeçalho mostra o contador de não lidos e a página "Avisos" lista
    todos.
  - **E-mail:** não há envio por e-mail.
- **Rationale**: um contador exige guardar o estado de leitura. Criar o aviso na mesma
  transação garante que ele só exista se a operação deu certo.
- **Alternatives considered**: avisos derivados por consulta. Não dariam o estado de lido sem
  uma tabela extra. Rejeitada.

## R9. Evidências em arquivo

- **Decision**: bucket privado `evidencias`, com os mesmos tipos e limite das entregas (PDF, ZIP,
  PNG e JPG, até 50 MB).
  - **Caminho:** `{edicao}/{dupla}/{chave}.ext`.
  - **Envio:** permitido à equipe docente da turma da equipe e à coordenação.
  - **Download:** permitido à equipe docente da turma, à coordenação e aos integrantes da equipe.
  - **Registro:** `registrar_ocorrencia` confere se o objeto existe e se foi enviado pelo autor.
- **Rationale**: reaproveita o padrão da spec 006 (envio em duas etapas e chave de envio), já
  testado.
- **Alternatives considered**: guardar a evidência só como texto. A spec pede arquivo
  opcional. Rejeitada.

## R10. Prévia e leitura por perfil (FR-019, FR-019a)

- **Decision**:
  - `pontos_da_minha_equipe(p_edicao)` mostra ao aluno os pontos oficiais da própria equipe por
    encontro, com as pendências. Na interface aparecem como "Prévia — não oficial". Essa RPC
    substitui o uso de `lancamentos_da_minha_equipe` na página do aluno, que continua existindo.
  - `pontos_da_turma(p_turma)` atende a equipe docente da turma e a coordenação. Ela não devolve
    a nota individual da prova, só os pontos do componente.
  - `ranking_publicado(p_edicao, p_categoria)`:
    - o aluno vê só a última versão da própria categoria;
    - a equipe docente vê a categoria das suas turmas;
    - a coordenação vê qualquer categoria e o histórico.
  - O painel da turma (spec 004) passa a preencher `pontuacao` com a última publicação da
    categoria.
- **Rationale**: segue os esclarecimentos de 2026-11-01. A leitura passa por RPC, e as tabelas
  ficam fechadas para `authenticated`.

## R11. Concorrência e idempotência

- **Decision**:
  - Idempotência das escritas:
    - `registrar_ocorrencia` e `pedir_revisao` usam uma chave de envio gerada no navegador;
    - `enviar_manifestacao` grava uma única manifestação por ocorrência (chave primária);
    - `decidir_ocorrencia`, `responder_revisao` e `registrar_resultados_prova` tratam a
      repetição com os mesmos valores como um sucesso sem efeito.
  - Concorrência:
    - publicação: trava por categoria (R6);
    - decisão: trava a linha da ocorrência.
  - O script `scripts/testar-concorrencia-publicacao.mjs` dispara duas publicações simultâneas
    e espera versões 1 e 2 distintas, ou uma recusa por falta de justificativa.
- **Rationale**: atende a Constituição V e o FR-024.
