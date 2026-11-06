# Operação, homologação, backup e restauração — PROPOSTA

> Orientações a validar pela unidade. Nenhum ambiente remoto foi criado ou conectado.

## Premissas em validação (spec 015)

- Antes de usar dados reais, a coordenação responde às premissas P01–P32 na tela "Premissas em
  validação" (aceite do PRD §16). "Precisa mudar" não altera o sistema: abrir uma spec para cada
  mudança. A lista pode ser exportada em CSV ou impressa para a reunião.
- Respostas são só de inserção e ficam na auditoria (`respostas_premissas`).
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
