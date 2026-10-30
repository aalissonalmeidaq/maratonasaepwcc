# Contrato — telas (spec 003)

## Aluno — "Minha equipe" (`/aluno/dupla`)

- **Sem equipe**: card "Convidar colegas" com lista dos colegas da turma sem equipe (caixa de
  seleção por colega; até 1, ou até 2 quando a turma permite trio — o texto de ajuda diz qual) e
  botão "Enviar convite". SC-001: abrir a tela → marcar colega → "Enviar convite" (3 interações).
- **Convites recebidos**: quem convidou, demais convidados (trio), botões "Aceitar" e "Recusar".
- Após aceite parcial em trio pendente: "Aguardando outro aceite" e "Retirar aceite";
  explicar que retirar cancela o convite inteiro. Equipe formada não apresenta essa ação.
- **Convites enviados**: convidados com a resposta de cada um e "Cancelar convite".
- **Com equipe**: selo "Dupla" ou "Trio", integrantes e nome de exibição; se ainda não tem nome, formulário
  "Nome da equipe" (avisa que só pode ser definido uma vez).
- Toda ação usa confirmação do servidor (`RetornoEnvio`); offline/demonstração bloqueiam envio.

## Coordenação — "Equipes" (`/coordenacao/duplas`)

- Sem o card "Formar dupla"; texto explica que as equipes são formadas pelos alunos por convite.
- Card de cada equipe: "Alterar equipe" abre ações: substituir, incluir (quando cabe), remover
  (só trio) e desfazer — todas com justificativa. Não oferece definir nome ou renomear.
- Exibir "integrante inativo" e aviso de trio em turma com número par de alunos ativos, quando
  aplicável; nenhum ajuste automático. Não oferecer remoção isolada de integrante de dupla.

## Docente/mentor — "Minhas turmas" (`/docente/turmas`)

- Tabela de equipes da turma + "Alunos sem equipe"; cada equipe com "Alterar equipe" (mesmas
  ações da coordenação e renomeação, somente após a escolha inicial dos integrantes).
- Permitir formar equipe com alunos ativos sem equipe, com justificativa; trio apenas em turma
  ímpar sem trio. Exibir os mesmos avisos de gestão e histórico.

## Estados e acessibilidade

- Carregamento, lista vazia e erro com possibilidade de reler dados; nenhuma mensagem de sucesso
  antes da confirmação. Bloquear envio repetido durante requisição e atualizar consultas depois.
- Navegação por teclado, foco visível, campos com rótulos, erros e estados por texto; contraste
  mínimo de 4,5:1 e validação em celular/tablet/desktop com componentes e tokens existentes.

## Edição encerrada (FR-017)

- Todas as telas de equipe mostram aviso "Edição encerrada: somente consulta" e escondem
  convidar, aceitar, recusar, retirar, cancelar, nomear e alterar; equipes e histórico seguem
  visíveis. O servidor recusa mesmo que a ação seja chamada diretamente.

## Navegação

- Aluno: "Minha dupla" → **"Minha equipe"**; coordenação: "Duplas" → **"Equipes"**.
- Aluno: o item "Minha equipe" do menu mostra a quantidade de convites recebidos pendentes
  (selo numérico com texto acessível "N convites pendentes"; some quando 0). O painel inicial
  do aluno mostra um card "Convites de equipe" com o mesmo número e link para "Minha equipe".
  Sem e-mail ou notificação externa (FR-016).
