# Quickstart: validar a spec 007

## Pré-requisitos

- Docker em execução e Supabase local nas portas 5442x, iniciado com `npx supabase start`.
- Banco recriado com `npx supabase db reset`. Isso aplica a migration
  `20261101120000_resultado_oficial_ranking.sql` e o seed fictício, que traz encontro de prova
  oficial, ocorrência e publicação de exemplo.

## Portões automáticos

| Comando                                            | O que comprova                                                                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                                   | Tipos, lint, Vitest e build. Inclui os casos de contrato do JSON compartilhado contra o TS (SC-001) e as telas novas com axe.                                               |
| `npm run test:db`                                  | pgTAP de `supabase/tests/008_resultado_oficial_ranking.test.sql`: RLS, RPCs, prazos e imutabilidade.                                                                        |
| `node scripts/testar-paridade-calculo.mjs`         | Cada caso de `casos-contrato.json` e `casos-ranking.json` passa por `app.calcular_encontro` e `app.classificar` no banco local e precisa dar o resultado esperado (SC-001). |
| `node scripts/testar-concorrencia-publicacao.mjs`  | Duas publicações simultâneas recebem versões distintas e sequenciais, sem número duplicado.                                                                                 |
| `npm run test:e2e`                                 | Jornadas da demonstração: ranking, prévia, ocorrências e avisos, só leitura.                                                                                                |
| `npm run test:e2e:supabase` (depois de `db reset`) | `e2e-supabase/resultado.spec.ts`: a jornada real descrita abaixo.                                                                                                           |

## Jornada manual de aceite (Supabase local, contas do seed)

1. **Coordenação, prova oficial (US1):**
   - registrar realização confirmada para os dois integrantes da equipe A1 e nota 75 com fonte,
     escala e autorização confirmadas para um deles. Esperado: 20 pontos no componente;
   - marcar a equipe A2 como pendente. Esperado: o total dela aparece pendente.
2. **Docente da turma A, ocorrência (US2):** registrar "Uso não autorizado" para A1, com
   evidência em PDF. Esperado: o aluno de A1 vê o aviso e a ocorrência, e o aluno de A2 não vê
   nada.
3. **Coordenação:** tentar decidir na hora. Esperado: recusa por prazo de manifestação aberto.
4. **Aluno de A1:** enviar a manifestação.
5. **Coordenação:** confirmar a ocorrência. Esperado: o encontro de A1 perde 5 pontos, sem
   ficar negativo.
6. **Coordenação, ranking (US4):** publicar o parcial da categoria. Esperado: o aluno vê o selo
   "Parcial" e o detalhe só da própria equipe.
7. **Coordenação:** tentar publicar como definitivo. Esperado: recusa com a lista de pendências
   (prova de A2 e componentes faltantes).
8. **Coordenação:** publicar como provisório, com justificativa. Esperado: versão 2.
9. **Aluno de A1, revisão (US5):** pedir revisão da presença do encontro 1.
10. **Coordenação:**
    - corrigir a presença com justificativa, ligando ao pedido;
    - deferir o pedido.

    Esperado: a prévia muda e o ranking publicado não muda até uma nova publicação (FR-022).

11. **Pedido fora do prazo:** como o prazo depende do relógio do servidor, o teste ajusta
    `revisao_ate` com SQL só no banco local. Esperado: pedido recusado; com uma exceção de prazo
    registrada, aceito.

## Verificações de dados

- Nenhuma resposta de RPC para aluno ou docente contém a chave `nota` (SC-002). O pgTAP e o E2E
  conferem isso.
- `select count(*) from public.auditoria where pedido_revisao_id is not null` é maior que zero
  depois do passo 10.

## Estado inicial (2026-11-01, antes da implementação)

- Supabase local nas portas 5442x, contêiner `supabase_db_maratona` ativo.
- pgTAP 001–007: 446 asserções, todas passando.
- `npm run verify`: 59 arquivos e 510 testes passando; build OK.

## Resultado da implementação (2026-11-01)

| Portão                                                                              | Resultado                                                                                                             |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                                                                    | 68 arquivos, 593 testes; build OK                                                                                     |
| `npm run test:db`                                                                   | 687 asserções (241 novas em `008_resultado_oficial_ranking.test.sql`), incluindo as da spec 006 com as RPCs recriadas |
| `node scripts/testar-paridade-calculo.mjs`                                          | 22 casos, 0 divergências entre TS e SQL                                                                               |
| `node scripts/testar-concorrencia-publicacao.mjs`                                   | aprovado: versões 1 e 2, sem repetição                                                                                |
| `node scripts/testar-concorrencia-questoes.mjs` e `testar-concorrencia-equipes.mjs` | aprovados                                                                                                             |
| `npm run test:e2e` (servidor aquecido)                                              | 49 passaram, 1 ignorado (só no celular)                                                                               |
| `npm run test:e2e:supabase` (depois de `db reset`)                                  | 53 passaram (11 novos em `resultado.spec.ts`)                                                                         |

O banco local foi resetado depois dos E2E.

## Diferenças em relação aos contratos (sem efeito nas regras)

- **Mensagem sem conexão:** usa o texto já padronizado no projeto ("Sem conexão: gravações exigem
  conexão com o servidor."), e não "Sem conexão: esta ação exige internet".
- **Avisos:** a rota fica dentro de cada área (`/aluno/avisos`, `/docente/avisos`,
  `/coordenacao/avisos`), em vez de `/avisos`; o contador está no cabeçalho de todas.
- **Ranking da coordenação:** mostra pendências, publicação, última versão e histórico; a "prévia
  classificada" antes de publicar não foi feita (a prévia das equipes está em "Pontos da turma").
- **Docente:** o ranking publicado da categoria aparece em `/docente/pontos`, sem rota própria.
- **Prévia de pontos:** mostra os valores do servidor sem o "/ máximo" de cada componente (a RPC
  não devolve as regras).
- **Correção ligada ao pedido:** o pedido chega por `?pedido=` na rota (atalho da tela de
  revisões), sem campo digitável.
- **Tipos de ocorrência:** lidos de `edicoes.regras` por `tiposDeOcorrencia` no repositório (não
  havia RPC no contrato).
- **Edição encerrada:** helper novo `app.exigir_edicao_em_andamento`, porque a mensagem de
  `app.exigir_edicao_aberta` fala de equipes.
- **Retorno de sucesso:** manifestação e resposta de revisão mostram o retorno no topo da página,
  porque o formulário some quando o estado muda.
