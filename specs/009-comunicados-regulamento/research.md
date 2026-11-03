# Research: Comunicados e regulamento (spec 009)

Não havia marcadores de esclarecimento abertos no contexto técnico. As decisões abaixo fixam como
o desenho atende a spec reaproveitando os padrões das specs 003, 006 e 007.

## R1 — Rascunho, publicação e turmas: o padrão das listas da spec 006

- **Decisão:** tabela `comunicados` com estado `rascunho → publicado → retirado`, mais
  `comunicado_turmas` para o recorte opcional por turma. Escrita só por RPCs `security definer`;
  RLS de leitura e `revoke` de insert/update/delete para `authenticated`, como nas specs 006 e 007.
- **Por quê:** `salvar_lista`/`publicar_lista` já resolvem rascunho com turmas e checagem de
  vínculo (`app.exigir_turmas_da_atividade`). Repetir o padrão reduz risco e revisão.
- **Alternativas:** colunas `turmas uuid[]` na própria tabela (descartada: dificulta RLS e índice
  por turma); um único estado com datas (descartada: estados explícitos deixam as recusas claras).

## R2 — Quem escreve e para quem (esclarecimentos 1 e 2)

- **Decisão:** função `app.exigir_autoria_comunicado(edicao, publico, turmas)`:
  - coordenação da edição (`app.e_coordenacao`): qualquer público, com ou sem turmas;
  - docente ou mentor: turmas obrigatórias, todas com `app.atua_na_turma`; senão `42501`;
  - demais: `42501`.
    Corrigir, retirar, publicar e apagar rascunho exigem ser o autor (e ainda atuar em todas as
    turmas do comunicado) ou ser coordenação. Sem etapa de aprovação.
- **Papel exibido do autor:** gravado na criação (`autor_papel`), na precedência coordenação >
  docente > mentor, para a lista mostrar "Prof.ª X — docente" sem consultar atribuições de novo.

## R3 — Público avaliado na leitura

- **Decisão:** `app.pode_ler_comunicado(id)` — publicado, não retirado, e a pessoa tem
  atribuição ativa na edição com papel do público (`aluno` para estudantes; `docente`/`mentor`
  para equipe docente; os três para todos) e, se houver turmas, `turma_id` entre elas. Usada na
  política de leitura e nas RPCs de lista.
- **Por quê:** FR-005 e os casos de borda (entrou depois, saiu da turma) pedem a regra no momento
  da leitura, não uma cópia da lista de destinatários.
- **Coordenação** lê tudo da edição (`app.e_coordenacao`); o autor lê os próprios em qualquer
  estado.

## R4 — Avisos e o selo "Novo" derivados da tabela `avisos`

- **Decisão:** novos tipos `comunicado_publicado` e `comunicado_atualizado` no `check` de
  `public.avisos`; referência `{ "comunicadoId": "<id>" }`. Os destinatários saem de
  `app.destinatarios_do_comunicado(id)` (mesma regra de R3, sem o autor, sem repetição) e passam
  por `app.avisar` (spec 007). "Novo" = existe aviso não lido daquele comunicado para a pessoa.
  `marcar_comunicado_lido(id)` marca esses avisos como lidos.
- **Por quê:** evita uma tabela de leituras paralela; o contador do cabeçalho e o painel do aluno
  (spec 008) já contam avisos não lidos; a correção volta o "Novo" só por gerar aviso novo.
- **Consequência aceita:** quem entrou no público depois da publicação vê o comunicado sem o selo
  "Novo" e sem aviso retroativo (caso de borda da spec).

## R5 — Idempotência e concorrência

- **Criação de rascunho:** `salvar_comunicado(p_chave, …)` com `chave_envio uuid unique`; o mesmo
  envio devolve o mesmo id (padrão de `registrar_ocorrencia`).
- **Publicar:** `select … for update` no comunicado; se já publicado, devolve sem gerar avisos.
  Duas publicações simultâneas: a segunda espera a trava e vê o estado `publicado`.
- **Corrigir:** trava a linha; se título e texto já são os enviados, nada muda e não há aviso
  (repetir os mesmos valores não grava nada, como na spec 007). Senão grava, incrementa `versao`,
  registra a justificativa na auditoria e gera `comunicado_atualizado`.
- **Retirar:** trava; se já retirado, devolve sem mudar.

## R6 — Justificativa, auditoria e edição encerrada

- **Justificativa:** `app.registrar_justificativa` (mínimo de 10 caracteres, regra já usada no
  projeto) antes do `update`; o gatilho `app.registrar_auditoria` grava antes/depois e autor.
- **Edição encerrada:** `app.exigir_edicao_aberta` tem mensagem sobre equipes; a migration cria
  `app.exigir_edicao_aberta_para_comunicados` com mensagem própria
  ("A edição está encerrada; os comunicados só podem ser lidos."), `23514`.

## R7 — Texto puro e limites

- **Decisão:** `check` de 1–200 caracteres no título e 1–5.000 no texto (após `btrim`), também
  validados no domínio TS para mensagens de campo. A tela exibe com `whitespace-pre-line` sem
  interpretar marcação (o React já escapa o texto). Limites **[validar]**.

## R8 — Regulamento a partir das regras da edição

- **Decisão:** função pura `resumoDoRegulamento(regras: unknown)` em
  `src/modules/comunicados/domain/regulamento.ts`, que lê o JSON de `edicoes.regras` (já legível
  por participantes via `edicoes_ler`) e devolve os itens com valor ou `null` ("a definir").
  Atrasos vêm de `entrega.faixasDeAtraso`/`limiteAtrasoMinutos` e o prazo de revisão de
  `prazos.revisaoHoras` — sem números fixos na tela. O repositório de organização passa a expor
  `regras` da edição.
- **Por quê:** a página atual usa `REGRAS_PILOTO` e frases com números fixos (15/30 min, 24 h).
- **Alternativas:** RPC dedicada (descartada: a leitura já é autorizada pela RLS existente).

## R9 — Leitura offline e demonstração

- **Offline:** nenhum `runtimeCaching` no service worker (já é assim); sem conexão, escritas
  bloqueadas com `useOnline` e a lista mostra o erro de consulta com "exige conexão".
- **Demonstração:** `criarComunicadosDemo` com os comunicados fictícios atuais de
  `demo/dados.ts`, selo "Dados fictícios" e escritas recusadas, como em `demo/paineis.ts`.
