# Contratos de tela: resultado oficial, ocorrências e ranking

Regras para todas as telas:

- **Português e acessibilidade:** textos em pt-BR, campos com rótulo, estados informados por
  texto e não só por cor, e axe sem violações.
- **Servidor e conexão:** nenhuma ação aparece como concluída antes da resposta do servidor.
  Sem conexão, as ações ficam desabilitadas e a tela mostra "Sem conexão: esta ação exige
  internet".
- **Demonstração:** usa dados fictícios e é só leitura. Os botões de ação ficam desabilitados,
  com o aviso de demonstração.

## Aluno

| Rota                        | Conteúdo                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/aluno/pontuacao`          | Pontos da própria equipe por encontro e componente, lidos de `pontos_da_minha_equipe`, com o selo **"Prévia — não oficial"**. As pendências aparecem como "Aguardando registro". Substitui o cálculo no navegador da spec 006.                                                                                                                                                               |
| `/aluno/ranking`            | Última publicação da categoria, com o selo do estado (Parcial, Provisório ou Definitivo), versão e data. A tabela mostra posição, equipe e total, com o empate indicado em texto. A linha da própria equipe vem destacada e abre o detalhe por encontro. Sem publicação, mostra "O ranking ainda não foi publicado". No estado provisório, aparece o botão "Pedir revisão" até `revisaoAte`. |
| `/aluno/ocorrencias`        | Ocorrências da equipe com tipo, fato, evidência, prazo de manifestação e estado. Inclui o formulário de manifestação, quando cabe, e a decisão com justificativa. Mostra "Pedir revisão" depois da decisão, dentro do prazo.                                                                                                                                                                 |
| `/aluno/revisoes`           | Pedidos da equipe, com o estado e a resposta.                                                                                                                                                                                                                                                                                                                                                |
| `/avisos` (todos os perfis) | Lista de avisos com "Marcar como lido". O cabeçalho mostra o contador de não lidos, com o rótulo acessível "N avisos não lidos".                                                                                                                                                                                                                                                             |

## Docente ou mentor

| Rota                       | Conteúdo                                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/docente/ocorrencias`     | Formulário "Registrar ocorrência" com turma, equipe, encontro, tipo (vindo das regras), desafio quando o tipo é plágio, fato, evidência em texto e arquivo opcional. Abaixo, a lista das ocorrências das turmas, com os estados. |
| `/docente/pontos`          | Prévia dos pontos de todas as equipes da turma (`pontos_da_turma`), por encontro e componente, sem a nota individual da prova. Inclui o link para o ranking publicado da categoria.                                              |
| Painel da turma (spec 004) | O bloco de pontuação passa a mostrar a última publicação da categoria.                                                                                                                                                           |

## Coordenação

| Rota                         | Conteúdo                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/coordenacao/prova-oficial` | Escolha do encontro de prova oficial. A tabela tem uma linha por estudante, agrupada por equipe, com estes campos: realização, nota, fonte, as caixas "Escala 0–100 confirmada" e "Uso autorizado", e "Nota indisponível". O envio é em lote. Uma correção abre o campo de justificativa e o campo opcional do pedido de revisão.                                               |
| `/coordenacao/ocorrencias`   | Filtro por turma e estado. Cada ocorrência mostra fato, evidência e manifestação, além do formulário de decisão com resultado, justificativa e a caixa "Apresentação dependente da entrega", que aparece no plágio. Uma decisão antes do prazo é recusada pelo servidor, e a tela mostra a mensagem. Tem a ação "Registrar exceção de prazo".                                   |
| `/coordenacao/ranking`       | Seletor de categoria com estes blocos: as pendências (`pendencias_da_categoria`), a prévia classificada e o formulário de publicação com estado e justificativa. A justificativa é obrigatória a partir da segunda versão. O histórico de versões fica abaixo. A publicação definitiva com pendências é recusada, e a lista volta do servidor (SC-004: no máximo 3 interações). |
| `/coordenacao/revisoes`      | Pedidos abertos e respondidos, com o objeto, o componente e as correções já ligadas. Inclui o formulário de resposta, deferido ou indeferido, com justificativa. Para cada componente há um atalho para a correção de origem, que passa o `p_pedido`.                                                                                                                           |
