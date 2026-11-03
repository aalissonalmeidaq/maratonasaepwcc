# Quickstart: validar a gestão de edições, turmas e vínculos

## Pré-requisitos

- Docker e Supabase local nas portas 5442x: `npx supabase start` e `npx supabase db reset`.
- Contas fictícias do seed (senha `senha-local-123`): `coordenacao@exemplo.invalid`,
  `docente@exemplo.invalid`, `aluna@exemplo.invalid` e `mentor@exemplo.invalid` (nova no seed,
  vinculada ao curso da edição fictícia).
- App: `npm run dev` (demonstração) ou com `.env.local` apontando para o Supabase local.

## Jornadas

1. **Migração:** depois do `db reset`, `/coordenacao/cadastro` mostra os cursos e turmas do seed no
   cadastro, cada turma com a edição fictícia; `mentor@` aparece vinculado ao curso e atua nas
   turmas dele.
2. **Criar (US1):** em `/coordenacao/edicoes`, "Nova edição", "Maratona 2027 (fictícia)", base
   "Regras do piloto". Esperado: edição em preparação, a criadora na coordenação, seletor no topo
   com as duas edições. Como aluna: a edição nova não aparece.
3. **Cadastro e vínculo (US2):** cadastrar o curso "Técnico em Informática (fictício)" com as
   turmas "A" e "B"; na organização da edição nova, vincular só a "A" (até 3 interações). Esperado:
   a "A" na edição; a "B" só no cadastro. Vincular também uma turma do seed: ela passa a participar
   das duas edições, sem alunos na nova.
4. **Gestão por turma (US3):** em "Gerir turma" da "A", cadastrar uma aluna, importar três alunos por
   CSV, vincular a aluna do seed (pela busca) e um docente. Tentar vincular de novo um aluno ativo em
   outra turma da edição: recusado.
5. **Mentor (US4):** vincular `mentor@` ao curso novo; conferir que a conta atua na "A"; vincular a
   "B" à edição e conferir que o mentor passa a atuar nela; desvincular do curso: deixa de atuar nas
   duas.
6. **Ativar e encerrar (US5):** ativar sem período (recusado, com o que falta); preencher e ativar.
   Encerrar com justificativa: o diálogo lista as pendências; depois, criar turma, lançar presença
   ou publicar comunicado nessa edição é recusado e a leitura continua.
7. **Coordenação (US6):** adicionar outra coordenação; tentar desativar a última ativa: recusado.
8. **Seletor (US7):** trocar a edição no seletor e conferir organização, comunicados e painel;
   recarregar e conferir que a escolha ficou. Conta com uma só edição: sem seletor.

## Portões

```bash
npm run verify
npm run test:db
npm run test:e2e
npm run test:e2e:supabase   # com E2E_SUPABASE_URL e E2E_SUPABASE_ANON_KEY locais
node scripts/testar-concorrencia-edicoes.mjs
node scripts/testar-paridade-calculo.mjs
```

Esperado:

- tudo verde, com o teste pgTAP novo `supabase/tests/011_edicoes.test.sql` e os testes existentes
  ajustados ao bloqueio de edição encerrada sem perder asserções;
- concorrência: duas criações com a mesma chave geram uma edição; dois vínculos simultâneos da
  mesma turma geram uma turma na edição; mentor vinculado ao curso enquanto uma turma é vinculada
  termina com a derivada criada;
- paridade sem divergências (as regras da edição não mudam nesta spec).

## Resultados

### Estado inicial (2026-11-03, antes da implementação)

| Portão                                     | Resultado                   |
| ------------------------------------------ | --------------------------- |
| `npm run test:db`                          | 10 arquivos, 929 asserções  |
| `npm run verify`                           | 83 arquivos, 655 testes, ok |
| `npm run test:e2e`                         | 61 passaram, 1 pulado       |
| `node scripts/testar-paridade-calculo.mjs` | 0 divergências              |

### Portões finais (2026-11-03)

| Portão                                      | Resultado                                               |
| ------------------------------------------- | ------------------------------------------------------- |
| `npm run verify`                            | 97 arquivos, 701 testes, lint sem avisos, build ok      |
| `npm run test:db`                           | 11 arquivos, 1096 asserções (165 em `011_edicoes`)      |
| `npm run test:e2e`                          | 67 passaram, 1 pulado                                   |
| `npm run test:e2e:supabase`                 | 61/61 (inclui `edicoes.spec.ts`)                        |
| Scripts de concorrência (5, inclui edições) | todos aprovados                                         |
| `node scripts/testar-paridade-calculo.mjs`  | 23 casos, 0 divergências (inclui `app.regras_piloto()`) |

`npx supabase db reset` ao final.

### Desvios e observações

- O E2E real encontrou um defeito: depois de ativar, a confirmação "Edição ativada." sumia porque o
  componente era recriado com o estado novo. Corrigido (chave só pela edição e mensagem fora do
  trecho de rascunho) e coberto por teste de componente.
- `criar_edicao` com a mesma chave em duas conexões simultâneas: a segunda esbarraria na unicidade;
  a inserção passou a ignorar o conflito e devolver a edição existente (script de concorrência).
- A justificativa do encerramento é exigida pela RPC, não por `check` na tabela: os testes das
  specs anteriores encerram edições por UPDATE direto.
- Bloqueio de edição encerrada: o pgTAP confere o gatilho nas 30 tabelas e a recusa real numa
  amostra (cursos, turmas, atribuições, encontros, comunicados); a coluna de cada tabela foi
  conferida na migration.
- Pendências no pgTAP: contagens de ocorrências e revisões conferidas em zero na fixture e a
  categoria sem ranking conferida; não há fixture com ocorrência aberta.
- Fixtures das specs 005–010: mentor passa pelo vínculo ao curso (inativo) com só a derivada da
  turma ativa, para manter as asserções por turma; fixtures em edição encerrada reabrem a edição
  durante a gravação; 002 e 003 usam as RPCs do cadastro. Nenhuma asserção foi removida.
- `ConfirmDialog` aceita conteúdo extra e a trava de foco passou a incluir campos (o diálogo de
  encerramento tem a justificativa).
- O seletor troca para a edição padrão da área quando a escolhida não tem papel naquela área.
- E2E reais de organização e do painel da turma ajustados ao cadastro e ao link "Gerir turma".
- Na primeira rodada completa do E2E real, o primeiro teste de `atividades` estourou o tempo com o
  servidor ainda frio; na repetição desde o reset, 61/61.
