# Tarefas: PWA, regulamento público offline e acessibilidade

**Entrada**: documentos em `specs/014-pwa-acessibilidade/`.
**Branch**: `014-pwa-acessibilidade` | **Data**: 2026-11-04.
**Pré-requisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/rpc.md](contracts/rpc.md),
[contracts/telas.md](contracts/telas.md), [quickstart.md](quickstart.md).

**Organização**: uma fase por história, em ordem P1 → P2. Caminhos relativos à raiz.
Arquivos ainda inexistentes são entregas previstas, não evidência de implementação.
`[P]` identifica trabalho em arquivos distintos, executável em paralelo dentro do grupo
indicado nas dependências. Não autoriza iniciar tarefa antes de seus pré-requisitos.

**Testes**: incluídos porque a spec exige verificação automática, teclado e E2E e a
constituição II exige TDD dos fluxos relevantes. Escrever e executar os testes antes da
implementação correspondente, registrar RED pelo comportamento esperado, implementar GREEN e
refatorar. Erro de importação ou ambiente não é evidência RED suficiente. Não implementar
durante a geração deste documento. Não aplicar migrations em banco remoto.

## Fase 1 — Preparação

**Objetivo**: reaproveitar o projeto e as dependências existentes, sem reinicialização.

- [X] T001 Conferir Node >=22.12, comandos e dependências de teste em `package.json` e documentar em `specs/014-pwa-acessibilidade/quickstart.md` a preparação local realmente necessária, mantendo axe-core existente e separação de testes de domínio, componentes, banco e E2E (constituição IV; FR-012).
- [X] T002 Preparar fixtures exclusivamente fictícias em `src/test/fixtures/regulamentoPublico.ts` para edições publicadas/não publicadas, início nulo, encontros sem horário/cancelados, regras ausentes e metadados privados sentinela aninhados; não acrescentar valores institucionais presumidos (FR-001–003; constituição VI/X).

## Fase 2 — Fundação

**Objetivo**: fronteira tipada e transporte público utilizáveis pela página e pelo offline.
**Bloqueio**: concluir T003–T005 antes das histórias.

- [X] T003 Escrever e executar RED em `src/shared/lib/supabasePublico.test.ts` comprovando que o transporte público não herda JWT nem sessão do cliente autenticado, não persiste sessão e usa apenas configuração pública; incluir schema inválido e projeto/mode distintos no contrato dos dados de teste em `src/test/fixtures/regulamentoPublico.ts` (FR-003/007).
- [X] T004 Definir tipos e schemas públicos em `src/modules/publico/domain/tipos.ts`, `src/modules/publico/domain/validacao.ts` e sua API `src/modules/publico/index.ts`: edição com `inicio | null; fim | null`, encontro com `inicio | null; fim | null`, estado `agendado | realizado | cancelado`, `geradoEm: timestamptz`, `salvoEm: string ISO`; rejeitar dados inválidos e projetar somente chaves públicas, inclusive regras aninhadas; domínio sem React/navegador/Supabase (FR-001–003/007).
- [X] T005 Implementar `src/shared/lib/supabasePublico.ts` com `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false` e storageKey independente; executar T003 até GREEN sem alterar o cliente autenticado nem introduzir segredo (FR-003/007; pesquisa R3).

**Marco**: contratos tipados e transporte anônimo disponíveis; nenhuma política anônima ampla.

## Fase 3 — US1: regulamento público sem login (P1)

**Objetivo**: coordenação decide publicar/retirar; visitante consulta somente conteúdo público.
**Teste independente**: no Supabase local publicar uma edição ativa, abrir `/regulamento`
sem login, conferir regras/encontros e ausência de dados privados, retirar e verificar saída;
docente, estudante e coordenação de outra edição recebem recusa.

### Testes primeiro

