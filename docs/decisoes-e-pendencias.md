# Decisões, premissas e pendências

Atualizado em 2026-10-29 (ciclo 1 — spec 001). Itens marcados **[validar]** dependem da
coordenação/unidade e devem ser resolvidos antes de usar dados reais.

## 1. Documentos e ativos

| Item                                                                                   | Situação                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PRD, Documento de Visão, Design System, `tokens_maratona.css`                          | Encontrados em `docs/referencias/` e usados                                                                                                                                                                                                                  |
| SVGs da marca Maratona (horizontal, branca, negativo, cinza, preta, vertical, símbolo) | Encontrados em `docs/referencias/identidade visual/`; copiados sem alteração para `public/brand/`                                                                                                                                                            |
| Pranchas PNG (paleta, tipografia, ícones, interface, mockups)                          | Usadas como referência visual; dados ilustrativos ignorados                                                                                                                                                                                                  |
| `docs/VETORIZADAS CLAUDE/`                                                             | Versão anterior dos SVGs (prefixo `saep-`), arquivos diferentes dos de `referencias/`. Usamos os de `referencias/` (mais recentes). **[validar]** qual é a versão aprovada                                                                                   |
| **Projeto pedagógico / livro de regras / regulamento**                                 | **AUSENTE.** Regras implementadas a partir do PRD e das instruções do usuário, versão `piloto-2026.0-a-confirmar`                                                                                                                                            |
| **Marca SENAI Ceará** (colorida e totalmente branca)                                   | Disponíveis em `public/brand/`: `senai-ceara-colorido.svg` para fundo claro (arquivo `logo-senai.svg` indicado pelo usuário em 30/10/2026, copiado sem alteração) e `senai-ceara-branco.svg` para fundo escuro.                                              |
| **Ícones do projeto em SVG individual**                                                | **Vetorizados (2026-10-29)**: 103 ícones redesenhados à mão a partir da prancha em `src/shared/ui/icones/dados.ts`; arquivos em `docs/icones/svg` e galeria em `docs/icones/galeria.html`. Não é rastreio automático: **[validar]** fidelidade com a unidade |
| Licença/arquivos de fonte                                                              | Montserrat (SIL OFL) via `@fontsource`, auto-hospedada. **[validar]** confirmação institucional                                                                                                                                                              |

## 2. Divergências registradas

- A prancha "Diretrizes de marca" mostra hex diferentes dos tokens (ex.: azul-marinho `#0B2D6B`
  vs `#062457`; amarelo `#FFC02E` vs `#FFB820`). O Design System diz que o CSS é a referência
  inicial → usamos `tokens_maratona.css`. **[validar]**
- O prompt cita "seta da marca em laranja"; os SVGs oficiais usam coral `#FC4B55`. Mantivemos os
  arquivos como estão (não alteramos a marca). **[validar]**
- Tokens têm `--color-coral-500 #FF5866` e os SVGs `#FC4B55` (diferença pequena). Sem ação.

- **Largura da barra lateral (2026-11-03, spec 011):** `--sidebar-width` passou de 16rem para
  17.5rem no arquivo de tokens, no tema e no `DESIGN.md`, para caber os títulos e ícones das
  categorias do menu. Decisão do usuário. **[validar]** com o Design System.

## 2.1 Identidade visual — pranchas recebidas em 2026-10-29

- O usuário indicou as pranchas (variações da marca, paleta, tipografia, universo fotográfico,
  aplicações, elementos de interface, iconografia, padrões gráficos e acabamentos) como a
  identidade visual da aplicação.
- **Padrões gráficos** (prancha 08) recriados em SVG em `src/shared/ui/padroes/dados.ts`;
  arquivos em `docs/padroes/svg` e galeria em `docs/padroes/galeria.html` (`npm run padroes`).
  **[validar]**
- **13 ícones** das pranchas "Navegação e conta", "Maratona e aprendizagem" e "Avaliação e
  administração" acrescentados, mais o ícone "Salvar" criado no mesmo estilo em 2026-10-30
  (117 no total). **[validar]**
- **Paleta da prancha × tokens em uso:** azul-marinho `#0B2D6B` × `#062457`; amarelo `#FFC02E` ×
  `#FFB820`; borda sutil `#E6EBF2` × `#DCE5EF`. Os padrões gráficos usam a paleta da prancha; os
  tokens da interface **não foram alterados** (estão documentados em `DESIGN.md`). **[decidir]**
  se os tokens devem migrar para a paleta da prancha.
- Ilustrações de pessoas enviadas como modelo não chegaram como arquivos; aguardam
  `docs/referencias/ilustracoes/`.

## 3. Premissas de regra (configuração `REGRAS_PILOTO`)

