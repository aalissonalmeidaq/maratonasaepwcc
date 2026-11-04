# Quickstart: validar o ranking por turma

## Pré-requisitos

- Supabase local nas portas 5442x: `npx supabase start` e `npx supabase db reset`.
- Contas fictícias do seed (senha `senha-local-123`): `coordenacao@`, `mentor@` (curso A),
  `docente@` e `aluna@` (3º ano A), `iris@` (3º ano B).
- Contratos: [rpc.md](./contracts/rpc.md) e [telas.md](./contracts/telas.md); dados em
  [data-model.md](./data-model.md).

## Jornadas

1. **Publicação por turma (US1):** em `/coordenacao/ranking`, conferir a lista de turmas com
   "Não publicado"; marcar o 3º ano A e publicar como parcial. Esperado: versão 1 só com equipes
   do 3º ano A; aviso para `aluna@` e `docente@`, nenhum para `iris@`.
2. **Lote com recusa parcial (US1, FR-007a):** marcar 3º ano A e 3º ano B, escolher definitivo,
   justificar e publicar com pendência só no 3º ano A. Esperado: 3º ano B publicado; 3º ano A
   recusado com a lista das pendências; resultado mostra as duas situações.
3. **Concorrência (FR-006):** abrir o ranking em duas abas como coordenação e publicar o 3º ano A
   nas duas. Esperado: uma versão e uma recusa com "recarregue".
4. **Aluno (US2):** `aluna@` em `/aluno/ranking` vê só o 3º ano A, com o estado e o detalhe da
   própria equipe; o painel inicial mostra a mesma posição; `iris@` não vê o 3º ano A. Com
   publicação provisória do 3º ano A, `aluna@` pede revisão dentro do prazo.
5. **Painéis (US3):** `docente@` vê o ranking do 3º ano A no painel da turma e em "Pontos da
   turma"; no início da coordenação, pendências e estado por turma batem com a tela de ranking; o
   relatório de pontos traz "Posição na turma".
6. **Histórico anterior (US4):** com uma publicação por categoria existente (fixture), a
   coordenação a vê em "Publicações por categoria (anteriores)"; `aluna@` não a vê; uma nova
   publicação por categoria é recusada; um pedido de revisão aberto sobre ela é respondido.
7. **Premiação (FR-018):** antes da definitiva, `/coordenacao/premiacao` mostra o 3º ano A "A
   definir" (ou "Provisório — não final" com provisória, visível também a `docente@`, não a
   `aluna@`). Depois da definitiva, premiados finais; com empate em posição premiada, "Empate a
   decidir" até a coordenação registrar a decisão com justificativa.

## Portões

```bash
npm run verify
npm run test:db
npm run test:e2e
npm run test:e2e:supabase   # com E2E_SUPABASE_URL e E2E_SUPABASE_ANON_KEY locais
node scripts/testar-concorrencia-publicacao.mjs
node scripts/testar-paridade-calculo.mjs
```

Esperado: tudo verde, com `supabase/tests/013_ranking_turma.test.sql` e os testes `008` e `009`
migrados para a publicação por turma; concorrência: duas publicações da mesma turma sobre a mesma
versão geram uma versão e uma recusa; paridade sem divergências (o cálculo não muda).

## Resultados

**Estado inicial (T001, 2026-11-03, `main` em `062697f`):**

- `npm run test:db`: 1242 asserções, 12 arquivos, PASS — depois de `npx supabase db reset`; sem o
  reset, `010_comunicados` falhou no teste 15 por dados deixados pelo E2E real.
- `npm run verify`: 753 testes, PASS (mesmo código do merge da spec 011).
- `npm run test:e2e`: 73 passaram, 1 pulado.
- `node scripts/testar-paridade-calculo.mjs`: 0 divergências.

**Portões finais (T034, 2026-11-04):**

- `npm run test:db`: 1395 asserções, 13 arquivos, PASS (após `npx supabase db reset`, que também
  conferiu a migration inteira a partir do zero).
- `npm run verify`: 110 arquivos, 784 testes, PASS. Uma rodada em paralelo com o E2E real deu
  "Failed to start forks worker" (falta de recursos, sem teste vermelho); sozinho, passou.
- `npm run test:e2e`: 79 passaram, 1 pulado.
- `npm run test:e2e:supabase`: 66 passaram (após `npx supabase db reset`).
- Scripts de concorrência (comunicados, edições, equipes, publicação, questões, regras):
  todos aprovados; publicação: uma versão e uma recusa com "recarregue".
- `node scripts/testar-paridade-calculo.mjs`: 0 divergências.
- `npx supabase db reset` ao fim.

**Asserções reescritas (T009, T019):**

- `008`: publicação por turma TA no lugar da "Cat 1" (TA + TB); as posições congeladas passam a
  ter só A1 e A2; leitura por `ranking_da_turma` (aluno de outra turma e docente sem a turma:
  `42501`); avisos para a turma, não para a TB; detalhe da coordenação com 2 equipes em vez de 3;
  turma de outra edição no lugar de "categoria inexistente".
- `009`: painel da coordenação por turma (TA, TB, TC); prova pendente por turma (TA 3, TB 2,
  TC 4 em vez de Cat 1 5 e Cat 2 4); coluna nova `posicaoNaTurma` no relatório de pontos; a data
  do encontro da prova passou a ser a de Brasília (o teste falhava depois das 21h).
- `e2e-supabase/ranking-turma.spec.ts`: no lote parcial, o 3º ano B devolve a versão 1 (reenvio
  idêntico da parcial dos painéis), como previsto em R3.
