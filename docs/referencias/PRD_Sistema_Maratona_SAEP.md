# PRD DO SISTEMA MARATONA DE COMPETÊNCIAS SAEP

Requisitos para desenvolvimento do sistema responsivo e PWA

Versão 1.0 | 28 de outubro de 2026  
Unidade e responsáveis: a confirmar

## 1 Resumo executivo

Este documento define requisitos de uma aplicação web responsiva e instalável como PWA para organizar a Maratona de Competências SAEP. Coordenação, docentes e estudantes acompanharão duplas, encontros, questões, desafios, entregas, pontuação, ocorrências e resultados. O objetivo é apoiar a execução pedagógica e produzir registros confiáveis, com acesso apropriado a cada perfil.

Premissas: o projeto pedagógico fornecido é a fonte das regras de competição. Os cursos, quantidades, infraestrutura, política institucional e disponibilidade da nota oficial ainda precisam de confirmação. As telas geradas anteriormente são conceitos, não especificações validadas; datas, notas ou turmas nelas são ilustrativas.

## 2 Problema e oportunidade

A maratona reúne atividades em duplas e registros individuais ao longo de quatro encontros. Quando presença, entregas, rubricas e resultados ficam dispersos, a conferência dos pontos e a comunicação dos prazos se tornam mais difíceis. O sistema centralizará os dados e mostrará o andamento apropriado a cada usuário.

## 3 Personas e usuários alvo

| Perfil | Necessidade |
| --- | --- |
| Coordenação | Configurar, supervisionar, decidir ocorrências, validar pontuação e publicar classificações. |
| Docente e mentor | Acompanhar turmas autorizadas, aplicar atividades, registrar presença e avaliar entregas. |
| Aluno | Consultar sua dupla e prazos, responder e entregar atividades, acompanhar feedback e pontos. |
| Apoio técnico-administrativo | Premissa: acesso apenas se a coordenação atribuir funções específicas; não constitui perfil amplo automático. |

## 4 Jornada do usuário

A coordenação cadastra edição, turmas e usuários; organiza as duplas; atribui docentes; configura encontros e critérios; publica atividades e regulamento. O aluno acessa a própria dupla, responde questões e entrega o desafio. O docente registra presença e participação, avalia entregas e apresentações e devolve feedback. A coordenação confirma pontuação, decide ocorrências e publica o ranking. A nota da prova oficial é lançada após disponibilidade e autorização; enquanto pendente, o resultado pode ser provisório.

## 5 Escopo do produto

MVP: autenticação, perfis, turmas e duplas; encontros; questões em dupla e gabarito; desafios e envio de arquivos; presença, participação, rubrica e apresentação; registro manual da prova oficial; cálculo, penalidades, revisão e ranking; avisos; relatórios básicos; interface responsiva e PWA com leitura offline limitada. Fora do MVP: aplicação da prova oficial, integração presumida com o SAEP, certificado automático, chat, notificações push e escrita offline com sincronização.

## 6 Requisitos funcionais

| ID | Requisito e resultado esperado | Prioridade |
| --- | --- | --- |
| RF01 | Autenticar usuários e restringir funções por perfil e vínculo à turma. | Must |
| RF02 | Coordenação cadastra edições, cursos, turmas e docentes responsáveis. | Must |
| RF03 | Cadastrar/importar alunos, vinculá-los a turma e gerenciar contas. | Must |
| RF04 | Criar duplas, registrar integrantes e alterações justificadas. | Must |
| RF05 | Cadastrar encontros, horários, ambientes e orientações. | Must |
| RF06 | Publicar regulamento e comunicados por público autorizado. | Must |
| RF07 | Criar questões objetivas, alternativas, gabarito e justificativa; associar capacidades. | Must |
| RF08 | Aplicar questões da dupla, registrar versão, prazo e submissão única. | Must |
| RF09 | Cadastrar desafio, recursos permitidos, política de IA, prazo e critérios. | Must |
| RF10 | Receber arquivo ou link da dupla e emitir comprovante após gravação no servidor. | Must |
| RF11 | Registrar presença individual e participação da dupla com autoria e horário. | Must |
| RF12 | Avaliar entrega e apresentação com rubricas e feedback. | Must |
| RF13 | Registrar participação individual na prova oficial e resultado confirmado autorizado. | Must |
| RF14 | Calcular pontos, descontos, histórico e desempate por categoria. | Must |
| RF15 | Registrar ocorrências, evidências, manifestação, decisão e recurso restritos. | Must |
| RF16 | Publicar ranking parcial, provisório ou definitivo sem notas individuais públicas. | Must |
| RF17 | Exibir painéis e relatórios filtrados por permissões; exportar CSV. | Should |
| RF18 | Permitir instalação PWA quando suportada, detectar offline e atualizar versão. | Must |
| RF19 | Gerar certificados quando critérios forem aprovados. | Could |
| RF20 | Enviar notificações push mediante permissão e compatibilidade. | Could |

## 7 Requisitos não funcionais