| Premissa                             | Escolha provisória                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Arredondamento                       | 2 casas, meio para cima, só no resultado do componente e no total. **[validar]**                         |
| Teto de 10 pontos                    | Vale para descontos gerais de ocorrências; zerar entrega por plágio não entra no teto. **[validar]**     |
| Atraso com exceção autorizada        | Prorrogação/impedimento registrado ⇒ sem desconto de atraso. **[validar]**                               |
| Penalidade duplicada (mesmo fato)    | Mantém a primeira registrada e informa as ignoradas. **[validar]**                                       |
| Ranking                              | Por categoria; no piloto, categoria = curso. **[validar]**                                               |
| Desempate "questões e prova oficial" | Soma do componente objetivo (30) de todos os encontros                                                   |
| Prova oficial                        | Encontro em que o componente objetivo é a prova; realização "pendente" também deixa o resultado pendente |
| Pedido de revisão                    | 24 h, exceção registrada pela coordenação (spec 007, §6.5)                                               |
| Premiação                            | Itens registrados como configuração; valores, quantidade, validade e entrega **[validar]**               |
| Cronograma                           | Nada fixado no código; demo usa datas relativas ao dia atual                                             |

## 4. Decisões técnicas (ver `docs/adr/`)

- ADR 0001 monólito modular; 0002 npm; 0003 versões e compatibilidade; 0004 modo demonstração;
  0005 PWA e cache; 0006 Supabase local, RLS e auditoria; 0007 repositórios + TanStack Query;
  0008 criação de contas; 0009 convites de acesso; 0010 equipes por convite.

## 5. Pendências técnicas

- Impeccable 4.8.0 (`pbakaus/impeccable`, via `npx skills add`) instalado a pedido do usuário
  em 2026-10-30, em `.agents/skills/impeccable` e `.claude/skills/impeccable` (cópia idêntica;
  versão travada em `skills-lock.json`). É código de terceiros com permissões do agente:
  revisar ao atualizar. UI/UX Pro Max **não está instalado**.
- `npm audit`: 4 vulnerabilidades **baixas** em `deepmerge` via `workbox-build` (ferramenta de
  build do PWA; não vai ao navegador). A correção sugerida rebaixa o plugin e quebra o build.
  Acompanhar nova versão de `workbox-build`.
- Bundle JS principal ~670 kB (197 kB gzip). Sem meta de desempenho definida (PRD RNF08);
  dividir por área com `import()` quando as metas forem acordadas.
- Contas criadas pela coordenação via Edge Function `criar-conta` (ADR 0008). Decidido em 2026-10-30
  (spec 002): sem senha provisória — primeiro acesso e recuperação por link no e-mail; importação
  por CSV com prévia. **Implementados em 2026-10-30:** convite de 7 dias, situação de acesso com
  reenvio e importação CSV (ADR 0009). Rotas `/primeiro-acesso`, `/esqueci-senha` e
  `/redefinir-senha` e o link "Esqueci minha senha" na entrada também concluídos. **Pendente:**
  provedor de e-mail da produção e SMTP do Auth **[validar]**.
- Criação de edições: resolvida na spec 010 (seção 6.8); só a primeira edição de uma instalação
  continua criada pela administração do banco.
- Ícones PWA gerados a partir de `maratona-simbolo.svg` com fundo branco no maskable. **[validar]**
- Contraste foi verificado apenas por inspeção dos tokens; auditoria axe no navegador real e
  testes com leitor de tela ficam para o Incremento 5.
- O CLI `claude` não está no PATH (sessão via extensão do VS Code); `specify init` rodou com
  `--ignore-agent-tools`. As skills `/speckit-*` foram instaladas em `.claude/skills/`.
- Porta do Supabase local alterada para 5442x porque outro projeto local usa as portas padrão.

## 6. Decisões da spec 002 a validar

- Equipes formadas pelos próprios alunos por convite (decidido em 2026-10-30, spec 003): dupla,
  ou um trio por turma em turma com número ímpar de alunos ativos. A coordenação não forma
  equipes; coordenação, docente e mentor alteram com justificativa. **Implementado em
  2026-10-30** (ver §6.2). Duplas entre turmas continuam recusadas.
- Encontros valem para todas as turmas da edição. **[validar]**
- Justificativa mínima de 10 caracteres para substituir integrante ou desfazer dupla. **[validar]**
- Edição de curso e turma pela interface: implementada em 2026-10-30. Decidido na mesma data
  (spec 002, Clarifications): com dupla ativa, o curso da turma não pode mudar — regra no servidor
  implementada (gatilho `turmas_validar_troca_de_curso`); a tela mostra o curso bloqueado.
- Os testes E2E reais deixam registros fictícios no banco local (rodar `supabase db reset`).

## 6.2 Spec 003 — equipes por convite (implementada em 2026-10-30)

