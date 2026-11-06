# Contrato: telas e componentes

## `/coordenacao/premissas` e `/docente/premissas` — `PremissasPage`

- `PageHeader` "Premissas em validação" com texto de apoio: "Escolhas que o sistema adotou sem
  decisão da unidade. Responder não muda o sistema: cada mudança vira uma especificação."
- Resumo por situação (sempre visível, também com filtro): "Aguardando resposta N",
  "Confirmadas N", "Precisam mudar N".
- Filtros: situação (Todas, Aguardando resposta, Confirmada, Precisa mudar) e tema (Todos + 6
  temas). Sem resultado: `EmptyState` "Nenhuma premissa com esses filtros.".
- Lista por tema (`h2` por tema); cada premissa num `Card`/`article`: código e pergunta (`h3`),
  `StatusBadge` da situação, "Em uso hoje", "Onde afeta", opções (lista, se houver),
  referência, e a resposta atual ("Confirmada por <nome> em <data>: <justificativa>").
- "Ver histórico (N)" abre/fecha a lista das respostas anteriores (botão com `aria-expanded`).
- Com `podeResponder`: botão "Responder" abre o formulário no próprio cartão — rádio "Confirmada"
  / "Precisa mudar", `TextAreaField` "Justificativa" (rótulo muda para "O que precisa mudar e
  por quê" em "Precisa mudar") com contador 0/2.000, `RodapeDoFormulario` "Registrar
  resposta"/"Cancelar". Envio com `useEnvio`; situação muda só após a resposta; recusa
  `40001` mostra o aviso e recarrega a premissa; offline o botão fica desabilitado com o motivo.
- Em "Precisa mudar": aviso "O sistema segue a premissa em uso até a mudança ser feita."
- Botões "Baixar lista (CSV)" e "Imprimir lista" no topo.
- Premissas resolvidas: seção recolhida "Resolvidas por especificações" no fim.
- Modo demonstração: dados fictícios; "Registrar resposta" recusado como nas demais escritas.

## Impressão (`@media print`)

- Sem menu lateral, cabeçalho do app, aviso de demonstração, filtros e botões.
- O comando de imprimir do navegador (Ctrl+P) imprime o que está filtrado; o botão "Imprimir
  lista" limpa os filtros e imprime todas. Histórico
  aberto, cada premissa com `break-inside: avoid`, texto preto sobre branco.

## CSV — `maratona-premissas-AAAA-MM-DD.csv`

Colunas: Código; Tema; Pergunta; Em uso hoje; Situação; Última decisão; Justificativa; Registrada
por; Registrada em (DD/MM/AAAA HH:MM, Juazeiro do Norte). Padrão da spec 008 (BOM, `;`,
proteção contra fórmula). Respeita os filtros da tela.

## Início da coordenação

- Cartão "Premissas aguardando resposta" com o número e link "Ver premissas", só quando > 0.

## Menu

- Coordenação: item "Premissas em validação" no grupo "Preparação" (junto de Edições).
- Docente e mentor: mesmo item, no grupo "Comunicação". Estudante: nada.

## Acessibilidade

- axe sem violações (componentes e E2E da spec 014 incluem a nova tela nos dois perfis);
  formulário com rótulos, erros ligados ao campo e foco no aviso de recusa.