- [X] T006 [P] [US1] Escrever e executar RED em `supabase/tests/015_regulamento_publico.test.sql` para leitura anônima fechada, lista vazia, múltiplas edições, filtro ativa/publicada, regras aninhadas sem sentinelas privadas, ordenação e proibição de SELECT anônimo nas tabelas (FR-001–003/005).
- [X] T007 [P] [US1] Escrever e executar RED em `src/modules/publico/ui/RegulamentoPublico.test.tsx` para nome/período, resumo com aviso oficial, encontros e situações, horário a confirmar, ausência de encontros/edições e dados fictícios identificados; preparar teste do link em `src/app/paginas/EntradaPage.test.tsx` (FR-001/002/004/005).
- [X] T008 [US1] Acrescentar e executar RED de publicação em `supabase/tests/015_regulamento_publico.test.sql`: marca inicial falsa, vínculo ativo da edição, `42501` para perfis sem autorização, `23514` para rascunho/encerrada, nulo recusado, repetição sem auditoria extra e bypass por UPDATE REST/RPC genérica recusado; testar concorrência por duas sessões em `e2e-supabase/regulamento-concorrencia.spec.ts` (FR-005a).
- [X] T009 [US1] Escrever e executar RED em `src/modules/organizacao/ui/EstadoDaEdicao.test.tsx` para publicar/retirar somente ativa, confirmação de retirada, falha do servidor sem sucesso visual e publicação bloqueada offline (FR-005a/009).

### Implementação

- [X] T010 [US1] Criar `supabase/migrations/20261108120000_regulamento_publico.sql` com `edicoes.regulamento_publico boolean` e restrição literal `not null default false`; escrita somente por `definir_regulamento_publico`, bloqueio de linha, checagem de coordenação/estado ativo, idempotência e auditoria existente; manter o bloqueio de edições encerradas e recusar bypass; concluir este conteúdo e T011 antes de aplicar a migration no Supabase local (FR-005a; T008).
- [X] T011 [US1] Na mesma migration `supabase/migrations/20261108120000_regulamento_publico.sql`, implementar `regulamento_publico()` e ampliar `edicoes_que_coordeno()`: `security definer`, `search_path = ''`, objetos qualificados, EXECUTE revogado de PUBLIC e concedido apenas aos papéis do contrato; projetar recursivamente campos consumidos pelo resumo, sem ajustes de turma; ordenar edições por início crescente, nulos no fim, nome/id e encontros por número; concluir T010/T011 antes de aplicar a migration completa somente no Supabase local e executar T006/T008 até GREEN, com RED registrado antes da aplicação. Se uma versão parcial já foi aplicada, reconstruir apenas o banco local descartável conforme `specs/014-pwa-acessibilidade/quickstart.md`, pois editar uma migration aplicada não a reaplica (FR-001–003/005/005a).
- [X] T012 [US1] Implementar adaptador de leitura e testes de contrato em `src/modules/publico/data/repositorioSupabase.ts` e `src/modules/publico/data/repositorioSupabase.test.ts`, consumindo o transporte T005 e schema T004; tratar erro HTTP/schema sem convertê-lo em sucesso vazio; exportar por `src/modules/publico/index.ts` (FR-003).
- [X] T013 [P] [US1] Acrescentar `EdicaoGerida.regulamentoPublico: boolean` e `definirRegulamentoPublico(id, publico): Promise<{ regulamentoPublico }>` em `src/modules/organizacao/domain/edicoes.ts`, `src/modules/organizacao/domain/tipos.ts` e `src/modules/organizacao/data/repositorioSupabase.ts`, verificando a resposta e invalidando leitura gerida após sucesso (FR-005a).
- [X] T014 [P] [US1] Criar `src/modules/demo/publico.ts` e exportar por `src/modules/demo/index.ts`; fornecer edição/encontros fictícios publicados, inclusive cancelado; adequar `src/modules/demo/repositorios.ts` ao campo novo e manter escritas de demonstração recusadas (US1 cenário 10; pesquisa R11).
- [X] T015 [US1] Implementar `src/modules/publico/ui/RegulamentoPublico.tsx` e `src/app/paginas/RegulamentoPublicoPage.tsx`, registrar `/regulamento` fora de RotaProtegida em `src/app/rotas.tsx` e link em `src/app/paginas/comum.tsx`; compor transporte público sem provider autenticado, resumo via API `@/modules/comunicados`, estados de carregamento/erro/vazio, sem inventar valores ausentes; executar T007 até GREEN (FR-001–005).
- [X] T016 [US1] Integrar publicar/retirar em `src/modules/organizacao/ui/EstadoDaEdicao.tsx` e `src/app/paginas/edicoes.tsx`, usando useEnvio, bloqueio offline e confirmação do servidor; não oferecer ações em rascunho/encerrada; executar T009 até GREEN (FR-005a/009).
- [X] T017 [US1] Implementar e executar `e2e-supabase/regulamento.spec.ts` com fixture local própria e limpeza: publicar, visitante sem login, retirada, encerramento, regras vigentes sem ajuste de turma e mesma resposta pública ao abrir logado; executar também o teste de concorrência T008 e registrar resultados em `specs/014-pwa-acessibilidade/quickstart.md` (FR-001–005a).