- Decisões do usuário (spec 003, Clarifications): docente/mentor formam equipe nova só com
  alunos que sobraram; a coordenação altera, mas não forma nem renomeia; o primeiro nome é
  escolhido uma vez por um integrante e depois só docente/mentor da turma renomeiam; aluno
  desativado continua na equipe com aviso "integrante inativo"; trio em turma que passa a ser par
  é preservado com aviso; edição encerrada fica somente leitura; aviso de convites só no app.
- ADR 0010: tabelas `duplas`/`dupla_integrantes` mantidas; toda RPC de equipe bloqueia a turma;
  o cadastro/importação de alunos **não** foi alterado (mudança de paridade concorrente equivale
  ao FR-013). A RPC `formar_dupla` foi removida.
- Seed local: turma fictícia "3º ano C" (5 alunos, ímpar, sem equipes) para os E2E de trio e de
  formação pelo docente. Os E2E reais exigem `supabase db reset` antes de cada execução.
- **[validar]** Convites não expiram e não há limite de convites por aluno (a spec não define;
  nada foi inventado).
- **[validar]** Nomes de equipe não passam por moderação; o docente/mentor pode renomear com
  justificativa.

## 6.3 Spec 004 — painel da turma (implementada em 2026-10-30)

- Antes numerada 007; renumerada para 004 a pedido do usuário em 2026-10-30.
- Uma RPC de leitura (`painel_da_turma`) decide o acesso no servidor: coordenação da edição,
  docente/mentor da turma e aluno ativo da turma. O aluno recebe só nome e "tem equipe" dos
  colegas, as equipes da turma e os encontros; nada de convites, contatos ou situação individual.
  Nenhuma tabela nova (sem RLS nova); a RPC tem teste pgTAP de todos os cenários de acesso.
- Indicadores são derivados das listas exibidas (SC-003); só o total de convites pendentes vem
  pronto do servidor, e só para a gestão.
- O painel é somente leitura; o link "Alterar equipes" leva às telas da spec 003.
- O componente `Card` passou a nomear a própria seção pelo título (`aria-labelledby`).
- Pontuação (esclarecimento de 2026-10-30, opção B): a RPC devolve `pontuacao: null` e o bloco
  mostra só "Pontuação disponível a partir dos lançamentos de avaliação.". Na demonstração, o bloco
  mostra o total e a posição na categoria das equipes da turma, com o selo "Dados fictícios".
- Publicação para alunos (decidido em 2026-10-30, seguindo o PRD RF16/HU05): publicar é um ato
  da coordenação, independente do estado. Um ranking publicado pode estar parcial, provisório ou
  definitivo e sempre mostra o estado. Na demonstração o ranking conta como publicado, e o painel
  da turma e a tela "Ranking" mostram ao aluno a mesma classificação. A regra provisória
  ("`parcial` não conta como publicado") foi revogada por contrariar o PRD.
- Listas de equipes e de alunos sem equipe ganham busca e paginação (10 por página) acima de
  10 itens.
- **Pendente (Incrementos 3/4):** pontuação real por equipe, posição na categoria e publicação do
  ranking para alunos (US3, cenários 1 e 2), com a regra de publicação aplicada no servidor.

## 6.4 Spec 006 — atividades, entregas, presença e avaliação (implementada em 2026-10-30)

- Antes numerada 008; renumerada para 006 a pedido do usuário em 2026-10-30.
- Implementação: módulo `src/modules/atividades` (absorve `desafios`, `presenca`, `avaliacao` e
  `questoes`); migration `20261030160000_atividades_avaliacao.sql` com 12 tabelas (RLS, auditoria,
  sem escrita direta) e bucket privado `entregas`. Toda escrita é RPC idempotente: repetir os
  mesmos valores não grava nada; entrega e respostas usam chave de envio gerada no navegador.
- A pontuação parcial (US5) era calculada no navegador com `calcularEncontro`; desde a spec 007,
  a página do aluno lê a prévia calculada no servidor (fonte oficial, §6.5).
- Decidido em 2026-10-30: cada docente cria e publica desafios e listas de questões para as
  próprias turmas; a equipe pode reenviar a entrega até o prazo (vale a última versão); a
  avaliação fica visível à equipe ao ser registrada, e correções exigem justificativa.
- **[validar]** Turmas do mesmo curso podem receber atividades diferentes, o que afeta a
  comparabilidade do ranking por curso.
- Formatos e limite de arquivo (decidido em 2026-10-30): PDF, ZIP, PNG e JPG até 50 MB.
- Presença apenas presente/ausente (decidido em 2026-10-30); atraso/saída antecipada em observação
  opcional, sem efeito nos pontos.
