<!--
Sync Impact Report
- Versão: (template) → 1.0.0
- Princípios definidos: I a X (todos novos)
- Seções adicionadas: Restrições de Segurança e Dados; Fluxo de Desenvolvimento e Portões de Qualidade
- Seções removidas: nenhuma
- Templates: plan/spec/tasks leem esta constituição em tempo de execução; nenhum template alterado.
- TODO: RATIFICATION_DATE adotada provisoriamente como 2026-10-29; confirmar com a coordenação.
-->

# Constituição do Sistema Maratona de Competências SAEP

## Princípios Fundamentais

### I. Desenvolvimento Orientado por Especificações

Toda funcionalidade MUST nascer de uma especificação incremental em `specs/NNN-nome/`, com
problema, histórias, critérios de aceite verificáveis, dúvidas e dependências, seguida de plano
técnico e lista de tarefas rastreáveis, usando o fluxo do GitHub Spec Kit
(`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).
Especificações genéricas que tentam cobrir o sistema inteiro são proibidas.
Racional: as regras do piloto ainda estão em validação; especificações pequenas permitem
revisar e aceitar cada parte.

### II. Testes Primeiro (TDD) para Regras e Fluxos Relevantes

Regras de pontuação, presença, prova oficial, penalidades, desempate, autorização, submissão
e rotas protegidas MUST seguir o ciclo RED → GREEN → REFACTOR: o teste é escrito, executado e
falha pelo motivo esperado antes da implementação. Testes MUST verificar comportamento
observável, não espelhar a implementação. Testes de domínio, de componentes, de integração
com Supabase e E2E são mantidos separados.

### III. Monólito Modular

O produto é um único repositório e uma única aplicação implantável, dividida em módulos de
negócio em `src/modules/<modulo>` com API pública explícita (`index.ts`). Um módulo MUST NOT
importar arquivos internos de outro módulo. O núcleo de domínio (`domain/`) MUST ser
TypeScript puro, sem React, sem navegador e sem Supabase, testável isoladamente.
Microsserviços são proibidos sem nova emenda desta constituição.

### IV. TypeScript Estrito

O código MUST compilar com `strict`, `noUncheckedIndexedAccess` e sem `any` implícito.
`any` explícito exige justificativa em comentário. Lint, checagem de tipos e testes MUST passar
antes de qualquer entrega ser considerada concluída.

### V. Segurança no Servidor e Menor Privilégio (INEGOCIÁVEL)

Ocultar botões no React não é segurança. Toda autorização efetiva MUST ser aplicada no
Supabase (RLS em todas as tabelas expostas, políticas por perfil e vínculo, funções RPC ou
Edge Functions para regras sensíveis). Operações que alteram notas, pontos, penalidades ou
classificação MUST ser atômicas, idempotentes e auditadas no servidor. `service_role`,
senhas, tokens privados ou segredos MUST NOT existir no frontend nem no repositório; só
variáveis públicas com prefixo `VITE_` chegam ao navegador. Nenhum perfil recebe acesso amplo
automático; permissões de apoio técnico-administrativo e analista educacional são atribuídas
explicitamente pela coordenação.

### VI. Proteção de Dados de Estudantes

O sistema trata dados de estudantes, inclusive menores de idade. Coleta MUST ser mínima;
notas individuais da prova oficial, ocorrências e dados pessoais MUST NOT aparecer no ranking
público nem em cache público do service worker. Seeds e demonstrações MUST usar apenas dados
fictícios, identificados como tal. Retenção e responsabilidades seguem política institucional
a ser validada.

### VII. Confirmação do Servidor e Offline Honesto

A interface MUST NOT apresentar entrega, registro, avaliação ou pontuação como concluídos sem
resposta bem-sucedida do servidor. O PWA permite leitura offline apenas de estrutura e conteúdo
público previamente carregado; escrita offline com sincronização MUST NOT ser implementada
sem especificação própria de segurança e conflitos.

### VIII. Acessibilidade, Responsividade e Identidade Visual

Telas MUST funcionar em celular, tablet e desktop (mobile-first), com navegação por teclado,
foco visível, rótulos em campos, estados comunicados por texto além de cor e contraste mínimo
de 4,5:1 para texto normal. A interface MUST usar os tokens e arquivos de marca aprovados em
`docs/referencias/`; marcas oficiais MUST NOT ser redesenhadas, distorcidas ou presumidas —
na ausência do arquivo, usa-se área provisória identificada e a pendência é registrada.

### IX. Rastreabilidade e Mudanças Pequenas

Cada tarefa referencia sua história/requisito (RFxx, HUxx, FR-xxx). Mudanças são pequenas e
verificáveis. Decisões técnicas relevantes são registradas em ADRs curtas em `docs/adr/`;
premissas e pendências em `docs/decisoes-e-pendencias.md`.

### X. Nada Inventado, Tudo em Português do Brasil

Regras, dados, integrações, prêmios, valores, datas e conteúdos de documentos ausentes MUST NOT
ser inventados. Regras de competição são configuração versionada da edição, não constantes
fixas no código. Lacunas são registradas como pendências. Documentação, mensagens de interface
e especificações são escritas em português do Brasil.

## Restrições de Segurança e Dados

- Stack: TypeScript, Vite, React, Tailwind CSS, Supabase (Auth, PostgreSQL, Storage), PWA.
- Migrations versionadas em `supabase/migrations/`; nunca executadas em produção pelo agente.
- O projeto não se conecta automaticamente a bancos remotos existentes.
- Buckets de arquivos sensíveis são privados; uploads têm tipo e tamanho validados.
- Operações críticas geram registro de auditoria com autor, horário do servidor e justificativa.
- `.env.example` contém apenas nomes de variáveis e valores fictícios.

## Fluxo de Desenvolvimento e Portões de Qualidade

1. Especificar → planejar → quebrar em tarefas → testar (RED) → implementar (GREEN) →
   refatorar → verificar → documentar.
2. Portões obrigatórios antes de declarar uma entrega concluída: `npm run typecheck`,
   `npm run lint`, `npm run test`, `npm run build`; E2E das jornadas afetadas quando existirem.
3. Se um comando não puder ser executado, a entrega MUST registrar a causa e a evidência; não se
   declara sucesso sem verificação.
4. Autorização só é considerada validada quando testada contra o banco com usuários de perfis e
   vínculos distintos.

## Governança

Esta constituição prevalece sobre outras práticas do repositório. Em divergências de conteúdo,
vale a ordem: instruções explícitas mais recentes do usuário; regulamento e projeto pedagógico
aprovados; PRD e documento de visão; Design System e arquivos visuais aprovados; premissas
técnicas registradas. Emendas exigem registro do motivo, atualização de versão semântica
(MAJOR: remoção ou redefinição de princípio; MINOR: novo princípio ou seção; PATCH: redação) e
revisão dos planos ativos. Todo plano MUST conter a seção "Constitution Check" verificando
estes princípios.

**Version**: 1.0.0 | **Ratified**: 2026-10-29 | **Last Amended**: 2026-10-29
