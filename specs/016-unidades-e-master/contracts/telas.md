# Contrato: telas

## Área do master (`/master`)

- **Início:** "Unidades sem gestão" (lista com link para cadastrar a gestão) e o aviso de
  premissas aguardando resposta (movido do início da coordenação).
- **Unidades (`/master/unidades`):** lista (nome, situação, contas de gestão com situação do
  acesso); "Cadastrar unidade" (nome + primeira conta de gestão: nome e e-mail — opcional, para
  a unidade poder nascer e receber a gestão depois); por unidade: renomear, desativar/reativar
  (justificativa), acrescentar gestão, desativar gestão, reenviar convite.
- **Masters (`/master/masters`):** lista, convidar master (nome, e-mail), desativar (não a si
  mesmo).
- **Premissas em validação (`/master/premissas`):** a tela da spec 015 com o formulário.

## Área da gestão (`/gestao`)

- **Início:** totais da equipe por função e edições da unidade por estado.
- **Equipe da unidade (`/gestao/equipe`):** lista com busca e filtro por função; "Cadastrar
  pessoa" (nome, e-mail, funções — caixas de seleção); por pessoa: trocar funções (justificativa),
  desativar/reativar (justificativa), reenviar convite. Recusa da última coordenação mostra a
  mensagem do servidor.
- **Edições (`/gestao/edicoes`):** lista; "Criar edição" (nome, período, coordenação escolhida
  entre as contas com função coordenação); por edição não encerrada: acrescentar/retirar
  coordenação.
- **Premissas em validação (`/gestao/premissas`):** só leitura.

## Área do analista (`/analista`)

- **Início:** painel da edição em uso (o mesmo da coordenação) sem links de ação; seletor de
  edição com as edições da unidade.
- **Relatórios (`/analista/relatorios`):** a tela da spec 008.

## Mudanças nas telas existentes

- Cabeçalho: nome da unidade ao lado da área (exceto master).
- Menu: "Trocar de área" quando a conta tem mais de uma área.
- Coordenação: "Criar edição" (spec 010) continua; o vínculo de docentes e mentores às turmas
  só lista pessoas da unidade com a função; o aviso de premissas sai do início.
- Premissas (`/coordenacao/premissas`, `/docente/premissas`): sem formulário.
- Regulamento público: "Unidade: <nome>" em cada edição.
- Página "Unidade desativada. Procure a gestão da rede." para contas de unidade inativa.

## Acessibilidade

Novas telas no axe dos E2E (spec 014), em desktop e celular; formulários com rótulos, erros
ligados ao campo, confirmação só após o servidor e diálogo de confirmação para desativar.