- Decidido em 2026-10-30: o mentor da turma tem as mesmas permissões do docente (cria e publica
  atividades, registra presença, participação, avaliação e prorrogação).
- **[validar]** Prorrogação/impedimento registrados pelo docente/mentor da turma ou pela
  coordenação.
- **[validar]** Trio: presença de três alunos limitada ao máximo por equipe das regras (piloto 10).
- **Pendente (operação):** limpeza automática de arquivos sem entrega no bucket `entregas` (upload
  concluído com registro recusado). Exige rotina com a API do Storage no ambiente de produção.
- Decidido em 2026-10-30: um encontro pode ter vários desafios e listas por turma; a pontuação
  do componente é a média simples dos itens (o PRD não define a agregação). **[validar]**

## 6.5 Spec 007 — resultado oficial, ocorrências e ranking (implementada em 2026-11-01)

- Implementação: módulo `src/modules/resultado`; migration
  `20261101120000_resultado_oficial_ranking.sql` com 8 tabelas (RLS, auditoria, sem escrita
  direta), bucket privado `evidencias` e a coluna `auditoria.pedido_revisao_id`. ADR 0011.
- Cálculo oficial no servidor em PL/pgSQL (`app.calcular_encontro`, `app.classificar`), com os
  mesmos casos de contrato do núcleo TS (`casos-contrato.json`, `casos-ranking.json`) conferidos
  por `scripts/testar-paridade-calculo.mjs`. A página de pontuação do aluno passou a ler a prévia
  do servidor ("Prévia — não oficial").
- Regras completadas pela migration: `penalidades.tipos` (reincidência 2, desrespeito 5, uso não
  autorizado 5, plágio zera a entrega) e `prazos` (24 h para manifestação e revisão), valores do
  PRD. Só edições não encerradas, com o sufixo `+inc4` no `regras_versao`; a auditoria de
  `edicoes` guarda o antes. **[validar]** com o regulamento.
- Nota da prova "indisponível": mantém os 5 pontos da realização, sem bônus e sem pendência. Nota
  sem escala 0–100 e autorização confirmadas fica pendente; o sistema não converte escalas.
  **[validar]** a equivalência para escalas diferentes.
- Decididos em 2026-11-01: revisão vale para decisão de ocorrência e para componente da
  publicação **provisória** (parcial não abre prazo; definitiva é final); revisão aceita corrige o
  registro de origem, ligado ao pedido, sem ajuste manual de pontos; a coordenação só decide
  depois da manifestação ou do fim do prazo; a equipe docente vê a prévia da própria turma sem
  nota individual; avisos só no aplicativo, sem e-mail.
- Ex-integrantes listados no registro da ocorrência continuam vendo a ocorrência do fato em que
  estavam (o registro guarda a composição da equipe no momento do fato).
- Pedido aberto sobre a versão provisória N continua válido quando sai a versão N+1, que abre
  prazo próprio.
- **Pendente:** um pedido de revisão sobre questões pode ser respondido, mas não há correção de
  origem para submissão de questões nem de gabarito (spec 006 não prevê). Exige spec própria.
- **Pendente (operação):** limpeza de arquivos de evidência sem ocorrência registrada no bucket
  `evidencias`, como na spec 006.
- Diferenças em relação ao contrato de telas, sem efeito nas regras: ver
  `specs/007-resultado-oficial-ranking/quickstart.md`.

## 6.6 Spec 008 — painéis com dados reais e relatórios CSV (implementada em 2026-11-02)

- Implementação: módulo `src/modules/relatorios`; migration
  `20261102120000_paineis_relatorios.sql` com a tabela `exportacoes_relatorio` (RLS, auditoria,
  sem escrita direta) e as RPCs `painel_do_aluno`, `painel_da_gestao`, `painel_da_coordenacao` e
  `relatorio`. Os painéis só compõem as funções das specs 004, 006 e 007; nenhuma regra de cálculo
  nova. A demonstração usa um repositório próprio com os mesmos formatos e o selo
  "Dados fictícios"; a exportação fica desabilitada nela.
- **Encontro realizado** (pendências dos painéis): estado "realizado" ou data anterior a hoje no
  horário de Brasília, sem estar cancelado. O encontro de hoje só conta no dia seguinte. A recusa
  do definitivo (spec 007) continua usando todos os encontros.
- **Formato do CSV:** UTF-8 com BOM, separador `;`, linhas CRLF, vírgula decimal sem separador de
  milhar, datas `DD/MM/AAAA HH:MM`, "Sim"/"Não", nulo como célula vazia e apóstrofo antes de texto
  que começa com `=`, `+`, `-`, `@`, tabulação ou CR (injeção de fórmula). Arquivo
  `maratona-<tipo>-<AAAA-MM-DD>.csv`.
