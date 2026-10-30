# Quickstart: Painel da turma

## Pré-requisitos

- Node e dependências (`npm ci`); Docker com Supabase local nas portas 5442x (`npx supabase start`).
- Nunca apontar para banco remoto.

## Validação

1. `npm run verify` — typecheck, lint, testes unitários/componentes e build.
2. `npm run test:db` — pgTAP (`supabase/tests/006_painel_da_turma.test.sql`).
3. `npm run test:e2e` — jornadas da demonstração (desktop e Pixel 7).
4. `npx supabase db reset` e E2E real (`e2e-supabase/painel-turma.spec.ts`).

## Roteiro manual (Supabase local)

1. Entrar como docente da turma "3º ano A" → "Minhas turmas" → "Abrir painel da turma": ver indicadores, equipes, alunos sem equipe e encontros.
2. Trocar a URL para o id de uma turma não vinculada: ver "Você não tem acesso a esta turma.".
3. Entrar como aluno → "Minha turma": ver equipes e colegas sem equipe, sem convites pendentes nem dados de contato.
4. Entrar como coordenação → "Organização → Turmas" → "Painel": ver o painel de qualquer turma e o link "Alterar equipes".

## Demonstração

- Entrar como "Profa. Lúcia Exemplo" → "Minhas turmas" → "Abrir painel da turma". O bloco de
  pontuação deve mostrar a tabela com o selo "Dados fictícios".
- Contra o Supabase local, o mesmo bloco mostra só o aviso, sem números.

## Resultados

- 2026-10-30, antes da spec: pgTAP 001–005 verde (268 asserções); Supabase local ativo.
- Primeira rodada (US1/US2): pgTAP 297; unitários 439; E2E demo 37 (servidor aquecido na
  porta 4173); E2E real 33 após `supabase db reset`.
- Portões finais (T018), após a opção B e a paginação: `npm run verify` verde (typecheck, lint,
  447 testes unitários/componentes, build); pgTAP 299; E2E demo 37 passaram (1 ignorado: só
  celular), com o servidor aquecido na porta 4173; E2E real 33 após `supabase db reset`.
