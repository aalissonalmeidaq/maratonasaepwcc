# Pesquisa (Fase 0): Unidades, usuário master e gestão da unidade

Base: `perfis`, `atribuicoes` (papel por edição), `edicoes`, `cadastro_cursos`/`cadastro_turmas`
(spec 010), auxiliares de permissão (`app.tem_papel`, `app.participa_da_edicao`,
`app.e_coordenacao`, `app.e_coordenacao_em_alguma`, `app.coordena_alguma_edicao`), gatilho
`app.criar_perfil_do_usuario` (perfil nasce do `auth.users`), Edge Functions de contas (ADR 0008,
0009), `minha sessão` montada de `perfis` + `atribuicoes` no front, premissas (spec 015) e
regulamento público (spec 014). Nenhum item ficou como NEEDS CLARIFICATION.

## R1. Modelo de unidade, master e funções

- **Decisão:**
  - `public.unidades` (`id`, `nome` único sem diferenciar maiúsculas, `ativa`, `desativada_em`,
    `justificativa_desativacao`, `criado_em`).
  - `public.masters` (`usuario_id` PK → `perfis`, `ativo`, `criado_em`): perfil de rede.
  - `perfis.unidade_id` (→ `unidades`): a unidade da conta; `null` só para master (gatilho
    recusa master com unidade e conta de unidade sem unidade, exceto masters).
  - `public.funcoes_unidade` (`usuario_id`, `funcao` enum `funcao_unidade` = `gestao`,
    `coordenacao`, `docente`, `mentor`, `analista`; `ativa`; PK `usuario_id, funcao`): funções
    da conta **na unidade** (FR-006b). A unidade é a de `perfis.unidade_id` — uma conta, uma
    unidade, várias funções.
  - `edicoes.unidade_id` e `cadastro_cursos.unidade_id` `not null`; unicidade do nome do curso
    passa a ser por unidade.
- **Motivo:** FR-001, FR-006b, FR-008. `atribuicoes` (papel por edição) continua igual: a função
  da unidade diz "quem a pessoa é na unidade"; a atribuição diz "o que faz em cada edição".
  Estudantes não têm função de unidade: são estudantes pela atribuição `aluno`.
- **Alternativas:** papel de unidade dentro de `atribuicoes` com `edicao_id` nulo (mistura dois
  conceitos e quebra as consultas por edição); `unidade_id` em todas as tabelas (redundante:
  tudo já pendura em `edicoes` ou no cadastro).

## R2. Isolamento por unidade (FR-008, FR-009, SC-001)

- **Decisão:** a separação vem de dois pontos:
  1. **Integridade:** gatilhos recusam atribuição cuja conta seja de outra unidade que a da
     edição; vínculo de cadastro de outra unidade à edição; turma de cadastro em curso de outra
     unidade. Atribuição de `coordenacao`, `docente` ou `mentor` exige a função correspondente
     ativa na unidade (alunos não precisam de função).
  2. **Leitura:** os auxiliares centrais (`app.tem_papel`, `app.participa_da_edicao`,
     `app.e_coordenacao`, `app.e_coordenacao_em_alguma`, `app.coordena_alguma_edicao`) passam a
     exigir **unidade ativa** (da edição e da conta). Funções que não passam por eles
     (perfil próprio, avisos, marcar comunicado lido, `minha_conta`, RPCs de master e gestão)
     são revisadas uma a uma na T027. Como toda política e RPC por edição já
     passa por eles, unidade desativada perde acesso em todas as operações (FR-009).
     O cadastro permanente (políticas `cadastro_*_ler` e RPCs) passa a filtrar pela unidade de
     quem pede. A busca `pessoas_para_vincular` filtra pela unidade da edição.
- **Motivo:** como atribuições nunca cruzam unidades, as políticas existentes por edição já
  isolam; o pgTAP de isolamento cobre as tabelas e RPCs principais com duas unidades.
- **Alternativas:** reescrever cada política com `unidade_id` (centenas de pontos, risco de
  esquecer um).

## R3. Unidade inicial (FR-010, SC-003)

- **Salvaguarda:** `edicoes.unidade_id` e `cadastro_cursos.unidade_id` têm como padrão
  `app.unidade_inicial()`, que só devolve a unidade enquanto a instalação tiver uma única
  unidade; com duas ou mais, recusa ("Informe a unidade."). Assim as fixtures antigas e o seed
  com uma unidade funcionam, e nenhum caminho de produção grava na unidade errada em silêncio.
  Uma conta sem unidade recebe a da edição na primeira atribuição, exceto conta master
  (recusada). Índices em `perfis.unidade_id` e `edicoes.unidade_id`.

- **Decisão:** a migration cria a unidade "SENAI Juazeiro do Norte", liga a ela todas as
  edições, cursos do cadastro e perfis existentes, e cria as funções de unidade a partir das
  atribuições ativas (`coordenacao` → `coordenacao`, `docente` → `docente`, `mentor` → `mentor`,
  `analista` → `analista`). Nenhuma conta vira gestão nem master (decisão do usuário).
- **Motivo:** nenhum comportamento muda para os perfis atuais; as suítes antigas continuam
  verdes (com fixtures ajustadas para criar a unidade).

## R4. Master (FR-001, FR-002, FR-004)

- **Decisão:** primeiro master por `app.promover_master(p_email text)`, executável só pela
  administração do banco (sem `grant` a `anon`/`authenticated`); local: `seed.sql` cria
  `master@exemplo.invalid`. Masters seguintes por convite (R6). `desativar_master` recusa a
  própria conta e o último master ativo. O master não tem atribuição nem função: nenhuma
  política de dados de edição o inclui (FR-004 por construção).