- **Fuso:** datas do CSV e o corte de "encontro realizado" em `America/Sao_Paulo`. **[validar]**
- **Textos livres fora do CSV:** fato, evidência, manifestação, justificativas e respostas podem
  conter dados pessoais e ficam só nas telas. A observação da presença entra no relatório de
  presença (R6). Nenhum relatório traz nota individual, e-mail ou identificador interno.
- **Pedidos de revisão:** só a coordenação exporta, porque a equipe docente não vê os pedidos nas
  telas (spec 007, FR-013 desta spec). O servidor recusa com `42501`.
- **Presença por equipe da época:** a equipe é a de que o estudante era integrante na data do
  encontro (`entrada_em`/`saida_em`), ou "Sem equipe". O seed local passou a formar as equipes 30
  dias antes, para que os relatórios mostrem a equipe nos encontros passados.
- **Indicadores da coordenação:** "encontros realizados de N" não conta os encontros cancelados.
  "Prova oficial pendente" soma os resultados pendentes (realização ou nota) e os integrantes
  atuais sem resultado, só em encontros de prova realizados.
- **Ações do aluno:** manifestação no prazo, revisão de decisão de ocorrência sem pedido e revisão
  da publicação provisória no prazo. Na edição encerrada o painel não pede ações.
- O E2E real dos painéis roda como projeto dependente (`paineis`), depois das outras jornadas,
  porque publica o ranking da Categoria B e lê o estado deixado por elas.

## 6.8 Spec 010 — gestão de edições, turmas e vínculos (implementada em 2026-11-03)

- Implementação: migration `20261104120000_gestao_edicoes.sql`, módulo `src/modules/organizacao`
  (edições, cadastro, vínculo de turmas, gestão por turma, mentores por curso, coordenação e
  seletor de edição) e páginas `/coordenacao/edicoes` e `/coordenacao/cadastro`.
- **Quem cria edições:** quem tem atribuição ativa de coordenação em qualquer edição; a criadora
  sai como coordenação da nova. Não há papel administrador; a primeira edição de uma instalação
  continua criada pela administração do banco. As regras vêm do piloto ou de outra edição
  coordenada e não mudam nesta spec.
- **Cadastro permanente:** cursos e turmas são da unidade; `cursos` e `turmas` passaram a ser o curso
  e a turma **na edição**. Correções do cadastro chegam sozinhas só às edições em preparação; na
  edição ativa, por "Atualizar a partir do cadastro". Instalação de uma só unidade. **[validar]**
- **Gestão por turma:** só a coordenação cadastra, importa e vincula alunos e docentes na turma.
  A busca de pessoas traz só contas que participam ou participaram de edições que a pessoa
  coordena, sem e-mail. **[validar]** se é preciso buscar qualquer conta.
- **Mentor por curso:** o vínculo ao curso gera linhas por turma (derivadas), mantidas por gatilho;
  vínculo direto de mentor a turma é recusado. Na migração, cada mentor por turma passou a ser
  vinculado ao curso e atua também nas outras turmas dele. **[validar]**
- **Encerramento:** lista ocorrências sem decisão, revisões abertas e categorias sem ranking, sem
  impedir; a justificativa e a lista ficam na edição e na auditoria. Edição encerrada recusa
  escrita em todas as tabelas dela (gatilho central); avisos e exportações continuam. Edição
  encerrada não é reaberta. **[validar]**
- **Coordenação:** a edição mantém ao menos uma coordenação ativa; ninguém altera a própria.
- **Várias edições ativas:** o seletor no topo aparece com duas ou mais edições da área; a escolha
  fica no dispositivo (só o id). Edição em preparação aparece com o selo "Em preparação".
- **Regras para a spec 011:** implementadas (seção 6.9), com a estrutura editável no lugar de "só
  valores mudam". Com ajustes por turma, equipes da mesma categoria podem ter máximos diferentes;
  o ranking por turma (spec 012) resolve a comparação.
- Testes das specs anteriores ajustados sem perder asserções: fixtures de mentor por turma passam
  pelo vínculo ao curso (só a derivada da turma ativa); fixtures em edição encerrada reabrem a
  edição durante a gravação; criação de cursos e turmas passou às RPCs do cadastro.

## 6.12 Ajustes visuais (2026-11-04, pedido do usuário)

- **Crédito de autoria:** "feito com ❤️ por Alisson Almeida", discreto, no rodapé da barra lateral
  (abaixo da marca SENAI, em duas linhas para não cruzar as faixas do canto), no rodapé do menu do
  celular e no rodapé da tela Entrar (na mesma linha da marca SENAI no celular, para a tela seguir
  sem rolagem em 360×640). Componente `src/app/layout/Credito.tsx`.