**Marco**: primeiro incremento demonstrável online e autorização provada no banco local.

## Fase 4 — US2: leitura offline do conteúdo já salvo (P1)

**Objetivo**: shell/cópia pública offline, consulta interna honesta e recuperação ao reconectar.
**Teste independente**: visitar e salvar com rede, desligar rede e recarregar `/regulamento`;
ver cópia datada; testar sem cópia, reconexão, quota e bloqueio de armazenamento sem impedir
leitura online nem confirmar gravação inexistente. Integração exige US1; unidade usa fixtures.

### Infraestrutura antes do RED

- [X] T018 [US2] Configurar projeto pwa de build/preview em `playwright.config.ts`, mantendo desktop/celular e exclusão cruzada de `e2e/pwa.spec.ts`; usar `dist-e2e-pwa/`, porta 4174, modo demo explícito e SW ativo, ajustar `.gitignore` para artefatos; preservar `runtimeCaching: []` e precache de shell/chunks em `vite.config.ts` (FR-006/007; pesquisa R10).

### Testes primeiro

- [X] T019 [P] [US2] Escrever e executar RED em `src/modules/publico/data/copiaLocal.test.ts` para schema inválido/cópia ausente, chave `maratona:regulamento-publico:v1:<modo>:<projeto>`, isolamento demo/projetos, datas ISO, substituição integral inclusive vazia e falhas de quota/acesso com e sem cópia anterior; cópia anterior não recebe data da tentativa falha (FR-006/006a/007).
- [X] T020 [P] [US2] Escrever e executar RED em `src/app/dados/Consulta.test.tsx` para consulta pausada sem dados, erro offline, dados existentes preservados no refetch e retomada ao reconectar; em `src/app/layout/LimiteCarregamento.test.tsx` cobrir falha e retomada real de chunk sem reload do aplicativo (FR-008).
- [X] T021 [P] [US2] Após T018, criar e executar `e2e/pwa.spec.ts` em RED antes de T022–T026, registrando falhas de comportamento com build e SW funcionais: visita anterior e reload offline, sem cópia, `/entrar` offline, rota interna nunca visitada, reconexão e nenhuma escrita com sucesso falso; preparar injeção de quota/bloqueio no navegador mantendo leitura online e aviso exato da FR-006a (FR-006–009; SC-001).

### Implementação

