---
description: 'Tarefas da spec 002 — Organização da maratona'
---

# Tasks: Organização da maratona

**Input**: `specs/002-organizacao-maratona/` · **Tests**: obrigatórios (constituição II).

## Phase 1: Banco (TDD com pgTAP)

- [x] T001 RED `supabase/tests/002_organizacao.test.sql`: cursos/turmas (US1), vínculos (US2), duplas (US3), encontros (US4), leitura por perfil (FR-008)
- [x] T002 GREEN migration `20261029130000_organizacao_duplas_encontros.sql`: ambientes, encontros, duplas, dupla_integrantes, RPCs, gatilhos, RLS
- [x] T003 Seed fictício ampliado (estudantes, duplas, encontros)

## Phase 2: Domínio (TDD)

- [x] T010 RED/GREEN `duplas/domain/composicao` — FR-004, Edge Cases
- [x] T011 RED/GREEN `encontros/domain/encontro` — FR-007
- [x] T012 RED/GREEN tradução de erros do Supabase para mensagens em português

## Phase 3: Acesso a dados

- [x] T020 Contratos de repositório (organização, duplas, encontros)
- [x] T021 Implementações Supabase
- [x] T022 Implementações de demonstração (somente leitura)
- [x] T023 Provedor de repositórios + QueryClient

## Phase 4: Telas

- [x] T030 Coordenação: cursos e turmas (criar e remover) — US1
- [x] T031 Coordenação: vínculos de pessoas — US2
- [x] T032 Coordenação: duplas (formar, substituir, desfazer, histórico) — US3
- [x] T033 Coordenação: encontros e ambientes — US4
- [x] T034 Docente: turmas e duplas reais; aluno: dupla e encontros reais — US5
- [x] T035 Testes de componentes dos formulários (validação, sucesso só após servidor)

## Phase 5: Contas (P3)

- [x] T040 Edge Function `criar-conta` com verificação de coordenação — US6
- [x] T041 Tela de criação de conta

## Phase 6: Verificação

- [x] T050 E2E demo (regressão) e E2E contra Supabase local (formar dupla → aluno vê)
- [x] T051 `npm run verify`, `test:e2e`, `test:db`; atualizar docs e pendências

## Phase 7: Pendências da spec (2026-10-30)

- [x] T060 RED/GREEN edição de curso e turma nos formulários (preenchidos, foco no primeiro campo, confirmação só após o servidor, Cancelar/Concluir) — FR-001
- [x] T061 Botão "Editar" nas tabelas de cursos e turmas; foco volta à linha ao sair da edição — FR-001
- [x] T062 E2E contra Supabase local: editar curso e recarregar; nome de turma repetido recusado — FR-001
- [x] T063 Editar e remover ambientes; migration: remoção de ambiente em uso recusada (hoje `on delete set null`) com mensagem listando encontros — FR-012
- [-] T064 ~~Nome da dupla sugerido no formulário da coordenação~~ — superada pela spec 006
- [ ] T065 (detalhada em T070–T090) Primeiro acesso por link de e-mail (token próprio, 7 dias, uso único): `criar-conta` sem senha + envio do convite; remover "Senha provisória"; situação "Aguardando primeiro acesso"/"Acesso ativo", corrigir e-mail e reenviar — FR-011, US6 cenários 1, 3 e 6
- [ ] T068 (detalhada em T091–T094) "Esqueci minha senha" na tela de entrada (resposta neutra, link de uso único) — FR-014
- [x] T069 (detalhada em T095–T100) Importação de alunos por CSV com prévia, relatório (criadas, vinculadas, recusadas) e convite por e-mail — FR-015
- [-] T066 Trio — movida para a spec 006 (formação por convite; remove "Formar dupla" da coordenação)
- [x] T067 Bloquear troca de curso de turma com dupla ativa (gatilho + pgTAP + mensagem) — FR-001, US1 cenário 4

## Phase 8: Contas sem senha, convite, recuperação e importação (revisão 2026-10-30)

