# Research: Gestão de edições, turmas e vínculos

Decisões técnicas da spec 010. Cada item segue o formato decisão, motivo e alternativas. As
decisões de regras (versões, ajustes por turma, versão por encontro) foram retiradas desta spec e
seguem para a spec 011.

## R1. Escrita de edições só por RPC

- **Decisão:** criar, alterar, ativar, encerrar e apagar edições passam a ser RPCs `security
definer`. A política `edicoes_atualizar` (UPDATE direto pela coordenação, desde a spec 001) é
  removida; `insert`, `update` e `delete` ficam revogados de `authenticated`.
- **Motivo:** FR-017 e constituição V. Hoje a coordenação consegue mudar `estado` e `regras` por
  UPDATE direto, sem justificativa.
- **Alternativas:** manter o UPDATE direto com gatilhos; rejeitada porque não dá para exigir chave
  de envio e justificativa num UPDATE comum.

## R2. Quem cria edições e mantém o cadastro

- **Decisão:** `app.coordena_alguma_edicao()` = atribuição ativa de `coordenacao` em qualquer
  edição. Ela autoriza criar edição e escrever no cadastro permanente. `criar_edicao` insere a
  edição e a atribuição da criadora na mesma transação, com as regras copiadas da base
  (`app.regras_piloto()` ou a edição coordenada).
- **Motivo:** esclarecimento 1.
- **Alternativas:** papel `administrador`; rejeitada no esclarecimento.

## R3. Cadastro permanente com "turma na edição"

- **Decisão:** duas tabelas novas de cadastro, `cadastro_cursos` (nome único, categoria) e
  `cadastro_turmas` (curso, nome único no curso, ano letivo opcional). As tabelas atuais `cursos` e
  `turmas` passam a representar o **curso na edição** e a **turma na edição**: ganham
  `cadastro_curso_id` / `cadastro_turma_id` (únicos por edição) e continuam sendo o alvo de todas as
  chaves estrangeiras existentes (~135 referências a `turma_id` em equipes, atividades, presenças,
  resultado, painéis e comunicados). Vincular uma turma do cadastro cria, se faltar, o curso na
  edição e cria a turma na edição, copiando nome e categoria.
- **Motivo:** FR-005 e FR-006 com o menor impacto: nenhuma RPC das specs 002–009 muda de assinatura
  e os dados de edições diferentes nunca se misturam, porque cada edição tem a sua linha de turma.
- **Alternativas:** tornar `turmas` permanente e acrescentar `edicao_id` em cada tabela que hoje usa
  `turma_id`; rejeitada (dezenas de tabelas, RPCs e políticas reescritas, risco alto).

## R4. Sincronia entre cadastro e edição

- **Decisão:** corrigir nome ou categoria no cadastro atualiza por gatilho os cursos e turmas na
  edição só das edições em preparação. Em edição ativa, a diferença aparece como aviso na
  organização da edição, e a RPC `atualizar_do_cadastro(p_edicao)` aplica as correções pendentes
  daquela edição (auditada); edições encerradas não mudam. O CRUD direto em
  `cursos` e `turmas` (políticas `for all` da spec 002) sai: a coordenação passa a usar o cadastro
  e as RPCs de vínculo. Apagar do cadastro é recusado quando há turma ou curso na edição ligado.
- **Motivo:** esclarecimento sobre a sincronia (a categoria define o ranking; edição em andamento
  não muda sem decisão da coordenação dela) e FR-004. Rankings publicados guardam a categoria em texto
  (`publicacoes_ranking.categoria`) e não são afetados.

## R5. Vínculo e desvínculo de turmas

- **Decisão:** `vincular_turmas(p_edicao, p_cadastro_turmas uuid[])` (idempotente; recria o que
  falta) e `desvincular_turma(p_turma)`, que apaga a turma na edição só se não houver atribuições
  próprias da turma (aluno ou docente, ativas ou não) nem registros que a referenciem; a recusa
  lista o que impede. As linhas derivadas de mentor (R6) não contam e saem junto com a turma. Se o
  curso na edição ficar sem turmas: sem vínculos de mentor, é apagado; com vínculos de mentor, eles
  ficam inativos (histórico preservado) e o curso fica fora da edição até uma turma dele voltar,
  sem reativar mentores.
