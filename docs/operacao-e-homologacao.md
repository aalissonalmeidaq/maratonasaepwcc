# Operação, homologação, backup e restauração — PROPOSTA

> Orientações a validar pela unidade. Nenhum ambiente remoto foi criado ou conectado.

## Premissas (spec 018)

- As 32 premissas (P01–P32) estão resolvidas e registradas em [premissas.md](premissas.md); não há
  tela no site para tratá-las (retirada pela spec 018). Premissa nova entra nesse documento; se
  mudar regra, vira spec.
- **Antes de usar dados reais, na implantação** (fora do sistema): configurar o provedor e o remetente
  de e-mail da unidade (P32; ver "Preparar homologação"), preencher a premiação de cada edição (P13)
  e fazer a conferência visual e institucional da identidade (P01, P02, P06, P08).
- Datas de relatórios, painéis e o corte de "encontro realizado" usam `America/Fortaleza`.

## Incremento PWA e acessibilidade (spec 014)

- `/regulamento` usa transporte anônimo e campos públicos selecionados no servidor; publicar ou
  retirar exige coordenação ativa da edição e gera auditoria. Encerrar remove a edição da leitura.
- O build mantém atualização por escolha. Teste automatizado usa dois builds reais na mesma
  origem e confirma que a versão B não ativa antes de “Atualizar agora”.
- Shell e cópia pública são os únicos conteúdos offline. Falta de espaço/bloqueio de armazenamento
  mantém conteúdo online e aviso, sem falsa confirmação. Sessão e consultas em memória são
  limpas ao sair; a cópia pública permanece. A preferência do seletor guarda somente o id da
  edição conforme spec 010, sem persistir uma resposta autenticada.
- Portas de teste: demo dev 4183, demo preview 4174, Supabase dev 4174 (executar em sequência),
  Supabase preview 4176, atualização A/B 4177. Builds isolados em `dist-e2e-*/`.
- Validação manual Safari/iPhone/iPad, NVDA e TalkBack: **não executada pelo agente**. Registrar
  aparelho/versões e resultados em `docs/acessibilidade/roteiro-leitor-de-tela.md`.
- Migrations da spec 014 foram aplicadas apenas no banco local. A suíte pgTAP completa passou
  com 1.428 testes após corrigir grants por coluna que haviam reaberto UPDATE direto da edição.
  Nenhuma migration foi aplicada em banco remoto.

Validação automatizada em 2026-11-05:

