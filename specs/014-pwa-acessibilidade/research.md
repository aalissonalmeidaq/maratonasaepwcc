# Pesquisa (Fase 0): PWA, regulamento público offline e acessibilidade

Base: `public.edicoes` e `public.encontros` (specs 002, 010), `ResumoRegulamento`
(`@/modules/comunicados`, specs 009/011), `src/shared/pwa` (base do RF18), `Consulta`
(`src/app/dados/Consulta.tsx`), ADR 0005 e os E2E de demonstração (`playwright.config.ts`).
Nenhum item ficou como NEEDS CLARIFICATION.

## R1. Marca de publicação na edição

- **Decisão:** coluna `edicoes.regulamento_publico boolean not null default false`. RPC
  `definir_regulamento_publico(p_id, p_publico)` só da coordenação da edição e só com a edição
  `ativa`; reenvio com o mesmo valor não grava. A mudança é um `update` em `edicoes`, já auditado
  pelo gatilho `auditoria_edicoes`. `edicoes_que_coordeno` passa a devolver `regulamentoPublico`.
- **Motivo:** FR-005a; a marca é um atributo da edição, sem histórico próprio além da auditoria.
  Edições existentes começam `false` (premissa da spec).
- **Alternativas:** tabela `publicacoes_regulamento` (versões, quem e quando) — duplicaria a
  auditoria sem ganho para a decisão tomada.

## R2. Leitura pública (anônima)

- **Decisão:** RPC `public.regulamento_publico()` `security definer`, com `grant execute` a
  `anon` e `authenticated`. Devolve `{geradoEm, edicoes: [{id, nome, inicio, fim, regras,
regrasVersao, encontros: [{numero, titulo, data, inicio, fim, estado}]}]}` só de edições
  `estado = 'ativa'` e `regulamento_publico`, por `inicio` e nome. Nada de ambientes,
  orientações, turmas ou pessoas. `anon` continua sem `select` em tabelas.
- **Motivo:** FR-001 a FR-003 e FR-005a; uma lista fechada de campos montada no servidor garante
  que nada além do público sai (constituição V e VI). A edição encerrada sai pelo filtro, sem
  mexer na marca.
- **Alternativas:** política RLS de `select` para `anon` em `edicoes`/`encontros` — exporia
  colunas não públicas (orientações, ambiente, premiação) e dependeria de views.

## R3. Cliente sem sessão para o conteúdo público

- **Decisão:** `obterSupabasePublico()` em `src/shared/lib/supabasePublico.ts`: cliente com a
  chave pública, `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`
  e `storageKey` próprio. A chamada pública nunca leva o token de quem está logado.
- **Motivo:** FR-007 e SC-002: o que fica no aparelho vem de uma resposta anônima, igual para
  qualquer pessoa.
- **Alternativas:** usar o cliente da sessão — a resposta seria igual, mas a requisição seria
  autenticada, contra a letra da FR-007.

## R4. Onde guardar a cópia offline

- **Decisão:** a cópia do regulamento público fica no `localStorage`
  (`maratona:regulamento-publico:v1:<modo>:<projeto>` = `{salvoEm, conteudo}`), com gravação tentada após cada resposta do
  servidor e lida, validada com zod, quando o navegador está offline ou a chamada falha por rede
  (`TypeError`). Toda leitura e escrita em `try/catch`; sem armazenamento, a página só funciona
  online e mostra o aviso da FR-006a, sem confirmar gravação. "Sair" não apaga a cópia (é pública). O service worker continua **sem**
  `runtimeCaching` (ADR 0005 mantida): o shell vem do precache e o conteúdo, da cópia.
- **Motivo:** FR-006 e FR-007; a regra "nada autenticado no cache do SW" fica literal e testável
  (o cache do SW só tem o precache); a data "Conteúdo salvo em …" sai da própria cópia; o modo
  demonstração exercita o mesmo caminho.
- **Alternativas:** `runtimeCaching` `NetworkFirst` para a RPC — abriria a primeira regra de
  cache de dados no SW, exigiria filtrar por cabeçalho de autorização e não daria a data salva sem
  metadados extras.

## R5. Telas que precisam do servidor, offline

- **Decisão:** `Consulta` passa a mostrar "Sem conexão: esta tela precisa de internet para
  carregar." em dois casos: consulta pausada pelo TanStack Query por falta de rede
  (`isPending && fetchStatus === 'paused'`, hoje um "Carregando…" sem fim) e erro com o navegador
  offline, apenas quando não houver dados utilizáveis em memória. A retomada é a do próprio TanStack Query ao reconectar (`refetchOnReconnect`, padrão).
  A consulta pública usa `networkMode: 'always'` para cair na cópia local.
