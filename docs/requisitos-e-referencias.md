# Requisitos mapeados e situação

Fonte: PRD v1.0, Documento de Visão v1.0, Design System v1.0 e instruções do usuário (2026-10-29).

| Requisito   | Descrição resumida                           | Situação após ciclo 1                                                   | Onde                                            |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| RF01        | Autenticar e restringir por perfil e vínculo | **Parcial**: login Supabase, rotas por papel, RLS testada               | `modules/auth`, `modules/acesso`, migration 001 |
| RF02        | Edições, cursos, turmas, docentes            | Esquema + RLS; telas de leitura (demo)                                  | migration 001, `paginas/coordenacao.tsx`        |
| RF03        | Cadastrar/importar alunos e contas           | Pendente (Inc. 2; exige Edge Function)                                  | —                                               |
| RF04        | Duplas e alterações justificadas             | Leitura demo; esquema no Inc. 2                                         | —                                               |
| RF05        | Encontros, horários, ambientes               | Leitura demo; configurável no Inc. 2                                    | —                                               |
| RF06        | Regulamento e comunicados                    | Resumo das regras a partir da configuração                              | `AlunoRegulamentoPage`                          |
| RF07–RF08   | Questões e submissão única                   | Regra de pontuação pronta                                               | `modules/pontuacao`                             |
| RF09–RF10   | Desafio e envio com comprovante do servidor  | Componente de envio pronto (sem backend)                                | `modules/desafios`                              |
| RF11        | Presença e participação                      | Regras prontas; registro no Inc. 3                                      | `modules/pontuacao`                             |
| RF12        | Rubricas e feedback                          | Regras e tela de critérios; lançamento no Inc. 3                        | `DocenteAvaliacoesPage`                         |
| RF13        | Prova oficial como registro                  | Regra pendente/confirmada pronta                                        | `pontuarProvaOficial`                           |
| RF14        | Cálculo, descontos, desempate                | Núcleo TS pronto e testado; versão SQL no Inc. 4                        | `modules/pontuacao`                             |
| RF15        | Ocorrências e recurso                        | Deduplicação/teto prontos; fluxo no Inc. 4                              | —                                               |
| RF16        | Ranking por estado sem notas individuais     | Cálculo e exibição (demo); publicação no Inc. 4                         | `classificar`, telas de ranking                 |
| RF17        | Painéis e CSV                                | Painéis demo; CSV no Inc. 5                                             | —                                               |
| RF18        | PWA instalável, offline, atualização         | **Base pronta**                                                         | `vite.config.ts`, `shared/pwa`                  |
| RF19–RF20   | Certificados, push                           | Fora do escopo (Could)                                                  | —                                               |
| RNF01       | Responsivo                                   | Verificado por E2E em 412 px (Pixel 7) e desktop                        | `e2e/`                                          |
| RNF02       | Acessibilidade                               | axe em componentes, foco visível, rótulos; auditoria completa no Inc. 5 | `src/test/a11y.ts`                              |
| RNF03–RNF04 | PWA/offline                                  | Cache só do shell; offline indicado; sem sucesso simulado               | ADR 0005                                        |
| RNF05–RNF06 | Segurança/privacidade                        | RLS, sem segredos, ranking sem notas individuais                        | ADR 0006                                        |
| RNF07–RNF08 | Operação/desempenho                          | Propostas em `operacao-e-homologacao.md`; metas a definir               | —                                               |

Histórias: HU02 (envio), HU03 (rubrica), HU04 (prova), HU05 (ranking), HU07 (offline) têm
regras ou componentes testados; HU01 e HU06 dependem dos incrementos 2 e 4.
