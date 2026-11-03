# Contratos de tela: painéis e relatórios

Valem as regras gerais da spec 007:

- textos em pt-BR, campos com rótulo, estado em texto e axe sem violações;
- sem conexão, as ações ficam desabilitadas;
- na demonstração, os dados são fictícios e trazem o selo "Dados fictícios".

| Rota                                              | Conteúdo                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/aluno`                                          | Banner com o nome da equipe e os cartões abaixo. Sem equipe, mostra o convite para formar equipe e os encontros.                                                                                                                                                                                                                          |
| `/docente`                                        | Próximo encontro e, por turma, a quantidade de equipes com pendência e a lista de pendências dos encontros realizados. Cada item tem um link de ação. Inclui o atalho para os relatórios.                                                                                                                                                 |
| `/coordenacao`                                    | Indicadores da edição e, por categoria, as pendências dos encontros realizados e a última publicação (ou "Ranking ainda não publicado"). Inclui o atalho para os relatórios.                                                                                                                                                              |
| `/docente/relatorios` e `/coordenacao/relatorios` | Escolha do relatório (5 tipos) e os filtros: categoria, só para a coordenação; turma; e encontro, quando o relatório usa. O botão "Exportar CSV" gera o arquivo depois da resposta do servidor. Mensagens: "N linhas exportadas." ou "Nenhum registro para os filtros escolhidos". Uma nota lembra que não há nota individual nem e-mail. |

Os cartões do painel do aluno (`/aluno`) são estes:

| Cartão           | Conteúdo                                                                     |
| ---------------- | ---------------------------------------------------------------------------- |
| Pontos           | A prévia, com o selo "Prévia — não oficial".                                 |
| Posição          | A posição e o estado da última publicação, ou "Ranking ainda não publicado". |
| Próximo encontro | Número, título e data.                                                       |
| Próximo prazo    | O desafio ou a lista com prazo aberto mais próximo.                          |
| Ações pendentes  | Cada ação com o seu prazo e um link.                                         |
| Avisos           | A quantidade de avisos não lidos.                                            |