| ID | Requisito verificável |
| --- | --- |
| RNF01 | Responsivo: verificar fluxos em celular, tablet e desktop; conteúdo e ações devem permanecer legíveis e utilizáveis. |
| RNF02 | Acessibilidade: navegação por teclado, foco visível, rótulos de campos, mensagens compreensíveis e contraste validado. Meta técnica a confirmar. |
| RNF03 | PWA: HTTPS, manifest, ícones e service worker para estrutura e conteúdo público previamente carregado; instalação depende de navegador e dispositivo. |
| RNF04 | Offline: indicar ausência de rede; permitir leitura apenas do conteúdo público previamente carregado; não sinalizar entrega como recebida antes da confirmação do servidor. |
| RNF05 | Segurança: validar permissões no servidor, proteger sessão, senhas e transporte; limitar upload, validar tipos e registrar operações críticas. |
| RNF06 | Privacidade: acesso mínimo; não armazenar notas, ocorrências ou dados pessoais em cache público; retenção e responsabilidades a definir pela unidade. |
| RNF07 | Operação: backups e restauração testados, logs e monitoramento; metas de disponibilidade, RPO e RTO a definir. |
| RNF08 | Desempenho: metas em dispositivos e redes da unidade a definir e medir; sem número presumido. |

## 8 Histórias e critérios de aceite

| ID e história | Critérios de aceite |
| --- | --- |
| HU01 Coordenação organiza dupla | Ao vincular integrantes elegíveis, o sistema impede dupla ativa duplicada na mesma categoria; registra alterações com responsável e justificativa. |
| HU02 Aluno entrega desafio | Dado prazo válido, quando enviar arquivo permitido e servidor confirmar, exibe protocolo e horário; falha de rede não gera confirmação. |
| HU03 Docente registra rubrica | Quatro notas entre 0 e 10 totalizam até 40; apresentação separada até 10; feedback e autoria ficam registrados. |
| HU04 Coordenação registra prova | Participação vale 5 por aluno e nota confirmada ≥70 agrega 10; nota pendente não gera bônus; escala e autorização são pré-condições. |
| HU05 Dupla acompanha ranking | Exibe categoria e estado parcial/provisório/definitivo, detalha pontuação da própria equipe e aplica desempates sem expor notas individuais alheias. |
| HU06 Estudante solicita revisão | Ocorrência restrita permite manifestação e recurso no prazo configurado; coordenação registra decisão e justificativa; ajuste recalcula ranking com histórico. |
| HU07 Acesso offline | Após visita prévia, conteúdo público armazenado pode abrir offline; ações de envio e avaliação exibem necessidade de conexão e não simulam sucesso. |

## 9 Priorização MoSCoW

| Categoria | Itens |
| --- | --- |
| Must | RF01–RF16 e RF18, regras de pontuação, proteção e auditoria. |
| Should | RF17, filtros, exportação e melhorias operacionais. |
| Could | Certificados e push, sujeitos à validação e compatibilidade. |
| Won’t nesta fase | Aplicação da prova oficial, integração automática com SAEP e escrita offline sincronizada. |

## 10 Regras de negócio e pontuação

Cada encontro vale no máximo 100 pontos e a maratona 400. Presença: 5 por aluno, até 10. Participação: até 10. Questões: acertos ÷ total × 30 nos dias 05, 12 e 26/11. Entrega: compreensão, aplicação técnica, qualidade e organização, até 10 cada. Apresentação: clareza 3, explicação 4 e respostas 3. Arredondamento das notas fracionárias deve ser definido antes da abertura; premissa técnica sugerida: duas casas decimais, sem arredondamento intermediário.

Em 19/11 cada aluno que realiza a prova oficial contribui 5 pontos; nota confirmada ≥70 adiciona 10, até 30 por dupla. O resultado deve permanecer pendente enquanto não houver confirmação ou equivalência de escala. A divulgação poderá ser provisória até o fechamento do resultado. Nenhum processo altera a nota oficial.

Atraso até 15 minutos desconta 2 pontos do critério organização; mais de 15 e até 30 minutos, 5; após 30 minutos, entrega não realizada, salvo exceção registrada. Sem entrega: zero na prática e zero na apresentação se não avaliável. Uma falta isolada perde apenas os 5 pontos de presença do ausente. A organização pode registrar prorrogação e impedimento justificado.

Ocorrências: reincidência após orientação registrada, 2 pontos; desrespeito com responsabilidade da dupla, 5; uso não autorizado, 5; plágio comprovado, zero na entrega e, se dependente e inelegível, zero na apresentação. Sem duplicidade pelo mesmo fato; descontos gerais de ocorrências distintas nas categorias indicadas limitados a 10 por encontro; pontuação não negativa. Conduta grave segue decisão fundamentada e normas institucionais. Desempate: prática, questões/prova, presença, empate compartilhado. Registrar manifestação e pedido de revisão em até 24 horas, ressalvada exceção registrada.

## 11 Especificações técnicas

Arquitetura sugerida, não imposta: frontend web responsivo PWA; API com validação de permissões e regras; banco relacional transacional; armazenamento protegido de arquivos; serviço de autenticação; logs e backups. A escolha da linguagem, hospedagem, ambiente institucional, domínios e integração de login permanece em aberto. Tudo que altera notas ou classificação deve ser executado no servidor, com trilha e idempotência para evitar duplicidade.

