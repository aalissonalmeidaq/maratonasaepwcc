# Quickstart: validar PWA, regulamento público offline e acessibilidade

Pré-requisitos: `npm ci`; Docker para o Supabase local (portas 5442x); navegadores do Playwright
instalados.

## Banco

```bash
npm run test:db
```

Esperado: `015_regulamento_publico.test.sql` passa — `anon` lê só os campos do
[contrato](contracts/rpc.md); edição não publicada, em rascunho ou encerrada fica fora; docente e
estudante recebem `42501` em `definir_regulamento_publico`; rascunho e encerrada recebem `23514`;
a mudança aparece na auditoria; `anon` continua sem `select` em `edicoes` e `encontros`.

## Unidade e componentes

```bash
npm run verify
```

Esperado: cópia local (gravar, ler, inválida, sem armazenamento), leitura com origem `servidor`
(persistência `salva` ou `falhou`),
`copia` e `sem-copia`, `RegulamentoPublicoPage`, `Consulta` offline, `OrientacaoInstalacao` e
`EstadoDaEdicao` (publicar e retirar), todos com axe.

## Ponta a ponta (demonstração e PWA)

```bash
npm run test:e2e
```

Esperado:

- `acessibilidade.spec.ts`: zero violações WCAG 2.2 A/AA nas telas da FR-013, em `desktop` e
  `celular`.
- `teclado.spec.ts`: jornadas dos três perfis só com teclado, foco visível e não encoberto.
- `pwa.spec.ts` (build em `dist-e2e-pwa/`): `/regulamento` e `/entrar` abrem offline depois de
  uma visita; aparece "Conteúdo salvo em …"; o cache do service worker só tem arquivos do
  precache.

## Ponta a ponta (Supabase local)

```bash
npm run test:e2e:supabase
```

Esperado: a coordenação publica o regulamento; sem login, `/regulamento` mostra a edição e os
encontros sem ambiente; a coordenação retira e a edição some.

## Manual

- iPhone/iPad (Safari): o menu mostra a orientação "Compartilhar → Adicionar à Tela de Início".
- Executar o [roteiro de leitor de tela](../../docs/acessibilidade/roteiro-leitor-de-tela.md)
  com NVDA e TalkBack e registrar os resultados.

## Preparação reproduzível (PowerShell, após a implementação)

Na raiz do repositório, usar Node >=22.12, Docker e CLI Supabase disponíveis:

```powershell
npm ci
npx playwright install chromium
supabase start
supabase status
$env:E2E_SUPABASE_URL = 'http://127.0.0.1:54421'
$env:E2E_SUPABASE_ANON_KEY = '<chave pública exibida pelo Supabase local>'
npm run test:db
npm run verify
npm run test:e2e
npm run test:e2e:supabase
```

Se o banco local já existia e precisa reaplicar todas as migrations, `supabase db reset`
recria somente esse ambiente de teste, apagando seus dados locais. Executar apenas em ambiente
local descartável; não usar configuração vinculada a banco remoto. Preparação adicional das
Edge Functions permanece conforme o README. Executar as suítes E2E sequencialmente: ambas
podem usar a porta 4174. O projeto PWA proposto deve usar artefatos isolados `dist-e2e-pwa/`,
sem substituir o build em uso por outro servidor.

## Matriz adicional de aceite

Para FR-006a, simular separadamente falta de espaço e armazenamento bloqueado antes de abrir
`/regulamento` com rede. Repetir com e sem cópia anterior. Esperado: conteúdo público atual
legível, aviso “Não foi possível salvar o regulamento para leitura offline.”, nenhuma
confirmação de gravação do conteúdo atual e nenhuma data antiga substituída pela tentativa
falha. Executar esses cenários de componente e navegador nas suítes acima. A garantia offline
de SC-001 se aplica à cópia previamente salva que permanece disponível, com suporte offline.