**Input**: [plan.md](./plan.md) (revisão), [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/), [quickstart.md](./quickstart.md) · **Tests**: obrigatórios (constituição II,
RED antes do GREEN). Todas as tarefas pertencem à **US6** (cenários 1, 3, 4, 5 e 6). T065, T068 e
T069 acima são detalhadas aqui.

### 8.1 Setup

- [x] T070 Configurar funções em `supabase/config.toml`: `[functions.definir-senha-inicial] verify_jwt = false`; `[functions.reenviar-convite]` e `[functions.importar-alunos]` com `verify_jwt = true`; variáveis locais não secretas `APP_URL=http://localhost:5173`, `EMAIL_PROVEDOR=mailpit`, `MAILPIT_URL` (endereço do Mailpit visto de dentro do Docker) em `supabase/functions/.env.example`, com `supabase/functions/.env` no `.gitignore`
- [x] T071 [P] Verificar no Supabase local como fica `auth.users.encrypted_password` de uma conta criada sem senha e registrar o critério de "Acesso ativo" em `specs/002-organizacao-maratona/research.md` (R4)
- [x] T072 [P] Incluir `supabase/functions/_shared/**/*.test.ts` no Vitest (`vite.config.ts` / `tsconfig.test.json`) para testar o código compartilhado das funções sem dependências do Deno

### 8.2 Foundational (bloqueia as demais)

- [x] T073 RED pgTAP em `supabase/tests/004_convites_acesso.test.sql`: `anon`/`authenticated` não leem nem escrevem `convites_acesso`; `public.registrar_convite`, `public.consumir_convite`, `public.desfazer_consumo` e `public.usuario_por_email` negados a `authenticated`; consumir token válido devolve `usuario_id` e grava `usado_em`; segunda vez, vencido (`expira_em < now()`) ou revogado → nada; `registrar_convite` revoga o pendente anterior (no máximo um válido por pessoa); `situacao_de_acesso` devolve e-mail e `acesso_ativo` para a coordenação e 42501 para docente, aluno e coordenação de outra edição
- [x] T074 GREEN migration `supabase/migrations/20261030130000_convites_acesso.sql`: tabela `public.convites_acesso` com "`token_hash` text único; SHA-256 hex do token (o token puro nunca é gravado)", "`expira_em` = `criado_em + interval '7 days'`", restrição "`not (usado_em is not null and revogado_em is not null)`", índice "`unique (usuario_id) where usado_em is null and revogado_em is null`", "RLS habilitada, sem políticas"; funções `public.registrar_convite`, `public.consumir_convite`, `public.desfazer_consumo`, `public.usuario_por_email` (somente `service_role`) e `public.situacao_de_acesso(p_edicao)` (`security definer`, `search_path = ''`, só coordenação da edição); auditoria sem `token_hash`
- [x] T075 [P] RED/GREEN `supabase/functions/_shared/convites.ts` (+ `.test.ts`): `gerarToken()` (32 bytes, base64url), `hashDoToken()` (SHA-256 hex via `crypto.subtle`), `linkDePrimeiroAcesso(appUrl, token)` → `${appUrl}/primeiro-acesso#t=${token}`
- [x] T076 [P] RED/GREEN `supabase/functions/_shared/email.ts` (+ `.test.ts` com `fetch` simulado): interface `EnviadorDeEmail`, adaptador Mailpit (`POST {MAILPIT_URL}/api/v1/send`), seleção por `EMAIL_PROVEDOR` (ausente → erro "Envio de e-mail não configurado."), modelo do e-mail de convite em português com apenas nome e link
- [x] T077 [P] Criar `supabase/functions/_shared/autorizacao.ts`: verificação de coordenação ativa da edição com o cliente sujeito à RLS (extraída de `supabase/functions/criar-conta/index.ts`, sem mudar o comportamento)

**Checkpoint**: `npm run test:db` com `004_convites_acesso` verde; testes de `_shared` verdes.

### 8.3 US6 — Primeiro acesso por convite (cenários 1, 3 e 6) 🎯 MVP

