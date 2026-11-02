# Tasks: Resultado oficial, ocorrências e ranking

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `007-resultado-oficial-ranking` | **Criação**: 2026-11-01.
**Testes**: obrigatórios pela Constituição II e pela spec (SC-001 a SC-006).

- Em cada história, escreva e rode o teste antes do código. Confirme que ele falha porque o comportamento ainda não existe (RED). Só então implemente até passar (GREEN).

**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`. `[P]` marca tarefas em arquivos diferentes, sem dependência entre si dentro do grupo.

**Convenções**:

- Toda RPC é `security definer` com `search_path = ''` e não pode ser executada por `anon`.
- Os códigos de erro são `42501`, `23514` e `P0002`, com mensagens em português.
- Repetir uma operação com os mesmos valores é um sucesso sem efeito (FR-024).
- Correções, decisões, respostas, exceções e publicações a partir da versão 2 exigem justificativa de pelo menos 10 caracteres, gravada via `app.registrar_justificativa`.
- Prazos usam `now()` do servidor.
- Toda RPC de escrita desta spec chama `app.exigir_edicao_aberta(edicao)`: registro de prova, ocorrência, manifestação, decisão, exceção de prazo, publicação, pedido e resposta de revisão. Em edição encerrada, a escrita é recusada com `23514` e a leitura continua liberada.
- Valores de regra vêm sempre de `edicoes.regras`: `penalidades.tipos`, `prazos.manifestacaoHoras` e `prazos.revisaoHoras` (R3).
- A nota individual da prova só sai em `resultados_prova(p_encontro)`, para a coordenação (FR-003, SC-002).
- Os testes pgTAP novos ficam em `supabase/tests/008_resultado_oficial_ranking.test.sql`.
  - Cada fase acrescenta uma seção no marcador `-- @@secoes`, com fixtures fictícias.
  - Fixtures da edição E:
    - turmas TA e TB da categoria "Cat 1" e turma TC da categoria "Cat 2";
    - docente de TA, mentor de TA, docente de TB e coordenação de E;
    - equipes A1 e A2 em TA e B1 em TB;
    - encontro 1 de questões e encontro 4 de prova oficial.
  - Edição F com a própria coordenação.
  - Edição G encerrada, com uma equipe e um encontro.

## Fase 1: Preparação

- [x] T001 Conferir o ambiente local e registrar o estado inicial em `specs/007-resultado-oficial-ranking/quickstart.md` (seção "Estado inicial"):
  - o Supabase local roda nas portas 5442x;
  - o pgTAP 001–007 passa;
  - `npm run verify` passa.
- [x] T002 [P] Criar o esqueleto de `src/modules/resultado/`:
  - `index.ts` vazio que exporta os tipos;
  - `README.md` descrevendo prova oficial, ocorrências, publicação, revisão e avisos, com o link para a spec 007.
- [x] T003 [P] Escrever o ADR `docs/adr/0011-calculo-oficial-no-servidor.md`: cálculo em PL/pgSQL, paridade por casos JSON compartilhados e alternativa da Edge Function rejeitada (research R1 e R2).

## Fase 2: Fundação (bloqueia todas as histórias)

Objetivo: regras novas, o cálculo SQL com paridade, o esquema seguro, os avisos e a injeção dos repositórios.

### Regras e núcleo TS

- [x] T004 RED: em `src/modules/pontuacao/domain/regras-piloto.test.ts`, exigir:
  - `REGRAS_PILOTO.penalidades.tipos` com:
    - `reincidencia`, 2 pontos;
    - `desrespeito`, 5 pontos;
    - `uso_nao_autorizado`, 5 pontos;
    - `plagio`, com `zeraEntrega: true`, sem pontos;
  - `REGRAS_PILOTO.prazos` igual a `{ manifestacaoHoras: 24, revisaoHoras: 24 }`.

  Em `calculo.test.ts`, exigir que nota `{ estado: 'indisponivel' }` dê 5 pontos pela realização, sem bônus e sem pendência (R4).

- [x] T005 GREEN: em `src/modules/pontuacao/domain/tipos.ts`:
  - acrescentar `TipoOcorrencia` (`{ id, rotulo, pontos }` ou `{ id, rotulo, zeraEntrega: true }`);
  - acrescentar `penalidades.tipos: TipoOcorrencia[]` e `prazos: { manifestacaoHoras: number; revisaoHoras: number }` em `RegrasDaEdicao`;
  - acrescentar `{ estado: 'indisponivel' }` em `NotaOficial`.

  Atualizar também `regras-piloto.ts` e `calculo.ts` (`pontuarProvaOficial`). Os valores vêm do PRD §regras. Rodar até T004 passar.

- [x] T006 RED+GREEN: extrair os casos de "pontuação do encontro" e "prova oficial" de `calculo.test.ts` para `src/modules/pontuacao/domain/casos-contrato.json`.
  - Formato de cada caso: `{ nome, regras: "piloto", lancamentos, esperado }`.
  - Criar `casos-contrato.test.ts`, que percorre o JSON com `calcularEncontro`.
  - Fazer o mesmo para o desempate em `casos-ranking.json`: `{ nome, equipes: [{ duplaId, nome, totais }], esperado }`, testado contra `classificar`.
  - Incluir casos de desempate por entrega, por componente objetivo, por presença e de empate persistente (posição compartilhada).
- [x] T007 Atualizar `supabase/seed.sql` (bloco de regras da edição) com os mesmos `penalidades.tipos` e `prazos` de `REGRAS_PILOTO`.

### Esquema seguro e cálculo SQL

- [x] T008 RED: seção "esquema" em `supabase/tests/008_resultado_oficial_ranking.test.sql`. Testar:
  - a existência das tabelas `resultados_prova`, `ocorrencias`, `manifestacoes`, `excecoes_prazo`, `publicacoes_ranking`, `publicacao_posicoes`, `pedidos_revisao` e `avisos`;
  - RLS habilitada em todas;
  - nenhum INSERT, UPDATE ou DELETE para `authenticated` e nenhum acesso para `anon`;
  - os tipos enum do data-model;
  - a coluna `auditoria.pedido_revisao_id`;
  - o bucket `evidencias` privado, com `file_size_limit` de 52428800 e os tipos `application/pdf`, `application/zip`, `application/x-zip-compressed`, `image/png` e `image/jpeg`;
  - edições não encerradas completadas com `regras ? 'prazos'` e `regras -> 'penalidades' ? 'tipos'` e com `regras_versao` terminando em `+inc4`; edições encerradas não mudam.

  Rodar `npm run test:db` e ver a falha.

- [x] T009 GREEN: criar `supabase/migrations/20261101120000_resultado_oficial_ranking.sql` com os tipos, as tabelas e as restrições do [data-model.md](data-model.md).
  - **`resultados_prova`**:
    - PK `(encontro_id, estudante_id)`;
    - `nota` "entre 0 e 100", nula a menos que `realizacao = 'confirmada'`;
    - `fonte` "até 300 caracteres", obrigatória com nota;
    - `escala_confirmada` e `autorizacao_confirmada` com padrão `false`.
  - **`ocorrencias`**:
    - `fato` "10–4000";
    - `evidencia` "1–4000";
    - `justificativa_decisao` "10–2000";
    - `chave_envio` único;
    - `apresentacao_dependente` com padrão `false`.
  - **`manifestacoes`**: PK `ocorrencia_id`, `texto` "10–4000".
  - **`excecoes_prazo`**: `justificativa` "10–1000", exatamente um entre `ocorrencia_id` e `publicacao_id`.
  - **`publicacoes_ranking`**: `unique (edicao_id, categoria, versao)`, `versao >= 1`.
  - **`publicacao_posicoes`**: PK `(publicacao_id, dupla_id)`.
  - **`pedidos_revisao`**:
    - `justificativa` "10–2000";
    - `resposta` "10–2000";
    - `chave_envio` único;
    - exatamente um alvo;
    - `componente` obrigatório para publicação, com os valores `presenca`, `participacao`, `avaliacaoObjetiva`, `entrega` e `apresentacao`;
    - índice único parcial para um pedido aberto por `(dupla_id, objeto, coalesce(ocorrencia_id, publicacao_id), componente, encontro_id)`.
  - **`avisos`**: `titulo` "até 200".
  - **Gatilhos**:
    - de auditoria em todas as tabelas;
    - de imutabilidade em `publicacoes_ranking` e `publicacao_posicoes`, que recusa UPDATE e DELETE.
  - **Auditoria:** a coluna `auditoria.pedido_revisao_id`. `app.registrar_auditoria` passa a lê-la de `current_setting('app.pedido_revisao', true)`.
  - **Regras:** completar `edicoes.regras` sem `prazos` ou sem `penalidades.tipos` com os valores do piloto (R3). Só edições com `estado <> 'encerrada'`, mantendo as outras chaves. Acrescentar o sufixo `+inc4` ao `regras_versao` dessas edições. O gatilho `auditoria_edicoes` guarda o antes e o depois.
  - **Storage:** o bucket `evidencias`.

  Rodar até T008 passar.

- [x] T010 RED: seção "paridade e montagem" no pgTAP. Testar `app.lancamentos_oficiais` e `app.pontos_do_encontro` sobre fixtures de A1:
  - dois desafios no encontro 1, com a média por componente (FR-026 da spec 006);
  - duas listas, com a média do componente objetivo;
  - entrega com atraso e prorrogação;
  - sem registros: componentes pendentes, sem pontos inventados.

  Escrever `scripts/testar-paridade-calculo.mjs`, no padrão de `scripts/testar-concorrencia-questoes.mjs`, que:
  - lê `casos-contrato.json` e `casos-ranking.json`;
  - chama `app.calcular_encontro` e `app.classificar` como `postgres` no contêiner `supabase_db_maratona`;
  - compara com `esperado` e sai com código 1 se houver divergência.

  Ver as duas falhas.

- [x] T011 GREEN: na migration, implementar `app.calcular_encontro(p_lancamentos jsonb, p_regras jsonb) returns jsonb immutable`, espelhando `calcularEncontro`:
  - `arredondar` meio para cima;
  - questões proporcionais;
  - presença limitada;
  - rubricas validadas;
  - faixas de atraso e "não realizada";
  - prova com `indisponivel`;
  - `consolidarPenalidades` por `fatoId`, com teto;
  - total não negativo.

  Implementar também:
  - `app.classificar(p_equipes jsonb)`, com desempate total → entrega → avaliacaoObjetiva → presença, empate compartilhado e nome em pt-BR como ordem estável;
  - `app.lancamentos_oficiais(p_dupla, p_encontro)`, que lê presenças, participação, desafios e avaliações com a média, listas com a média e entregas com atraso e prorrogação;
  - `app.pontos_do_encontro` e `app.totais_da_equipe(p_dupla)`, que devolvem os totais e o detalhe por encontro, como `acumularEncontros`.

  Neste ponto, prova e ocorrências entram vazias; elas são ligadas em US1 e US2. Rodar até T010 e o script de paridade passarem.

### Avisos, prazos e injeção

- [x] T012 RED: seção "avisos" no pgTAP. Testar:
  - `app.avisar(destinatarios uuid[], tipo, titulo, referencia)` cria uma linha por destinatário;
  - `meus_avisos()` devolve só os avisos de quem chama, com `naoLidos`;
  - `marcar_avisos_lidos(ids)` só altera os avisos de quem chama, e repetir não muda nada;
  - outro usuário não lê nem marca avisos alheios.
- [x] T013 GREEN: na migration, implementar `app.avisar`, `public.meus_avisos(p_limite int default 50)` e `public.marcar_avisos_lidos(p_ids uuid[])`, com a RLS de `avisos` (`destinatario_id = auth.uid()`). Implementar também `app.prazo_manifestacao_efetivo(ocorrencia)` e `app.prazo_revisao_efetivo(dupla, ocorrencia, publicacao)`, considerando a exceção mais recente.
- [x] T014 [P] Em `src/modules/resultado/domain/tipos.ts`, criar os tipos do contrato:
  - `ResultadoProva`;
  - `Ocorrencia`, com `estado` `registrada | manifestada | confirmada | arquivada`;
  - `PublicacaoRanking`, com `estado` `parcial | provisorio | definitivo`;
  - `PedidoRevisao`, `Aviso`, `PontosDaEquipe` e `PendenciasDaCategoria`.

  Criar também a interface `RepositorioResultado`, com um método por RPC de [contracts/rpc.md](contracts/rpc.md).

- [x] T015 [P] RED+GREEN: `src/modules/resultado/domain/prazos.ts` (+ `.test.ts`), puro, com:
  - `prazoAberto(prazo, agora)`;
  - `podeManifestar(ocorrencia, agora)`;
  - `podePedirRevisao({ objeto, estadoPublicacao, revisaoAte, decididoEm, prazoHoras }, agora)`, recusando parcial e definitivo;
  - `rotuloEstadoOcorrencia` e `rotuloEstadoRanking`, em português.
- [x] T016 Injetar o repositório:
  - criar `src/modules/resultado/data/repositorioSupabase.ts` com as chamadas `rpc` tipadas e os mapeamentos (+ `.test.ts` com cliente simulado: nomes de RPC, parâmetros e conversão de erros por `mensagemDeErro`);
  - criar `src/modules/demo/resultado.ts`, só leitura, com dados fictícios: prévia, ranking parcial, ocorrência e aviso;
  - ligar os dois em `src/app/dados/` no mesmo padrão de `atividades`.

**Checkpoint**: verify, pgTAP e paridade verdes. As histórias podem começar.

## Fase 3: US1, coordenação registra a prova oficial (P1) 🎯 MVP

**Objetivo**: registrar a realização e a nota oficial por estudante, com os pontos da equipe.

**Teste independente**: realização confirmada nos dois integrantes de A1 e nota 75 em um deles dão 20 pontos; A2 pendente fica pendente; o aluno não vê nenhuma nota.

- [x] T017 RED [US1]: seção "prova oficial" no pgTAP. Testar:
  - só a coordenação da edição registra; docente, mentor, aluno e coordenação de F recebem `42501`;
  - encontro que não é de prova oficial: `23514`;
  - estudante sem equipe ativa: `23514`;
  - nota sem escala ou autorização confirmadas é gravada com `nota_estado = 'pendente'`;
  - `notaIndisponivel` grava `indisponivel`;
  - pontos de A1 iguais a 20, e A2 com a pendência `avaliacaoObjetiva`;
  - limite de 30 por equipe;
  - corrigir uma nota sem justificativa: `23514`; com justificativa, a auditoria guarda antes e depois;
  - repetir os mesmos valores não gera auditoria;
  - edição G encerrada: a escrita desta seção é recusada (`23514`) e a leitura funciona (U1);
  - o estudante de A1 com resultado registrado sai da equipe (`saida_em` preenchido) ou é desativado: os pontos da prova continuam em A1 e a equipe nova dele não os recebe (caso de borda, C2);
  - `resultados_prova` só para a coordenação;
  - nenhuma RPC de aluno ou docente devolve a chave `nota` (SC-002).
- [x] T018 GREEN [US1]: na migration:
  - implementar `public.registrar_resultados_prova(p_encontro, p_resultados jsonb, p_justificativa text, p_pedido uuid default null)` e `public.resultados_prova(p_encontro)`;
  - ligar os resultados em `app.lancamentos_oficiais`: `avaliacaoObjetiva = { tipo: 'prova_oficial', resultados }` dos integrantes da equipe gravada em `resultados_prova.dupla_id`.

  Rodar até T017 passar.

- [x] T019 [P] [US1] RED+GREEN: `src/modules/resultado/ui/FormResultadosProva.tsx` (+ `.test.tsx` com axe). Requisitos:
  - uma linha por estudante, agrupada por equipe;
  - campos: realização, nota, fonte, "Escala 0–100 confirmada", "Uso autorizado" e "Nota indisponível";
  - envio em lote;
  - a justificativa aparece ao alterar um valor já gravado;
  - campo opcional "Pedido de revisão";
  - sucesso só depois da resposta;
  - desabilitado sem conexão e na demonstração.
- [x] T020 [US1] Criar a página `/coordenacao/prova-oficial` em `src/app/paginas/resultado.tsx`, com seletor de encontros de prova oficial e consultas em `src/app/dados/consultas.ts`. Registrar em `src/app/rotas.tsx` e `src/app/navegacao.ts`.

**Checkpoint**: US1 testável sozinha.

## Fase 4: US2, docente registra ocorrência e coordenação decide (P1)

**Objetivo**: ocorrência com evidência, manifestação no prazo, decisão fundamentada e penalidade no cálculo.

**Teste independente**: o docente de TA registra "uso não autorizado" para A1; o aluno de A1 se manifesta; a coordenação confirma; A1 perde 5 pontos; o aluno de A2 não vê a ocorrência.

- [x] T021 RED [US2]: seção "ocorrências" no pgTAP. Testar:
  - quem registra:
    - docente e mentor de TA registram para A1;
    - docente de TB, para A1: `42501`;
    - coordenação registra;
    - aluno: `42501`;
  - validações:
    - tipo fora de `regras.penalidades.tipos`: `23514`;
    - plágio sem desafio da turma: `23514`;
  - registro:
    - a mesma `chave_envio` devolve o mesmo id;
    - `prazo_manifestacao = criado_em + 24 h`;
    - `integrantes` guarda a composição da equipe;
    - os integrantes recebem o aviso `ocorrencia_registrada`;
  - visibilidade (`ocorrencias_visiveis`):
    - A1 e a equipe docente de TA veem;
    - A2 e o docente de TB não veem;
  - manifestação:
    - integrante de A1 envia;
    - segunda manifestação, ou fora do prazo sem exceção: `23514`;
    - com exceção de prazo registrada pela coordenação, é aceita;
  - decisão:
    - antes da manifestação e com o prazo aberto: `23514` (FR-009);
    - depois da manifestação, a coordenação confirma com justificativa;
    - docente decidindo: `42501`;
    - os integrantes recebem o aviso `ocorrencia_decidida`;
  - cálculo:
    - confirmada desconta 5 no encontro;
    - arquivada não desconta;
    - duas com o mesmo `fato_chave` descontam uma vez;
    - acima de 10, o desconto fica limitado a 10, e o encontro não fica negativo;
    - plágio zera a entrega do desafio fora do teto, e a apresentação só com `apresentacao_dependente`;
  - redecisão sem `p_pedido`: `23514`;
  - edição G encerrada: a escrita desta seção é recusada (`23514`) e a leitura funciona (U1);
  - evidência:
    - políticas `evidencias_enviar` e `evidencias_baixar` por gestão, coordenação e integrantes;
    - caminho com equipe de outra turma: recusa.
- [x] T022 GREEN [US2]: na migration:
  - implementar `public.registrar_ocorrencia`, `public.enviar_manifestacao`, `public.decidir_ocorrencia(…, p_pedido uuid default null)`, `public.registrar_excecao_prazo` e `public.ocorrencias_visiveis`;
  - criar a RLS de `ocorrencias`, `manifestacoes` e `excecoes_prazo`;
  - criar as políticas de Storage `evidencias_enviar` e `evidencias_baixar`, com o caminho `{edicao}/{dupla}/{chave}.ext`;
  - ligar as ocorrências confirmadas em `app.lancamentos_oficiais`:
    - penalidades `{ id, fatoId: fato_chave, pontos }` ordenadas por `criado_em`;
    - plágio zera as notas de entrega do desafio antes da média e, com `apresentacao_dependente`, as de apresentação.

  Rodar até T021 passar.

- [x] T023 [P] [US2] RED+GREEN: `src/modules/resultado/ui/FormOcorrencia.tsx` (+ teste com axe):
  - os tipos vêm das regras;
  - o desafio é obrigatório no plágio;
  - fato, evidência e arquivo opcional (PDF, ZIP, PNG ou JPG até 50 MB, validados no navegador antes do upload);
  - chave de envio por `novaChaveDeEnvio` de `@/modules/atividades`;
  - upload no bucket `evidencias` e depois a RPC;
  - Sem conexão (`useOnline` falso), a ação fica desabilitada e aparece "Sem conexão: esta ação exige internet"; na demonstração, desabilitada com o aviso de demonstração (FR-025, C1).
- [x] T024 [P] [US2] RED+GREEN: `ListaOcorrencias.tsx`, `FormManifestacao.tsx`, `FormDecisao.tsx` e `FormExcecaoPrazo.tsx` em `src/modules/resultado/ui/` (+ testes):
  - estado em texto;
  - prazo de manifestação visível;
  - manifestação só quando `podeManifestar`;
  - decisão com resultado, justificativa e "Apresentação dependente da entrega" (só no plágio);
  - a recusa do servidor aparece no lugar da mensagem de sucesso;
  - Sem conexão (`useOnline` falso), a ação fica desabilitada e aparece "Sem conexão: esta ação exige internet"; na demonstração, desabilitada com o aviso de demonstração (FR-025, C1).
- [x] T025 [P] [US2] RED+GREEN: `src/modules/resultado/ui/ContadorAvisos.tsx` e `ListaAvisos.tsx` (+ testes):
  - contador com o rótulo acessível "N avisos não lidos";
  - "Marcar como lido" chama a RPC e só atualiza depois da resposta;
  - Sem conexão (`useOnline` falso), a ação fica desabilitada e aparece "Sem conexão: esta ação exige internet"; na demonstração, desabilitada com o aviso de demonstração (FR-025, C1).
- [x] T026 [US2] Criar as páginas em `src/app/paginas/resultado.tsx`:
  - `/docente/ocorrencias`;
  - `/aluno/ocorrencias`;
  - `/coordenacao/ocorrencias`, com filtro por turma e estado;
  - `/avisos`, para todos os perfis.

  Pôr o contador no cabeçalho, em `src/app/layout/`. Atualizar rotas e navegação. Substituir o placeholder "Ocorrências, penalidades e pedidos de revisão" de `src/app/paginas/coordenacao.tsx`.

**Checkpoint**: US2 testável sozinha, com a penalidade refletida nos pontos.

## Fase 5: US3, pontos oficiais calculados no servidor (P1)

**Objetivo**: leitura dos pontos oficiais por perfil, com prévia, a partir do cálculo do servidor.

**Teste independente**: os pontos do servidor batem com os casos de contrato; alterar uma presença atualiza a prévia.

- [x] T027 RED [US3]: seção "pontos" no pgTAP. Testar:
  - `pontos_da_minha_equipe(E)`:
    - devolve só a equipe de quem chama, com encontros, componentes, pendências e totais;
    - sem equipe: `equipe` nulo;
  - `pontos_da_turma(TA)`:
    - devolve as equipes de TA para o docente, o mentor e a coordenação;
    - docente de TB e aluno: `42501`;
  - nenhuma das duas devolve a chave `nota` (FR-019a, SC-002);
  - corrigir uma presença com justificativa muda os pontos na próxima leitura (cenário 4 da US3);
  - equipe sem lançamentos: total 0 e pendente.
- [x] T028 GREEN [US3]: na migration, implementar `public.pontos_da_minha_equipe(p_edicao)` e `public.pontos_da_turma(p_turma)` sobre `app.totais_da_equipe`. Rodar até T027 passar.
- [x] T029 [P] [US3] RED+GREEN: `src/modules/resultado/ui/PreviaPontos.tsx` (+ teste com axe):
  - tabela por encontro e componente com o selo "Prévia — não oficial";
  - "Aguardando registro" nas pendências;
  - modo equipe (aluno) e modo turma (docente).
- [x] T030 [US3] Trocar o cálculo no navegador (`calcularParcial`) pela prévia do servidor:
  - em `src/app/paginas/atividades.tsx`, a página `/aluno/pontuacao` passa a usar `pontos_da_minha_equipe`;
  - criar a página `/docente/pontos` em `src/app/paginas/resultado.tsx`;
  - atualizar rotas, navegação e consultas (FR-019, FR-019a).

  A demonstração continua usando `calcularParcial` com dados fictícios.

**Checkpoint**: US1 a US3 entregam o resultado oficial lido do servidor.

## Fase 6: US4, coordenação publica o ranking por categoria (P2)

**Objetivo**: publicação versionada e imutável nos estados parcial, provisório e definitivo, com leitura por perfil.

**Teste independente**: publicar o parcial de "Cat 1"; o aluno vê o selo "Parcial" e o detalhe só da própria equipe; a publicação definitiva com prova pendente é recusada.

- [x] T031 RED [US4]: seção "ranking" no pgTAP. Testar:
  - quem publica:
    - só a coordenação;
    - docente, aluno e coordenação de F: `42501`;
  - conteúdo da versão 1 (parcial):
    - posições, totais, `compartilhada` e `detalhe` congelados;
    - `regras_versao` e `revisao_ate` nulo;
  - empate em total, entrega, objetivo e presença: posição compartilhada;
  - versão 2 sem justificativa: `23514`;
  - repetir o mesmo estado com as mesmas posições devolve a última versão, sem criar outra;
  - definitivo:
    - recusado (`23514`) com componente pendente, ocorrência não decidida ou revisão aberta na categoria;
    - a mensagem lista as pendências;
    - `pendencias_da_categoria` devolve as mesmas pendências;
  - provisório: `revisao_ate = publicado_em + 24 h`;
  - imutabilidade: UPDATE e DELETE em `publicacoes_ranking` e `publicacao_posicoes`, mesmo como `postgres` via gatilho, falham;
  - `ranking_publicado`:
    - aluno de TA vê "Cat 1", com `detalhe` só em A1, e não vê "Cat 2";
    - docente de TA vê "Cat 1";
    - a coordenação vê qualquer categoria;
    - sem publicação, devolve `null`;
  - avisos `ranking_publicado` para os alunos e a equipe docente das turmas da categoria;
  - corrigir um lançamento depois de publicar não muda a versão publicada (FR-022);
  - edição G encerrada: a escrita desta seção é recusada (`23514`) e a leitura funciona (U1);
  - equipe sem lançamentos aparece na versão publicada com total 0 e `pendente` (caso de borda, C3).
- [x] T032 GREEN [US4]: na migration, implementar:
  - `app.pendencias_da_categoria`;
  - `public.pendencias_da_categoria`;
  - `public.publicar_ranking`, com `pg_advisory_xact_lock(hashtext(edicao || categoria))`;
  - `public.ranking_publicado`;
  - `public.historico_publicacoes`.

  Fazer `public.painel_da_turma` preencher `pontuacao` com a última publicação da categoria da turma, mantendo o formato da spec 004. Rodar até T031 passar e conferir que o pgTAP 006 continua verde.

- [x] T033 [P] [US4] Escrever `scripts/testar-concorrencia-publicacao.mjs`: duas publicações provisórias simultâneas da mesma categoria, com justificativa, em duas conexões. Esperado:
  - versões 1 e 2 distintas, ou uma recusa clara;
  - nenhuma versão repetida;
  - limpeza das fixtures fictícias.
- [x] T034 [P] [US4] RED+GREEN: mover `TabelaRanking` de `src/app/paginas/aluno.tsx` para `src/modules/resultado/ui/TabelaRanking.tsx` (+ teste com axe):
  - selo do estado em texto;
  - empate em texto;
  - a linha da própria equipe destacada, abrindo o detalhe por encontro;
  - o estado vazio "O ranking ainda não foi publicado".
- [x] T035 [P] [US4] RED+GREEN: `src/modules/resultado/ui/PainelPublicacao.tsx` e `HistoricoPublicacoes.tsx` (+ testes):
  - lista de pendências;
  - prévia classificada;
  - estado e justificativa, obrigatória a partir da versão 2;
  - a recusa do definitivo mostra as pendências devolvidas;
  - publicar em até 3 interações (SC-004);
  - Sem conexão (`useOnline` falso), a ação fica desabilitada e aparece "Sem conexão: esta ação exige internet"; na demonstração, desabilitada com o aviso de demonstração (FR-025, C1).
- [x] T036 [US4] Ligar as páginas `/aluno/ranking` (`src/app/paginas/aluno.tsx`) e `/coordenacao/ranking` (`src/app/paginas/coordenacao.tsx`) aos dados reais, removendo o texto "será feita no servidor (Incremento 4)". Ajustar o painel da turma e as consultas.

**Checkpoint**: ranking oficial publicado e visível por perfil.

## Fase 7: US5, estudante pede revisão em até 24 h (P2)

**Objetivo**: pedido de revisão no prazo, resposta fundamentada e correção de origem ligada ao pedido.

**Teste independente**: o aluno pede revisão 2 h depois da publicação provisória; a coordenação corrige a presença ligando o pedido e defere; os pontos mudam e o ranking só muda numa nova publicação; um pedido 25 h depois é recusado, salvo exceção.

- [x] T037 RED [US5]: seção "revisão" no pgTAP. Testar:
  - pedido sobre decisão de ocorrência, dentro de 24 h de `decidido_em`: aceito;
  - pedido sobre publicação provisória, com componente: aceito;
  - pedido sobre publicação parcial ou definitiva: `23514`;
  - pedido fora do prazo (prazo ajustado no fixture): `23514`; com exceção de prazo, aceito;
  - quem pede:
    - pessoa de outra equipe, ou publicação sem a equipe: `42501` ou `23514`;
    - segundo pedido aberto para o mesmo objeto: `23514`;
    - mesma `chave_envio`: devolve o original;
  - a coordenação recebe o aviso `revisao_pedida`;
  - correções ligadas ao pedido:
    - `registrar_presencas`, `registrar_participacao` e `registrar_avaliacao` com `p_pedido` gravam `auditoria.pedido_revisao_id`;
    - `p_pedido` fechado ou de outra equipe: `23514`;
    - `registrar_resultados_prova` e `decidir_ocorrencia` (redecisão) com `p_pedido` também ligam;
  - resposta:
    - `responder_revisao` exige justificativa;
    - só a coordenação responde;
    - a equipe recebe o aviso `revisao_respondida`;
  - `pedidos_revisao`: a equipe vê só os próprios pedidos e a coordenação vê todos, com as correções ligadas;
  - o pgTAP 007 da spec 006 continua verde com as RPCs recriadas;
  - edição G encerrada: a escrita desta seção é recusada (`23514`) e a leitura funciona (U1);
  - pedido aberto sobre a versão provisória N continua válido depois da versão N+1, que abre prazo próprio (U2).
- [x] T038 GREEN [US5]: na migration:
  - implementar `public.pedir_revisao`, `public.responder_revisao` e `public.pedidos_revisao`;
  - recriar `public.registrar_presencas`, `public.registrar_participacao` e `public.registrar_avaliacao` (drop e create) com `p_pedido uuid default null`, mantendo a semântica da spec 006;
  - criar o helper `app.vincular_pedido(p_pedido, p_dupla)`, que valida e faz `set_config('app.pedido_revisao', …, true)`.

  Rodar até T037 e `007_atividades_avaliacao.test.sql` passarem.

- [x] T039 [P] [US5] Atualizar `src/modules/atividades/data/repositorioSupabase.ts` e os formulários de correção (`FormAvaliacao`, `RegistroPresenca` e `FormParticipacao`) para aceitar o `pedidoId` opcional, recebido pela rota (`?pedido=`) (+ testes existentes ajustados).
- [x] T040 [P] [US5] RED+GREEN: `src/modules/resultado/ui/FormPedidoRevisao.tsx`, `ListaRevisoes.tsx` e `FormRespostaRevisao.tsx` (+ testes com axe):
  - o botão "Pedir revisão" só aparece quando `podePedirRevisao`;
  - componente e encontro no pedido sobre publicação;
  - resposta deferida ou indeferida com justificativa;
  - correções ligadas listadas;
  - atalho para a correção de origem com `?pedido=`;
  - Sem conexão (`useOnline` falso), a ação fica desabilitada e aparece "Sem conexão: esta ação exige internet"; na demonstração, desabilitada com o aviso de demonstração (FR-025, C1).
- [x] T041 [US5] Criar as páginas `/aluno/revisoes` e `/coordenacao/revisoes` em `src/app/paginas/resultado.tsx` e o botão "Pedir revisão" no ranking provisório e na ocorrência decidida. Atualizar rotas, navegação e consultas.

**Checkpoint**: todas as histórias funcionando de forma independente.

## Fase 8: Acabamento e verificação

- [x] T042 [P] E2E da demonstração em `e2e/jornadas.spec.ts`:
  - aluno vê a prévia com o selo, o ranking parcial com o detalhe só da própria equipe, a ocorrência e o contador de avisos;
  - coordenação vê pendências e histórico com as ações desabilitadas;
  - 412 px.
- [x] T043 E2E real em `e2e-supabase/resultado.spec.ts`, seguindo a jornada do [quickstart.md](quickstart.md):
  - prova;
  - ocorrência com PDF;
  - decisão recusada antes do prazo;
  - manifestação e confirmação;
  - parcial;
  - definitivo recusado;
  - provisório;
  - pedido, correção ligada e deferimento.

  Para o E2E real: fixture com seed, `db reset` antes e a suíte completa.

- [x] T044 [P] Completar o seed fictício (`supabase/seed.sql`) com:
  - o encontro 4 de prova oficial com a turma A;
  - uma ocorrência registrada de exemplo, marcada como fictícia.
- [x] T045 [P] Documentação:
  - `docs/decisoes-e-pendencias.md`, nova §6.5 com:
    - regras completadas pela migration: só edições não encerradas, com `regras_versao` marcado `+inc4`;
    - ex-integrantes listados em `integrantes` continuam vendo a ocorrência do fato em que estavam (U3);
    - nota indisponível;
    - revisão de questões sem correção de origem;
    - escala diferente de 0–100;
    - avisos sem e-mail;
  - `docs/arquitetura.md`, com o módulo `resultado`;
  - `docs/requisitos-e-referencias.md`, com RF13 a RF16, HU04 a HU06 e o estado novo.
- [x] T046 Portões finais:
  - `npm run verify`;
  - `npm run test:db`;
  - `node scripts/testar-paridade-calculo.mjs`;
  - `node scripts/testar-concorrencia-publicacao.mjs`;
  - `node scripts/testar-concorrencia-questoes.mjs`;
  - `npm run test:e2e`, com o servidor aquecido;
  - `npm run test:e2e:supabase`, depois de `db reset`.

  Registrar os resultados e as divergências do contrato em `quickstart.md`. Depois, resetar o banco local.

## Dependências

- A Fase 1 vem antes da Fase 2, e a Fase 2 bloqueia todas as histórias.
- **US1 (prova)**, **US2 (ocorrências)** e **US3 (pontos)** dependem só da Fundação.
  - US1 e US2 ligam a prova e as penalidades em `app.lancamentos_oficiais`.
  - Por isso, T018 e T022 mexem na mesma função e não podem rodar em paralelo.
- **US3** lê o que US1 e US2 ligarem, mas é testável com presença e avaliação da spec 006.
- **US4** depende de US3, que fornece os totais e as pendências. Para a recusa do definitivo por ocorrência aberta, também depende de US2.
- **US5** depende de US2 (decisão) e de US4 (publicação provisória).
- **Na mesma migration**, as tarefas GREEN de SQL são sequenciais: T009 → T011 → T013 → T018 → T022 → T028 → T032 → T038.
- **No mesmo arquivo pgTAP**, as tarefas RED também são sequenciais.

## Paralelismo

- **Fundação:** T014, T015 e T016 (TS) podem correr ao lado de T008 a T013 (SQL).
- **US1:** T019 (UI) roda em paralelo com T017 e T018 (SQL).
- **US2:** T023, T024 e T025 rodam em paralelo entre si e com T021 e T022.
- **US4:** T033, T034 e T035 rodam em paralelo depois de T032 (o script) ou de forma independente (a UI).
- **US5:** T039 e T040 rodam em paralelo.
- **Acabamento:** T042, T044 e T045 rodam em paralelo.

## Estratégia de implementação

1. **MVP:** Fundação e US1. A prova oficial fica registrada e entra nos pontos do servidor, com a paridade TS e SQL comprovada.
2. **Primeiro incremento:** US2 e US3. Penalidades com o direito de manifestação e prévia lida do servidor para aluno e docente.
3. **Segundo incremento:** US4. O ranking oficial publicado substitui a demonstração.
4. **Terceiro incremento:** US5 e o acabamento. Revisão com correção ligada e os portões completos.