- [X] T022 [US2] Implementar `src/modules/publico/data/copiaLocal.ts` com validação na leitura/escrita, namespace de T019 e tratamento de exceções; retornar sucesso de persistência somente após escrita aceita e nunca guardar respostas privadas; executar T019 até GREEN (FR-006/006a/007).
- [X] T023 [US2] Implementar `src/modules/publico/data/lerRegulamento.ts` e `src/modules/publico/data/lerRegulamento.test.ts`: estados `origem: 'servidor'; persistencia: 'salva'; salvoEm`, `origem: 'servidor'; persistencia: 'falhou'`, `origem: 'copia'; salvoEm` e `origem: 'sem-copia'`; usar cópia em falha de rede, não mascarar erros HTTP/schema; preservar conteúdo atual online quando armazenamento falha (FR-006/006a).
- [X] T024 [US2] Integrar leitura pública com `networkMode: 'always'` em `src/app/paginas/RegulamentoPublicoPage.tsx` e avisos em `src/modules/publico/ui/RegulamentoPublico.tsx`; ampliar `src/modules/publico/ui/RegulamentoPublico.test.tsx` para cópia datada, sem cópia e “Não foi possível salvar o regulamento para leitura offline.” sem falsa confirmação; indicar ausência de suporte offline quando aplicável (FR-006/006a/007).
- [X] T025 [US2] Ajustar `src/app/dados/Consulta.tsx` e `src/app/layout/LimiteCarregamento.tsx` para mensagem “Sem conexão: esta tela precisa de internet para carregar.” apenas sem dados utilizáveis, preservar dados carregados e retomar ao reconectar; ajustar imports lazy em `src/app/rotas.tsx` se necessário para retry real de promise rejeitada; executar T020 até GREEN (FR-008).
- [X] T026 [US2] Ajustar `src/app/paginas/comum.tsx` e `src/app/paginas/EntradaPage.test.tsx` para entrada exigir rede, manter link público offline e nunca simular autenticação/registro concluído; conferir reuso do bloqueio de escrita em `src/app/dados/consultas.ts` (FR-008/009).
- [X] T027 [US2] Executar `e2e/pwa.spec.ts` no build até GREEN, completando atualização da cópia para resposta vazia após retirada e namespace demo/projeto; testar quota e acesso bloqueado separadamente, com/sem cópia anterior; registrar evidências em `specs/014-pwa-acessibilidade/quickstart.md` (FR-006/006a; SC-001).
- [X] T028 [US2] Configurar projeto exclusivo de build/preview conectado ao Supabase local em `playwright.supabase.config.ts` para `e2e-supabase/privacidade-offline.spec.ts`, com diretório de build isolado, modo demo desativado, credenciais públicas locais e execução sequencial sem conflito com a porta 4174; excluir esse arquivo dos projetos que usam dev. Criar e executar o cenário confirmando SW ativo e controlador antes de usar os três perfis, consultar conteúdo privado e sair; inspecionar Cache Storage/localStorage/IndexedDB, comprovar só shell/cópia pública persistidos como conteúdo e sessão removida no logout; falhar se o SW não controlar a página, sem aceitar cache vazio como prova suficiente; ajustar limpeza em `src/app/dados/repositorios.tsx` somente se necessário (FR-007; SC-002).
- [X] T029 [US2] Atualizar `docs/adr/0005-pwa-politica-de-cache.md` com extensão limitada à cópia pública anônima datada, falha FR-006a e distinção entre sessão Auth e cache de negócio; manter proibição de respostas Supabase no SW e escrita offline (FR-006–009).

**Marco**: US1 + US2 entregam o MVP funcional de regulamento público e leitura offline.

## Fase 5 — US3: instalar e atualizar (P2)

**Objetivo**: orientação iOS, nenhum convite no app instalado e atualização por escolha.
**Teste independente**: evento de instalação em navegador compatível, orientação Safari
iPhone/iPad, modo standalone sem convite e dois builds com atualização somente após escolha.

### Testes primeiro

- [X] T030 [P] [US3] Escrever e executar RED em `src/shared/pwa/instalacao.test.tsx` para beforeinstallprompt, appinstalled, iPhone/iPad, iPadOS com identificação desktop, display-mode standalone e navigator.standalone; distinguir convite de instalação e orientação textual (FR-010).
- [X] T031 [P] [US3] Criar `e2e/atualizacao-pwa.spec.ts` com dois builds servidos sequencialmente na mesma origem: A sob controle, B disponível, aviso, adiamento sem ativação e “Atualizar agora” ativando B; prever teardown sem apagar diretórios fora do workspace (FR-011).

### Implementação

- [X] T032 [US3] Implementar detecção de instalado em `src/shared/pwa/instalacao.ts`, `src/shared/pwa/OrientacaoInstalacao.tsx` e adaptar `src/shared/pwa/BotaoInstalar.tsx`; texto “Para instalar: toque em Compartilhar e depois em Adicionar à Tela de Início.”; esconder ambos em standalone e exportar por `src/shared/pwa/index.ts`; executar T030 até GREEN (FR-010).
- [X] T033 [US3] Integrar orientação ao menu em `src/app/layout/AppShell.tsx` e testar em `src/app/layout/Menu.test.tsx` sem duplicar controles ou quebrar navegação/foco (FR-010).
- [X] T034 [US3] Integrar execução isolada de `e2e/atualizacao-pwa.spec.ts` em `playwright.config.ts` e auxiliar `e2e/suporte/servidorAtualizacao.ts`, evitando executar em dev/concorrer pela porta pwa; manter registerType prompt e ajustar `src/shared/pwa/AtualizacaoPwa.tsx` só se necessário; executar T031 até GREEN (FR-011).
- [X] T035 [US3] Registrar roteiro e evidências reais Safari/iOS e app instalado em `docs/operacao-e-homologacao.md`, deixando “não executado” quando aparelho indisponível; confirmar em `e2e/atualizacao-pwa.spec.ts` os dois builds sem ativação antecipada (FR-010/011).

