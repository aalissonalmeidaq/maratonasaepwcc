# Implementation Plan: Atividades, entregas, presença e avaliação dos encontros

**Branch**: `006-atividades-avaliacao` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-atividades-avaliacao/spec.md`. Ela era a spec
008 e foi renumerada para 006 a pedido do usuário em 2026-10-30.

## Summary

Esta spec implementa o Incremento 3: desafios com entrega (arquivo no Storage privado ou link) e
comprovante emitido pelo servidor; presença individual e participação por equipe; avaliação por
rubrica com feedback; listas de questões com submissão única por equipe e gabarito protegido; e
pontuação parcial da equipe.

Uma nova migration cria nove tabelas: `desafios`, `desafio_turmas`, `entregas`, `prorrogacoes`,
`presencas`, `participacoes`, `avaliacoes`, `listas_questoes`/`lista_turmas`/`questoes`/
`alternativas` e `submissoes_questoes`. Também cria o bucket privado `entregas`, com limites de
tipo e tamanho e políticas de Storage. Todas as tabelas têm RLS e nenhuma escrita direta para
`authenticated`: toda escrita passa por RPC `security definer` transacional e auditada.

Limites, faixas de atraso e critérios vêm de `edicoes.regras` (FR-025). Correções exigem
justificativa e ficam na trilha de auditoria (antes/depois).

O aluno nunca lê `questoes.justificativa` nem `alternativas.correta` diretamente: a RPC
`lista_para_equipe` só devolve o gabarito depois do prazo.

A pontuação parcial (US5) vem da RPC `lancamentos_da_minha_equipe`, que devolve os lançamentos
brutos e as regras da edição. O cálculo usa `calcularEncontro` do domínio TS, já testado com os
casos de contrato (SC-006).

O novo módulo `src/modules/atividades` reúne:

- `domain`: tipos, validações puras e montagem dos lançamentos;
- `data`: repositório Supabase, incluindo o upload no Storage;
- `ui`: formulários de desafio e de lista, envio, presença, avaliação, questões e pontuação.

As páginas existentes passam a usar dados reais: "Desafios e entregas" e "Pontuação" do aluno, e
"Presença" e "Avaliações" do docente. A área docente ganha a página "Atividades", e a coordenação
reutiliza "Presença" e "Avaliações" para correções e prorrogações. A demonstração continua
somente leitura, com dados fictícios.

### Decisões dos esclarecimentos refletidas no desenho

| Decisão                                                                              | Requisito              | Onde está no desenho                                      |
| ------------------------------------------------------------------------------------ | ---------------------- | --------------------------------------------------------- |
| Vários desafios e listas por encontro; cada componente vale a média simples          | FR-026                 | Média calculada em `montarLancamentos` no domínio TS (R9) |
| Encerramento automático pelo horário do servidor, com encerramento manual antecipado | FR-027                 | Situação derivada nas RPCs e na leitura, sem job (R2.1)   |
| Primeiro registro feito por docente ou mentor; a coordenação só corrige              | FR-011                 | Checagem nas RPCs de presença, participação e avaliação   |
| Mentor com as mesmas permissões do docente                                           | FR-001, FR-007, FR-016 | `app.atua_na_turma` em todas as ações de docente          |
| Arquivos PDF, ZIP, PNG e JPG de até 50 MB                                            | FR-003                 | Configuração do bucket e checagem na RPC                  |
| Presença só presente/ausente, com observação opcional                                | FR-009                 | Coluna `presencas.observacao`                             |
| Arquivos órfãos                                                                      | Caso de borda          | Pendência operacional (R7)                                |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: React 19, React Router, Tailwind, @tanstack/react-query 5,
  supabase-js 2 (Storage), react-hook-form e zod. Nenhuma dependência nova.
- **Storage**: Supabase PostgreSQL e Storage local (portas 5442x), com o bucket privado `entregas`.
- **Testing**:
  - Vitest + Testing Library + axe;
  - pgTAP em `supabase/tests/007_atividades_avaliacao.test.sql`, incluindo as políticas de
    Storage;
  - Playwright: demo em `e2e/` e Supabase real em `e2e-supabase/atividades.spec.ts`, com upload
    real;
  - script de concorrência para a submissão única (SC-007).
- **Target Platform**: PWA responsiva (320 px a desktop).
- **Project Type**: aplicação web (monólito modular) com banco Supabase.
- **Performance Goals**: SC-003, presença de 30 alunos em menos de 2 minutos: uma tela e um
  único envio em lote.
- **Constraints**:
  - autorização só no servidor;
  - horário do servidor para prazo e atraso;
  - nenhum sucesso simulado;
  - nada autenticado no cache do SW;
  - nenhum valor de regra fixo no SQL ou na UI (sempre `edicoes.regras`).
- **Scale/Scope**: uma edição, quatro encontros e algumas turmas; volume de produção não
  informado.

## Constitution Check

| Princípio           | Atendimento                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I/IX SDD e rastreio | Spec 006 com esclarecimentos; tarefas ligadas a US/FR/SC                                                                                                                             |
| II TDD              | pgTAP por tabela/RPC/política de Storage e testes de domínio/componentes escritos e vistos falhando antes do código                                                                  |
| III Modular         | Novo módulo `atividades` com `index.ts`; domínio TS puro, usando `@/modules/pontuacao` só para tipos e cálculo                                                                       |
| IV Estrito          | Sem `any`; JSON das RPCs tipado no repositório                                                                                                                                       |
| V Servidor          | RLS em todas as tabelas novas; sem escrita direta; RPCs com checagem de vínculo; Storage privado com políticas por equipe e gestão; operações auditadas                              |
| VI Dados            | Aluno só vê a própria equipe e turma; gabarito protegido até o prazo; sem notas de outras equipes                                                                                    |
| VII Confirmação     | Comprovante só após a RPC; envio/submissão/presença/avaliação bloqueados offline; demonstração não grava                                                                             |
| VIII A11y           | Componentes compartilhados; axe em todos os novos formulários; E2E em 412 px                                                                                                         |
| X Nada inventado    | Limites e faixas vêm de `edicoes.regras`; formatos/tamanho de arquivo (PDF, ZIP, PNG, JPG até 50 MB), permissões do mentor e média por encontro decididos pelo usuário em 2026-10-30 |

Resultado (pré e pós-design): aprovado. Exceção registrada: a limpeza de arquivos órfãos no
Storage fica como pendência operacional (ver research R7).

## Project Structure

### Documentation

```text
specs/006-atividades-avaliacao/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md
├── checklists/requirements.md
└── contracts/{rpc.md, telas.md}
```

### Source Code

```text
supabase/migrations/20261030160000_atividades_avaliacao.sql
supabase/tests/007_atividades_avaliacao.test.sql
supabase/seed.sql                               # desafio e lista fictícios para E2E
scripts/testar-concorrencia-questoes.mjs        # SC-007 com duas conexões reais
src/modules/atividades/
├── index.ts, README.md
├── domain/tipos.ts
├── domain/regras.ts (+ .test)                  # validação de arquivo/link, atraso previsto, notas
├── domain/lancamentos.ts (+ .test)             # monta LancamentosDoEncontro a partir do servidor
├── data/repositorioSupabase.ts (+ .test)
└── ui/
    ├── FormDesafio.tsx, FormLista.tsx           # docente
    ├── EnvioEntrega.tsx (substitui o de desafios) # aluno: arquivo ou link
    ├── ResponderLista.tsx, ResultadoLista.tsx  # aluno
    ├── RegistroPresenca.tsx, FormParticipacao.tsx
    ├── FormAvaliacao.tsx, FormProrrogacao.tsx
    └── PontuacaoDoEncontro.tsx
src/modules/demo/repositorios.ts                # atividades da demonstração (somente leitura)
src/app/paginas/atividades.tsx                  # páginas do aluno, docente e coordenação
src/app/{rotas.tsx, navegacao.ts, dados/*}
e2e/jornadas.spec.ts, e2e-supabase/atividades.spec.ts
```

**Structure Decision**: `src/modules/desafios` (só tem o `EnvioEntrega` de link) é absorvido pelo
módulo `atividades`. Desafio, entrega, questões, presença e avaliação compartilham o mesmo ciclo
por encontro e equipe, e o README de `desafios` aponta para o novo módulo. Os módulos `presenca`,
`avaliacao` e `questoes`, que hoje só têm README, passam a apontar para `atividades`.

## Complexity Tracking

| Item                                          | Por que é necessário                                      | Alternativa mais simples rejeitada                                                |
| --------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Nove tabelas e um bucket numa única migration | Tudo pertence ao mesmo incremento e às mesmas RPCs        | Uma migration por história: aumentaria dependências cruzadas entre migrations     |
| Upload em duas etapas (Storage + RPC)         | O Storage não grava a linha de entrega na mesma transação | Edge Function com `service_role`: exige segredo no servidor e mais infraestrutura |