- **Ícone `coracao`:** criado no traço da biblioteca (24×24, traço 2), com o corpo na cor de apoio
  coral; o leitor de tela anuncia "amor". Validação visual pela unidade pendente, como os demais
  ícones.
- **Passos da edição:** o link "Abrir" não encolhe mais (quebrava como "Abri / r" no celular).

## 6.11 Spec 013 — encerramento da edição por turma (implementada em 2026-11-04)

- Implementação: migration `20261107120000_encerramento_por_turma.sql` (recria
  `app.pendencias_json` e `edicoes_que_coordeno`); tela `EstadoDaEdicao`.
- **Pendência de ranking ao encerrar:** turmas com equipes ativas cuja última publicação não é a
  definitiva ("Sem publicação", "Parcial" ou "Provisório"), no lugar das categorias sem ranking.
  Publicações por categoria anteriores não contam para a turma.
- **Não impede o encerramento** (decisão do usuário, mantém a spec 010); a lista fica no registro.
- **Edição encerrada mostra o registro** das pendências no formato gravado: turmas (encerramentos
  novos) ou categorias (anteriores); sem registro, "Pendências do encerramento não registradas".
- Desvios e observações:
  - o `011_edicoes` não tem equipes nas turmas da edição, então a lista de turmas fica vazia
    ali; a lista com turmas é coberta pelo `014_encerramento_turma`;
  - na demonstração há uma edição encerrada fictícia (também no seletor da coordenação), com o
    3º ano B "Sem publicação", porque o botão de encerrar fica desabilitado no modo demonstração.

## 6.10 Spec 012 — ranking por turma (implementada em 2026-11-04)

- **Divergência com o PRD:** RF14, HU05 e o risco "múltiplos cursos incomparáveis" falam em
  ranking por categoria; vale a instrução mais recente do usuário (spec 011): a classificação é
  por turma. A categoria continua como atributo da turma e da equipe.
- **Premiação:** vale para cada turma — as posições premiadas da publicação definitiva de cada
  turma recebem os prêmios configurados na edição. Empate persistente numa posição premiada:
  a coordenação decide, com justificativa auditada; até lá a turma fica em "empate a decidir".
  Valores, quantidade e condições dos prêmios continuam pendentes (§2).
- **Publicação em lote:** a coordenação marca várias turmas e publica no mesmo estado com uma
  justificativa; cada turma vira uma versão própria e uma recusa (ex.: pendência na definitiva)
  não impede as outras.
- **Premiação visível:** coordenação (todas as turmas); docentes e mentores (suas turmas, também a
  provisória, marcada "provisório — não final"); alunos (própria turma, só depois da definitiva).
- Publicações por categoria anteriores ficam imutáveis e só a coordenação as lê (auditoria e
  revisões já abertas); novas publicações por categoria são recusadas.
- Implementação: migration `20261106120000_ranking_por_turma.sql` (`turma_id` e `lote_id` em
  `publicacoes_ranking`, `decisoes_premiacao`, `publicar_ranking_turmas`, `ranking_da_edicao`,
  `ranking_da_turma`, `premiacao_da_edicao`, `decidir_premiacao_empate`, gatilhos de recusa) e
  ADR 0012; telas em `@/modules/resultado` (lista de turmas, publicação em lote, premiação).
- **Pendências contadas na lista do ranking:** só de encontros realizados, os mesmos números do
  painel da coordenação; a recusa da definitiva olha todos os encontros da turma.
- **Prazo de revisão da provisória:** pelas regras vigentes da turma no momento da publicação.
- **Aviso de publicação:** aluno, docente e mentor da turma (inclusive o mentor ligado ao curso).
- **Premiação provisória:** segue a última publicação da turma; uma parcial depois de uma
  provisória volta a "a definir".
- Desvios e observações:
  - o painel da turma mostra todas as posições da publicação da turma, mesmo de uma equipe que
    mudou de turma depois (a versão publicada não muda);
  - o teste `009` usava `current_date` para "ontem" e falhava depois das 21h de Brasília; passou a
    usar a data de Brasília;
  - na demonstração, o 3º ano A aparece com a definitiva e pendências (impossível no servidor),
    para mostrar o empate a decidir na premiação.
- ~~**[pendência]** O encerramento da edição (spec 010) ainda confere "categoria sem ranking".~~
  Resolvida na spec 013 (§6.11): a pendência passa a ser por turma.
- Editar os prêmios da edição continua fora do escopo (a lista vem do cadastro da edição).

## 6.9 Spec 011 — regras da edição e das turmas (implementada em 2026-11-03)

- Implementação: migration `20261105120000_regras_edicao.sql`; módulo `src/modules/pontuacao`
  (domínio das regras, `FormRegras`, `FormAjustesTurma`, `HistoricoRegras`, `EncontrosDaTurma`,
  `PontuacaoMaxima`); seções "Regras da edição" em `/coordenacao/edicoes` e "Regras da turma",
  "Encontros da turma" e pontuação máxima no painel da turma; menu em categorias.
