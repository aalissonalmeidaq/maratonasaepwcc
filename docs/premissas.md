# Premissas do projeto (P01–P32)

Registro de desenvolvimento das premissas que o sistema adotou sem decisão da unidade. Até a spec 017
elas eram tratadas numa tela do site ("Premissas em validação", specs 015 e 016); a **spec 018** retirou
a tela e as tabelas, e este documento passou a ser o único registro.

- **Estado:** todas as 32 estão resolvidas — P25 pela spec 016 (várias unidades) e as demais por
  decisão do projeto de 06/11/2026. Resolver não muda regra: toda mudança continua exigindo uma spec.
- **O que depende da unidade na implantação** (fora do sistema) está em
  [operacao-e-homologacao.md](operacao-e-homologacao.md) e em
  [decisoes-e-pendencias.md](decisoes-e-pendencias.md): e-mail (P32), premiação (P13) e conferência
  visual e institucional (P01, P02, P06, P08).
- Texto copiado do catálogo que existia no banco (migration `20261109120000_premissas_em_validacao.sql`),
  sem acréscimos.

## Pontuação

### P09 — Como as notas fracionárias devem ser arredondadas?

- **Pergunta:** Como as notas fracionárias devem ser arredondadas?
- **Premissa em uso:** Duas casas decimais, meio para cima, só no resultado de cada componente e no total; sem arredondamento intermediário.
- **Onde afeta:** Cálculo de todos os componentes, total do encontro e ranking.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §3; PRD §10
- **Resolução:** decisão do projeto de 06/11/2026

### P10 — O teto de 10 pontos de descontos vale para quais penalidades?

- **Pergunta:** O teto de 10 pontos de descontos vale para quais penalidades?
- **Premissa em uso:** O teto vale para os descontos gerais de ocorrências; zerar a entrega por plágio não entra no teto.
- **Onde afeta:** Decisão de ocorrências e pontuação do encontro.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §3
- **Resolução:** decisão do projeto de 06/11/2026

### P11 — Entrega com prorrogação ou impedimento registrado deve ter desconto de atraso?

- **Pergunta:** Entrega com prorrogação ou impedimento registrado deve ter desconto de atraso?
- **Premissa em uso:** Com prorrogação ou impedimento registrado, não há desconto de atraso.
- **Onde afeta:** Pontuação da entrega (critério organização).
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §3
- **Resolução:** decisão do projeto de 06/11/2026

### P12 — O que fazer com penalidades repetidas pelo mesmo fato?

- **Pergunta:** O que fazer com penalidades repetidas pelo mesmo fato?
- **Premissa em uso:** Vale a primeira registrada; as demais são ignoradas e a tela informa quais foram.
- **Onde afeta:** Ocorrências e pontuação do encontro.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §3
- **Resolução:** decisão do projeto de 06/11/2026

### P13 — Quais são os valores, a quantidade, a validade e a forma de entrega da premiação?

- **Pergunta:** Quais são os valores, a quantidade, a validade e a forma de entrega da premiação?
- **Premissa em uso:** Os itens de premiação são registrados como configuração da edição; valores, quantidade, validade e entrega estão a definir.
- **Onde afeta:** Tela de premiação da coordenação.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §3
- **Resolução:** decisão do projeto de 06/11/2026

### P14 — Quando o encontro tem vários desafios ou listas, como somar a nota do componente?

- **Pergunta:** Quando o encontro tem vários desafios ou listas, como somar a nota do componente?
- **Premissa em uso:** O componente é a média simples dos itens do encontro (o PRD não define a agregação).
- **Onde afeta:** Pontuação de questões e de entrega em encontros com mais de um item.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.4
- **Resolução:** decisão do projeto de 06/11/2026

### P15 — Em equipe de três estudantes, como fica a pontuação de presença?

- **Pergunta:** Em equipe de três estudantes, como fica a pontuação de presença?
- **Premissa em uso:** A presença dos três é limitada ao máximo por equipe das regras (10 no piloto).
- **Onde afeta:** Pontuação de presença dos trios.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.4
- **Resolução:** decisão do projeto de 06/11/2026