**Goal**: conta criada sem senha recebe convite de 7 dias; a pessoa define a própria senha; a
coordenação vê quem está pendente e reenvia.
**Independent Test**: [quickstart.md](./quickstart.md) cenários 1 e 2.

- [x] T078 [US6] Helper local `e2e-supabase/mailpit.ts` (recusa URL não local; busca a última mensagem por destinatário pela API HTTP do Mailpit e extrai o link)
- [x] T079 [US6] RED E2E em `e2e-supabase/contas.spec.ts`: `criar-conta` sem senha → 201 `conviteEnviado: true` e e-mail no Mailpit; com `senhaProvisoria` → 400; `definir-senha-inicial` com o token → 200 e login com a nova senha; reutilizar o link → 400 "Link inválido ou vencido…"; senha com menos de 10 caracteres → 422 e o link continua valendo; docente → 403
- [x] T080 [US6] GREEN `supabase/functions/criar-conta/index.ts`: recusar `senhaProvisoria` ("Campo não aceito"), criar usuário sem senha, `public.registrar_convite` com o hash, enviar o e-mail; resposta `{ usuarioId, conviteEnviado }` (falha de e-mail não desfaz a conta)
- [x] T081 [P] [US6] GREEN `supabase/functions/definir-senha-inicial/index.ts` (pública): senha ≥ 10 (422), `public.consumir_convite`, `auth.admin.updateUserById` com a senha, `public.desfazer_consumo` se o Auth recusar; mesma mensagem 400 para token inexistente, usado, revogado ou vencido; devolve só o e-mail
- [x] T082 [P] [US6] GREEN `supabase/functions/reenviar-convite/index.ts`: coordenação da edição e pessoa da edição (403), 409 se acesso já ativo, `novoEmail` opcional (409 se em uso), revoga e cria convite, envia
- [x] T083 [P] [US6] RED `src/modules/organizacao/ui/FormConta.test.tsx`: sem campo "Senha provisória"; envia `{ nome, email, papel, turmaId }`; com `conviteEnviado: true` mostra "Conta criada. Enviamos o convite para …"; com `false`, aviso para usar "Reenviar convite"
- [x] T084 [US6] GREEN `src/modules/organizacao/ui/Formularios.tsx` (`FormConta`), `src/modules/organizacao/domain/tipos.ts` e `src/modules/organizacao/data/repositorioSupabase.ts` (`criarConta` devolve `{ conviteEnviado }`); demonstração continua recusando escrita; atualizar o E2E "coordenação cria conta pela interface" em `e2e-supabase/organizacao.spec.ts` (sem "Senha provisória"; confere "Enviamos o convite para …" e o e-mail no Mailpit)
- [x] T085 [P] [US6] RED `src/modules/auth/ui/PrimeiroAcessoPage.test.tsx`: lê o token de `#t=`; "Nova senha" e "Confirmar senha" (≥ 10 e iguais); sucesso só após o servidor, com "Entrar" e e-mail preenchido; erro do servidor exibido; sem token → orientação; link "Esqueci minha senha"; axe sem violações; no modo demonstração, a página informa "Indisponível no modo demonstração" e não chama nem simula o servidor
- [x] T086 [US6] GREEN `src/modules/auth/ui/PrimeiroAcessoPage.tsx` e chamada à função em `src/modules/auth/data/` (exportados por `src/modules/auth/index.ts`)
- [ ] T087 [US6] (pendente: `rotas.tsx` tem alterações sem commit de outra sessão; a página já existe e está exportada por `@/modules/auth`) Rota pública `/primeiro-acesso` em `src/app/rotas.tsx` — **combinar com a outra sessão** que edita esse arquivo
- [x] T088 [P] [US6] RED testes da coluna "Acesso" em `src/app/paginas/organizacao.test.tsx` (ou componente extraído): `StatusBadge` "Aguardando primeiro acesso"/"Acesso ativo"; "Reenviar convite" e "Corrigir e-mail" só nas pendentes; busca encontra pela situação; no modo demonstração, situações fictícias identificadas como tais e ações bloqueadas com o aviso existente
- [x] T089 [US6] GREEN `situacaoDeAcesso(edicaoId)` e `reenviarConvite(...)` em `src/modules/organizacao/data/repositorioSupabase.ts` (+ demonstração com situações fictícias e escrita bloqueada), hook em `src/app/dados/consultas.ts`, coluna e ações em `src/app/paginas/organizacao.tsx`
- [x] T090 [US6] E2E em `e2e-supabase/contas.spec.ts`: corrigir e-mail e reenviar invalida o link anterior; após o primeiro acesso a situação vira "Acesso ativo"

