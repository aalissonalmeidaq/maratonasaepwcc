# Research: Painéis com dados reais e relatórios CSV

Decisões técnicas da spec 008. Nenhum item ficou como NEEDS CLARIFICATION. Os painéis e os
relatórios só leem dados das specs 004, 006 e 007; nenhuma regra de cálculo nova é criada.

## R1. Uma RPC de leitura por painel

- **Decision**: três RPCs `stable security definer`, uma por perfil:
  - `painel_do_aluno(p_edicao)`;
  - `painel_da_gestao(p_edicao)`, para docente e mentor, cobrindo só as turmas em que atuam;
  - `painel_da_coordenacao(p_edicao)`.

  Cada uma monta o resumo com os helpers que já existem: `app.totais_da_equipe`, a leitura da
  publicação do ranking, `app.prazo_*` e os avisos.

- **Rationale**: uma ida ao servidor por tela, autorização no mesmo lugar e números iguais aos
  das páginas de origem (SC-001), porque vêm das mesmas funções.
- **Alternatives considered**: compor o painel no navegador com as consultas das outras páginas.
  São várias idas ao servidor e há risco de divergência entre contagens. Rejeitada.

## R2. Encontro "realizado" para as pendências (FR-004a)

- **Decision**: `app.encontro_realizado(encontro)`, verdadeiro quando:
  - `estado = 'realizado'`; ou
  - `estado <> 'cancelado'` e `data < (now() at time zone 'America/Sao_Paulo')::date`.

  As pendências dos painéis só consideram encontros realizados. `app.pendencias_da_categoria`,
  da spec 007, não muda: continua usando todos os encontros na recusa do definitivo.

- **Rationale**: segue o esclarecimento de 2026-11-02. O fuso fica explícito para não depender
  do fuso do servidor.

## R3. Pendências da equipe docente (FR-003)

- **Decision**: por turma e por encontro realizado, o painel mostra:
  - **presença não registrada**: estudante ativo da turma sem linha em `presencas` naquele
    encontro;
  - **participação não registrada**: equipe ativa sem `participacoes`;
  - **entrega recebida sem avaliação**: existe `entregas`, mas não existe `avaliacoes` para o
    desafio e a equipe;
  - **ocorrências da turma sem decisão**: estados `registrada` ou `manifestada`.

  Cada item traz o caminho da página de ação: presença, avaliações ou ocorrências.

- **Rationale**: são as ações que o docente consegue fazer e que destravam o cálculo. A situação
  da prévia por turma vem dos totais (`pendente` por equipe).

## R4. Relatórios: dados no servidor, arquivo no navegador

- **Decision**:
  - A RPC `relatorio(p_tipo, p_edicao, p_categoria, p_turma, p_encontro)` autoriza, filtra e
    devolve `{ colunas: [{ id, rotulo, tipo }], linhas: [...] }`. Os tipos são `texto`,
    `numero`, `data_hora` e `sim_nao`.
  - A mesma chamada grava a exportação em `exportacoes_relatorio`, com autor, horário, tipo,
    filtros e quantidade de linhas (FR-009).
  - O navegador só serializa o CSV com a função pura `gerarCsv` do domínio e oferece o download.
- **Autorização**:
  - **Coordenação**: toda a edição.
  - **Docente ou mentor**: só as turmas em que atua. Sem filtro de turma, recebe só essas turmas;
    pedir outra turma é recusado com `42501`.
  - **Aluno**: recusado com `42501`.
- **Rationale**: atende a FR-008, porque os dados são autorizados e gerados no servidor. O
  formato do arquivo fica testável em TS puro.
- **Alternatives considered**:
  - Edge Function devolvendo `text/csv`: exige outra implantação e outra camada de autorização.
    Rejeitada.
  - Gerar o CSV em SQL: o formato pt-BR (decimal e datas) e o escape ficariam mais difíceis de
    testar. Rejeitada.

## R5. Formato do CSV (FR-010, SC-005)

- **Decision**: BOM UTF-8 e separador `;`, que é o padrão do Excel em pt-BR. Linhas com CRLF.
  - **Escape:** campos com `;`, `"`, CR ou LF ficam entre aspas, com aspas duplicadas.
  - **Números:** vírgula decimal, sem separador de milhar.
  - **`data_hora`:** `DD/MM/AAAA HH:MM`, no fuso `America/Sao_Paulo`.
  - **`sim_nao`:** "Sim" ou "Não".
  - **Proteção contra fórmulas:** valores de texto que começam com `=`, `+`, `-`, `@`, tabulação
    ou CR recebem um apóstrofo na frente (injeção de fórmula, OWASP).
  - **Nome do arquivo:** `maratona-<tipo>-<AAAA-MM-DD>.csv`.
- **Rationale**: o arquivo abre direto em planilhas em português, sem ajuste manual.

## R6. Conteúdo dos relatórios (FR-007, FR-011, FR-011a)

- **Decision**: cinco tipos.

  | Tipo          | Uma linha por                   | Colunas                                                                                                                                            |
  | ------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `pontos`      | equipe × encontro               | categoria, turma, equipe, encontro, presença, participação, questões/prova, entrega, apresentação, descontos, total, pendências                    |
  | `presenca`    | estudante × encontro registrado | categoria, turma, equipe (a da data do encontro, pelo histórico de integrantes, ou "Sem equipe"), estudante (nome), encontro, presente, observação |
  | `entregas`    | versão de entrega               | categoria, turma, equipe, desafio, encontro, versão, recebida em, atraso em minutos, forma (arquivo ou link), avaliada                             |
  | `ocorrencias` | ocorrência                      | categoria, turma, equipe, encontro, tipo, estado, registrada em, decidida em, apresentação dependente                                              |
  | `revisoes`    | pedido                          | categoria, turma, equipe, objeto, componente, encontro, estado, pedido em, respondido em                                                           |

  Nenhum relatório traz nota individual da prova, e-mail, identificador interno, texto de fato,
  evidência, manifestação nem justificativa. Esses textos livres podem conter dados pessoais;
  continuam visíveis nas telas.

- **Rationale**: coleta mínima (Constituição VI e esclarecimentos de 2026-11-02).

## R7. Painéis na demonstração

- **Decision**: a interface `RepositorioPaineis` tem duas implementações:
  - **Supabase**;
  - **demonstração**: monta os mesmos formatos com os dados fictícios de `modules/demo`, com o
    selo "Dados fictícios".

  As páginas iniciais deixam de usar `ComDadosDemo` com `painelAluno`, `painelDocente` e
  `painelCoordenacao` e passam a usar o repositório nos dois modos. Na demonstração, a exportação
  é recusada.

- **Rationale**: um único código de tela e os mesmos E2E de demonstração.
