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

## Resultado da validação

_(preenchido na implementação)_
