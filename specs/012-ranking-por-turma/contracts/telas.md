# Contratos de tela: ranking por turma

Componentes em `src/modules/resultado/ui`, exportados por `index.ts`. Todos passam no axe,
funcionam a partir de 360 px e são operáveis por teclado; estados por texto além de cor.

## Coordenação — `/coordenacao/ranking`

- `ListaTurmasRanking`: tabela responsiva (cartões no celular) com caixa de seleção por turma,
  turma, categoria, equipes, "Última publicação" (`StatusBadge` + versão e data, ou "Não
  publicado") e "Pendências (encontros realizados)" (número; zero aparece "Nenhuma"); a recusa da definitiva lista também o que falta em encontros futuros. "Selecionar todas" no cabeçalho.
  Clicar no nome abre o detalhe da turma.
- `PainelPublicacao` (adaptado): estado (parcial, provisório, definitivo), justificativa
  (obrigatória quando alguma turma marcada já tem publicação) e "Publicar N turmas"; desabilitado
  sem turma marcada. Conclui só após a resposta e mostra `ResultadoDoLote`: lista "Publicadas"
  (turma, versão) e "Recusadas" (turma e motivo, com "Recarregar" quando a versão mudou).
- Detalhe da turma: pendências (`pendencias_ranking_turma`), "Última versão publicada"
  (`TabelaRanking`) e "Histórico de versões" (`HistoricoPublicacoes`).
- Seção recolhida "Publicações por categoria (anteriores)": categorias com histórico; ao abrir,
  a última versão e o histórico, só leitura.

## Coordenação — `/coordenacao/premiacao`

- `PremiacaoPorTurma`: um cartão por turma com a situação ("A definir", "Provisório — não final",
  "Final", "Empate a decidir") e, por prêmio configurado, posição, descrição e equipes. Posição sem
  equipe por empate anterior: "Sem equipe nesta posição (empate na posição anterior)".
- `FormDecisaoEmpate` (só "Empate a decidir"): escolha das equipes premiadas entre as empatadas,
  decisão (texto curto) e justificativa; conclui só após a resposta; a decisão aparece no cartão.
- Aviso permanente: valores, quantidade e condições dos prêmios a confirmar (pendência §2).

## Aluno — `/aluno/ranking`

- Título "Ranking da turma"; aviso "Classificação da sua turma" com o desempate; `TabelaRanking`
  com o estado e o detalhe só da própria equipe; sem publicação: "Ranking da turma ainda não
  publicado" e a prévia da equipe.
- "Premiação da turma" (só depois da definitiva): prêmios e equipes premiadas da turma.
- Pedido de revisão da publicação provisória da turma, como na spec 007.

## Docente e mentor

- "Pontos da turma" (`/docente/pontos`): seletor das turmas em que atuam; para a turma escolhida,
  prévia (spec 007), ranking publicado da turma e "Premiação da turma" (provisória marcada
  "Provisório — não final", ou final).
- Painel da turma (spec 004): bloco "Pontuação e classificação" com a publicação da turma.

## Painéis iniciais (spec 008)

- Aluno: indicador "Posição" pela publicação da turma (texto "na turma").
- Coordenação: seção "Pendências dos encontros realizados" por turma (um cartão por turma, com a
  categoria abaixo do nome e o estado da última publicação); indicador "Pendências abertas" soma
  as turmas.

## Relatórios

- Relatório de pontos: coluna "Posição na turma".
