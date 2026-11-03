# Requisitos mapeados e situação

Fonte: PRD v1.0, Documento de Visão v1.0, Design System v1.0 e instruções do usuário (2026-10-29).

| Requisito   | Descrição resumida                           | Situação (após spec 002)                                                            | Onde                                              |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| RF01        | Autenticar e restringir por perfil e vínculo | **Feito**: login, rotas por papel, RLS; vínculos por turma e mentor por curso (010) | `modules/auth`, `modules/acesso`, specs 001/010   |
| RF02        | Edições, cursos, turmas, docentes            | **Feito (specs 002/010)**: edições pelo app, cadastro permanente, turmas na edição  | `modules/organizacao`, `criar_edicao`             |
| RF03        | Cadastrar/importar alunos e contas           | **Feito**: contas e importação CSV; gestão por turma (spec 010)                     | `supabase/functions/criar-conta`                  |
| RF04        | Duplas e alterações justificadas             | **Feito**: equipes por convite, trio, nome e gestão com histórico (HU01, spec 003)  | `modules/duplas`, migrations 002 e 003            |
| RF05        | Encontros, horários, ambientes               | **Feito**: encontros e ambientes configuráveis                                      | `modules/encontros`, migration 002                |
| RF06        | Regulamento e comunicados                    | **Feito (spec 009)**: comunicados por público e resumo das regras da edição         | `modules/comunicados`, `publicar_comunicado`      |
| RF07–RF08   | Questões e submissão única                   | **Feito (spec 006)**: listas, gabarito só após o prazo, submissão única por equipe  | `modules/atividades`, migration 006               |
| RF09–RF10   | Desafio e envio com comprovante do servidor  | **Feito (spec 006)**: desafios, entrega no Storage privado e comprovante            | `modules/atividades`, bucket `entregas`           |
| RF11        | Presença e participação                      | **Feito (spec 006)**: presença em lote e participação, correções justificadas       | `modules/atividades`                              |
| RF12        | Rubricas e feedback                          | **Feito (spec 006)**: rubrica de entrega e apresentação com feedback                | `modules/atividades`                              |
| RF13        | Prova oficial como registro                  | Registro pela coordenação, nota só para ela (spec 007)                              | `modules/resultado`, `registrar_resultados_prova` |
| RF14        | Cálculo, descontos, desempate                | Cálculo oficial no servidor com paridade TS/SQL (spec 007)                          | `app.calcular_encontro`, `modules/pontuacao`      |
| RF15        | Ocorrências e recurso                        | Registro, manifestação, decisão e revisão em 24 h (spec 007)                        | `modules/resultado`                               |
| RF16        | Ranking por estado sem notas individuais     | Publicação versionada e imutável por categoria (spec 007)                           | `publicar_ranking`, `TabelaRanking`               |
| RF17        | Painéis e CSV                                | **Feito (spec 008)**: painéis por perfil com dados reais e 5 relatórios CSV         | `modules/relatorios`, `relatorio`                 |
| RF18        | PWA instalável, offline, atualização         | **Base pronta**                                                                     | `vite.config.ts`, `shared/pwa`                    |
| RF19–RF20   | Certificados, push                           | Fora do escopo (Could)                                                              | —                                                 |
| RNF01       | Responsivo                                   | Verificado por E2E em 412 px (Pixel 7) e desktop                                    | `e2e/`                                            |
| RNF02       | Acessibilidade                               | axe em componentes, foco visível, rótulos; auditoria completa no Inc. 5             | `src/test/a11y.ts`                                |
| RNF03–RNF04 | PWA/offline                                  | Cache só do shell; offline indicado; sem sucesso simulado                           | ADR 0005                                          |
| RNF05–RNF06 | Segurança/privacidade                        | RLS, sem segredos, ranking sem notas individuais                                    | ADR 0006                                          |
| RNF07–RNF08 | Operação/desempenho                          | Propostas em `operacao-e-homologacao.md`; metas a definir                           | —                                                 |

Histórias: HU02 (envio) e HU03 (rubrica) concluídas na spec 006 (pgTAP + E2E real com upload). HU04 (prova), HU05 (ranking) e HU06 (revisão) concluídas na spec 007 (pgTAP, paridade TS/SQL e E2E real); HU07 (offline) tem
regras ou componentes testados; HU01 concluída na spec 002 e revista na spec 003 (formação por convite; pgTAP + E2E real);
