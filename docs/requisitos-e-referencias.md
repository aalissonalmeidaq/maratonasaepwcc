# Requisitos mapeados e situação

Fonte: PRD v1.0, Documento de Visão v1.0, Design System v1.0 e instruções do usuário (2026-10-29).

| Requisito   | Descrição resumida                           | Situação (após spec 002)                                                           | Onde                                            |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| RF01        | Autenticar e restringir por perfil e vínculo | **Parcial**: login Supabase, rotas por papel, RLS testada                          | `modules/auth`, `modules/acesso`, migration 001 |
| RF02        | Edições, cursos, turmas, docentes            | **Feito (spec 002)**: cursos, turmas e vínculos com RLS e auditoria                | `modules/organizacao`, migrations 001/002       |
| RF03        | Cadastrar/importar alunos e contas           | **Feito**: conta criada por Edge Function; importação CSV pendente                 | `supabase/functions/criar-conta`                |
| RF04        | Duplas e alterações justificadas             | **Feito**: equipes por convite, trio, nome e gestão com histórico (HU01, spec 003) | `modules/duplas`, migrations 002 e 003          |
| RF05        | Encontros, horários, ambientes               | **Feito**: encontros e ambientes configuráveis                                     | `modules/encontros`, migration 002              |
| RF06        | Regulamento e comunicados                    | Resumo das regras a partir da configuração                                         | `AlunoRegulamentoPage`                          |
| RF07–RF08   | Questões e submissão única                   | Regra de pontuação pronta                                                          | `modules/pontuacao`                             |
| RF09–RF10   | Desafio e envio com comprovante do servidor  | Componente de envio pronto (sem backend)                                           | `modules/desafios`                              |
| RF11        | Presença e participação                      | Regras prontas; registro no Inc. 3                                                 | `modules/pontuacao`                             |
| RF12        | Rubricas e feedback                          | Regras e tela de critérios; lançamento no Inc. 3                                   | `DocenteAvaliacoesPage`                         |
| RF13        | Prova oficial como registro                  | Regra pendente/confirmada pronta                                                   | `pontuarProvaOficial`                           |
| RF14        | Cálculo, descontos, desempate                | Núcleo TS pronto e testado; versão SQL no Inc. 4                                   | `modules/pontuacao`                             |
| RF15        | Ocorrências e recurso                        | Deduplicação/teto prontos; fluxo no Inc. 4                                         | —                                               |
| RF16        | Ranking por estado sem notas individuais     | Cálculo e exibição (demo); publicação no Inc. 4                                    | `classificar`, telas de ranking                 |
| RF17        | Painéis e CSV                                | Painel por turma real (spec 004); demais painéis demo; CSV no Inc. 5               | `modules/painel-turma`, migration 004           |
| RF18        | PWA instalável, offline, atualização         | **Base pronta**                                                                    | `vite.config.ts`, `shared/pwa`                  |
| RF19–RF20   | Certificados, push                           | Fora do escopo (Could)                                                             | —                                               |
| RNF01       | Responsivo                                   | Verificado por E2E em 412 px (Pixel 7) e desktop                                   | `e2e/`                                          |
| RNF02       | Acessibilidade                               | axe em componentes, foco visível, rótulos; auditoria completa no Inc. 5            | `src/test/a11y.ts`                              |
| RNF03–RNF04 | PWA/offline                                  | Cache só do shell; offline indicado; sem sucesso simulado                          | ADR 0005                                        |
| RNF05–RNF06 | Segurança/privacidade                        | RLS, sem segredos, ranking sem notas individuais                                   | ADR 0006                                        |
| RNF07–RNF08 | Operação/desempenho                          | Propostas em `operacao-e-homologacao.md`; metas a definir                          | —                                               |

Histórias: HU02 (envio), HU03 (rubrica), HU04 (prova), HU05 (ranking), HU07 (offline) têm
regras ou componentes testados; HU01 concluída na spec 002 e revista na spec 003 (formação por convite; pgTAP + E2E real); HU06 depende do Incremento 4.
