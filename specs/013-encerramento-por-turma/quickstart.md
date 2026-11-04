# Quickstart: validar o encerramento da edição por turma

## Pré-requisitos

- Supabase local nas portas 5442x: `npx supabase start` e `npx supabase db reset`.
- Conta fictícia `coordenacao@` (senha `senha-local-123`).
- Contratos: [rpc.md](./contracts/rpc.md) e [telas.md](./contracts/telas.md); formatos em
  [data-model.md](./data-model.md).

## Jornadas

1. **Pendências por turma (FR-001, FR-002):** publicar o 3º ano A como provisório e deixar o 3º
   ano B sem publicação; em `/coordenacao/edicoes`, pedir para encerrar. Esperado: "3º ano A
   (Categoria A (exemplo)): Provisório" e "3º ano B (Categoria B (exemplo)): Sem publicação";
   turmas sem equipes não aparecem.
2. **Definitiva some da lista:** com uma turma definitiva, ela não aparece; uma parcial depois da
   definitiva volta a aparecer como "Parcial".
3. **Encerrar com pendências (FR-004, FR-005):** confirmar com justificativa. Esperado: edição
   encerrada e, na tela dela, "Pendências registradas no encerramento" com as mesmas turmas.
4. **Registro antigo (FR-006):** uma edição encerrada com o formato anterior mostra "Categorias
   sem ranking publicado" como foi gravado.

## Portões

```bash
npm run verify
npm run test:db
npm run test:e2e
npm run test:e2e:supabase   # com E2E_SUPABASE_URL e E2E_SUPABASE_ANON_KEY locais
```

Esperado: tudo verde, com `supabase/tests/014_encerramento_turma.test.sql` e o `011_edicoes`
migrado.

## Resultados

**Estado inicial (T001, 2026-11-04, `main` em `ca612ee`):**

- `npm run test:db`: 1395 asserções, 13 arquivos, PASS (após `npx supabase db reset`).
- `npm run verify`: 784 testes; `npm run test:e2e`: 79 passaram, 1 pulado (mesmo código do merge
  da spec 012).

**Asserções reescritas (T005):** no `011_edicoes`, as contagens passam a excluir a chave
`turmasSemDefinitiva`; "categoria sem ranking publicado aparece nas pendências" virou "turmas sem
equipes não entram nas pendências de ranking" (as turmas da edição E desse teste não têm equipes,
e a regra nova só conta turmas com equipes; a lista com turmas está coberta pelo `014`); o
registro do encerramento passa a ter `turmasSemDefinitiva`.

**Portões finais (T011, 2026-11-04):**

- `npm run verify`: 110 arquivos, 790 testes, PASS.
- `npm run test:db`: 1410 asserções, 14 arquivos, PASS (após `npx supabase db reset`, que aplicou
  a migration a partir do zero).
- `npm run test:e2e`: 81 passaram, 1 pulado.
- `npm run test:e2e:supabase`: 66 passaram (após `npx supabase db reset`).
- `npx supabase db reset` ao fim.
- Os testes do repositório (T007) passaram já na primeira execução: o repositório só repassa a
  resposta da RPC, então eles verificam o contrato, sem código novo.
