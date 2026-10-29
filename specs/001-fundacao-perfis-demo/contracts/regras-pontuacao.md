# Contrato: núcleo de regras de pontuação (`@/modules/pontuacao`)

Funções puras, sem React nem Supabase. As mesmas regras deverão ser reproduzidas no servidor
(função SQL/RPC transacional) no Incremento 4; os casos de teste deste contrato servem de
especificação compartilhada para os dois lados.

## Configuração versionada — `RegrasDaEdicao`

| Campo                                             | Piloto (a confirmar)                                               |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `versao`                                          | `piloto-2026.0-a-confirmar`                                        |
| `casasDecimais`                                   | 2 (arredondamento só no resultado de cada componente e no total)   |
| `presenca.pontosPorIntegrante` / `maximoPorDupla` | 5 / 10                                                             |
| `participacao.criterios`                          | envolvimento 4, colaboração 3, organização 3                       |
| `questoes.maximo`                                 | 30                                                                 |
| `entrega.criterios`                               | compreensão 10, aplicação técnica 10, qualidade 10, organização 10 |
| `entrega.faixasAtraso`                            | ≤15 min → −2; ≤30 min → −5 (no critério organização)               |
| `entrega.limiteAtrasoMinutos`                     | 30 (acima: não realizada, salvo exceção registrada)                |
| `apresentacao.criterios`                          | clareza 3, explicação 4, respostas 3                               |
| `provaOficial`                                    | realização confirmada 5; nota confirmada ≥ 70 → +10                |
| `penalidades.tetoDescontosPorEncontro`            | 10                                                                 |
| `quantidadeEncontros`                             | 4 (configurável)                                                   |

## Funções

- `pontuarQuestoes(acertos, total, regras) → number` — `acertos/total × máximo`; erro se
  `total ≤ 0`, `acertos < 0` ou `acertos > total`.
- `pontuarPresenca(presencas, regras) → number`
- `pontuarRubrica(notas, criterios) → number` — erro se critério ausente, desconhecido,
  negativo ou acima do máximo.
- `descontoPorAtraso(minutos, regras) → { desconto, naoRealizada }`
- `pontuarProvaOficial(resultados, regras) → { pontos, pendente }`
- `consolidarPenalidades(penalidades, regras) → { desconto, duplicadasIgnoradas }`
- `calcularEncontro(lancamentos, regras) → PontuacaoDoEncontro`
- `acumularEncontros(pontuacoes) → TotaisDaDupla`
- `classificar(duplas) → PosicaoNoRanking[]` — ordem total → entrega → questões/prova →
  presença; empate total ⇒ mesma posição (1, 1, 3).

## Erros

`ErroDeRegra` (mensagem em português) para dados inválidos; nunca retornar pontuação silenciosa
para entrada inválida.
