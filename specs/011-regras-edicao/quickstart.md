# Quickstart: validar as regras da edição e das turmas

## Pré-requisitos

- Supabase local nas portas 5442x: `npx supabase start` e `npx supabase db reset`.
- Contas fictícias do seed (senha `senha-local-123`): `coordenacao@`, `mentor@` (curso A),
  `docente@` e `aluna@` (3º ano A), `iris@` (3º ano B).

## Jornadas

1. **Versão da edição (US1):** em `/coordenacao/edicoes`, seção "Regras da edição": acrescentar o
   critério "Documentação" (máximo 5) à entrega e mudar os pontos de presença; aceitar o nome
   sugerido; justificar. Esperado: versão nova no histórico, a anterior preservada; regulamento da
   aluna com o critério novo. Tentar remover o critério de atraso: recusado com a explicação.
2. **Encontro com regras do início (US4):** com um encontro passado e um futuro, mudar um critério;
   esperado: avaliação do encontro passado com os critérios antigos e do futuro com os novos;
   paridade sem divergências.
3. **Ajuste da turma (US2):** como `mentor@`, no painel do 3º ano A, definir a apresentação para a
   turma com um critério próprio. Esperado: 3º ano A com a rubrica própria; 3º ano B com a da
   edição. Mentor tentando ajustar penalidades: recusado; a coordenação consegue.
4. **Encontros da turma e máximo (US3):** como coordenação, tirar o encontro 4 do 3º ano B (sem
   lançamentos). Esperado: pontuação máxima do 3º ano B com 3 encontros e do 3º ano A com 4;
   encontro com lançamentos não sai.
5. **Leitura (US5):** `aluna@` vê no regulamento as regras do 3º ano A, os grupos definidos para a
   turma e a pontuação máxima; `iris@` vê as do 3º ano B.
6. **Menu (US6):** em cada área, conferir no desktop e no celular as categorias com título,
   "Início" no topo e o item atual destacado; percorrer o menu só com o teclado; os atalhos da tela
   inicial seguem os mesmos grupos.

## Portões

```bash
npm run verify
npm run test:db
npm run test:e2e
npm run test:e2e:supabase   # com E2E_SUPABASE_URL e E2E_SUPABASE_ANON_KEY locais
node scripts/testar-concorrencia-regras.mjs
node scripts/testar-paridade-calculo.mjs
```

Esperado: tudo verde, com `supabase/tests/012_regras.test.sql`; concorrência: duas gravações sobre
a mesma versão (edição e turma) geram uma gravação e uma recusa; paridade sem divergências com duas
versões, critério novo e ajuste de turma.

## Resultados

### Estado inicial (2026-11-03)

| Portão                                     | Resultado                                                  |
| ------------------------------------------ | ---------------------------------------------------------- |
| `npm run test:db`                          | 11 arquivos, 1101 asserções                                |
| `npm run verify`                           | 97 arquivos, 701 testes, ok                                |
| `npm run test:e2e`                         | 67 passaram, 1 pulado (última execução, merge da spec 010) |
| `node scripts/testar-paridade-calculo.mjs` | 23 casos, 0 divergências                                   |

### Ao fim da implementação (2026-11-03)

| Portão                                     | Resultado                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `npm run test:db`                          | 12 arquivos, 1242 asserções, ok (depois de `npx supabase db reset`)                              |
| `npm run verify`                           | 106 arquivos, 749 testes, ok                                                                     |
| `npm run test:e2e`                         | 73 passaram, 1 pulado                                                                            |
| `npm run test:e2e:supabase`                | 48 passaram; 1 tempo esgotado no primeiro `goto` da suíte (`atividades`), que passou sozinho (9) |
| `node scripts/testar-paridade-calculo.mjs` | 26 casos, 0 divergências                                                                         |
| `scripts/testar-concorrencia-*.mjs` (6)    | todos aprovados, inclusive `testar-concorrencia-regras.mjs`                                      |

Desvios:

- `--sidebar-width` passou de 16rem para 17.5rem (menu em acordeão), por decisão do usuário;
  atualizado também em `docs/referencias/tokens_maratona.css` e `DESIGN.md`; registrado em
  `docs/decisoes-e-pendencias.md` §2.
- O menu passou a acordeão (uma categoria aberta por vez) depois da implementação da US6; o
  esclarecimento registrado pedia grupos sempre abertos. Testes de unidade e E2E já acompanham.
- Banco local recriado com `npx supabase db reset` ao fim.
