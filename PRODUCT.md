# Maratona de Competências SAEP

<!-- impeccable:product-schema 1 -->

## Platform

web

## Usuários

Estudantes dos 3º anos do ensino médio dos cursos técnicos do SENAI Juazeiro do
Norte, docentes, coordenação e mentor SAEP. O contexto e esses públicos foram
confirmados pelo usuário; não foi definido um público prioritário entre eles.

## Propósito do produto

Centralizar a operação da Maratona de Competências SAEP e tornar critérios e
resultados rastreáveis. A aplicação organiza duplas, encontros, atividades,
entregas, presença, avaliações, pontuação e classificação.

## Contexto de operação

Aplicação web/PWA para computador, tablet e celular. As jornadas são organizadas
por perfil: estudantes acompanham a dupla e a competição; docentes acompanham
turmas, presença e avaliações; a coordenação organiza a edição e acompanha sua
operação. O escopo específico do mentor SAEP permanece sujeito às especificações.

O repositório identifica o produto como piloto em desenvolvimento. Capacidade
planejada não equivale a funcionalidade concluída ou homologada. Consultar as
especificações em `specs/`, os módulos implementados e os ADRs em `docs/adr/`
antes de afirmar disponibilidade de uma função.

## Capacidades e restrições

- Base existente: React, TypeScript, Vite e Tailwind; Supabase para autenticação,
  PostgreSQL com RLS e armazenamento. A autorização deve ser aplicada no backend.
- Demonstrações e seeds usam dados fictícios identificados como tais; o modo de
  demonstração não comprova autenticação segura nem operações persistidas.
- Entregas, registros e avaliações só podem ser apresentados como concluídos após
  confirmação bem-sucedida do servidor.
- O PWA armazena o shell estático. Dados autenticados não entram no cache do
  service worker; escrita offline e sincronização estão fora do escopo atual.
- Regras de competição são configuração versionada. O regulamento e o projeto
  pedagógico aprovados não constam como fornecidos na documentação consultada;
  regras de pontuação e premiação provisórias não devem ser apresentadas como
  aprovação institucional.
- Dados pessoais, ocorrências e notas individuais da prova oficial não devem
  aparecer no ranking público nem em cache público.
- Documentação e interface usam português do Brasil.

## Compromissos de marca

Preservar a identidade institucional e os arquivos existentes. As referências
estão em `docs/referencias/` e os ativos publicados em `public/brand/`.
Não redesenhar, distorcer ou presumir marcas oficiais ausentes. A existência de
um arquivo não comprova aprovação institucional.

## Evidências disponíveis

- `docs/referencias/PRD_Sistema_Maratona_SAEP.md`: requisitos do produto.
- `docs/referencias/`: visão, sistema de design, tokens e referências de identidade.
- `public/brand/`: SVGs da Maratona e `senai-ceara-branco.svg`.
- `src/modules/demo/dados.ts`: conteúdo fictício para demonstração, sem valor de
  evidência de resultados reais.
- `docs/decisoes-e-pendencias.md`: premissas, divergências e validações pendentes.
- `.specify/memory/constitution.md`: princípios de segurança, privacidade,
  acessibilidade e rastreabilidade estabelecidos no projeto.

Não inventar depoimentos, resultados, prêmios, datas ou validações institucionais.

## Princípios do produto

1. Manter critérios, registros e resultados rastreáveis.
2. Apresentar o estado real de cada operação e distinguir demonstração de uso real.
3. Proteger os dados dos estudantes, inclusive menores de idade.
4. Preservar regras e identidade institucionais; explicitar decisões pendentes.
5. Permitir o uso das jornadas nos dispositivos previstos e por teclado.

## Acessibilidade e inclusão

A constituição do projeto exige navegação por teclado, foco visível, campos com
rótulos, estados expressos por texto além de cor e contraste mínimo de 4,5:1 para
texto normal. As telas devem funcionar em celular, tablet e desktop.
Esses requisitos não constituem uma certificação de conformidade já obtida.

## Decisões em aberto

- O usuário informou que fornecerá correções e compromissos adicionais; o teor
  ainda não foi recebido. Não presumir que todas as premissas do repositório foram
  aprovadas por essa confirmação do contexto geral.
- Validar regulamento, pontuação, premiação e demais regras provisórias com a unidade.
- Validar aprovação e versão dos ativos institucionais. A documentação registra
  ausência da marca SENAI, mas existem SVGs em `public/brand/` e
  `docs/referencias/identidade visual/`; a divergência permanece registrada.
- Confirmar política de retenção e tratamento de dados de menores, hospedagem,
  domínio e detalhes operacionais ainda listados em `docs/decisoes-e-pendencias.md`.

Contexto geral confirmado pelo usuário em 29/10/2026. Restrições e evidências
acima registram fontes existentes; pendências institucionais continuam abertas.