### P16 — As penalidades e os prazos de 24 horas estão de acordo com o regulamento?

- **Pergunta:** As penalidades e os prazos de 24 horas estão de acordo com o regulamento?
- **Premissa em uso:** Penalidades e prazos de manifestação e de revisão (24 h) com os valores do PRD, aplicados às edições não encerradas.
- **Onde afeta:** Ocorrências, manifestação e pedidos de revisão.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.5
- **Resolução:** decisão do projeto de 06/11/2026

### P17 — Como tratar nota da prova oficial que não está na escala de 0 a 100?

- **Pergunta:** Como tratar nota da prova oficial que não está na escala de 0 a 100?
- **Premissa em uso:** Nota sem escala 0–100 e sem autorização confirmadas fica pendente; o sistema não converte escalas.
- **Onde afeta:** Registro da prova oficial e resultado da equipe.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.5
- **Resolução:** decisão do projeto de 06/11/2026

### P18 — Os limites de proteção das regras da edição estão adequados?

- **Pergunta:** Os limites de proteção das regras da edição estão adequados?
- **Premissa em uso:** Até 20 critérios por rubrica, nomes com até 80 caracteres, de 0 a 4 casas decimais e de 1 a 20 encontros.
- **Onde afeta:** Tela de regras da edição e das turmas.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.9
- **Resolução:** decisão do projeto de 06/11/2026

### P19 — A pontuação máxima da turma está correta para encontros com avaliação objetiva diferente?

- **Pergunta:** A pontuação máxima da turma está correta para encontros com avaliação objetiva diferente?
- **Premissa em uso:** A pontuação máxima soma, nos encontros da turma, os componentes pelas regras de cada encontro (questões ou prova oficial).
- **Onde afeta:** Regulamento da turma e painéis de progresso.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.9
- **Resolução:** decisão do projeto de 06/11/2026

## Equipes e atividades

### P20 — Que limite de atraso mostrar num desafio que vale para várias turmas?

- **Pergunta:** Que limite de atraso mostrar num desafio que vale para várias turmas?
- **Premissa em uso:** A lista mostra o maior limite entre as turmas do desafio; o envio de cada equipe usa o da própria turma.
- **Onde afeta:** Lista de desafios encerrados e envio das entregas.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.9
- **Resolução:** decisão do projeto de 06/11/2026

### P21 — Qual o tamanho mínimo da justificativa para substituir integrante ou desfazer equipe?

- **Pergunta:** Qual o tamanho mínimo da justificativa para substituir integrante ou desfazer equipe?
- **Premissa em uso:** Justificativa com pelo menos 10 caracteres.
- **Onde afeta:** Gestão das equipes pela coordenação, docentes e mentores.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6
- **Resolução:** decisão do projeto de 06/11/2026

### P22 — Os convites para formar equipe devem expirar ou ter limite por estudante?

- **Pergunta:** Os convites para formar equipe devem expirar ou ter limite por estudante?
- **Premissa em uso:** Convites não expiram e não há limite de convites por estudante.
- **Onde afeta:** Formação das equipes pelos estudantes.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.2
- **Resolução:** decisão do projeto de 06/11/2026

### P23 — Os nomes de equipe precisam de moderação?

- **Pergunta:** Os nomes de equipe precisam de moderação?
- **Premissa em uso:** Sem moderação; docente ou mentor da turma pode renomear com justificativa.
- **Onde afeta:** Nome das equipes nas telas e no ranking.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.2
- **Resolução:** decisão do projeto de 06/11/2026

### P24 — Quem pode registrar prorrogação ou impedimento de entrega?

- **Pergunta:** Quem pode registrar prorrogação ou impedimento de entrega?
- **Premissa em uso:** Docente ou mentor da turma, ou a coordenação.
- **Onde afeta:** Entregas e descontos de atraso.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.4
- **Resolução:** decisão do projeto de 06/11/2026

## Acesso e edições

### P25 — O cadastro permanente de cursos e turmas e a instalação de uma só unidade atendem à unidade?