Fluxo sugerido de estados: atividade rascunho → publicada → encerrada; entrega rascunho → enviada → avaliada; ocorrência registrada → manifestação → decisão → revisão quando solicitada; ranking parcial → provisório → definitivo. Alterações posteriores geram nova versão e justificativa.

## 12 Modelo de dados inicial

| Entidade | Campos e relações principais |
| --- | --- |
| Usuário | ID, nome, credencial, estado; perfis e vínculos de turma. |
| Edição / Curso / Turma | ID, nome, datas, curso, categoria e unidade. |
| Dupla / Integrante | ID, nome, categoria, membros e histórico de composição. |
| Encontro / Ambiente | Data, horário, local, status e responsáveis. |
| Atividade / Questão / Alternativa | Tipo, capacidade, enunciado, prazo, rubrica e gabarito protegido. |
| Submissão / Arquivo / Resposta | Dupla, atividade, versão, autor, confirmação, hora do servidor e arquivo. |
| Presença / Avaliação | Aluno ou dupla, critério, pontos, responsável e registro. |
| Prova oficial | Participação, nota confirmada, escala, fonte e estado; acesso restrito. |
| Ocorrência / Recurso | Fato, evidência, autoria, decisão, justificativa, prazo e histórico. |
| Ranking / Auditoria | Categoria, cálculo, versão, publicação e rastreio de alterações. |

## 13 Requisitos UX e UI

Aplicar a identidade visual selecionada: azul-marinho e azul predominantes, acentos ciano, amarelo, coral e roxo; ícones do projeto com significado, rótulos e estados claros. A arte gerada serve como referência: a unidade deverá fornecer e validar versões finais reutilizáveis da marca e dos ícones. Priorizar ações principais, leitura simples e navegação por perfil. O aluno deve ver sua dupla e próxima tarefa; o docente, entregas e presenças; a coordenação, pendências e publicação.

## 14 Métricas de sucesso

| Métrica | Medição e meta |
| --- | --- |
| Participação | Alunos ativos ÷ alunos cadastrados; meta a definir. |
| Entregas no prazo | Entregas recebidas no prazo ÷ entregas esperadas; meta a definir. |
| Avaliações concluídas | Avaliações concluídas ÷ entregas recebidas; meta e prazo a definir. |
| Confiabilidade | Conciliação entre registros e cálculo da classificação; meta a definir. |
| Uso em celular | Sessões e conclusão de tarefas por dispositivo; sem meta presumida. |

## 15 Plano de implementação

Fase 1: validar regras, cursos, prova oficial e permissões. Fase 2: desenhar telas e dados e criar autenticação, usuários e duplas. Fase 3: encontros, atividades, entregas e rubricas. Fase 4: pontuação, prova, ranking e ocorrências. Fase 5: PWA, testes, treinamento e implantação. Priorizar piloto em ambiente de homologação antes da maratona; estimativas e responsáveis dependem da equipe e da infraestrutura.

## 16 Critérios de pronto

Fluxos Must concluídos e demonstrados para os três perfis; cálculos e desempates verificados com cenários normais e exceções; permissões e isolamento de dados testados no servidor; entrega confirma apenas após gravação; PWA e modo offline testados em dispositivos da unidade; backup e recuperação verificados; regulamento aprovado; dados fictícios de teste removidos; documentação e aceite da coordenação registrados.

## 17 Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Notas oficiais indisponíveis | Registro pendente e ranking provisório. |
| Regras ambíguas ou modificadas | Parametrização controlada e versão aprovada. |
| Dados de estudantes expostos | Acesso restrito, minimização e revisão da política da unidade. |
| Falha de rede no envio | Comprovante de servidor, mensagem clara e fluxo de exceção. |
| Múltiplos cursos incomparáveis | Categorias e rankings separados. |
| Dependência de dispositivo | Testes reais e alternativa operacional presencial. |

## 18 Dependências

Equipe técnica e docente; validação pedagógica; infraestrutura HTTPS e hospedagem; política de contas e dados; matriz de cada curso; confirmação de notas, escala e acesso; marca e ícones finais; procedimentos de backup e suporte.

## 19 Questões em aberto

Qual unidade, cursos e volume de usuários? Como serão feitos cadastro e login? Qual tecnologia e infraestrutura estão disponíveis? Há autorização para tratar a nota e quando ela estará disponível? Como comprovar participação oficial? Quais formatos e limite de arquivos? Qual critério de atraso, presença parcial e trio? Quem pode publicar, alterar ou reabrir uma avaliação? Como serão premiação provisória e versão final? Qual retenção dos dados e qual política para menores?

## 20 Resumo do MVP recomendado

Entregar primeiro o fluxo completo de cadastro até ranking, com registro confiável de atividade e pontuação, revisão de ocorrências e PWA responsivo. Não depender de integração com a prova oficial; usar registro autorizado e controlado. Validar a aplicação com coordenação, docentes e estudantes antes de liberar dados reais.
