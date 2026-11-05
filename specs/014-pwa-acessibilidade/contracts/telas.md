# Contrato: telas e componentes

## `/regulamento` — `RegulamentoPublicoPage` (pública, fora de `RotaProtegida`)

- Cabeçalho com a marca, título "Regulamento da Maratona" e link "Entrar" (para `/entrar`).
- Com conteúdo: uma `section` por edição (`h2` com o nome e o período), `ResumoRegulamento` com
  `regras` e `regrasVersao` (inclui o aviso "Resumo em validação…") e a lista de encontros:
  "Encontro N — título", data por extenso, horário ("08:00 às 10:00", "a partir das 08:00" ou
  "horário a confirmar") e a situação com `StatusBadge` (Agendado, Realizado, Cancelado). Sem
  encontros: "Encontros ainda não divulgados."
- Sem edições: `EmptyState` "Nenhum regulamento publicado no momento."
- Origem `copia`: `Alert` informativo "Conteúdo salvo em <data e hora>. Pode estar
  desatualizado."
- Origem `sem-copia`: `Alert` de alerta "Sem conexão: abra esta página com internet uma vez para
  lê-la depois offline."
- Origem `servidor`, `persistencia: 'falhou'`: manter o regulamento online visível e mostrar
  `Alert` anunciado “Não foi possível salvar o regulamento para leitura offline.” (FR-006a).
  Não exigir liberação de espaço para ler nem indicar que o conteúdo atual foi salvo.
- Modo demonstração: aviso de demonstração já existente (`AvisoDemo`).

## `EntradaPage` (alterada)

- Link "Regulamento da Maratona" para `/regulamento`.
- Offline (`useOnline() === false`): `Alert` "Sem conexão: entrar exige internet. O regulamento
  público continua disponível se você já o abriu antes."

## `EstadoDaEdicao` (alterada; coordenação)

- Edição `ativa`: bloco "Regulamento público" com o estado ("Publicado na página pública" ou
  "Não publicado") e o botão "Publicar regulamento" ou "Retirar regulamento" (`useEnvio`;
  confirmado só após a resposta; recusa exibida). Retirar pede confirmação (`ConfirmDialog`).
- Rascunho e encerrada: sem o bloco.

## `Consulta` (alterada)

- Sem dados utilizáveis, `isPending && fetchStatus === 'paused'`, ou `isError` com o navegador offline: `Alert` "Sem
  conexão: esta tela precisa de internet para carregar." (sem "Tentar novamente"; recarrega ao
  reconectar). Demais casos como hoje.

## `OrientacaoInstalacao` (nova, `@/shared/pwa`)

- iOS/iPadOS fora do modo instalado: "Para instalar: toque em Compartilhar e depois em Adicionar
  à Tela de Início." Ao lado de `BotaoInstalar` no menu (`AppShell`). Nada no modo instalado.

## Acessibilidade (telas da FR-013)

- axe (WCAG 2.2 A/AA) sem violações em `desktop` e `celular`.
- Foco visível e não encoberto em todas as paradas das jornadas de teclado.

## Retomada, privacidade e validação complementar

- Dados internos já presentes em memória permanecem visíveis se um refetch falhar offline;
  a mensagem de FR-008 vale quando não há dados utilizáveis. Reconexão tenta carregar sem
  recarregar o aplicativo, inclusive após falha no carregamento de uma rota.
- A cópia pública é substituída também quando a resposta online vier vazia. Falha de gravação
  mantém leitura online e informa que a cópia offline não pôde ser salva. Nunca anunciar
  gravação concluída sem confirmação do armazenamento.
- Sem suporte a service worker, informar que a reabertura offline não está disponível.
- Verificar zoom de 200%, ausência de rolagem horizontal, contraste dos tokens e estados,
  diálogos/menu, alvos de toque e foco frente a cabeçalho/aviso fixo de demonstração.
- A jornada de teclado do docente abre a página de ranking disponível ao perfil pelo painel
  da turma (`/docente/turmas/:turmaId`), sem criar rota ou privilégio novo de ranking.
- Nova versão permanece aguardando até “Atualizar agora”; validar com dois builds reais.