- **Pergunta:** O cadastro permanente de cursos e turmas e a instalação de uma só unidade atendem à unidade?
- **Premissa em uso:** Cursos e turmas são da unidade; correções chegam sozinhas às edições em preparação e, na edição ativa, por "Atualizar a partir do cadastro". Uma instalação atende uma unidade.
- **Onde afeta:** Cadastro de cursos e turmas e gestão das edições.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.8
- **Resolução:** spec 016

### P26 — A busca de pessoas da coordenação deve alcançar qualquer conta da instalação?

- **Pergunta:** A busca de pessoas da coordenação deve alcançar qualquer conta da instalação?
- **Premissa em uso:** A busca traz só contas que participam ou participaram de edições que a pessoa coordena, sem e-mail.
- **Onde afeta:** Vínculo de estudantes e docentes às turmas.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.8
- **Resolução:** decisão do projeto de 06/11/2026

### P27 — O mentor vinculado a um curso deve atuar em todas as turmas dele?

- **Pergunta:** O mentor vinculado a um curso deve atuar em todas as turmas dele?
- **Premissa em uso:** O mentor é vinculado ao curso e atua em todas as turmas do curso; vínculo direto de mentor a turma é recusado.
- **Onde afeta:** Permissões de mentores nas turmas.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.8
- **Resolução:** decisão do projeto de 06/11/2026

### P28 — Uma edição encerrada pode ser reaberta?

- **Pergunta:** Uma edição encerrada pode ser reaberta?
- **Premissa em uso:** Edição encerrada não é reaberta; os dados dela só podem ser lidos.
- **Onde afeta:** Encerramento da edição e todas as telas da edição encerrada.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.8
- **Resolução:** decisão do projeto de 06/11/2026

## Comunicados e relatórios

### P29 — Os comunicados precisam de público por equipe ou por pessoa?

- **Pergunta:** Os comunicados precisam de público por equipe ou por pessoa?
- **Premissa em uso:** O público é por perfil (todos, estudantes ou equipe docente), opcionalmente limitado a turmas; não há público por equipe ou por pessoa.
- **Onde afeta:** Publicação de comunicados.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.7
- **Resolução:** decisão do projeto de 06/11/2026

### P30 — Os limites de tamanho dos comunicados estão adequados?

- **Pergunta:** Os limites de tamanho dos comunicados estão adequados?
- **Premissa em uso:** Título de 1 a 200 caracteres e texto de 1 a 5.000, sem formatação.
- **Onde afeta:** Publicação de comunicados.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.7
- **Resolução:** decisão do projeto de 06/11/2026

### P31 — Quantos itens as listas devem mostrar por página?

- **Pergunta:** Quantos itens as listas devem mostrar por página?
- **Premissa em uso:** Listas com busca mostram 10 itens por página.
- **Onde afeta:** Listas de estudantes, equipes, entregas e demais listas com busca.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §6.1
- **Resolução:** decisão do projeto de 06/11/2026

## Identidade visual

### P01 — Qual versão dos arquivos da marca é a aprovada?

- **Pergunta:** Qual versão dos arquivos da marca é a aprovada?
- **Premissa em uso:** O sistema usa os SVGs de docs/referencias/; a versão anterior em VETORIZADAS CLAUDE/ (prefixo saep-) não é usada.
- **Onde afeta:** Logotipo na tela de entrada, no menu, no regulamento público e nos ícones do aplicativo.
- **Opções:** Usar os arquivos de docs/referencias/; Usar os arquivos de VETORIZADAS CLAUDE/
- **Referência:** docs/decisoes-e-pendencias.md §1
- **Resolução:** decisão do projeto de 06/11/2026

### P02 — Os 118 ícones redesenhados a partir das pranchas estão fiéis à identidade visual?

- **Pergunta:** Os 118 ícones redesenhados a partir das pranchas estão fiéis à identidade visual?
- **Premissa em uso:** Ícones redesenhados à mão a partir das pranchas (não por rastreio automático), mais o ícone "Salvar" criado no mesmo estilo.
- **Onde afeta:** Todos os ícones do menu, dos cartões e dos botões (galeria em docs/icones/galeria.html).
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §1 e §2.1
- **Resolução:** decisão do projeto de 06/11/2026