| Comando / escopo                                                                                                        | Resultado                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run verify` (typecheck, lint, testes e build)                                                                      | Aprovado; 119 arquivos e 814 testes unitários/componentes                                                |
| `npm run test:db` / pgTAP local                                                                                         | 15 arquivos e 1.428 testes aprovados                                                                     |
| `npm run test:e2e -- --project=desktop --project=celular --workers=2`                                                   | 129 aprovados; 1 ignorado no desktop porque o menu recolhível só existe no celular (caso móvel aprovado) |
| `npm run test:e2e -- --project=atualizacao --workers=1`                                                                 | 1 aprovado; builds A/B reais e ativação por escolha                                                      |
| `npm run test -- src/shared/pwa/instalacao.test.tsx`                                                                    | 5 aprovados após ampliar a cobertura (+3 casos novos sobre convite, instalação e orientação)             |
| `npm run test:e2e -- e2e/acessibilidade.spec.ts e2e/instalacao.spec.ts --project=desktop --project=celular --workers=2` | 34 aprovados; telas principais e menu aberto, sem violações detectadas                                   |
| `npm run test:e2e -- --project=pwa --workers=1`                                                                         | 5 aprovados no build final com SW controlador                                                            |
| `npm run test:e2e:supabase` e retomadas por projeto                                                                     | 70 casos distintos aprovados: 60 desktop (inclui publicação pela UI), 9 painéis e 1 privacidade PWA real |

As execuções E2E finais usaram `E2E_EXTERNAL_SERVERS=true`, com servidores iniciados
explicitamente nas portas acima, após timeouts do gerenciamento de processos no Windows.
Os testes unitários usam no máximo quatro workers para evitar saturação da máquina.
Typecheck, lint e build também passaram após as últimas correções de layout.

A primeira execução completa dos E2E Supabase teve 58 aprovações, 1 timeout enquanto a área
ainda carregava e 10 casos dependentes não executados. O caso de acesso negado passou na
repetição isolada sem alterar seu teste; depois foram executados os projetos `paineis` e
`privacidade-pwa` com `--no-deps`, preservando a ordem e as fixtures. A configuração do Vite
passou a ignorar builds/relatórios de teste no watcher: os logs mostraram recargas causadas
pelos HTMLs desses artefatos durante jornadas. O axe aguarda animações finitas terminarem
antes de medir contraste, sem excluir regras nem elementos.

O pgTAP deve rodar com seed limpo **antes** dos E2E. Uma repetição após os E2E encontrou duas
asserções antigas dependentes dos valores originais de comunicados/auditoria. Para repetir,
recriar somente o banco local descartável com `supabase db reset --local` e executar
`npm run test:db`; esse reset apaga os dados fictícios de teste.
Após esse reset final, os 15 arquivos e 1.428 testes passaram novamente; o ambiente local
foi deixado com o seed limpo. Os servidores temporários desta execução foram encerrados.

## Ambientes

| Ambiente    | Banco                         | Dados                                        | Modo demo    |
| ----------- | ----------------------------- | -------------------------------------------- | ------------ |
| Local       | `supabase start` (Docker)     | seed fictício                                | permitido    |
| Homologação | projeto Supabase **separado** | fictícios ou anonimizados, salvo autorização | **proibido** |
| Produção    | projeto Supabase próprio      | reais                                        | **proibido** |

## Integração contínua (spec 017)

Toda proposta de mudança (PR) para o `main` roda sozinha as mesmas verificações exigidas por
`CLAUDE.md`, no fluxo `CI` (`.github/workflows/ci.yml`). O resultado aparece na própria proposta,
como quatro verificações independentes:

| Verificação         | O que cobre                                                                          | Como reproduzir na sua máquina                                                          |
| ------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `qualidade`         | tipos, estilo, testes de unidade e build                                             | `npm ci && npm run verify`                                                              |
| `banco`             | regras de segurança do banco (pgTAP)                                                 | `supabase start && supabase test db`                                                    |
| `jornadas-demo`     | jornadas de ponta a ponta no modo demonstração, em computador e celular              | `npx playwright install chromium && npm run test:e2e`                                   |
| `jornadas-supabase` | jornadas contra o Supabase local, com funções de servidor e caixa de e-mail de teste | roteiro do `README.md` (Supabase local + `supabase functions serve` + `E2E_SUPABASE_*`) |

Também rodam após cada mesclagem no `main` e sob demanda (aba **Actions** › **CI** › **Run
workflow**). Uma nova versão da mesma proposta cancela a execução anterior. Cada verificação tem
limite de tempo (15, 15, 20 e 25 minutos); estourar o limite conta como falha.

**Garantias:** o banco é o Supabase **local**, criado do zero em cada execução com o seed
fictício; o fluxo não usa segredos, não conecta banco remoto nem altera configurações do
repositório; as permissões são só de leitura. O teste `scripts/ci/fluxo.test.ts` (parte do
`npm run verify`) falha se alguma dessas garantias deixar de valer.

**Quando uma verificação falha:** abra a execução na aba **Actions**, leia o resumo do job e,
nas jornadas, baixe o artefato `jornadas-demo-falha` ou `jornadas-supabase-falha` (ficam 7 dias).
Eles trazem o relatório e os traços do Playwright (e o registro das funções, no caso do
Supabase); abra o traço com `npx playwright show-trace <arquivo>.zip`. Falha de infraestrutura
(download de dependência ou de imagem do banco): use **Re-run failed jobs**, sem novo commit.

### Exigir as verificações antes de mesclar (passo manual do dono)

O fluxo só informa; quem bloqueia a mesclagem é uma regra do repositório, que exige permissão de
administrador e **não** é feita pelo pipeline. Faça uma vez:

1. No GitHub, abra o repositório › **Settings** › **Rules** › **Rulesets** › **New ruleset** ›
   **New branch ruleset** (ou **Settings** › **Branches** › **Add branch protection rule**).
2. Nome: `main exige CI`; **Enforcement status**: _Active_; alvo: a branch `main`.
3. Marque **Require status checks to pass** e **Require branches to be up to date before
   merging** e adicione exatamente estas quatro verificações: `qualidade`, `banco`,
   `jornadas-demo` e `jornadas-supabase`. (Elas só aparecem na lista depois da primeira execução
   do fluxo.)
4. Salve. Confira abrindo uma proposta com uma verificação vermelha ou pendente: o botão de
   mesclar fica bloqueado; com as quatro verdes, é liberado.

Alternativa por linha de comando (como dono, com `gh` autenticado):

```bash
gh api -X PUT repos/<dono>/<repositorio>/branches/main/protection   -H "Accept: application/vnd.github+json"   -f "required_status_checks[strict]=true"   -f "required_status_checks[contexts][]=qualidade"   -f "required_status_checks[contexts][]=banco"   -f "required_status_checks[contexts][]=jornadas-demo"   -f "required_status_checks[contexts][]=jornadas-supabase"   -F "enforce_admins=false" -F "required_pull_request_reviews=null" -F "restrictions=null"
```

Renomear uma verificação no `ci.yml` exige atualizar esta regra e este documento.

**Estado atual:** regra aplicada no `main` em 2026-11-06 pela linha de comando acima (quatro
verificações obrigatórias, branch atualizada, proposta obrigatória, sem force-push nem exclusão;
administradores não são obrigados — `enforce_admins=false`).

## Primeiro master e unidades (spec 016)

O master é quem cadastra unidades e contas de gestão. O **primeiro** só pode ser criado pela
administração do banco, em máquina autorizada (nunca pelo frontend):

1. Criar a conta do master no Auth com o metadado `{"master": true}` (a conta nasce **sem
   unidade**; uma conta de unidade não vira master) e enviar o convite de primeiro acesso.
2. No SQL do projeto: `select app.promover_master('<e-mail do master>');`.
3. O master entra, cadastra a unidade em **Rede › Unidades** e a conta de gestão (convite por
   e-mail); a gestão monta a equipe. Nenhum segredo vai ao frontend.

A instalação existente é migrada para a unidade inicial "SENAI Juazeiro do Norte" **[validar o
nome com a unidade]**. Com duas ou mais unidades, operações de administração do banco que gravam
dados de unidade precisam informar a unidade.

## Transferir uma conta de equipe para outra unidade (spec 019)

Quando uma pessoa da equipe passa a trabalhar em outra unidade, o **master** transfere a conta (em vez
de desativá-la e criar outra):

1. **Rede › Unidades**, na unidade de origem, **Ver equipe** e **Transferir…** na conta.
2. Escolher a **unidade de destino** (ativa) e escrever a **justificativa** (10 a 2.000 caracteres);
   confirmar. O sucesso só aparece depois da resposta do servidor.
3. A conta passa a pertencer ao destino **sem funções**; a **gestão do destino** define as funções
   em **Equipe** (até lá a pessoa vê "aguardando permissão"). A função de gestão continua só do
   master.

O que acontece: funções e vínculos na origem ficam **inativos e preservados** (inclusive os de
edições encerradas); a pessoa deixa de acessar o que era da origem; a gestão e as contas da origem
continuam lendo o histórico; a transferência fica registrada (quem, quando, origem, destino e
justificativa). Não são transferidos: estudantes, masters, a **última gestão ativa** da unidade e a
**última coordenação ativa** de uma edição não encerrada (indique outra antes). O e-mail e o login
não mudam.

## Preparar homologação

1. Criar um projeto Supabase de homologação (conta institucional) e anotar a URL e a chave
   **pública**. A chave `service_role`/secreta fica só no painel/CI, nunca no repositório.
2. Configurar Auth: desabilitar auto-cadastro; URLs de redirecionamento do domínio de
   homologação; senha mínima ≥ 10.
3. Aplicar migrations a partir de uma máquina autorizada:
   `supabase link --project-ref <ref>` e `supabase db push` (revisar o diff antes).
   **Não** rodar `seed.sql` em homologação com dados reais.
4. Rodar os testes de RLS contra um banco local equivalente (`supabase test db`).
5. Publicar o build (`npm run build` → `dist/`) em hospedagem estática com HTTPS
   (obrigatório para PWA), com fallback de SPA para `index.html` e cabeçalho
   `Cache-Control: no-cache` para `sw.js` e `index.html`.
6. Definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de build; deixar
   `VITE_DEMO_MODE` vazio.
7. Testar em celulares, tablets e computadores da unidade (PRD RNF01, RNF08).
8. **E-mail** (spec 002, ADR 0009) — dois envios diferentes:
   - **convites de primeiro acesso**, enviados pelas Edge Functions por um provedor de e-mail
     **[validar: provedor, domínio e remetente da unidade]**. Segredos das funções:
     `APP_URL` (endereço público da aplicação), `EMAIL_PROVEDOR`, `EMAIL_REMETENTE` e as
     credenciais do provedor (`supabase secrets set …`, nunca no repositório). Um adaptador
     novo é necessário: hoje só existe o do Mailpit (ambiente local). Confirmar o bloqueio de
     SMTP (portas 25/587) nas funções hospedadas;
   - **recuperação de senha**, enviada pelo próprio Supabase Auth: configurar o **SMTP
     próprio** do Auth no painel (remetente e domínio da unidade) **[P32 — em validação]** e incluir
     `<domínio>/redefinir-senha` nas URLs de redirecionamento.
9. Fazer o deploy das funções (`supabase functions deploy`) com `definir-senha-inicial` sem
   verificação de JWT (ela é pública; ver `supabase/config.toml`).

## Backup e restauração (a validar)

- Verificar o plano do Supabase contratado (backups diários/PITR) e registrar RPO/RTO acordados.
- Backup lógico adicional antes de cada publicação de ranking e ao fim de cada encontro:
  `supabase db dump --data-only -f backup-AAAAMMDD.sql` (e `--schema` separado), guardado em
  local institucional com acesso restrito (contém dados pessoais).
- Arquivos do Storage: exportação periódica do bucket privado (Incremento 3).
- **Testar a restauração** em projeto descartável antes do evento e registrar o resultado
  (PRD §16 exige backup e recuperação verificados).