| Cenário                                                     | Evidência esperada                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| Coordenação de outra edição e escrita direta da marca       | Recusa no banco; estado e auditoria inalterados                 |
| Repetição e encerramento concorrente                        | Sem auditoria duplicada; encerrada nunca aparece                |
| Campos privados dentro das regras                           | Ausentes da resposta, inclusive objetos/listas aninhados        |
| Visita online após retirar todas as publicações             | Lista vazia substitui snapshot anterior                         |
| Primeiro acesso offline, cópia corrompida ou quota excedida | Aviso honesto; leitura online preservada                        |
| Demo versus projeto Supabase                                | Cópias separadas; nenhum conteúdo fictício no modo real         |
| Área interna nunca visitada, desconexão e reconexão         | Sem spinner infinito; retoma sem reload                         |
| Dados internos já carregados e refetch offline              | Dados da sessão permanecem visíveis                             |
| Três perfis, logout e inspeção de armazenamento             | Só shell/cópia pública; sessão removida; sem respostas privadas |
| Build A instalado, build B disponibilizado                  | Aviso; B só ativa após “Atualizar agora”                        |
| App standalone e navegador sem service worker               | Sem convite de instalação no app; online funciona sem SW        |
| Zoom 200%, contraste, foco e alvos                          | Registrar evidências e exceções normativas justificadas         |

O arquivo `docs/acessibilidade/roteiro-leitor-de-tela.md` é uma entrega prevista para a
implementação. Deve cobrir cada tela da FR-013 com NVDA e TalkBack, incluindo resultado
esperado, obtido e situação; registrar data, versão, aparelho/navegador e executor. Até a
unidade executar, deixar o resultado como “não executado”, sem declarar conformidade.

## Estado da implementação — entregue e validada (2026-11-05)

Implementação dos fluxos públicos, offline, instalação e atualização disponível. A suíte
pgTAP local completa passou com 1.428 testes. RED foi registrado para transporte sem sessão,
contrato das RPCs, apresentação pública, publicação na UI, cópia local, consulta offline e
detecção iOS/standalone; a regressão de UPDATE direto foi detectada e corrigida antes do novo
GREEN da suíte de banco. `npm run verify` passou com 814 testes em 119 arquivos; o arquivo
de instalação foi ampliado depois e seus 5 casos passaram (+3 casos novos). Typecheck e lint
passaram novamente. Os builds de produção, demo PWA e Supabase PWA passaram.

Os E2E cobriram 137 casos distintos de demo/PWA (mais um caso de menu móvel ignorado no
desktop) e 70 com Supabase local. O timeout isolado de carregamento e as retomadas estão
documentados em `docs/operacao-e-homologacao.md`; não foram alteradas as asserções de
autorização para aprovar os testes. Axe, teclado, texto a 200%, atualização por escolha,
quota/bloqueio de armazenamento e privacidade com os três perfis foram verificados.

O projeto `privacidade-pwa` usa build real com Supabase local na porta 4176 e exige SW
controlador. O teste fica fora dos projetos dev. O projeto `atualizacao` serve dois builds reais
na porta 4177. O guia manual foi entregue; execução em aparelhos físicos permanece pendente.

Para diagnóstico, `E2E_EXTERNAL_SERVERS=true` permite usar servidores locais já iniciados nas
mesmas portas: demo dev 4183, demo preview 4174, Supabase dev 4174 e Supabase preview 4176.
Isso evita o gerenciamento de processos filhos durante a investigação de timeouts no Windows;
os testes de PWA continuam exigindo SW controlador e build real. Nunca executar demo preview
e Supabase dev ao mesmo tempo na porta 4174.

Na inspeção do armazenamento, a preferência `maratona:edicao:<usuario>` conserva somente o
UUID da edição, como exige a spec 010. Ela não é uma resposta autenticada nem serve dados
privados offline; chaves de sessão e qualquer payload autenticado continuam proibidos após sair.

Executar pgTAP com seed limpo antes dos E2E. As jornadas alteram fixtures e tornam inválidas
algumas asserções antigas que assumem os valores iniciais. Para repetir o pgTAP depois delas,
recriar apenas o banco local descartável, conforme as instruções de reset acima.