- **Versões da edição:** cada gravação guarda uma versão nova com autor, justificativa e o horário a
  partir do qual vale; a versão inicial vale desde sempre. `edicoes.regras` continua como cópia da
  vigente. Rótulo sugerido (último número incrementado; sem número, `.1`), editável e único na
  edição. Concorrência otimista pela versão carregada; reenvio idêntico não grava.
- **Estrutura editável (substitui "só valores mudam" da spec 010):** critérios das rubricas, faixas de
  atraso e tipos de penalidade podem ser criados, removidos e renomeados; o id do critério nasce do
  nome e não muda ao renomear. A prova oficial segue o PRD (HU04) e não muda. Limites de proteção
  contra erro de digitação: 20 critérios por rubrica, nomes de 80 caracteres, 0 a 4 casas
  decimais, 1 a 20 encontros. **[validar]**
- **Ajustes da turma:** cada ajuste guarda o conjunto completo de grupos definidos para a turma
  (`{}` volta a herdar tudo); o restante vem da edição, inclusive mudanças posteriores. Coordenação
  ajusta qualquer grupo; o mentor do curso, só presença, participação, questões, entrega e
  apresentação; grupos fora do alcance de quem grava seguem como estão (o mentor não desfaz
  penalidades ou prazos da coordenação). Com base desatualizada, a resposta é "recarregue" antes da
  checagem de permissão.
- **Regras de cada encontro:** valem a versão e o ajuste vigentes no início do encontro (data e
  horário no fuso `America/Sao_Paulo`; sem horário, o início do dia). Encontro remarcado passa a
  usar a versão do novo início. Cálculo oficial, avaliação, participação, entrega, ocorrências e
  prazos usam as regras do encontro para a turma da equipe; avaliação já lançada continua válida e
  com os nomes antigos. As leituras para o cálculo parcial devolvem as regras de cada encontro.
- **Limite de atraso exibido do desafio** (desafio encerrado na lista): o maior entre as turmas do
  desafio; o envio de cada equipe usa o da própria turma. **[validar]**
- **Prazo de revisão do ranking publicado:** ainda pelas regras atuais da edição (o ranking por
  turma é a spec 012).
- **Encontros da turma:** guardam-se só as exclusões; encontro com presença, participação,
  avaliação, respostas, prova oficial ou ocorrência da turma não sai; encontro fora da turma não
  recebe lançamentos dela e sai dos totais, dos lançamentos e do painel da turma. O "próximo
  encontro" do painel do aluno continua o da edição.
- **Pontuação máxima da turma:** soma, nos encontros da turma, de presença + participação +
  questões (ou prova oficial, conforme o encontro) + entrega + apresentação pelas regras de cada
  encontro. **[validar]** encontros com avaliação objetiva diferente.
- **Regulamento:** quem tem uma turma só (estudante, docente de uma turma) vê as regras da turma, com
  "definido para a sua turma" e a pontuação máxima; coordenação e docentes de várias turmas veem as
  da edição.
- **Menu:** categorias por área (US6), sem mudar endereços nem permissões.
- **Tela inicial como painel (revisão do FR-018, pedida pelo usuário):** o "Acesso rápido" sai das
  telas iniciais; a navegação fica só no menu. Cada perfil abre com uma faixa de indicadores
  calculados dos dados que o servidor já entrega (nada novo no banco): aluno — pontos (prévia),
  posição, próximo encontro e próximo prazo; docente — turmas, equipes com pendência, pendências
  de registro (por tipo) e próximo encontro; coordenação — cursos e turmas, equipes ativas,
  encontros realizados (com barra de progresso) e pendências abertas (soma das categorias).
  Abaixo, o que pede ação: ações pendentes, avisos e convites (aluno); pendências por turma, com
  link direto para o painel da turma (docente, mantém o SC-001 da spec 004 em uma interação);
  pendências por categoria com contador destacado quando acima de zero (coordenação).
  "Relatórios" fica como ação no banner. A saudação usa o primeiro nome, sem tratamento
  ("Olá, Lúcia!"), e o selo "Dados fictícios" ganhou versão legível sobre o banner escuro.
- **Menu recolhível (ajuste visual pedido no incremento):** cada categoria tem ícone e é um botão
  que recolhe e expande os itens; começa recolhida, exceto a categoria da página atual, e abrir uma
  fecha a anterior (só uma aberta por vez). Recolhida, a categoria mostra o contador dos itens
  (ex.: convites pendentes) e um ponto quando contém a página atual. A barra lateral passa de 16rem
  para 17,5rem (token `--sidebar-width`, atualizado também na referência de tokens) e o menu do
  celular de 15rem para 16rem (18rem no tablet), para caber ícone, título e seta sem cortar.
  **[validar]** com a identidade visual.
