# Quickstart: validar unidades, master e gestão

Pré-requisitos: `npm ci`; Docker e Supabase local (portas 5442x); Edge Functions locais
(`supabase functions serve`, como no README); Mailpit local para os convites.

## Banco

```powershell
npx supabase db reset --local   # só o banco local descartável
npm run test:db
```

Esperado (`017_unidades.test.sql` e suítes antigas):

- Migração: unidade inicial com todas as edições, cursos e perfis; funções criadas das
  atribuições; nenhuma gestão nem master criados.
- Isolamento (duas unidades): coordenação, docente, mentor, estudante e analista da Unidade A
  não leem nem alteram nada da Unidade B (edições, turmas, equipes, notas, comunicados, cadastro,
  painéis, relatórios, busca de pessoas); atribuição cruzando unidades recusada.
- Master: lê e gere unidades, gestão e masters; recusado em RPCs de edição; não desativa a si
  nem o último master; `app.promover_master` não executável por `authenticated`.
- Gestão: equipe e funções da própria unidade; cria edição com coordenação; troca coordenação;
  recusa da última coordenação; sem acesso a dados de estudantes.
- Unidade desativada: todas as contas dela recusadas.
- Premissas: só master responde; analista e estudante não leem.
- Todas as suítes anteriores verdes.

## Front e ponta a ponta

```powershell
npm run verify
npm run test:e2e
$env:E2E_SUPABASE_URL = 'http://127.0.0.1:54421'
$env:E2E_SUPABASE_ANON_KEY = '<ANON_KEY do supabase status>'
npm run test:e2e:supabase
```

Esperado:

- Demonstração: master, gestão e analista entram, veem suas áreas; axe sem violações nas telas
  novas; escritas recusadas.
- Supabase: master cadastra a "Unidade C" com gestão (convite no Mailpit); a gestão cadastra uma
  coordenação e cria uma edição com ela; a coordenação entra e vê só a Unidade C; master responde
  uma premissa e a coordenação a lê sem formulário; analista vê painel e relatório da sua unidade.

## Manual

- Primeiro master em produção: `select app.promover_master('<email>')` pela administração do
  banco (documentado em `docs/operacao-e-homologacao.md`).

## Resultado da validação (2026-11-06)

| Portão                              | Resultado                                                               |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `npx supabase db reset --local`     | migrations e seed aplicados (uma única unidade no seed)                 |
| `npm run test:db`                   | 17 arquivos, 1.918 testes aprovados (`017_unidades`: 418)               |
| `npm run verify`                    | 139 arquivos, 988 testes de unidade; typecheck, lint e build sem erros  |
| `npm run test:e2e` (demonstração)   | 181 aprovados, 1 ignorado (desktop e celular, axe nas telas novas)      |
| `npm run test:e2e:supabase` (local) | 75 aprovados (inclui `unidades.spec.ts` e `premissas.spec.ts` ajustado) |