### P03 — As cores da interface devem seguir os tokens atuais ou a paleta da prancha?

- **Pergunta:** As cores da interface devem seguir os tokens atuais ou a paleta da prancha?
- **Premissa em uso:** A interface usa os tokens (azul-marinho #062457, amarelo #FFB820, borda #DCE5EF); a prancha mostra #0B2D6B, #FFC02E e #E6EBF2.
- **Onde afeta:** Todas as cores da interface; os padrões gráficos já usam a paleta da prancha.
- **Opções:** Manter os tokens atuais; Migrar os tokens para a paleta da prancha
- **Referência:** docs/decisoes-e-pendencias.md §2 e §2.1
- **Resolução:** decisão do projeto de 06/11/2026

### P04 — A seta da marca deve ser coral ou laranja?

- **Pergunta:** A seta da marca deve ser coral ou laranja?
- **Premissa em uso:** A seta fica em coral #FC4B55, como nos SVGs oficiais; o texto de referência citava laranja.
- **Onde afeta:** Logotipo em todas as telas e nos ícones do aplicativo.
- **Opções:** Coral, como nos SVGs oficiais; Laranja
- **Referência:** docs/decisoes-e-pendencias.md §2
- **Resolução:** decisão do projeto de 06/11/2026

### P05 — A largura do menu lateral está adequada à identidade visual?

- **Pergunta:** A largura do menu lateral está adequada à identidade visual?
- **Premissa em uso:** Menu lateral com 17,5rem no computador, 16rem no celular e 18rem no tablet, para caber ícone, título e seta sem cortar.
- **Onde afeta:** Menu de todas as áreas internas.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §2 e §6.9
- **Resolução:** decisão do projeto de 06/11/2026

### P06 — Os padrões gráficos recriados em SVG estão fiéis à prancha 08?

- **Pergunta:** Os padrões gráficos recriados em SVG estão fiéis à prancha 08?
- **Premissa em uso:** Padrões recriados em SVG a partir da prancha (galeria em docs/padroes/galeria.html).
- **Onde afeta:** Faixas e fundos decorativos da entrada, do menu e dos destaques.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §2.1
- **Resolução:** decisão do projeto de 06/11/2026

### P07 — Os ícones do aplicativo instalado estão aprovados?

- **Pergunta:** Os ícones do aplicativo instalado estão aprovados?
- **Premissa em uso:** Ícones do aplicativo gerados a partir do símbolo da marca, com fundo branco no ícone adaptável (Android).
- **Onde afeta:** Ícone na tela inicial do celular e do computador após instalar o aplicativo.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §5
- **Resolução:** decisão do projeto de 06/11/2026

### P08 — A fonte Montserrat, hospedada com o aplicativo, tem a confirmação institucional?

- **Pergunta:** A fonte Montserrat, hospedada com o aplicativo, tem a confirmação institucional?
- **Premissa em uso:** Montserrat (licença SIL OFL) servida junto com o aplicativo, sem depender de serviço externo.
- **Onde afeta:** Todos os textos do sistema.
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §1
- **Resolução:** decisão do projeto de 06/11/2026

## Operação

### P32 — Qual provedor e qual remetente vão enviar os e-mails de convite e recuperação de senha?

- **Pergunta:** Qual provedor e qual remetente vão enviar os e-mails de convite e recuperação de senha?
- **Premissa em uso:** Os e-mails de convite e de recuperação de senha dependem do provedor e do remetente da unidade, ainda não definidos.
- **Onde afeta:** Criação de contas, primeiro acesso e "Esqueci minha senha".
- **Opções:** sem opções fixas
- **Referência:** docs/decisoes-e-pendencias.md §5; docs/operacao-e-homologacao.md; docs/adr/0009-convites-de-acesso.md
- **Resolução:** decisão do projeto de 06/11/2026
