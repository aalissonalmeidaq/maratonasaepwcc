# Quickstart: validar comunicados e regulamento (spec 009)

## Pré-requisitos

- Docker com o Supabase local nas portas 5442x (`npx supabase start`), `npx supabase db reset`.
- Contas fictícias do seed, senha `senha-local-123`:
  - `coordenacao@exemplo.invalid`;
  - `docente@exemplo.invalid` (3º ano A) e `docente2@exemplo.invalid` (3º ano B e outra turma);
  - `aluna@exemplo.invalid` (Ana, 3º ano A) e `iris@exemplo.invalid` (Categoria B).

## Portões automáticos

| Comando                     | O que prova                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`            | tipos, lint, testes de domínio (`validarComunicado`, `resumoDoRegulamento`), componentes com axe e build              |
| `npm run test:db`           | `supabase/tests/010_comunicados.test.sql`: autoria, público, RLS, avisos únicos, correção, retirada, edição encerrada |
| `npm run test:e2e`          | demonstração: comunicados fictícios, escrita desabilitada, regulamento                                                |
| `npm run test:e2e:supabase` | `e2e-supabase/comunicados.spec.ts`: as jornadas abaixo                                                                |

## Jornadas manuais (Supabase local)

1. **Coordenação publica para uma turma (US1, US2).** Como coordenação, em "Comunicados e
   regulamento", criar "Mudança de sala" para Estudantes, turma 3º ano A, e publicar. Esperado:
   "Comunicado publicado." com data e hora. Como Ana: o comunicado aparece com "Novo" em
   "Regulamento e avisos" e há 1 aviso a mais; "Marcar como lido" tira o selo. Como Íris e como
   `docente@`: o comunicado não aparece.
2. **Docente publica só nas próprias turmas (esclarecimento 1).** Como `docente@`, em
   "Comunicados", o formulário lista só o 3º ano A; publicar para Estudantes. Ana vê, com
   "por Prof. … (docente)". Uma chamada direta a `salvar_comunicado` com a turma do 3º ano B
   recebe `42501` (coberto no pgTAP).
3. **Correção avisa de novo (esclarecimento 3, US3).** Como `docente@`, corrigir o texto com
   justificativa. Ana vê o texto novo, "Atualizado em …", o selo "Novo" de volta e um aviso
   "Comunicado atualizado". `docente2@` não consegue corrigir; a coordenação consegue.
4. **Retirada.** Como coordenação, retirar com justificativa. Ana não vê mais; a coordenação vê
   "Retirado" e a justificativa. Nenhum aviso novo.
5. **Regulamento (US4).** Os valores da página batem com `edicoes.regras` da edição do seed
   (presença, participação, questões, entrega, apresentação, prova oficial, faixas de atraso,
   teto de descontos e prazo de revisão) e a versão exibida é `regras_versao`.
6. **Offline.** Com a rede desligada nas ferramentas do navegador, os botões de escrita ficam
   desabilitados com "Sem conexão" e a lista não vem do cache.

## Resultados

### Estado inicial (2026-11-03)

- `npm run test:db`: 9 arquivos, 809 asserções passando.
- `npm run verify`: 75 arquivos de teste, 615 testes, build ok (rodado ao fim da spec 008).

### Portões finais (2026-11-03)

| Portão                                             | Resultado                                                   |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `npm run verify`                                   | tipos, lint e build ok; 83 arquivos de teste, 655 testes    |
| `npm run test:db`                                  | 10 arquivos, 929 asserções (120 novas em `010_comunicados`) |
| `npm run test:e2e`                                 | 61 passaram, 1 pulado (como antes)                          |
| `npm run test:e2e:supabase`                        | 60/60 (2 jornadas novas em `comunicados.spec.ts`)           |
| `node scripts/testar-concorrencia-comunicados.mjs` | aprovado: 1 aviso por estudante na publicação e na correção |
| Demais scripts de concorrência e paridade          | aprovados; paridade com 0 divergências                      |

`npx supabase db reset` ao final.

### Desvios e observações

- O E2E real encontrou um defeito que os testes de unidade não pegavam: `retirar_comunicado` e
  `apagar_rascunho` não devolvem dados e o repositório tratava a resposta vazia como erro.
  Corrigido com `verificarGravacao` e um teste de repositório novo.
- Datas nas listas seguem `formatarDataHora` do projeto ("03 de nov., 14:00"), como as demais
  telas, e não `DD/MM/AAAA HH:MM` como estava em `contracts/telas.md`.
- SC-002 contado em cliques, além de digitar título e texto: docente com uma turma publica em 3
  (novo comunicado, público, publicar); com várias turmas, 4.
- A confirmação da retirada aparece no item, que continua na lista como "Retirado"; o formulário
  fecha depois da resposta do servidor.
- A página de avisos leva o aviso de comunicado à página do perfil (link "Ler: <título>").
- O E2E real usa `timeout: 180_000` por jornada, porque cada uma entra com três ou quatro contas.
