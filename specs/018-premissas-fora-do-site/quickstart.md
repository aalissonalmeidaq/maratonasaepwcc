# Guia de validação: premissas fora do site

## Pré-requisitos

- Branch `018-premissas-fora-do-site`; Docker e Supabase CLI como no README.
- `npx supabase db reset --local` para recomeçar do zero.

## 1. Documento preservado

```bash
npm run test -- scripts/premissas-documento.test.ts   # se existir; senão, conferência manual
```

Esperado: `docs/premissas.md` com P01–P32, cada uma com código, tema, pergunta, premissa em uso,
onde afeta, referência e resolução (contagem 32 × 6).

## 2. Banco

```bash
npx supabase db reset --local && npm run test:db
```

Esperado: 16 arquivos pgTAP aprovados; o bloco novo prova que as tabelas, o tipo e as funções de
premissas não existem; a varredura de segurança continua verde.

## 3. Front

```bash
npm run verify
```

Esperado: typecheck, lint, testes e build sem referências ao módulo removido; testes de menu sem
item nem grupo "Sistema".

## 4. Jornadas

```bash
npm run test:e2e
# com Supabase local e funções servidas (ver README):
npm run test:e2e:supabase
```

Esperado: para master, gestão, coordenação e docente, as quatro rotas antigas mostram "não
encontrado" e o menu não tem o item; as RPCs antigas respondem função inexistente; axe sem
violações nas rotas restantes.

## 5. Busca de resíduos (SC-006)

```bash
git grep -n -i "premissas_em_validacao\|responder_premissa\|modules/premissas" -- src e2e e2e-supabase supabase/functions
```

Esperado: nenhuma linha.

## Resultado da validação (2026-11-06)

| Item                                             | Antes                      | Depois                                                                                                    |
| ------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run verify` (testes de unidade)             | 140 arquivos, 1.001 testes | 133 arquivos, 968 testes (módulo e testes de premissas removidos; teste do documento e do menu ajustados) |
| `npm run test:db`                                | 17 arquivos, 1.929 testes  | 16 arquivos, 1.861 testes (016 removido; 017 com o bloco de ausência)                                     |
| `npm run test:e2e` (demonstração)                | 181 aprovados, 1 ignorado  | 173 aprovados, 1 ignorado (quatro perfis × rota antiga "não encontrado")                                  |
| `npm run test:e2e:supabase`                      | 75 aprovados               | 74 aprovados (RPCs inexistentes e rota antiga)                                                            |
| `docs/premissas.md`                              | —                          | 32 premissas × 6 campos, guardado por `scripts/premissas-documento.test.ts`                               |
| Migration `20261114120000_remover_premissas.sql` | —                          | aplica do zero e é idempotente (reexecução sem erro)                                                      |
| Busca de resíduos (SC-006)                       | —                          | só restam o bloco de ausência do 017, migrations antigas, `specs/` e docs                                 |