**Marco**: instalação orientada e atualização por escolha verificadas; evidência manual distingue pendências.

## Fase 6 — US4: acessibilidade WCAG 2.2 AA (P2)

**Objetivo**: auditoria real das telas FR-013, teclado e roteiro executável pela unidade.
**Teste independente**: zero violações detectáveis A/AA nos dois viewports; jornadas dos três
perfis sem mouse; todas as telas cobertas pelo roteiro NVDA/TalkBack, sem certificação presumida.

### Testes e diagnóstico primeiro

- [X] T036 [US4] Criar `e2e/a11y.ts` injetando axe-core existente no navegador e executando tags wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa; anexar violações e diagnósticos ao relatório Playwright, sem exclusões silenciosas de regras (FR-012; SC-003).
- [X] T037 [P] [US4] Criar e executar `e2e/acessibilidade.spec.ts` em desktop/celular cobrindo entrada, regulamento público, início dos três perfis, ranking da turma, pontuação da equipe, encontros, presença, avaliações, ranking da coordenação e edições; incluir menu/diálogo e estados vazios/avisos relevantes; registrar falhas observadas antes de corrigir (FR-012/013; SC-003).
- [X] T038 [P] [US4] Criar e executar `e2e/teclado.spec.ts` para entrar, abrir menu, acessar ranking e sair nos três perfis somente com teclado, sem clicks de preparação na jornada; docente usa painel `/docente/turmas/:turmaId`; verificar foco visível e não coberto por cabeçalho/aviso demo, com diagnóstico de elemento/posição (FR-014; SC-004).
- [X] T039 [P] [US4] Criar e executar `e2e/responsividade-acessivel.spec.ts` para alvos “pelo menos 24×24 px ou o espaçamento equivalente”, zoom 200% e texto ampliado sem rolagem horizontal, contraste de texto normal mínimo 4,5:1; registrar exceções normativas justificadas e revisão humana em `docs/acessibilidade/auditoria.md` (FR-015; constituição VIII).

### Correção e documentação

- [X] T040 [US4] Corrigir violações observadas de controles, tabelas e diálogos em `src/shared/ui/Button.tsx`, `src/shared/ui/ConfirmDialog.tsx`, `src/shared/ui/ResponsiveTable.tsx` e componentes apontados por T037/T039; adicionar regressões de comportamento aos testes adjacentes somente para problemas encontrados; reexecutar auditoria afetada (FR-012/015).
- [X] T041 [US4] Corrigir foco, contraste, offsets fixos e menu em `src/index.css`, `src/app/layout/Menu.tsx`, `src/app/layout/AppShell.tsx` e `src/app/layout/AvisoDemo.tsx`, preservando tokens/marca; corrigir páginas indicadas por T037/T038 e reexecutar teclado e axe até GREEN (FR-012–015).
- [X] T042 [P] [US4] Criar `docs/acessibilidade/roteiro-leitor-de-tela.md` com preparação NVDA Windows e TalkBack Android, uma seção por tela FR-013, jornadas dos três perfis, colunas Passo/Resultado esperado/Resultado obtido/OK e campos data, executor, versão, aparelho/navegador; todos os resultados inicialmente “não executado” (FR-016; SC-005).
- [X] T043 [US4] Consolidar resultados reais, comandos, matriz tela/perfil/viewport e limitações da automação em `docs/acessibilidade/auditoria.md`; registrar execução do roteiro pela unidade como pendência em `docs/decisoes-e-pendencias.md` até haver evidência, sem afirmar conformidade certificada (FR-012–016; SC-003–005).
- [X] T044 [US4] Executar `e2e/acessibilidade.spec.ts`, `e2e/teclado.spec.ts` e `e2e/responsividade-acessivel.spec.ts` nos projetos previstos de `playwright.config.ts`, comprovando zero violações detectadas e jornadas completas; registrar os resultados em `docs/acessibilidade/auditoria.md` e conferir cobertura integral do roteiro (FR-012–016).

