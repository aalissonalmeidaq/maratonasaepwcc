# Tasks: Encerramento da edição por turma

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contratos RPC](contracts/rpc.md), [telas](contracts/telas.md) e [quickstart.md](quickstart.md).
**Branch**: `013-encerramento-por-turma` | **Criação**: 2026-11-04.
**Testes**: obrigatórios pela Constituição II e pela spec (SC-001 a SC-004). Escreva e rode o teste antes do código e confirme que ele falha porque o comportamento ainda não existe (RED); só então implemente (GREEN).

**Formato**: `- [ ] TNNN [P] [USn] descrição com caminho`.

**Convenções**:

- Uma só migration: `supabase/migrations/20261107120000_encerramento_por_turma.sql`.
- pgTAP novo em `supabase/tests/014_encerramento_turma.test.sql`.
  - Fixtures: edição E (ativa) com curso K ("Categoria K": turmas KA, KB, KC) e curso L ("Categoria L": turma LA); KA, KB e KC com equipes ativas; LA sem equipes; KA com a definitiva, KB com provisória, KC sem publicação; turma KD com a definitiva e depois uma parcial; uma publicação por categoria anterior (sem turma) da "Categoria K"; coordenação `c`; docente `d`; edição G encerrada com o registro no formato anterior (`categoriasSemRanking`) e edição H encerrada sem registro.
  - Publicações das fixtures inseridas com `set local session_replication_role = replica`, como no `013_ranking_turma`.
- Toda tela passa no axe (`src/test/a11y.ts`), funciona a partir de 360 px e é operável por teclado.

## Fase 1: Preparação

- [x] T001 Registrar o estado inicial em `specs/013-encerramento-por-turma/quickstart.md` (seção "Resultados"): `npm run test:db` (após `npx supabase db reset`), `npm run verify` e `npm run test:e2e`.
- [x] T002 [P] Tipos em `src/modules/organizacao/domain/edicoes.ts` conforme o [data-model.md](data-model.md): `TurmaSemDefinitiva` (`estado: 'sem_publicacao' | 'parcial' | 'provisorio'`), `PendenciasDaEdicao` com `turmasSemDefinitiva` no lugar de `categoriasSemRanking`, `RegistroDoEncerramento` (com `turmasSemDefinitiva?` e `categoriasSemRanking?`) e `EdicaoGerida.pendenciasNoEncerramento?: RegistroDoEncerramento | null`; exportar por `src/modules/organizacao/index.ts` e corrigir os usos pelo `tsc`.

## Fase 2: US1, coordenação vê as turmas sem ranking definitivo antes de encerrar (P1) 🎯 MVP

**Teste independente**: com uma turma definitiva, uma provisória e uma sem publicação, pedir para encerrar e ver só as duas últimas com o estado; encerrar e ver o registro na tela da edição encerrada.

