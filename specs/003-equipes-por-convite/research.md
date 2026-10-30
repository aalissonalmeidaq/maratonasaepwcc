# Research — spec 003 (equipes por convite)

## R1. Renomear tabelas `duplas` → `equipes`?

- **Decision**: não renomear. Manter `duplas` e `dupla_integrantes`; "equipe" é o termo de
  domínio e de interface.
- **Rationale**: renomear quebra RLS, gatilhos, seed, testes e o Incremento 4 sem ganho
  funcional; o risco não se justifica neste incremento.
- **Alternatives**: renomear com views de compatibilidade (mais superfície para a RLS).

## R2. Concorrência na formação (FR-003, FR-004, SC-002)

- **Decision**: a RPC `responder_convite_equipe` faz `select ... from turmas ... for update` da
  turma do convite antes de validar e formar. Todas as formações e inclusões da turma ficam
  serializadas; o índice único `integrantes_um_por_edicao` continua como última barreira.
- **Rationale**: o volume por turma é pequeno; o bloqueio também resolve "um trio por turma",
  que não cabe em índice único (depende da contagem de integrantes).
- **Alternatives**: `pg_advisory_xact_lock` por aluno (não cobre o trio); nível SERIALIZABLE
  (exige repetição no cliente).
- **Detalhamento após inspeção**: substituir e desfazer hoje bloqueiam a equipe primeiro;
  reescrever com ordem turma → convite/equipe → integrantes.
- **Rejeitado**: serializar também a escrita de vínculos de aluno (cadastro, CSV, ativação).
  Uma mudança de paridade concorrente com a formação produz o mesmo estado que o FR-013 já
  admite (trio preservado + aviso), e a mudança exigiria reescrever Edge Functions já entregues.

## R3. Paridade da turma e trio

- **Decision**: "turma ímpar" = número de atribuições `aluno` ativas na turma é ímpar; "trio
  ativo" = equipe ativa da turma com 3 integrantes sem `saida_em`. Validado ao enviar convite de
  trio, ao aceitar (no momento da formação) e ao incluir integrante.
- **Rationale**: regra da spec; o estado pode mudar entre envio e aceite.

## R4. Visibilidade de colegas (FR-005)

- **Decision**: RPC `colegas_da_turma(p_turma)` (`security definer`, `stable`) devolve id,
  nome e `tem_equipe` só se quem chama é aluno ativo daquela turma (ou equipe/coordenação com
  acesso à turma). Os convites do aluno vêm pela RPC `meus_convites_equipe(p_edicao)`, que já
  devolve os nomes de remetente e convidados. `app.pode_ver_perfil` **não** é ampliada.
- **Rationale**: `perfis` só tem nome; expor "tem equipe" exige ler integrantes de outras
  equipes, que a RLS de `duplas` corretamente bloqueia. Ampliar a RLS de perfis abriria leitura
  em massa de colegas por qualquer consulta, além do necessário (R11).

## R5. Cancelamento automático

- **Decision**: função interna `app.cancelar_convites_de(p_edicao, p_alunos uuid[], p_motivo)`
  chamada na formação, na inclusão por docente/coordenação e por gatilho quando uma atribuição
  de aluno fica inativa. Na formação de trio também cancela os convites de trio pendentes da
  turma.
- **Motivos**: `equipe_formada`, `aluno_em_equipe`, `trio_formado`, `aluno_inativo`,
  `cancelado_pelo_remetente`, `recusado`, `aceite_retirado`.

## R6. Nome da equipe

- **Decision**: `duplas.nome` passa a aceitar nulo; nova coluna `nome_definido_em`. Integrante
  define uma vez (`definir_nome_equipe`, só se `nome is null`); depois só
  `renomear_equipe` (somente docente/mentor da turma, com justificativa). A coordenação não
  escolhe o primeiro nome nem renomeia. Sem nome, a interface mostra os primeiros nomes
  ("Ana e Bruno", "Ana, Bruno e Carla") — função pura no domínio.

## R7. Quem altera equipes formadas (FR-006)

- **Decision**: `app.exigir_gestao_da_turma(p_turma)` aceita coordenação da edição ou
  `app.atua_na_turma` (docente/mentor ativo). `substituir_integrante` e `desfazer_dupla` passam
  a usá-la; novas `incluir_integrante`, `remover_integrante`, `renomear_equipe`.
- Remover integrante só de trio (a equipe não pode ficar com 1); para dupla, desfazer.
- `formar_dupla` é removida (`drop function`) — FR-007.
- `formar_equipe_docente` aceita somente docente/mentor da turma, com alunos ativos sem equipe,
  justificativa e histórico (FR-010). A coordenação é recusada.

## R9. Esclarecimentos de ciclo de vida

- **Decision**: implementar `retirar_aceite_convite_equipe` para convidado que aceitou um trio
  ainda pendente. Cancela o convite inteiro com motivo `aceite_retirado`; não altera outros
  convites. Se a equipe já foi formada, recusa e exige gestão.
- **Rationale**: FR-014; a aceitação parcial não é vínculo de equipe.
- **Alternatives**: desfazer automaticamente uma equipe recém-formada foi rejeitado por FR-006.
- **Decision**: preservar trio quando a turma passa a ser par e integrante quando seu vínculo
  é desativado; calcular os avisos a partir do estado atual, sem duplicar estado persistido.
- **Rationale**: FR-011/013; evita avisos desatualizados após reativação ou ajuste.
- **Alternatives**: bloquear cadastro ou desfazer automaticamente contraria os esclarecimentos.

## R10. Compatibilidade e validação

- **Decision**: manter nomes existentes e preencher `nome_definido_em` para equipes já nomeadas
  usando data histórica disponível, sem fingir uma nova escolha dos alunos; todas contam como
  nome já escolhido. Manter a validação existente de nome de 2–80 caracteres e índice por turma.
- **Rationale**: migração não deve apagar nomes nem reabrir permissão de escolha.
- **Alternatives**: zerar nomes exigiria uma decisão de produto ausente.
- **Decision**: registrar autorização, conflitos e transições no banco; erros e cancelamentos
  usam códigos estáveis e mensagens em português, sem nomes ou tokens em logs do navegador.
- **Rationale**: rastreabilidade e minimização de dados da constituição.

## R11. Visibilidade e autorizações existentes

- **Decision**: usar verificação de participação atual e atribuição ativa para nomeação, pois
  `app.e_integrante` também considera membros históricos. Projetar nomes e avisos de inativos
  somente para gestão autorizada, sem depender da leitura atual que oculta perfil inativo.
- **Rationale**: antigos integrantes não podem escolher nome; a gestão precisa identificar
  quem está inativo para decidir ajustes. Não ampliar acesso público a perfis ou equipes.
- **Alternatives**: confiar em botões ocultos ou na função histórica permitiria escrita indevida.

Fontes locais: `supabase/migrations/20261029130000_organizacao_duplas_encontros.sql`,
`src/modules/duplas/data/repositorioSupabase.ts`, `src/modules/duplas/domain/tipos.ts`,
`package.json` e os esclarecimentos de `spec.md`. Decisões são projeto para implementação,
não afirmação de testes já executados.

## R8. Testes antigos que formavam dupla pela coordenação

- **Decision**: `002_organizacao` e `003_regras_organizacao` passam a formar equipes por convite
  (enviar como aluno, aceitar como o outro). O cenário "coordenação forma dupla" vira "coordenação
  não forma equipe". O E2E `organizacao.spec.ts` perde os dois testes de formação; as jornadas
  passam para `e2e-supabase/equipes.spec.ts`.