- **Barras de rolagem:** finas, trilho transparente e polegar na cor azul-marinho da marca (branco
  translúcido nas áreas escuras do menu); a barra lateral rola quando a categoria aberta não cabe.
- **Tela Entrar:** ocupa exatamente a altura da tela (o aviso de demonstração e o de sem conexão
  passam a fazer parte dela) e, no celular, o conteúdo fica sem moldura e mais compacto, sem
  rolagem de 360×640 a 1920×1080. Só rola quando a pessoa abre a ajuda, quando aparece um erro ou
  com zoom de texto — nada é escondido para caber.
- **Decisões para a spec 012 (não implementadas):** ranking por turma, apresentado dentro da turma;
  o estudante vê só o da própria turma; substitui o ranking por categoria da spec 007.
- Desvios do plano: `encontros_fora_da_turma` tem `id` (com `(turma_id, encontro_id)` único) para a
  auditoria registrar a linha; `regras_da_turma` devolve também `encontrosBloqueados` (só para a
  coordenação), usado na tela de encontros da turma.

## 6.7 Spec 009 — comunicados e regulamento (implementada em 2026-11-03)

- Implementação: módulo `src/modules/comunicados`; migration `20261103120000_comunicados.sql`
  com as tabelas `comunicados` e `comunicado_turmas` (RLS, auditoria, sem escrita direta) e as RPCs
  `salvar_comunicado`, `apagar_rascunho`, `publicar_comunicado`, `corrigir_comunicado`,
  `retirar_comunicado`, `marcar_comunicado_lido`, `comunicados_para_mim` e
  `comunicados_que_gerencio`. A demonstração mostra os comunicados fictícios com escrita
  desabilitada.
- **Autoria (esclarecimento 1):** coordenação, docentes e mentores publicam. Docente e mentor só
  para as turmas em que atuam, com pelo menos uma turma; a coordenação pode publicar para a edição
  inteira. Sem etapa de aprovação (esclarecimento 2): a coordenação vê, corrige e retira qualquer
  comunicado da edição. Quem deixa de atuar numa turma não corrige mais os comunicados dela.
- **Público por perfil e turma:** todos (estudantes, docentes e mentores), estudantes ou equipe
  docente, opcionalmente limitado a turmas, avaliado na leitura. Público por equipe ou por pessoa
  fica fora. **[validar]**
- **Apoio e analista** não leem comunicados neste incremento, porque o PRD não define o que
  recebem.
- **Avisos e selo "Novo":** publicação e cada correção geram avisos na tabela `avisos` (tipos
  `comunicado_publicado` e `comunicado_atualizado`); a retirada não avisa. O "Novo" deriva do aviso
  não lido, sem tabela de leituras: quem entra no público depois da publicação vê o comunicado sem
  o selo e sem aviso retroativo. O aviso leva à página de comunicados do perfil.
  Na retirada, os avisos pendentes do comunicado passam a lidos, para o contador não apontar para
  algo que o público já não vê; os avisos ficam no histórico, sem ser apagados.
- **Correção e retirada:** só de publicados, com justificativa de pelo menos 10 caracteres (a regra
  de `app.exigir_justificativa`, já usada no projeto), registrada na auditoria com a versão
  anterior. O público não muda depois de publicado; publicado não é apagado, só retirado.
- **Limites:** título de 1 a 200 caracteres e texto de 1 a 5.000, sem marcação (exibido como texto
  puro). **[validar]**
- **Regulamento:** o resumo passa a ler `edicoes.regras` e `regras_versao` da edição, sem números
  fixos na tela; valor ausente aparece como "a definir". O documento oficial do regulamento
  continua ausente e não é publicado por esta spec.
- **Edição encerrada:** comunicados só podem ser lidos.

## 6.1 Spec 005 — busca e paginação

- Busca e paginação são feitas no navegador sobre os registros que a RLS já entregou (volume
  pequeno por edição). Se as listagens crescerem (ex.: centenas de estudantes por edição), migrar
  para paginação e busca no servidor (`range` + filtro no PostgREST).
- Tamanho de página: 10. **[validar]** com a coordenação.
- Resumos dos painéis iniciais não são listagens e não têm busca.

## 7. Questões em aberto (PRD §19)

Unidade, cursos e volume de usuários; forma de login (institucional?); hospedagem e domínio;
autorização e prazo da nota oficial e sua escala; formatos e limites de arquivo; regra para
trios, presença parcial e turmas mistas; quem pode reabrir avaliação; retenção de dados e
política para menores.