- **Motivo:** FR-008 e US2 (cenários 4 e 6); um ponto único cobre todas as telas.
- **Alternativas:** aviso por página — repetitivo e fácil de esquecer em uma tela.

## R6. Instalação no iPhone/iPad

- **Decisão:** `OrientacaoInstalacao` em `src/shared/pwa`, onde está `BotaoInstalar`, quando o
  navegador é iOS/iPadOS (user agent iPhone/iPad/iPod, ou `MacIntel` com toque) e o app não está
  instalado (`navigator.standalone` ou `display-mode: standalone`). Texto: "Para instalar: toque
  em Compartilhar e depois em Adicionar à Tela de Início." Nem o botão nem a orientação aparecem
  no modo instalado.
- **Motivo:** FR-010; o Safari não emite `beforeinstallprompt`.

## R7. Verificação automática de acessibilidade no navegador real

- **Decisão:** `e2e/a11y.ts` injeta o `axe-core` já instalado (`page.addScriptTag` com o arquivo
  do pacote) e roda `axe.run` com as tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `wcag22aa`
  (inclui `target-size`, 2.5.8). `e2e/acessibilidade.spec.ts` percorre as telas da FR-013 no modo
  demonstração nos dois projetos existentes (`desktop` e `celular`, Chromium). Nenhuma
  dependência nova.
- **Motivo:** FR-012, FR-013 e SC-003. Safari/iOS e leitores de tela ficam no roteiro manual
  (R9), que cobre o que o Chromium e as ferramentas não cobrem.
- **Alternativas:** `@axe-core/playwright` (dependência nova para o que poucas linhas fazem);
  projeto WebKit (navegador extra, sem cobrir leitor de tela).

## R8. Teclado e foco não encoberto

- **Decisão:** `e2e/teclado.spec.ts`: jornadas dos três perfis só com `Tab`, `Shift+Tab` e
  `Enter` (entrar na demonstração, abrir o menu, ir ao ranking, sair). A cada parada, confere que
  o elemento focado tem contorno visível (`outline` ou `box-shadow`) e que o ponto central dele
  não está coberto (`document.elementFromPoint` devolve o próprio elemento ou um descendente) —
  WCAG 2.4.7 e 2.4.11. Se preciso, corrige-se com `scroll-padding-top` igual à altura dos
  elementos fixos.
- **Motivo:** FR-014 e SC-004; o axe não verifica 2.4.11.

## R9. Roteiro de leitor de tela

- **Decisão:** `docs/acessibilidade/roteiro-leitor-de-tela.md`: preparação (NVDA com Firefox ou
  Chrome no Windows; TalkBack com Chrome no Android), uma seção por tela da FR-013, tabela "Passo
  | Resultado esperado | Resultado obtido | OK?" e um quadro de registro (data, quem executou,
  versão do app, aparelho). A execução é da unidade; a lacuna fica em
  `docs/decisoes-e-pendencias.md` até o registro.
- **Motivo:** FR-016 e SC-005; constituição X (não declarar conformidade não verificada).

## R10. Offline de verdade nos testes (service worker)

- **Decisão:** projeto Playwright `pwa` no `playwright.config.ts`, com um segundo `webServer`
  que gera o build de demonstração em `dist-e2e-pwa/` e o serve com `vite preview` (porta 4174).
  `e2e/pwa.spec.ts` espera o service worker ativo, visita `/regulamento`, passa o contexto para
  offline e recarrega: o shell e a cópia abrem com "Conteúdo salvo em …"; `/entrar` offline
  informa que entrar exige conexão; e o cache do SW só tem arquivos do precache (SC-002). Os
  outros projetos ignoram `pwa.spec.ts`, e `npm run test:e2e` continua sendo o único comando.
- **Motivo:** o servidor de desenvolvimento não registra o service worker (`devOptions`
  desligado); só o build prova o offline.
- **Alternativas:** script separado `test:e2e:pwa` (mais um comando para esquecer).

## R11. Demonstração

- **Decisão:** repositório público de demonstração com a edição fictícia publicada e os
  encontros fictícios (um deles cancelado); `definirRegulamentoPublico` é recusado como as demais
  escritas da demonstração. A página mostra o aviso de demonstração já existente.
- **Motivo:** US1 (cenário 10) e ADR 0004.

## R12. Fechamento da revisão técnica

- **Decisão:** preservar localStorage de R4, com chave efetiva
  `maratona:regulamento-publico:v1:<modo>:<projeto>`; modo demo não compartilha cópia com
  Supabase, e projetos Supabase diferentes não se misturam. Validar schema estrito na leitura
  e na escrita; descartar chaves desconhecidas antes de persistir. Substituir a cópia inteira
  em cada sucesso, inclusive lista vazia. Preservar a cópia anterior em falha de rede;
  erros HTTP, autorização ou schema não são silenciosamente apresentados como resposta atual.