- [x] T003 [US1] RED: criar `supabase/tests/014_encerramento_turma.test.sql` com as fixtures: `pendencias_da_edicao(E)` por `c` traz `turmasSemDefinitiva` = KB (`provisorio`), KC (`sem_publicacao`) e KD (`parcial`), nessa ordem (categoria e nome), cada uma com `turmaId`, `turma` e `categoria`; KA (definitiva) e LA (sem equipes) não entram; KC continua `sem_publicacao` apesar da publicação por categoria anterior da "Categoria K" (ela não conta para a turma); uma equipe nova criada em KA depois da definitiva não tira KA da lista de turmas com a definitiva (vale a última publicação da turma); a chave `categoriasSemRanking` não existe; `ocorrenciasSemDecisao` e `revisoesAbertas` como na spec 010; por `d`: `42501` em `pendencias_da_edicao` e em `encerrar_edicao`; `encerrar_edicao(E, justificativa)` encerra mesmo com pendências e grava em `pendencias_no_encerramento` a mesma lista de turmas; reenvio devolve o registro gravado sem mudar; `edicoes_que_coordeno()` por `c` traz `pendenciasNoEncerramento` de E (formato novo), de G (com `categoriasSemRanking`, como foi gravado) e `null` para H; o registro de G continua igual depois do encerramento de E.
- [x] T004 [US1] GREEN: migration `supabase/migrations/20261107120000_encerramento_por_turma.sql`: recriar `app.pendencias_json(p_id)` ([research.md](research.md) R1, usando `app.equipes_da_turma` e `app.ultima_publicacao_da_turma`) e `public.edicoes_que_coordeno()` com `pendenciasNoEncerramento` (R3). Rodar até T003 passar.
- [x] T005 [US1] Migrar `supabase/tests/011_edicoes.test.sql`: as asserções de `categoriasSemRanking` (pendências e registro do encerramento) passam a verificar `turmasSemDefinitiva`, mantendo cada asserção; registrar a reescrita em `quickstart.md`.
- [x] T006 [P] [US1] RED+GREEN: `src/modules/organizacao/ui/EstadoDaEdicao.tsx` (+ `EstadoDaEdicao.test.tsx` com axe) conforme o [contrato de telas](contracts/telas.md): antes de encerrar, "Turmas sem ranking definitivo" com uma linha por turma ("3º ano A (Categoria A): Provisório" / "Parcial" / "Sem publicação") ou "Todas as turmas têm o ranking definitivo"; na edição encerrada, "Pendências registradas no encerramento" no formato gravado (turmas, ou "Categorias sem ranking publicado: …" no formato anterior) ou "Pendências do encerramento não registradas".
- [x] T007 [P] [US1] Repositório e demonstração: `src/modules/organizacao/data/repositorioSupabase.ts` lê `pendenciasNoEncerramento` de `edicoes_que_coordeno` (+ teste com cliente simulado); `src/modules/demo/edicoes.ts` (+ `edicoes.test.ts`) com `turmasSemDefinitiva` calculada pelas versões fictícias por turma (3º ano A definitiva; 3º ano B sem publicação) e uma edição encerrada fictícia com `pendenciasNoEncerramento` no formato novo (3º ano B "Sem publicação"), para a tela da edição encerrada aparecer na demonstração.
- [x] T008 [US1] Página `src/app/paginas/edicoes.tsx`: passa `pendenciasNoEncerramento` da edição para `EstadoDaEdicao` (sem outra mudança de fluxo).

## Fase 3: Acabamento

- [x] T009 [P] E2E de demonstração em `e2e/jornadas.spec.ts` (gestão de edições): na demonstração o botão "Encerrar edição" fica desabilitado, então o teste abre a edição encerrada fictícia e confere "Pendências registradas no encerramento" com "3º ano B (fictícia) (Categoria B (exemplo)): Sem publicação" e sem o 3º ano A.
- [x] T009a [P] Migrar o E2E real `e2e-supabase/edicoes.spec.ts` (passo 6, "Ativar e encerrar com pendências"): a turma E2E tem alunos e nenhuma equipe, então o diálogo passa a mostrar "Todas as turmas têm o ranking definitivo" no lugar de "Categorias sem ranking publicado: Categoria E2E"; depois de encerrar, conferir o bloco "Pendências registradas no encerramento" na edição encerrada.
- [x] T010 [P] Documentação: `docs/decisoes-e-pendencias.md` (§6.10: pendência resolvida; seção nova 6.11 da spec 013 com as decisões e desvios).
- [x] T011 Portões finais e registro em `quickstart.md`: `npm run verify`, `npm run test:db`, `npm run test:e2e`, `npm run test:e2e:supabase`; `npx supabase db reset` ao fim; desvios registrados.

## Dependências

- Fase 1 → Fase 2 → Fase 3. T004 depois de T003; T005 depois de T004; T008 depois de T006 e T007.

## Paralelismo

- T002 em paralelo com T001.
- T006 e T007 em paralelo entre si e com T004 depois de T002.
- T009, T009a e T010 em paralelo; T011 por último.

## Estratégia

1. **MVP:** Fases 1 e 2 (a lista por turma no servidor e na tela, com o registro da edição encerrada).
2. Acabamento e portões.