**Marco**: automação validada e roteiro entregue; execução manual pela unidade permanece explícita.

## Fase 7 — Acabamento e portões de entrega

- [X] T045 Revisar imports entre módulos e domínio puro em `src/modules/publico/index.ts`, `src/modules/comunicados/index.ts` e `src/modules/organizacao/index.ts`; refatorar desvios encontrados, manter TypeScript estrito e confirmar que nenhum persistidor de consultas autenticadas foi introduzido (constituição III/IV; FR-007).
- [X] T046 Atualizar `README.md` e `specs/014-pwa-acessibilidade/quickstart.md` com comandos finais, portas e diretórios reais, testes de FR-006a, leitura pública/offline e limitações; compatibilizar `playwright.config.ts` e `playwright.supabase.config.ts` para execução sequencial sem conflito de 4174 (FR-001–016).
- [X] T047 Executar `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:db`, `npm run test:e2e` e `npm run test:e2e:supabase` conforme `specs/014-pwa-acessibilidade/quickstart.md`; registrar comandos/resultados ou impedimentos objetivos em `docs/operacao-e-homologacao.md`, sem declarar autorização validada sem banco local (constituição IV/V; SC-001–005).
- [X] T048 Conferir todos os critérios FR-001–016, incluindo FR-005a/006a, contra evidências em `specs/014-pwa-acessibilidade/tasks.md` e `docs/acessibilidade/auditoria.md`; atualizar status das tarefas apenas com comprovação, manter resultados manuais não executados explícitos e registrar pendências em `docs/decisoes-e-pendencias.md` (constituição IX/X).

## Dependências e ordem de execução

```text
T001 → T002 → T003 → T004 → T005 (fundação)
                         │
                         ├─ US1: T006–T017 → US2: T018–T029
                         │                    │
                         └─ US3: T030–T035 ────┤
                                              ↓
                                       US4: T036–T044
                                              ↓
                                       T045–T048
```

- **US1**: T006/T007 em paralelo; T008 após T006 (mesmo SQL). T009 é independente dos outros testes. T010/T011 após RED T006/T008 e sequenciais na mesma migration; aplicar somente após concluir ambas e então executar GREEN. Se aplicada parcialmente, reconstruir apenas o banco local descartável conforme quickstart. T012 após T011; T013/T014 podem ocorrer em paralelo após T011, antes da composição T015/T016. T017 exige fluxo completo e T008 implementado.
- **US2**: T018 prepara build/preview antes dos testes. T019/T020/T021 podem ser escritos em paralelo após US1 e T018; executar T021 em RED com SW controlador antes de implementar T022–T026. T022 depende do RED de T019/T021; T023 depende de T022; T024 depende de T023. T025 depende do RED de T020/T021; T026 segue T024/T025. T027 executa GREEN após T022–T026. T028 configura e executa privacidade em build real com Supabase local após T027, sem concorrência com os demais servidores pwa; T029 fecha o desenho implementado.
- **US3**: testes T030/T031 em arquivos distintos. T032 depende de T030; T033 de T032; T034 de T031 e da configuração pwa T018, pois compartilha `playwright.config.ts`; T035 após T034. O núcleo de instalação pode avançar em paralelo com US1/US2 após a fundação.
- **US4**: T036 precede T037; T037/T038/T039 em paralelo quando US1–US3 estiverem integradas. T040/T041 são sequenciais se a auditoria indicar os mesmos arquivos; T042 pode avançar separadamente após definir a matriz de telas. T043 exige resultados e roteiro; T044 confirma o conjunto corrigido.
- **Final**: T045 → T046 → T047 → T048. Não paralelizar suítes que gravam fixtures ou usam a mesma porta. Não executar dois resets de banco nem dois builds no mesmo diretório.

## Exemplos de paralelismo por história

| História | Grupo em arquivos distintos                                         | Barreira                                                |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| US1      | T006 pgTAP + T007 UI; depois T013 adaptador organização + T014 demo | Fundação pronta; T013/T014 após T011                    |
| US2      | T019 cópia + T020 consultas/chunks + T021 cenários PWA              | US1 e T018 prontas; executar RED antes de T022–T026     |
| US3      | T030 instalação + T031 atualização                                  | Fundação pronta; integração da atualização aguarda T018 |
| US4      | T037 axe + T038 teclado + T039 responsividade                       | T036 e fluxos anteriores prontos                        |

