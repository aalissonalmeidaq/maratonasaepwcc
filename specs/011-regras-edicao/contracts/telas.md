# Contratos de tela: regras da edição e das turmas

Componentes em `src/modules/pontuacao/ui`, exportados por `index.ts`. Todos passam no axe,
funcionam a partir de 360 px e são operáveis por teclado.

## Coordenação — `/coordenacao/edicoes` (seção nova "Regras da edição")

- `FormRegras`: grupos (encontros e casas decimais, presença, participação, questões, entrega e
  atrasos, apresentação, penalidades, prazos); prova oficial só leitura com "valores do PRD (HU04)".
  Editor de critérios por rubrica: lista com nome e pontuação máxima, "Adicionar critério",
  "Remover" (desabilitado para o critério de atraso, com a explicação), reordenação não é exigida.
  Faixas de atraso e tipos de penalidade com a mesma lógica. Mensagens por campo; nome da versão
  sugerido e editável; justificativa obrigatória; "Gravar versão" conclui só após a resposta;
  recusa por desatualização mostra "Recarregar".
- `HistoricoRegras`: versões com nome, a partir de quando valem, autor e justificativa.

## Coordenação e mentor — painel da turma (seções novas)

- "Regras da turma" (`FormAjustesTurma`): por grupo, "Herdar da edição" ou "Definir para a turma";
  ao definir, o mesmo editor da edição com os valores atuais como ponto de partida. Mentor vê só os
  grupos de avaliação; penalidades e prazos aparecem só para a coordenação. Justificativa
  obrigatória. Histórico da turma abaixo.
- "Encontros da turma" (`EncontrosDaTurma`, só coordenação): caixas por encontro da edição, marcadas
  por padrão; encontro com lançamentos aparece marcado e bloqueado, com o motivo.
- `PontuacaoMaxima` no topo do painel: "Pontuação máxima da turma: N pontos (M encontros)".

## Estudante e docente

- Regulamento (`/aluno/regulamento` e páginas de regulamento existentes): resumo com as regras
  vigentes da turma; grupos ajustados marcados "definido para a sua turma"; pontuação máxima.
- Pontuação da equipe: "X de N pontos" com a pontuação máxima da turma.
- Formulários de avaliação e presença: critérios das regras do encontro para a turma.

## Menu de todas as áreas (User Story 6)

- Barra lateral e menu do celular: "Início" no topo; depois uma seção por categoria com título
  (texto pequeno em caixa alta, `aria-labelledby` na lista) e os itens da categoria. Item atual com
  `aria-current="page"`, como hoje.
- Atalhos da tela inicial: mesmos grupos, com título de grupo acima dos cartões.
- Categorias e itens conforme a spec (US6); nenhum item novo, nenhum endereço novo.

## Demonstração

- Regras da edição fictícia, um ajuste fictício na turma A e o histórico; escrita desabilitada.