### 8.4 US6 — Recuperação de senha (cenário 4)

**Goal**: "Esqueci minha senha" com resposta neutra e link de 1 hora.
**Independent Test**: [quickstart.md](./quickstart.md) cenário 3.

- [ ] T091 (pendente: depende de `rotas.tsx`/`comum.tsx`/adaptador em edição por outra sessão) [P] [US6] RED `src/modules/auth/ui/EsqueciSenhaPage.test.tsx` e `src/modules/auth/ui/RedefinirSenhaPage.test.tsx`: mesma mensagem para qualquer e-mail ("Se o e-mail estiver cadastrado, enviamos um link válido por 1 hora."); redefinição com senha ≥ 10 e confirmação; link vencido orienta a pedir outro; no modo demonstração, as duas páginas informam "Indisponível no modo demonstração" sem simular envio
- [ ] T092 (pendente: depende de `rotas.tsx`/`comum.tsx`/adaptador em edição por outra sessão) [US6] GREEN páginas em `src/modules/auth/ui/` e métodos `pedirRecuperacao(email)` (`resetPasswordForEmail` com `redirectTo` `/redefinir-senha`) e `redefinirSenha(senha)` em `src/modules/auth/data/adaptadorSupabase.ts` — **arquivo alterado pela outra sessão; combinar**
- [ ] T093 (pendente: depende de `rotas.tsx`/`comum.tsx`/adaptador em edição por outra sessão) [US6] Rotas `/esqueci-senha` e `/redefinir-senha` em `src/app/rotas.tsx` e link "Esqueci minha senha" na entrada (`src/app/paginas/comum.tsx`) — **combinar com a outra sessão**
- [ ] T094 (pendente: depende de `rotas.tsx`/`comum.tsx`/adaptador em edição por outra sessão) [US6] E2E em `e2e-supabase/contas.spec.ts`: e-mail cadastrado e inexistente recebem a mesma resposta; só o cadastrado recebe mensagem no Mailpit; o link redefine a senha

### 8.5 US6 — Importação de alunos por CSV (cenário 5)

**Goal**: importar alunos de uma turma com prévia e relatório.
**Independent Test**: [quickstart.md](./quickstart.md) cenário 4.

- [x] T095 [P] [US6] RED `src/modules/organizacao/domain/importacao.test.ts`: separador `,` ou `;`, BOM UTF-8, aspas, cabeçalho `nome,email` opcional, linhas vazias ignoradas, e-mail inválido, nome 2–160, e-mail repetido no arquivo (sem diferenciar maiúsculas), mais de 500 linhas → arquivo recusado, número da linha original preservado
- [x] T096 [US6] GREEN `src/modules/organizacao/domain/importacao.ts` (TS puro), exportado por `src/modules/organizacao/index.ts`
- [x] T097 [US6] GREEN `supabase/functions/importar-alunos/index.ts`: coordenação (403), turma da edição (400), até 500 linhas (413), revalidação; por linha: `public.usuario_por_email` → vínculo de aluno com o cliente da coordenação (RLS + auditoria), `atribuicoes_aluno_uma_turma` → "Já ativo em outra turma desta edição.", `atribuicoes_unica` → "Já é aluno desta turma."; nova → conta sem senha + convite + e-mail; resposta `{ criadas, vinculadas, recusadas }`
- [x] T098 [P] [US6] RED `src/modules/organizacao/ui/ImportarAlunos.test.tsx`: turma + arquivo → prévia (válidas/recusadas com motivo) sem chamar o servidor; "Importar N alunos" envia só as válidas; relatório criadas/vinculadas/recusadas; bloqueado na demonstração; axe sem violações
- [x] T099 [US6] GREEN `src/modules/organizacao/ui/ImportarAlunos.tsx`, `importarAlunos(...)` no repositório e seção "Importar alunos" em `src/app/paginas/organizacao.tsx` (com entrada em `NavegacaoSecoes`)
- [x] T100 [US6] E2E em `e2e-supabase/contas.spec.ts` com `e2e-supabase/fixtures/alunos.csv` (2 novos, 1 existente sem turma, 1 ativo em outra turma, 1 inválido, 1 duplicado), conforme o cenário 4 do quickstart

