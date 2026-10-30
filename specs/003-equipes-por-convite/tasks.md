# Tasks: Formação de equipes por convite entre alunos

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `003-equipes-por-convite` | **Atualização**: 2026-10-30.
**Testes**: obrigatórios pela spec (SC-002–004) e constituição II. Em cada história, escrever e executar testes RED antes da implementação GREEN; falha deve ocorrer pelo comportamento ausente, não por ambiente quebrado.
**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`. `[P]` indica arquivos distintos sem dependência entre tarefas do mesmo grupo; não elimina dependências anteriores. Todas as tarefas foram concluídas em 2026-10-30 (evidências em `quickstart.md`).

## Fase 1: Preparação

- [x] T001 Conferir estado dos arquivos existentes e ferramentas locais em `package.json`, `supabase/config.toml` e `src/modules/duplas/domain/equipes.test.ts`; registrar pré-requisitos e falhas de ambiente em `specs/003-equipes-por-convite/quickstart.md`, sem tocar em banco remoto (FR-009, SC-003).
- [x] T002 Registrar decisão de manter tabelas legadas e serializar por turma em `docs/adr/0010-equipes-por-convite.md`, com ordem de bloqueios, a decisão de não serializar o cadastro de alunos (FR-013) e permissões distintas para formação/nomeação/renomeação (FR-003–010).

## Fase 2: Fundação — bloqueia as histórias

Objetivo: schema seguro e contratos compartilhados. Não retirar a formação antiga antes de a US1 fornecer o caminho substituto.

- [x] T003 Escrever e executar RED em `supabase/tests/005_equipes_por_convite.test.sql` para schema, FKs, estados, índices, preservação de nomes legados, RLS e escrita direta negada a `anon`/`authenticated` nas duas tabelas novas (FR-004/009).
- [x] T004 Criar `supabase/migrations/20261030140000_equipes_por_convite.sql`: `duplas.nome` "passa a aceitar nulo (check de 2–80 caracteres só quando informado)", `nome_definido_em` "novo, timestamptz"; preservar nomes existentes com data histórica disponível; manter índices `duplas_nome_ativo_por_turma` e `integrantes_um_por_edicao` (FR-004/008).
- [x] T005 Completar `supabase/migrations/20261030140000_equipes_por_convite.sql` com `convites_equipe`: `id` uuid PK; `edicao_id`/`turma_id`/`remetente_id` FKs, "turma do remetente", "aluno ativo da turma, sem equipe ativa"; `tipo` dupla/trio, "dupla = 1 convidado; trio = 2"; enum `situacao_convite_eq` com "pendente → formado | recusado | cancelado"; `motivo` "obrigatório quando cancelado ou recusado"; `dupla_id` "preenchido quando formado"; `criado_em` "default now()" e `encerrado_em` "preenchido quando sai de pendente"; índices `(turma_id, situacao)` e `(remetente_id) where situacao = 'pendente'` (FR-001–003).
- [x] T006 Completar `supabase/migrations/20261030140000_equipes_por_convite.sql` com `convite_equipe_convidados`: FKs, "PK composta com convidado_id", "aluno ativo da mesma turma, ≠ remetente", resposta "pendente | aceito | recusado", `respondido_em` "timestamptz, nulo"; RLS de leitura para envolvidos e gestão autorizada, auditoria nas duas tabelas e nenhuma escrita direta para `authenticated`; helpers internos sem exposição pública, RPCs com `search_path = ''` e privilégios mínimos (FR-005/009).
- [x] T007 Definir contratos TS em `src/modules/duplas/domain/tipos.ts` e exportações em `src/modules/duplas/index.ts`: `nome: string | null`, entidades de convite/colega, projeções de gestão, métodos RPC de convites e colegas; remover `formar()` e o card "Formar dupla" da coordenação (a RPC `formar_dupla` sai em T014); não declarar ainda métodos da US4 (FR-005/007).

Marco: T003 fica GREEN; esquema e API pública prontos. Continuar acrescentando SQL na migration deste incremento enquanto ainda não publicada; não reescrever migrations anteriores.

## Fase 3: US1 — Aluno forma dupla por convite (P1, MVP)

Objetivo: enviar, receber, recusar, cancelar e aceitar convites de dupla.
Teste independente: duas contas ativas sem equipe na mesma turma; convite → aceite → ambas veem a mesma dupla; demais convites pendentes dos dois são cancelados.

### Testes primeiro

- [x] T008 [P] [US1] Revisar e executar RED de elegibilidade e nome de exibição provisório em `src/modules/duplas/domain/equipes.test.ts`: um convidado distinto do remetente, ativo, mesma turma e sem equipe; exibição "Ana e Bruno" sem nome próprio (FR-001/005, US3 cenário 1).
- [x] T009 [P] [US1] Escrever e executar RED em `supabase/tests/005_equipes_por_convite.test.sql` para envio, aceite, recusa, cancelamento, várias solicitações, convite repetido ao mesmo convidado, isolamento por turma, cancelamento de pendentes, atomicidade, nova tentativa após aceite confirmado e negação a estranho/inativo; formação direta pela coordenação recusada; `pode_ver_perfil` inalterada: aluno não lê `perfis` de colega fora da própria equipe pela API; envio, resposta e cancelamento com edição `encerrada` ⇒ recusa e nada gravado; `rascunho`/`ativa` permitem (FR-001–007/009, FR-017).
- [x] T010 [P] [US1] Escrever e executar RED em `src/modules/duplas/ui/ConvitesEquipe.test.tsx` para ações, carregamento/erro/vazio, promessa ainda pendente sem sucesso, falha de rede com releitura, duplo clique e escrita bloqueada offline/demo; teste do contador: mostra N pendentes recebidos, ignora enviados e encerrados, some com 0, texto acessível (FR-002/003, constituição VII, FR-016).
- [x] T011 [P] [US1] Escrever E2E inicialmente falhando em `e2e-supabase/equipes.spec.ts` para enviar convite em até 3 interações e os dois alunos verem a equipe após aceite; antes de aceitar, o convidado vê '1' no item 'Minha equipe' do menu (SC-001/004, FR-016).

### Implementação

- [x] T012 [US1] Implementar regras puras em `src/modules/duplas/domain/equipes.ts` para tornar T008 GREEN, sem React/Supabase e sem inventar limite de convites (FR-001/002).
- [x] T013 [US1] Implementar `enviar_convite_equipe`, `responder_convite_equipe`, `cancelar_convite_equipe`, `colegas_da_turma`, `meus_convites_equipe` e cancelamento interno em `supabase/migrations/20261030140000_equipes_por_convite.sql`; bloquear turma antes de convite/equipe, revalidar após bloqueio, formar atomicamente, repetir aceite confirmado sem duplicar equipe e retornar erro claro para estado encerrado; habilitar dupla primeiro e deixar envio de trio indisponível até US2; criar `app.exigir_edicao_aberta(p_edicao)` e chamá-lo após o bloqueio da turma em toda RPC de escrita (FR-001–005, FR-017).
- [x] T014 [US1] Remover RPC `formar_dupla` em `supabase/migrations/20261030140000_equipes_por_convite.sql`, adaptar `supabase/tests/002_organizacao.test.sql` e `supabase/tests/003_regras_organizacao.test.sql` para fixtures por convite e provar que a API antiga não permite formação pela coordenação (FR-007).
- [x] T015 [P] [US1] Implementar leitura de convites e colegas pelas RPCs `meus_convites_equipe`/`colegas_da_turma` (sem `select` em `perfis`) e escrita de convites em `src/modules/duplas/data/repositorioSupabase.ts`, tipando respostas e propagando erros em português conforme `specs/003-equipes-por-convite/contracts/rpc.md` (FR-002/005).
- [x] T016 [P] [US1] Adaptar repositórios fictícios e testar bloqueio de escrita em `src/modules/demo/repositorios.ts` e `src/modules/demo/repositorios.test.ts`, mantendo convites/colegas apenas para demonstração identificada (FR-005, constituição VI/VII).
- [x] T017 [US1] Implementar `src/modules/duplas/ui/ConvitesEquipe.tsx` para tornar T010 GREEN; rótulos, foco e estados por texto, envio único em andamento e nenhuma confirmação otimista (FR-002/003).
- [x] T018 [US1] Integrar `useColegas`/`useConvites` em `src/app/dados/consultas.ts`, página em `src/app/paginas/organizacao.tsx` e rótulos em `src/app/navegacao.ts`; invalidar equipe/convites/colegas/histórico após confirmação, retirar formulário de formação da coordenação e tornar T011 GREEN; contador de convites recebidos pendentes no item 'Minha equipe' do menu (`src/app/navegacao.ts`/`src/app/layout/AppShell.tsx`, preservando as alterações locais em andamento nesse arquivo) e card no painel do aluno (`src/app/paginas/aluno.tsx`); modo leitura com aviso 'Edição encerrada: somente consulta' quando `edicao.estado = 'encerrada'` (FR-003/005/007, SC-001/004, FR-016/017).

Marco MVP: US1 ponta a ponta; trio não é anunciado como disponível até a US2.

## Fase 4: US2 — Trio por convite em turma ímpar (P1)

Objetivo: dois convidados aceitam antes da formação; permitir retirada de aceite parcial.
Teste independente: turma ímpar sem trio, convite a dois colegas; primeiro aceite não forma equipe, segundo forma trio e cancela os demais convites de trio; retirada anterior à formação cancela somente aquele convite.

- [x] T019 [P] [US2] Escrever e executar RED em `supabase/tests/005_equipes_por_convite.test.sql`: turma par, segundo trio, aceite parcial, recusa encerrando convite inteiro como `recusado` (não `cancelado`), retirada por quem aceitou, retirada por estranho ou após formação, preservação de outros convites e cancelamento se envolvido entra em outra equipe; retirada de aceite com edição encerrada ⇒ recusa (FR-001/003/014, FR-017).
- [x] T020 [P] [US2] Acrescentar e executar RED em `src/modules/duplas/domain/equipes.test.ts` e `src/modules/duplas/ui/ConvitesEquipe.test.tsx` para paridade, limite de dois convidados distintos, exibição de trio e ação "Retirar aceite" apenas durante aceite parcial (FR-001/014).
- [x] T021 [US2] Implementar paridade/trio único nas RPCs e `retirar_aceite_convite_equipe` em `supabase/migrations/20261030140000_equipes_por_convite.sql`; cancelar convite inteiro com `motivo = aceite_retirado`, preservando respostas/horários e demais convites; usar bloqueio turma primeiro em todas as transições e revalidar elegibilidade no envio/aceite; `retirar_aceite_convite_equipe` chama `app.exigir_edicao_aberta` (FR-001/003/014, FR-017).
- [x] T022 [US2] Implementar regras de trio em `src/modules/duplas/domain/equipes.ts`, método de retirada em `src/modules/duplas/data/repositorioSupabase.ts` e estado parcial em `src/modules/duplas/ui/ConvitesEquipe.tsx`; atualizar leitura demo em `src/modules/demo/repositorios.ts` e integração em `src/app/paginas/organizacao.tsx` (FR-001/014).
- [x] T023 [US2] Acrescentar e executar E2E em `e2e-supabase/equipes.spec.ts` para trio com fixture ímpar isolada, aceite parcial e retirada, revalidando dupla da US1 (FR-003/014, SC-004).

## Fase 5: US4 — Gestão forma e altera equipes (P1)

Objetivo: docente/mentor forma equipe com alunos sem equipe; gestão ajusta equipes com justificativa e avisos. Renomeação é entregue na US3.
Teste independente: docente forma dupla de alunos livres e a altera com histórico; coordenação altera mas não forma; outra turma é recusada; desativação preserva integrante e avisa; trio que passa a turma par permanece.

- [x] T024 [P] [US4] Escrever e executar RED em `supabase/tests/005_equipes_por_convite.test.sql` para formação docente/mentor, coordenação sem formação, autorizações por turma, justificativa ≥ 10 caracteres, inclusão só até trio permitido, remoção só de trio, substituto ativo da mesma turma sem equipe, desfazer com histórico e cancelamento de convites; formação docente, inclusão, remoção, substituição e desfazer com edição encerrada ⇒ recusa (FR-006/007/010/012/015, FR-017).
- [x] T025 [P] [US4] Escrever e executar RED em `src/modules/duplas/ui/AcoesDupla.test.tsx` e `src/modules/duplas/ui/FormEquipeDocente.test.tsx` para matriz de ações, justificativa, sem remoção de dupla, avisos de gestão e sucesso após servidor (FR-006/010–013/015).
- [x] T026 [US4] Implementar helpers de gestão e RPCs `formar_equipe_docente`, `incluir_integrante`, `remover_integrante`, `substituir_integrante` e `desfazer_dupla` em `supabase/migrations/20261030140000_equipes_por_convite.sql`; turma antes de equipe/integrantes, dados/histórico atômicos, sem nome inicial pela gestão; formar/incluir trio cancela demais convites de trio. Em seguida, acrescentar `formarPorDocente({ turmaId, estudantes, justificativa })` em `src/modules/duplas/domain/tipos.ts` e `src/modules/duplas/data/repositorioSupabase.ts` (recusa no repositório demo); todas as RPCs de gestão chamam `app.exigir_edicao_aberta` (FR-006/007/010/012/015, FR-017).
- [x] T027 [US4] Acrescentar RED em `supabase/tests/005_equipes_por_convite.test.sql` para desativação/reativação e cadastro alterando paridade: preservar participações sem `saida_em`, cancelar pendentes, aviso de integrante inativo/trio em turma par, nomes visíveis só à gestão; cadastro/ativação de alunos sem alteração de comportamento (regressão de `004_convites_acesso`) (FR-011/013).
- [x] T028 [US4] Implementar cancelamento de convites por desativação e RPC `equipes_da_turma_gestao(p_turma uuid)` em `supabase/migrations/20261030140000_equipes_por_convite.sql`, conforme formato e permissões em `specs/003-equipes-por-convite/contracts/rpc.md`; ampliar o RED de T027 com todos os casos do contrato antes de implementar a projeção, preservando equipe e nome de inativos apenas para gestão (FR-005/011/013).
- [x] T029 [US4] Escrever e executar RED de mapeamento/erros em `src/modules/duplas/data/repositorioSupabase.test.ts`, depois implementar `equipesGestao(turmaId): Promise<EquipeGestao[]>` em `src/modules/duplas/domain/tipos.ts` e `src/modules/duplas/data/repositorioSupabase.ts`; mapear `turma_id`/`trio_em_turma_par` para camelCase, adaptar `src/modules/demo/repositorios.ts`, exportar tipos em `src/modules/duplas/index.ts` e invalidar consulta após alterar equipe/vínculo (FR-005/006/011/013).
- [x] T030 [US4] Implementar `src/modules/duplas/ui/AcoesDupla.tsx` e `src/modules/duplas/ui/FormEquipeDocente.tsx`, integrar em `src/app/paginas/organizacao.tsx` e `src/app/dados/consultas.ts`; remover `src/modules/duplas/ui/FormDupla.tsx` e adaptar seu teste/exportação em `src/modules/duplas/index.ts`, sem regredir ações permitidas (FR-006/007/010–013/015).
- [x] T031 [US4] Adaptar e executar `e2e-supabase/organizacao.spec.ts` e `e2e-supabase/contas.spec.ts`; cobrir formação docente, coordenação sem formação, alteração auditada, avisos; rodar `e2e-supabase/contas.spec.ts` sem alterações como regressão; confirmar T024/T025/T027 GREEN (FR-006/007/010–013/015).

## Fase 6: US3 — Equipe escolhe o nome (P2)

Objetivo: integrantes escolhem uma vez; depois só docente/mentor da turma renomeia.
Teste independente: equipe sem nome mostra primeiros nomes; integrante atual ativo define; alunos e coordenação não renomeiam; docente/mentor da turma renomeia com justificativa; gestão não escolhe primeiro nome.

- [x] T032 [P] [US3] Escrever e executar RED em `supabase/tests/005_equipes_por_convite.test.sql` para primeiro nome só por integrante atual ativo, ex-integrante/inativo recusado, gestão recusada na escolha inicial, renomeação só docente/mentor da turma, justificativa ≥ 10, "2–80 caracteres" e unicidade sem diferenciar caixa entre equipes ativas da turma; definir e renomear nome com edição encerrada ⇒ recusa (FR-008, FR-017).
- [x] T033 [P] [US3] Escrever e executar RED em `src/modules/duplas/ui/NomeEquipe.test.tsx` e ampliar `src/modules/duplas/ui/AcoesDupla.test.tsx` para escolha única, ausência de renomeação para coordenação/aluno e mensagens de conflito de nome (FR-008).
- [x] T034 [US3] Implementar `definir_nome_equipe` e `renomear_equipe` em `supabase/migrations/20261030140000_equipes_por_convite.sql`: verificar `saida_em is null` e atribuição ativa, não confiar no helper histórico; manter `nome_definido_em` preenchido e impedir apagar nome para reabrir escolha; `definir_nome_equipe` e `renomear_equipe` chamam `app.exigir_edicao_aberta` (FR-008, FR-017).
- [x] T035 [US3] Implementar `definirNome`/`renomear` em `src/modules/duplas/data/repositorioSupabase.ts`, `src/modules/duplas/ui/NomeEquipe.tsx`, permissão específica em `src/modules/duplas/ui/AcoesDupla.tsx` e integração em `src/app/paginas/organizacao.tsx`; atualizar demo em `src/modules/demo/repositorios.ts` (FR-008).
- [x] T036 [US3] Acrescentar e executar fluxo de nomeação/renomeação em `e2e-supabase/equipes.spec.ts`, preservando nomes legados e nome provisório de duplas/trios, e confirmar T032/T033 GREEN (FR-008).

## Fase 7: Validação transversal e documentação

- [x] T037 Implementar e executar teste de duas conexões reais em `scripts/testar-concorrencia-equipes.mjs`, restrito a banco local e fixtures fictícias: aceites concorrentes, retirada versus último aceite, duas formações de trio e inclusão versus aceite; verificar respostas e estado final sem duplicidade, corrupção ou deadlock e registrar comando/evidências em `specs/003-equipes-por-convite/quickstart.md` (FR-003/004/013/014, SC-002).
- [x] T038 Validar e corrigir navegação por teclado, foco, rótulos, contraste ≥ 4,5:1, celular/tablet/desktop e ausência de cache autenticado em `e2e/jornadas.spec.ts` e `src/modules/duplas/ui/ConvitesEquipe.tsx`; confirmar offline/demo sem escrita nem sucesso fictício (constituição VI–VIII).
- [x] T039 Atualizar `docs/arquitetura.md`, `docs/requisitos-e-referencias.md`, `docs/decisoes-e-pendencias.md` e `src/modules/duplas/README.md` com FR-001–015; registrar pendências institucionais sem inventar regras e remover referências obsoletas à formação pela coordenação.
- [x] T040 Executar `npm run verify`, `npm run test:e2e`, `npm run test:db`, `npm run test:e2e:supabase` e T037 conforme `specs/003-equipes-por-convite/quickstart.md`; registrar resultados ou bloqueios reais, conferir 100% das autorizações com pgTAP e atualizar status em `specs/003-equipes-por-convite/spec.md` somente após evidência (SC-001–004).

## Dependências e ordem de execução

Preparação T001–T002 → fundação T003–T007 → US1 T008–T018 → US2 T019–T023 → US4 T024–T031 → US3 T032–T036 → validação T037–T040.

US2 reutiliza as RPCs/consultas da US1 e começa após o marco MVP. US4 pode iniciar após US1, mas sua entrega completa de trio requer US2. US3 pode usar fixtures de equipe após US1, porém integra ações de renomeação da US4. A ordem acima evita edição simultânea de migration, repositórios e páginas compartilhados. T037 depende de US1/US2/US4; T038–T040 dependem das quatro histórias.

Dentro de cada fase: grupo RED → implementação → GREEN e integração. Na US1, T015/T016 começam após T013/T014; T017 depende de T010 e contratos, T018 reúne todas as entregas. Na US4, T027 deve falhar antes de T028; T031 valida também regressão das contas. Não marcar testes como concluídos antes da execução.

## Exemplos de paralelismo

| História | Tarefas que podem começar juntas após a fundação/dependências                       |
| -------- | ----------------------------------------------------------------------------------- |
| US1      | T008 (domínio), T009 (pgTAP), T010 (componente), T011 (E2E); após RPCs, T015 e T016 |
| US2      | T019 (pgTAP) e T020 (domínio/componente)                                            |
| US4      | T024 (pgTAP) e T025 (componentes)                                                   |
| US3      | T032 (pgTAP) e T033 (componentes)                                                   |

Executar tarefas no mesmo arquivo sequencialmente, mesmo se pertencerem a histórias distintas. Exemplos são oportunidades de divisão do trabalho, não autorização de delegação automática.

## Cobertura e estratégia de entrega

| Requisitos             | Tarefas principais                           |
| ---------------------- | -------------------------------------------- |
| FR-001–005             | T003–T018, T019–T023, T037                   |
| FR-006/007/010/012/015 | T024–T031                                    |
| FR-008                 | T004, T032–T036                              |
| FR-009                 | T003/T006, testes pgTAP de cada história     |
| FR-011/013             | T027–T031, T037                              |
| FR-014                 | T019–T023, T037                              |
| FR-016                 | T010/T011/T018                               |
| FR-017                 | T009/T013/T018/T019/T021/T024/T026/T032/T034 |
| SC-001/004             | T011/T018/T023/T036                          |
| SC-002/003             | T003/T009/T019/T024/T027/T032/T037/T040      |

MVP: fases 1–3, dupla por convite ponta a ponta validada localmente. Não representa conclusão da spec inteira. Entregar depois trio, gestão e nomeação, cada história com teste independente acima e regressão das anteriores. Nenhum deploy ou alteração de banco remoto faz parte destas tarefas.
