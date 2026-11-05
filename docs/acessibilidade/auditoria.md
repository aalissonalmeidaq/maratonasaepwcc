# Auditoria de acessibilidade — spec 014

## Situação

Automação executada em 2026-11-04/05 no ambiente local. Nenhuma
conformidade certificada é declarada. A automação cobre regras detectáveis; os critérios
que dependem de julgamento humano exigem o roteiro e a revisão da unidade.

## Matriz

Os projetos Playwright `desktop` (Desktop Chrome) e `celular` (Pixel 7, Chromium) cobrem:
entrada, regulamento público, início dos três perfis, ranking da turma, pontuação da equipe,
encontros, presença, avaliações, ranking da coordenação e edições. O viewport móvel não
substitui um teste em Android físico/TalkBack. Safari/iOS requer validação manual.

## Comandos

```text
npm run test:e2e -- e2e/acessibilidade.spec.ts
npm run test:e2e -- e2e/teclado.spec.ts
npm run test:e2e -- e2e/responsividade-acessivel.spec.ts
```

Relatório Playwright em `playwright-report/`; resultados axe anexados por tela. Não suprimir
violações para aprovar a suíte. Registrar exceções de tamanho de alvo com critério normativo,
localização e evidência. Contraste normal deve alcançar 4,5:1.

## Resultados

| Verificação                          | Resultado                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Axe WCAG 2.2 A/AA em desktop/celular | 32 cenários sem violações detectadas                                                                          |
| Jornadas de teclado dos três perfis  | 6 jornadas concluídas com foco visível e ponto central não encoberto após estabilizar transições              |
| Alvos, foco, zoom e contraste        | Regras axe A/AA e alvo do link público verificados; 10 cenários de texto a 200% concluídos nos dois viewports |
| NVDA e TalkBack pela unidade         | Não executado; roteiro entregue                                                                               |

Cobertura adicional: orientação no menu aberto em desktop/celular (`e2e/instalacao.spec.ts`)
e diálogo de retirada com restauração de foco (`e2e-supabase/regulamento-ui.spec.ts`), todos
aprovados e sem violações axe. As medições aguardam fontes e animações finitas estabilizarem;
cores intermediárias durante a abertura do menu não são usadas como estado final da auditoria.

Consultar [roteiro-leitor-de-tela.md](roteiro-leitor-de-tela.md) e registrar os resultados
obtidos com versão, aparelho, navegador e executor antes de concluir homologação manual.

## Correções e limites da evidência

- Corrigidos nomes acessíveis divergentes do texto visível no painel da coordenação e na
  edição selecionada. As duas telas permanecem na matriz axe como regressão.
- Corrigidos transbordamento do título público com texto ampliado e quebra do cabeçalho
  autenticado na coordenação; as rotas principais são percorridas a 200% em desktop e celular.
- A jornada abre os grupos recolhidos do menu pelo teclado e espera as animações finitas
  antes de medir foco, sem cliques para preparar o percurso.
- Conferência visual executada em 1440×1000 e 412×915; tokens e arquivos de marca preservados.
  Detector mecânico Impeccable: nenhuma ocorrência nos componentes novos/alvo verificados.
- Contraste detectável verificado pelo axe em navegador real. Critérios não automatizáveis,
  leitores de tela e aparelhos físicos continuam no roteiro da unidade. Nenhuma regra foi
  excluída para aprovar a automação.