### 8.6 Polish & cross-cutting

- [x] T101 [P] ADR `docs/adr/0009-convites-de-acesso.md` (por que token próprio; hash; prazos) e atualização de `docs/adr/0008-criacao-de-contas.md`
- [x] T102 [P] Atualizar `README.md` e `docs/operacao-e-homologacao.md`: Mailpit local, variáveis das funções, provedor de e-mail dos convites **[validar]**, configuração do SMTP próprio do Supabase Auth para a recuperação de senha (remetente e domínio da unidade) **[validar]**, confirmação do bloqueio de SMTP nas funções hospedadas; `docs/decisoes-e-pendencias.md` atualizado
- [x] T103 E2E de autorização (quickstart cenário 5) em `e2e-supabase/contas.spec.ts`: docente recusado em `criar-conta`, `reenviar-convite` e `importar-alunos`
- [x] T104 Verificação final: `npm run verify`, `npm run test:e2e`, `npm run test:db`, `npm run test:e2e:supabase`; tabela de resultados em `specs/002-organizacao-maratona/tasks.md`; marcar T065, T068 e T069

### Dependencies & Execution Order

- 8.1 → 8.2 → (8.3, 8.4, 8.5) → 8.6. Dentro de cada bloco: RED antes do GREEN.
- 8.3 (MVP) depende de T074–T077. 8.4 só depende do Auth (pode começar após 8.1). 8.5 depende de
  T074 (`public.usuario_por_email`, convite) e de T080 (criação de conta sem senha reutilizada).
- T087, T092 e T093 dependem de alinhamento com a sessão que edita `rotas.tsx`, `comum.tsx` e o
  adaptador de autenticação.

### Parallel Opportunities

- 8.2: T075, T076 e T077 em paralelo (arquivos distintos) enquanto T073/T074 avançam.
- 8.3: T081 e T082 em paralelo após T080; T083, T085 e T088 (testes de interface) em paralelo.
- 8.5: T095 (domínio) e T098 (interface) em paralelo; T097 após T074.

### Implementation Strategy

1. **MVP** = 8.1 + 8.2 + 8.3: nenhuma senha passa pela coordenação; convite, primeiro acesso,
   situação e reenvio funcionando e testados.
2. Incremento 2 = 8.4 (recuperação), assim que as rotas forem combinadas.
3. Incremento 3 = 8.5 (importação CSV).
4. 8.6 fecha documentação e verificação.

## Resultado da verificação (2026-10-30, 8.5 e 8.6)

| Verificação                        | Resultado                                               |
| ---------------------------------- | ------------------------------------------------------- |
| `npm run verify`                   | sem erros nem avisos; 38 arquivos, 359 testes; build ok |
| `npm run test:e2e` (demonstração)  | 17 passando                                             |
| `npm run test:db` (pgTAP)          | 95/95                                                   |
| `npm run test:e2e:supabase` (real) | 21 passando (após aquecer o servidor; ver nota)         |

