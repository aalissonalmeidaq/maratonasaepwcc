# Contrato de telas: Painel da turma

## Rotas e entradas (FR-006, SC-001)

| Área           | Rota                           | Entrada                                                       |
| -------------- | ------------------------------ | ------------------------------------------------------------- |
| Docente/mentor | `/docente/turmas/:turmaId`     | "Minhas turmas" → link "Abrir painel da turma" em cada cartão |
| Coordenação    | `/coordenacao/turmas/:turmaId` | "Organização → Turmas" → link "Painel" em cada linha          |
| Aluno          | `/aluno/turma`                 | Menu "Minha turma" (turma ativa do aluno na edição em uso)    |

## Conteúdo

1. Cabeçalho: nome da turma; descrição "Curso · categoria · ano letivo". Para quem tem mais de uma turma visível, campo "Trocar de turma" (select rotulado) com a turma aberta selecionada.
2. Indicadores (`StatCard`): Alunos ativos, Com equipe, Sem equipe, Equipes e — só na visão `gestao` — Convites pendentes.
3. "Equipes": lista com nome de exibição, selo Dupla/Trio e integrantes (gestão vê "(integrante inativo)"). Gestão vê o link "Alterar equipes" (docente → `/docente/turmas`, coordenação → `/coordenacao/duplas`). Vazio: "Nenhuma equipe formada nesta turma." + orientação ("Os alunos formam equipes por convite em Minha equipe.").
4. "Alunos sem equipe": nomes. Vazio com alunos: "Todos os alunos ativos têm equipe." Turma sem alunos: "Nenhum aluno cadastrado — cadastre em Organização." (gestão) / "Nenhum aluno ativo nesta turma." (aluno). Para aluno, link "Convidar para minha equipe" → `/aluno/dupla`.
5. "Encontros": próximo encontro em destaque; listas "Agendados", "Realizados" (e "Cancelados" se houver). Vazio: "Nenhum encontro cadastrado nesta edição."
6. "Pontuação e classificação":
   - Com `pontuacao = null`: aviso "Pontuação disponível a partir dos lançamentos de avaliação.", sem números.
   - Na demonstração: tabela "Pontuação das equipes da turma" (Equipe, Pontos, Posição na categoria), com o selo do estado da classificação e o selo "Dados fictícios". Posição compartilhada aparece como "2º (empate)"; equipe com lançamentos pendentes recebe a nota "lançamentos pendentes". Sem notas individuais.
   - Aluno com `pontuacao.publicada = false`: "Classificação ainda não publicada.", sem números e sem a tabela. Com `publicada = true`, o aluno vê a mesma tabela, só com os totais.

## Estados

- Listas "Equipes da turma" e "Alunos sem equipe" usam `ListaPaginada` (busca por nome; 10 por página, como na spec 005) quando passam de 10 itens.
- Carregando: `Spinner` "Carregando…" (componente `Consulta`).
- Erro de acesso: `Alert` de erro com "Você não tem acesso a esta turma." / "Turma não encontrada." e botão "Tentar novamente".
- Turma de outra edição: "Turma não encontrada."
- Aluno sem turma: "Você ainda não está vinculado a uma turma nesta edição." / "Procure a coordenação."
- 320 px: blocos empilhados (grid de uma coluna), sem rolagem horizontal.
