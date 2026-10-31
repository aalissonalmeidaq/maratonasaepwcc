# Contrato de telas: atividades, entregas, presença e avaliação

## Aluno

### "Desafios e entregas" (`/aluno/desafios`)

**Lista de desafios**

- Mostra os desafios publicados e encerrados da turma.
- Cada desafio aparece num cartão com título, enunciado, recursos permitidos, uso de IA e prazo
  em horário local.
- A situação aparece como "Aberto", "Prazo encerrado" ou "Encerrado".

**Envio da entrega** (`EnvioEntrega`)

- Campo de arquivo e/ou de link, conforme o que o desafio aceita.
- O navegador valida o tipo e o tamanho antes de enviar.
- Enquanto envia, o botão mostra "Enviando…".
- Só depois da resposta do servidor aparece o comprovante: "Entrega recebida pelo servidor —
  protocolo X, recebida em dd/mm hh:mm". Com atraso, aparece também "Atraso de N min: desconto
  previsto de D pontos em Organização e entrega".
- Em caso de erro, aparece "A entrega não foi recebida" com o motivo do servidor.
- O envio fica bloqueado quando:
  - o aluno não tem equipe: "Você precisa fazer parte de uma equipe para enviar.";
  - não há conexão;
  - está em modo demonstração.

**Histórico de versões**

- Mostra versão, protocolo, horário, autor e atraso de cada envio.
- O arquivo de cada versão pode ser baixado por um link assinado.

**Avaliação**

- Aparece assim que for registrada.
- Mostra as notas por critério, o desconto de atraso separado, a apresentação (ou "não
  avaliável") e o feedback.

**Questões do encontro**

- Antes de enviar: as questões aparecem com alternativas (`radio` agrupado em `fieldset`, com
  `legend`) e o botão "Enviar respostas da equipe".
  - Antes de enviar, aparece uma confirmação: "A equipe só pode enviar uma vez."
  - Depois de enviar, aparece "Respostas enviadas por {nome} em {data}".
- Depois do prazo: aparecem acertos, gabarito, justificativa e "Pontuação: X de 30".

### "Pontuação" (`/aluno/pontuacao`)

- Um cartão por encontro, com os componentes Presença, Participação, Questões/prova, Entrega e
  Apresentação.
- Cada componente mostra "x / máximo" ou "Aguardando registro".
- O total do encontro aparece com o selo "Parcial".
- O feedback da avaliação aparece no cartão.
- Não mostra notas de outras equipes.

## Docente e mentor

### "Atividades" (`/docente/atividades`; docente e mentor da turma editam)

- Filtro por encontro.
- **Desafios**:
  - formulário com título, enunciado, recursos, política de IA, prazo (data e hora), formas
    aceitas e turmas (caixas de seleção com as turmas vinculadas);
  - ações "Salvar rascunho", "Publicar" e "Encerrar";
  - estado exibido com `StatusBadge`.
- **Listas de questões**:
  - aparecem só em encontros com o componente objetivo "questões";
  - o editor de questões permite adicionar e remover questões e alternativas, marcar a correta,
    e preencher justificativa e capacidade.
- O mentor da turma usa a tela com as mesmas ações do docente.

### "Presença" (`/docente/presenca`; também `/coordenacao/presenca`)

- Escolha de turma e encontro.
- **Presença**:
  - tabela de alunos agrupados por equipe, com uma caixa "Presente" e um campo opcional "Observação" (até 300 caracteres) para cada aluno;
  - ações em lote "Marcar todos presentes" e "Salvar presenças";
  - um campo de justificativa aparece quando há alteração de registro existente.
- **Participação** por equipe: um campo numérico por critério, com o máximo no rótulo.
- A confirmação só aparece depois da resposta do servidor.

### "Avaliações" (`/docente/avaliacoes`; também `/coordenacao/avaliacoes`)

- Escolha de turma e desafio.
- Um cartão por equipe com:
  - a última entrega (link para baixar, protocolo, atraso) e as versões anteriores;
  - o formulário de rubrica: um campo por critério de entrega e de apresentação, a opção
    "Apresentação não avaliável" e o feedback, obrigatório quando houve entrega;
  - um campo de justificativa quando já existe avaliação;
  - "Prorrogação ou impedimento", com novo prazo e justificativa, disponível só para docente e
    coordenação.
- Coordenação: o formulário de rubrica só aparece para corrigir uma avaliação existente.

## Estados comuns

- Carregando: `Spinner`.
- Erro: `Alert` com "Tentar novamente".
- Sem conexão ou em modo demonstração: as ações ficam desabilitadas e o motivo aparece em texto.
- Nenhuma ação mostra sucesso antes da resposta do servidor.