- **Motivo:** ninguém vira master pela interface sem já ser master.

## R5. Edições e coordenação (FR-006, FR-006c)

- **Decisão:** `criar_edicao` passa a aceitar quem tem função `gestao` ou `coordenacao` ativa na
  unidade; a edição nasce na unidade de quem cria; novo parâmetro `p_coordenacao uuid` (obrigatório
  para quem só é gestão; padrão: quem cria, se for coordenação). Nova RPC
  `definir_coordenacao_da_edicao(p_edicao, p_usuario, p_ativa, p_justificativa)` para gestão e
  coordenação da edição, com a regra existente de manter ao menos uma coordenação ativa; a
  pessoa precisa ter a função `coordenacao` na unidade. `desativar_membro` recusa a conta que é
  a última coordenação ativa de alguma edição não encerrada ("Indique outra coordenação antes.").
- **Motivo:** decisões do usuário de 2026-11-05; a spec 010 já protege "ao menos uma
  coordenação".

## R6. Contas: master, gestão e equipe (FR-002, FR-003, FR-005)

- **Decisão:** Edge Function nova `contas-da-rede`, no padrão de `criar-conta` (autorização com o
  cliente sujeito à RLS de quem chama; criação com o cliente administrativo; compensação em
  falha; convite para criar a senha — ADR 0009), com três ações:
  `master` (quem chama é master), `gestao` (master; `unidadeId`) e `equipe` (gestão da unidade;
  `funcoes[]`). A unidade vai em `raw_user_meta_data.unidade_id`; `app.criar_perfil_do_usuario`
  passa a gravá-la. As funções e o registro de master são gravados por RPC como quem chama
  (auditoria). `criar-conta` e `importar-alunos` (coordenação) gravam a unidade da edição.
  E-mail já existente é recusado pelo próprio Auth ("E-mail já cadastrado."), em qualquer
  unidade. Reenvio de convite reaproveita `reenviar-convite` (master para gestão e masters;
  gestão para a equipe).
- **Motivo:** chave secreta só no servidor (constituição V); um padrão já testado.
- **Alternativas:** criar conta só por RPC (impossível sem a chave do Auth).

## R7. Analista (FR-006a)

- **Decisão:** `painel_da_coordenacao` e `relatorio` aceitam também quem tem função `analista`
  ativa na unidade da edição (`app.e_analista_da_edicao`). Área `analista` no front: início com o
  painel da edição em uso **sem** links de ação e a tela de relatórios. Nada de escrita.
- **Motivo:** decisão do usuário; os relatórios já não trazem nota individual nem contato.

## R8. Sessão e áreas no front

- **Decisão:** RPC `minha_conta()` → `{ nome, master, unidade: {id, nome, ativa} | null,
funcoes[], papeis[] }`; o adaptador Supabase monta a sessão com ela. `Area` ganha `master`,
  `gestao` e `analista`; prioridade da área inicial: master → gestão → coordenação → docente →
  analista → aluno. Quem tem mais de uma área troca pelo menu ("Trocar de área"). Unidade
  desativada: página "Unidade desativada. Procure a gestão da rede." (e o servidor já recusa).
  Áreas e itens de menu:
  - **master:** Início (unidades sem gestão, premissas aguardando), Unidades, Masters,
    Premissas em validação.
  - **gestão:** Início (equipe, edições), Equipe da unidade, Edições, Premissas em validação.
  - **analista:** Início (painel), Relatórios.
- **Motivo:** FR-006b (funções acumuladas) e R4 da spec 001 (navegação não é barreira: a barreira
  é o servidor).

## R9. Premissas (FR-012, FR-013)

- **Decisão:** `responder_premissa` passa a exigir `app.e_master()`. `premissas_em_validacao`
  lê para master (`podeResponder = true`) e para quem tem função `gestao`, `coordenacao`,
  `docente` ou `mentor` ativa (ou atribuição desses papéis); analista, estudante e visitante →
  `42501`. O aviso de premissas sai do início da coordenação e vai para o do master.
- **Motivo:** decisão do usuário; histórico da spec 015 preservado (tabela só de inserção).

## R10. Regulamento público (FR-011)

- **Decisão:** `regulamento_publico()` acrescenta `unidade` (nome) a cada edição; a página mostra
  "Unidade: <nome>" no título de cada edição.

## R11. Demonstração e seed

- **Decisão:** contas fictícias novas "Master (fictício)", "Gestão da unidade (fictícia)" e
  "Analista (fictício)"; duas unidades fictícias na demonstração (a atual e "Unidade Fictícia B", sem dados de
  estudantes; a demonstração não usa o banco). Escritas recusadas como sempre. Seed local:
  `master@exemplo.invalid`, `gestao@exemplo.invalid` (gestão da unidade inicial) e
  `analista@exemplo.invalid`, com **uma única unidade** — compatível com a salvaguarda de R3. A
  segunda unidade nasce dentro dos testes: no pgTAP, na transação; no E2E com Supabase, cadastrada
  pelo master na tela ("Unidade C").

## R12. Documentação

- **Decisão:** ADR 0013 "Multiunidade" (modelo R1–R2, master, funções); P25 da spec 015 marcada
  como resolvida pela spec 016 (`resolvida_por`) em migration; operação: como criar o primeiro
  master em produção.