Notas: leitor de CSV (T095) e tela de importação (T098) vistos em RED antes do código; os E2E de
importação (T100, T103) foram escritos depois da função. O primeiro teste com interface da suíte
real chegou a esgotar 30 s e 60 s quando o Vite refazia a pré-otimização de dependências (após
mudança no `vite.config.ts`); o tempo limite da suíte passou a 60 s e, com o cache aquecido,
todos passaram. O CSV do E2E é gerado no teste (e-mails únicos), em vez de `fixtures/alunos.csv`.
Pendentes: T087 e T091–T094 (rotas e tela de entrada em edição por outra sessão).

## Resultado da verificação (2026-10-30, MVP 8.1–8.3)

| Verificação                        | Resultado                                                            |
| ---------------------------------- | -------------------------------------------------------------------- |
| `npm run verify`                   | typecheck e lint sem avisos; 36 arquivos, 347 testes; build ok       |
| `npm run test:e2e` (demonstração)  | 17 passando                                                          |
| `npm run test:db` (pgTAP)          | 95/95 (27 novos em `004_convites_acesso.test.sql`)                   |
| `npm run test:e2e:supabase` (real) | 19 passando na 2ª execução; na 1ª, 1 falha por tempo (servidor frio) |

Notas de TDD: pgTAP (27 falhas), funções compartilhadas, E2E de contas, `FormConta`,
`PrimeiroAcessoPage` e `AcessoDaConta` vistos em RED antes do código. Exceções: o teste de
`_shared/autorizacao.ts` (T077) e o E2E de reenvio (T090) foram escritos junto/depois do código.
Achados: (1) conta criada sem senha recebe senha aleatória no Auth — o critério de "Acesso
ativo" passou a ser convite usado ou login após o convite (research R4); (2) o cliente
administrativo só chama funções do schema `public` — as funções exclusivas do servidor ficaram
em `public` com execução revogada de `anon`/`authenticated` (pgTAP cobre).

## Resultado da verificação (2026-10-30, após T063 e T067)

| Verificação                        | Resultado                                             |
| ---------------------------------- | ----------------------------------------------------- |
| `npm run typecheck` / `lint`       | sem erros nem avisos                                  |
| `npm run test`                     | 31 arquivos, 320 testes                               |
| `npm run test:db` (pgTAP)          | 68/68 (12 novos em `003_regras_organizacao.test.sql`) |
| `npm run test:e2e:supabase` (real) | 16 passando                                           |

TDD: pgTAP em RED (4 falhas) antes da migration `20261030120000_regras_turma_ambiente.sql`;
testes dos formulários em RED antes do código. Achado na verificação: o erro de remoção
aparecia fora do diálogo de confirmação (encoberto); passou a ser exibido dentro dele.

## Resultado da verificação (2026-10-30, após T060–T062)

| Verificação                        | Resultado                       |
| ---------------------------------- | ------------------------------- |
| `npm run typecheck` / `lint`       | sem erros nem avisos            |
| `npm run test`                     | 30 arquivos, 315 testes         |
| `npm run test:db` (pgTAP)          | 56/56                           |
| `npm run test:e2e:supabase` (real) | 15 passando (2 novos de edição) |

## Resultado da verificação (2026-10-29)

| Verificação                        | Resultado                                           |
| ---------------------------------- | --------------------------------------------------- |
| `npm run typecheck` / `lint`       | sem erros nem avisos                                |
| `npm run test`                     | 18 arquivos, 124 testes                             |
| `npm run build`                    | ok (aviso de chunk > 500 kB segue como pendência)   |
| `npm run test:e2e` (demonstração)  | 14 passando                                         |
| `npm run test:db` (pgTAP)          | 56/56 (22 da spec 001 + 34 da spec 002)             |
| `npm run test:e2e:supabase` (real) | 13 passando (duplas, encontros, cursos, contas/API) |

Notas de TDD: testes pgTAP, de domínio e dos formulários foram executados em RED antes da
implementação. Os testes de `modules/demo/repositorios` foram escritos junto com a
implementação. Falhas encontradas na verificação foram de seletores dos próprios testes
(corrigidos), e um defeito real de interface: o formulário de novo encontro sugeria número 1
antes de a lista carregar (corrigido; com todos os encontros cadastrados o formulário não é
oferecido).