- **Motivo:** US2-5/6. As chaves estrangeiras `on delete restrict` e a contagem explícita dão a
  mensagem.

## R6. Mentor por curso com vínculos derivados

- **Decisão:** `atribuicoes` ganha `curso_id` (curso na edição) e `origem_id` (atribuição que gerou
  esta). O vínculo do mentor é uma linha com `papel = 'mentor'`, `curso_id` preenchido e
  `turma_id` nulo. Gatilhos mantêm, para cada turma do curso na edição, uma linha derivada
  (`papel = 'mentor'`, `turma_id`, `origem_id`) ativa enquanto a de origem estiver ativa:
  - criar/reativar o vínculo ao curso cria/reativa as derivadas;
  - desativar desativa as derivadas;
  - vincular uma turma nova ao curso cria a derivada para cada mentor ativo do curso.
    Linhas derivadas não podem ser escritas diretamente. Mentor com `turma_id` e sem `origem_id` é
    recusado (FR-008). A restrição de unicidade passa a incluir `curso_id`.
- **Motivo:** todas as verificações existentes (`app.atua_na_turma`, `app.vinculado_a_turma`,
  painéis, comunicados, RLS) leem `atribuicoes.turma_id` com `papel = 'mentor'`; com as derivadas,
  nenhuma delas muda.
- **Migração:** cada mentor com vínculos por turma ganha um vínculo ao curso de cada uma dessas
  turmas; as linhas antigas viram derivadas desse vínculo, e o gatilho completa as turmas do curso
  que faltavam (FR-009, **[validar]** a ampliação).
- **Alternativas:** trocar todas as verificações para considerar o curso; rejeitada (muitos
  pontos, risco de esquecer um e abrir ou fechar acesso indevidamente).

## R7. Gestão por turma

- **Decisão:** a tela da turma reaproveita o que já existe na organização da edição (spec 002),
  filtrado pela turma: `FormConta` com a turma fixa (Edge Function `criar-conta`), `ImportarAlunos`
  com a turma fixa, lista de vínculos da turma e "Vincular pessoa com conta" (busca por nome).
  A busca usa a RPC nova `pessoas_para_vincular(p_edicao, p_busca)`: contas ativas que participam
  ou participaram de edições que a pessoa coordena, até 20 por busca, sem e-mail. **[validar]** se
  é preciso buscar qualquer conta da instalação.
  As escritas de vínculo continuam pelas políticas de `atribuicoes` da spec 001 (coordenação gere
  as de outras pessoas), agora com os gatilhos de R6 e R9.
- **Permissão:** só a coordenação da edição (esclarecimento sobre a gestão da turma). A seção
  "Alunos e docentes" aparece só para ela; docentes e mentores continuam vendo a lista da turma
  pelo painel da spec 004. No servidor, as políticas de `atribuicoes`, a Edge Function
  `criar-conta` e `pessoas_para_vincular` exigem `app.e_coordenacao`.
- **Motivo:** FR-007 com o menor código novo; mesmas validações (um aluno ativo por edição).
- **Rota:** `/coordenacao/turmas/:turmaId` já é o painel da turma (spec 004); a gestão vira uma
  seção "Alunos e docentes" nessa página, acessível a partir da edição.

## R8. Edição encerrada: bloqueio central de escrita

- **Decisão:** gatilho `before insert or update or delete` com `app.bloquear_edicao_encerrada()`
  em todas as tabelas da edição; a função acha a edição pela coluna indicada no argumento do
  gatilho (`edicao_id`, `turma_id`, `curso_id`, `encontro_id`, `dupla_id`, `desafio_id`, `lista_id`,
  `ocorrencia_id`, `comunicado_id`, `publicacao_id`, `convite_id`, conferidas tabela por tabela) e
  recusa com `23514` "A edição está encerrada; os dados só podem ser lidos.". Ficam fora:
  `edicoes` (as RPCs cuidam), `auditoria`, `avisos` (marcar como lido continua),
  `exportacoes_relatorio` (relatório de edição encerrada continua permitido, spec 008), `perfis`,
  `convites_acesso` e o cadastro permanente. As verificações já existentes (equipes, resultado,
  comunicados) continuam com as mensagens próprias.