Esses exemplos descrevem oportunidades; não exigem agentes ou trabalho paralelo.

## Estratégia de implementação

1. Concluir preparação/fundação, então US1 como primeiro incremento verificável online.
2. Concluir US2 para o MVP de regulamento público offline (as duas histórias P1), incluindo
   falhas de armazenamento e proteção de dados. Não declarar o MVP offline com US1 isolada.
3. Entregar US3 e US4 incrementalmente; manter acessibilidade básica em cada etapa.
4. Rodar os portões finais e entregar roteiro à unidade. A entrega do roteiro não equivale à
   sua execução; resultados manuais ausentes permanecem documentados sem bloquear ficticiamente
   tarefas de automação já concluídas nem afirmar homologação completa.

## Rastreabilidade de cobertura

| Requisito / resultado                        | Tarefas principais                               |
| -------------------------------------------- | ------------------------------------------------ |
| FR-001–005: conteúdo e entrada públicos      | T002, T004–T007, T011–T015, T017                 |
| FR-005a: publicação autorizada/auditada      | T008–T011, T013, T016–T017                       |
| FR-006/006a; SC-001: cópia e falha honesta   | T018–T019, T021–T024, T027                       |
| FR-007; SC-002: privacidade do armazenamento | T003–T005, T018–T019, T022–T023, T028–T029, T045 |
| FR-008/009: conexão, retomada e bloqueios    | T009, T020–T021, T025–T027                       |
| FR-010/011: instalação e atualização         | T030–T035                                        |
| FR-012/013; SC-003: auditoria automática     | T036–T037, T040–T041, T043–T044                  |
| FR-014; SC-004: teclado                      | T038, T041, T044                                 |
| FR-015: alvos, contraste e responsividade    | T039–T041, T044                                  |
| FR-016; SC-005: roteiro de leitores de tela  | T042–T044                                        |
| Portões transversais                         | T045–T048                                        |

**Contagem**: 48 tarefas; preparação/fundação 5, US1 12, US2 12, US3 6, US4 9,
acabamento 4. Os marcadores refletem a execução; evidências e limites estão registrados no
quickstart e na auditoria de acessibilidade.

## Evidências da execução (2026-11-05)

- Checklist de requisitos preservado: 16/16 atendidos.
- Portões de frontend, testes de banco e E2E: comandos, contagens e retomadas em
  `docs/operacao-e-homologacao.md` e `quickstart.md`.
- T030: detecção validada em RED/GREEN; cobertura final inclui eventos de convite/instalação,
  orientação textual e supressão quando instalado em `instalacao.test.tsx`.
- T033: a orientação pertence ao `AppShell`, não ao componente `Menu`. Sua integração foi
  verificada em navegador real por `e2e/instalacao.spec.ts` nos dois viewports, incluindo
  navegação após abrir o menu e ausência de controles duplicados; `Menu.test.tsx` foi preservado.
- FR-001–005/005a: RPC anônima com whitelist, autorização/concorrência/auditoria pgTAP,
  testes da projeção e jornadas `regulamento*.spec.ts`, incluindo publicar/retirar pela UI.
- FR-006/006a/007: cópia validada/isolada, falhas de gravação, SW controlador e inspeção
  após logout dos três perfis; preferência UUID da spec 010 preservada, sem resposta privada.
- FR-008/009: consulta sem dados offline, reconexão e bloqueios de escrita em componentes/E2E.
- FR-010/011: testes de instalação e dois builds reais; Safari físico permanece pendente.
- FR-012–015: matriz axe, menu/diálogo, 6 jornadas de teclado e 10 cenários de texto ampliado;
  resultados e limites em `docs/acessibilidade/auditoria.md`.
- FR-016: roteiro entregue cobrindo todas as telas principais; resultados NVDA/TalkBack
  permanecem “não executado”, conforme `docs/decisoes-e-pendencias.md`.
- Nenhum hook de extensão registrado: `.specify/extensions.yml` ausente.