- **Racional:** evita dados fictícios em ambiente real e conteúdo retirado persistindo após
  uma visita online. Quota, acesso negado ou cópia corrompida não podem quebrar a página online;
  comunicar indisponibilidade da gravação quando aplicável. A garantia offline exige visita
  anterior com shell instalado e armazenamento efetivamente disponível.
- **Alternativas consideradas:** Cache Storage manual, sugerido na revisão independente,
  também isolaria o documento, mas troca o mecanismo já previsto sem necessidade de volume;
  cache genérico de RPC permanece rejeitado.
- **Decisão:** `regras` é uma projeção de campos de pontuação usados pelo resumo da spec 009,
  nunca o JSON arbitrário integral da edição. Selecionar no servidor campos escalares,
  critérios e faixas reconhecidos pelo resumo; excluir extras em cada nível. Testar campos
  sentinela privados na raiz e dentro de objetos/listas. Valores ausentes continuam ausentes,
  renderizados como “a definir”; não criar valores padrão de competição.
- **Racional:** FR-002 proíbe receber dados privados, não apenas mostrá-los. Uma lista fechada
  das chaves externas não protege contra metadados inesperados dentro de `regras`.
- **Decisão:** publicar/retirar bloqueia a linha da edição na transação, verifica autorização
  atual e estado ativo, e altera somente a marca. Repetição é idempotente. Escrita direta da
  marca por REST ou RPCs genéricas deve ser recusada; preservar os demais fluxos de edição.
  Concorrência com encerramento nunca torna uma edição encerrada visível na leitura pública.
- **Decisão:** `Consulta` mantém dados da sessão já presentes mesmo em erro de refetch offline;
  mensagem de falta de conexão substitui spinner/erro apenas quando não há dados utilizáveis.
  Reconexão retoma queries sem recarregar o aplicativo. Incluir `LimiteCarregamento` no desenho:
  testar rota nunca visitada e garantir retry real de import, pois React.lazy pode memorizar
  uma promise rejeitada; não basta limpar o estado do error boundary.
- **Decisão:** testar atualização com dois builds, recusando ativação antes de “Atualizar
  agora”. Precache de todos os chunks necessários garante entrada e rota pública offline.
- **Decisão:** SC-002 inspeciona Cache Storage, localStorage e IndexedDB após usar os três
  perfis e sair; nenhuma resposta de negócio autenticada persiste. Sessão Auth durante login
  é a exceção já documentada na ADR 0005 e deve ser removida ao sair.

## R13. Falha de armazenamento confirmada na clarificação (FR-006a)

- **Decisão:** manter o conteúdo retornado pelo servidor na tela e informar “Não foi possível
  salvar o regulamento para leitura offline.” se a gravação falhar por quota ou bloqueio.
  O resultado de leitura distingue sucesso da rede de sucesso da persistência; somente este
  último confirma a cópia e sua data. Não alterar a data de uma cópia anterior por uma tentativa
  falha. Tratar falha de persistência localmente, sem lançá-la como falha da consulta online.
- **Racional:** opção A escolhida pelo usuário; FR-006a e SC-001 exigem disponibilidade online
  e ausência de confirmação falsa. A gravação deve ser tentada inclusive para lista vazia.
- **Alternativas consideradas:** bloquear a leitura até liberar espaço (opção B rejeitada);
  omitir a falha ou afirmar que salvou (incompatível com a decisão e offline honesto).
- **Validação:** simular quota excedida e acesso ao armazenamento negado, com e sem cópia
  anterior. A resposta online continua visível, o aviso aparece e a resposta atual nunca é
  marcada como salva. Cópia antiga, quando ainda acessível, conserva seu conteúdo e data.

## Referências verificadas em 2026-11-04

- [Supabase — funções de banco](https://supabase.com/docs/guides/database/functions):
  permissões explícitas, schema qualificado e search_path fixo para funções privilegiadas.
- [Playwright — acessibilidade](https://playwright.dev/docs/accessibility-testing):
  axe em navegador real e limites das verificações automáticas. Aqui se mantém a injeção do
  axe-core existente, sem adicionar o wrapper opcional.
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/): foco não encoberto e alvos de 24 CSS px,
  considerando as exceções normativas. Automação não equivale a certificação.

Pesquisa independente somente leitura confirmou isolamento do cliente público, consultas
pausadas, risco de retry de chunks e necessidade de E2E com build. As decisões acima consolidam
os achados; nenhuma dúvida técnica bloqueadora permanece.