- **Motivo:** SC-005. Hoje cursos, turmas, atribuições, encontros e atividades (specs 002, 005, 006) não recusam escrita em edição encerrada.
- **Impacto nos testes:** fixtures pgTAP e o seed passam a criar os dados antes de encerrar a
  edição fictícia.
- **Alternativas:** checagem em cada RPC; rejeitada (dezenas de pontos, e políticas diretas ficam
  de fora).

## R9. Coordenação e última coordenação ativa

- **Decisão:** gatilho em `atribuicoes` recusa desativar ou apagar a última atribuição ativa de
  `coordenacao` de uma edição ("A edição precisa de pelo menos uma coordenação ativa."). Atribuir e
  desativar coordenação passam pelas RPCs `atribuir_coordenacao` e `desativar_coordenacao`
  (nunca a própria), que concluem sem mudança quando o estado pedido já vale; assim o reenvio não
  esbarra na unicidade de `atribuicoes` (FR-013).
- **Motivo:** FR-014.

## R10. Encerramento com pendências

- **Decisão:** `pendencias_da_edicao(p_edicao)` devolve as quantidades de ocorrências sem decisão,
  pedidos de revisão abertos e categorias sem ranking publicado (reaproveitando funções da spec
  007). `encerrar_edicao` recalcula as pendências na transação e as grava em
  `edicoes.pendencias_no_encerramento`, que a auditoria guarda junto com o estado.
- **Motivo:** esclarecimento 3, FR-011.

## R11. Seletor de edição

- **Decisão:** `EdicaoEmUsoProvider` em `src/app/dados` guarda o id da edição escolhida por usuário
  em `localStorage` (`maratona:edicao:<usuarioId>`, com `try/catch`). `useEdicaoAtual` mantém a
  assinatura (48 usos ficam iguais) e devolve a escolhida quando visível; senão, a padrão
  (`edicaoPadrao`: ativa de maior início; sem ativa, a de maior início). O seletor fica no topo do
  `AppShell` e só aparece com duas ou mais edições visíveis na área atual (edições em que a pessoa
  tem um papel da área). As chaves de consulta já incluem o id da edição.
- **Motivo:** FR-019, FR-020, SC-007; menor mudança nas telas.
- **Alternativas:** edição na URL; rejeitada por mexer em todas as rotas e links.

## R12. Migração dos dados existentes

- **Decisão:** a migration cria o cadastro a partir dos cursos (por nome) e turmas (por curso e
  nome) atuais, liga cada curso e turma na edição ao item do cadastro, converte os mentores (R6) e
  preenche as colunas novas de edições (`ativada_em`, `encerrada_em`, justificativa padrão
  "Encerrada antes da spec 010." para as já encerradas).
- **Motivo:** a constituição exige que as specs anteriores continuem funcionando; os testes pgTAP
  e E2E existentes servem de rede de segurança.

## R13. Telas e módulos

- **Decisão:** tudo em `@/modules/organizacao` (módulo 3): domínio (`validarEdicao`,
  `edicaoPadrao`, `validarItemDoCadastro`), repositório e UI (`ListaEdicoes`, `FormEdicao`,
  `CadastroCursosTurmas`, `VincularTurmas`, `GestaoDaTurma`, `MentoresDoCurso`,
  `DialogoEncerrar`, `CoordenacaoDaEdicao`, `SeletorEdicao`). Páginas: `/coordenacao/edicoes`
  ("Edições": lista, criação, estado, coordenação), `/coordenacao/cadastro` ("Cursos e turmas":
  cadastro permanente) e a organização da edição (`/coordenacao/organizacao`) reorganizada em
  turmas vinculadas, mentores por curso e link para a gestão de cada turma. Demonstração com dados
  fictícios e escrita desabilitada.
- **Motivo:** arquitetura (módulo 3, "Edições, cursos e turmas") e constituição III.
