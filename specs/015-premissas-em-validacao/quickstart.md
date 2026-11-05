# Quickstart: validar Premissas em validação

Pré-requisitos: `npm ci`; Docker e Supabase local (portas 5442x); navegadores do Playwright.

## Banco

```powershell
npx supabase db reset --local   # só o banco local descartável
npm run test:db
```

Esperado (`016_premissas.test.sql`):

- Catálogo com P01–P32, temas do Apêndice A, nenhum resolvido.
- Coordenação (inclusive só de edição encerrada) lê e responde; docente e mentor leem com
  `podeResponder = false` e recebem `42501` ao responder; estudante e `anon` recebem `42501` na
  leitura.
- Justificativa curta ou longa → `23514`; premissa inexistente → `23514`; resposta-base
  desatualizada → `40001`; histórico em ordem e situação pela mais recente.
- `anon`/`authenticated` sem `select`, `insert`, `update`, `delete` nas duas tabelas; resposta
  não muda nem some; cada resposta gera linha na auditoria com a justificativa.
- Nenhuma função de `app`/`public` contém `America/Sao_Paulo`; testes 009 e 012 passam com
  `America/Fortaleza`.

## Front

```powershell
npm run verify
```

Esperado: domínio (validação, situação, filtros, linhas do CSV), repositório Supabase,
`PremissasPage` (leitura, formulário, recusa 40001, offline, docente sem formulário, axe),
cartão do início, demonstração com os 32 códigos, CSV com `America/Fortaleza`.

## Ponta a ponta

```powershell
npm run test:e2e
$env:E2E_SUPABASE_URL = 'http://127.0.0.1:54421'
$env:E2E_SUPABASE_ANON_KEY = '<ANON_KEY do supabase status>'
npm run test:e2e:supabase
```

Esperado: demonstração — coordenação e docente abrem a tela, filtram, baixam o CSV, axe sem
violações; Supabase — coordenação registra "Confirmada" e "Precisa mudar", docente vê sem
formulário, estudante sem menu; segunda resposta concorrente recebe o aviso.

## Manual

- Imprimir a tela (Ctrl+P): sem menu e botões, uma premissa por bloco.
- Busca SC-003: `rg "\[(validar|decidir|pendência)\]" docs src supabase/tests` e nas migrations desta spec (migrations anteriores não são editadas) sem marcas em aberto.

## Execução (2026-11-05)

| Portão                                       | Resultado                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run test:db` (banco recriado antes)     | 16 arquivos, 1.492 testes aprovados (`016_premissas` incluído)                      |
| `npm run verify`                             | 127 arquivos, 855 testes; typecheck, lint e build aprovados                         |
| `npm run test:e2e` (demonstração e PWA)      | 147 aprovados, 1 ignorado (menu do celular no desktop)                              |
| `npm run test:e2e:supabase` (banco recriado) | 72 aprovados (`premissas.spec.ts` incluído)                                         |
| Busca SC-003                                 | nenhuma marca em aberto em `docs`, `src`, `supabase/tests` e nas migrations da spec |

- Impressão conferida no Chromium (PDF A4): sem menu, cabeçalho, seletor de edição, aviso de
  demonstração, filtros e botões; 32 premissas em 9 páginas, cada uma num bloco inteiro.
- CSV conferido pelo teste da página: cabeçalho do contrato, BOM, `;`, justificativa iniciada
  por `=` protegida e data DD/MM/AAAA HH:MM. Abrir numa planilha da unidade fica para a
  homologação.
- Celular (360 px): sem rolagem horizontal; axe sem violações nas duas telas novas
  (`/coordenacao/premissas`, `/docente/premissas`) em desktop e celular.
- Desvios registrados:
  - o fuso da spec 015 não muda nenhuma hora em 2026, então o teste do CSV (T031) não tinha
    como falhar antes da troca; a garantia é o pgTAP que proíbe `America/Sao_Paulo` nas funções;
  - a quarta função com o fuso antigo era `public.relatorio` (a versão vigente de
    `painel_da_coordenacao` já não tinha o fuso); a migration recria a definição vigente de cada
    uma, extraída do banco;
  - o repositório usa `verificar`, como os demais, no lugar de zod (plano ajustado);
  - `responder` do repositório foi escrito junto com a leitura, antes do seu teste (T024).
