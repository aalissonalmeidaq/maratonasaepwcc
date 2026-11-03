# Quickstart: validar a spec 008

## Pré-requisitos

- Supabase local nas portas 5442x.
- Banco recriado com `npx supabase db reset`.

## Portões automáticos

| Comando                     | O que comprova                                                                                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`            | `gerarCsv`: BOM, `;`, escape, decimal com vírgula, datas em Brasília e proteção contra fórmulas. Também cobre as telas dos painéis e dos relatórios (com axe), além de tipos, lint e build.                                                           |
| `npm run test:db`           | `supabase/tests/009_paineis_relatorios.test.sql`: autorização por perfil, números dos painéis iguais aos das funções de origem, pendências só de encontros realizados, relatórios sem chave `nota` nem e-mail, e registro em `exportacoes_relatorio`. |
| `npm run test:e2e`          | Painéis da demonstração com o selo "Dados fictícios"; exportação desabilitada.                                                                                                                                                                        |
| `npm run test:e2e:supabase` | `e2e-supabase/paineis.spec.ts`, descrito abaixo.                                                                                                                                                                                                      |

## Jornada real (`e2e-supabase/paineis.spec.ts`)

1. **Docente da turma A:**
   - o painel lista a presença do encontro 1 como pendente;
   - depois de registrar a presença, a pendência some.
2. **Aluna da Dupla Órbita:** o painel mostra a prévia e o próximo encontro, e não mostra o
   ranking enquanto não houver publicação.
3. **Coordenação:**
   - publica o ranking parcial; o painel da aluna passa a mostrar a posição;
   - exporta o relatório "Pontos por equipe e encontro" da Categoria A; o download é um CSV que
     começa com o BOM e tem cabeçalho em português.
4. **Docente da turma A:** exporta o relatório de presença e o arquivo só tem linhas da turma A.

## Estado inicial (T001, 2026-11-02)

- Supabase local ativo nas portas 5442x.
- `npm run test:db`: 8 arquivos (001–008), 687 asserções, todos passando.
- `npm run verify`: tipos, lint, 68 arquivos de teste (593 testes) e build passando.

## Resultados dos portões (T026, 2026-11-02)

| Comando                                                                             | Resultado                                                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run verify`                                                                    | tipos, lint e build ok; 75 arquivos de teste, 615 testes                        |
| `npm run test:db`                                                                   | 9 arquivos, 809 asserções (122 novas em `009_paineis_relatorios.test.sql`)      |
| `node scripts/testar-paridade-calculo.mjs`                                          | 22 casos, 0 divergências                                                        |
| `node scripts/testar-concorrencia-publicacao.mjs`, `-questoes.mjs` e `-equipes.mjs` | aprovados                                                                       |
| `npm run test:e2e`                                                                  | 55 testes (desktop e celular), incluindo os painéis da demonstração             |
| `npm run test:e2e:supabase` (depois de `db reset`)                                  | 58 testes; `paineis.spec.ts` roda por último, como projeto dependente `paineis` |

Diferenças em relação ao plano, sem efeito nas regras:

- O relatório de pedidos de revisão é só da coordenação (a equipe docente não vê os pedidos nas
  telas da spec 007); o formulário do docente mostra 4 relatórios.
- A jornada real usa a presença do **encontro 2** (o encontro 1 já é registrado pelas jornadas
  anteriores) e a publicação da **Categoria B** (a Categoria A já foi publicada pela jornada da
  spec 007), com a aluna Íris.
- O seed forma as equipes 30 dias antes, para o histórico de integrantes do relatório de presença.
