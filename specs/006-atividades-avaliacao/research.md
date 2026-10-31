# Research: Atividades, entregas, presença e avaliação

## R1. Envio de arquivo: Storage privado + RPC

- **Decisão**: o envio acontece em duas etapas.
  1. O navegador envia o arquivo ao bucket privado `entregas`, no caminho
     `{desafio_id}/{dupla_id}/{uuid}.{ext}`.
  2. O navegador chama `registrar_entrega(p_desafio, p_arquivo, p_link)`. A RPC confere, em
     `storage.objects`, que o objeto existe, pertence ao autor e está no prefixo da equipe, e lê
     tamanho e tipo nos metadados. Também confere prazo e equipe. Só então cria a versão e o
     protocolo, e devolve o comprovante.

  O bucket limita tamanho (50 MB) e tipos (PDF, ZIP, PNG, JPG) já no upload. A RPC repete as
  mesmas checagens (FR-003).

- **Políticas do Storage** (`storage.objects`, bucket `entregas`):
  - `insert`: só integrante ativo da equipe do prefixo, com o desafio publicado para a turma dele;
  - `select`: integrantes da equipe, docente ou mentor da turma e coordenação da edição;
  - `update`/`delete`: nenhuma política. Arquivos não são sobrescritos e cada versão tem um
    caminho único.
- **Motivo**: o Storage não participa da transação SQL. A ordem "gravar o arquivo, depois
  registrar" garante que nunca exista comprovante sem arquivo (FR-004).
- **Alternativa rejeitada**: uma Edge Function com `service_role` para receber o arquivo. Exige
  segredo e mais infraestrutura, sem ganho de segurança sobre as políticas de Storage.

## R2. Prazo, atraso e prorrogação

- O atraso é calculado na RPC: `ceil(extract(epoch from now() - prazo_efetivo) / 60)`. O prazo
  efetivo é o da prorrogação mais recente da equipe ou, se não houver, o do desafio.
- Com atraso acima de `regras.entrega.limiteAtrasoMinutos`, o envio é recusado.
- Dentro do limite, o desconto vem de `regras.entrega.faixasDeAtraso`. O comprovante mostra os
  minutos de atraso e o desconto previsto.
- Com prorrogação registrada, não há desconto enquanto o envio estiver dentro do novo prazo, que
  é tratado como um prazo normal.
- Reenvio depois do prazo, quando a equipe já tem entrega no prazo: recusado (caso de borda da
  spec).

## R2.1 Encerramento (FR-027)

- O estado "encerrado" é derivado no servidor: `estado = 'encerrado'` (encerramento manual) ou
  `now() > prazo` (lista) ou `now() > prazo + limiteAtrasoMinutos` (desafio). Não há job:
  as RPCs e a leitura calculam a situação a cada chamada.
- Encerramento manual antecipado: `encerrar_desafio`/`encerrar_lista` (docente).
- Prorrogação vale mesmo com o desafio encerrado: o envio usa o prazo efetivo da equipe.

## R3. Gabarito protegido (FR-017, SC-005)

- O aluno não tem nenhuma política de SELECT em `questoes`, `alternativas` nem
  `submissoes_questoes`. Docente, mentor e coordenação leem as tabelas por RLS.
- O aluno lê pela RPC `lista_para_equipe(p_lista)`. Antes do prazo, ela devolve as questões e as
  alternativas sem `correta` e sem `justificativa`. Depois do prazo, devolve também o gabarito, as
  justificativas, as respostas da equipe e os acertos.
- O pgTAP verifica que, antes do prazo, nenhuma chave `correta`/`justificativa` sai na resposta e
  que a leitura direta das tabelas devolve 0 linhas para o aluno.

## R4. Submissão única (FR-018, SC-007)

- Há um índice único `(lista_id, dupla_id)` em `submissoes_questoes`. A RPC `enviar_respostas`
  bloqueia a linha da lista (`for update`) e verifica se já existe submissão. O índice é a última
  barreira.
- O script `scripts/testar-concorrencia-questoes.mjs` dispara dois envios sobrepostos, com duas
  conexões reais, e confirma que só um é aceito.

## R5. Histórico e correções

- Tabelas de estado atual (`presencas`, `participacoes`, `avaliacoes`) têm a trilha de auditoria
  `app.registrar_auditoria`, que guarda os valores antes e depois e a justificativa vinda de
  `set_config('app.justificativa', …, true)`.
- Uma correção (atualizar registro existente) exige justificativa de pelo menos 10 caracteres,
  mesma regra da spec 002. O primeiro registro não exige.
- As versões de entrega ficam na própria tabela `entregas`, com uma linha por versão.
- **Repetição segura (Constituição V):** antes de exigir justificativa, a RPC compara o que chegou
  com o que está gravado (presença e observação; notas em jsonb; feedback; não avaliável). Se for
  igual, devolve sucesso sem gravar. Isso cobre o caso "o servidor gravou, mas a resposta se perdeu
  e o docente tentou de novo". Na entrega, a repetição é identificada pela `chave_envio` (ver I1).

## R6. Pontuação parcial (US5, FR-021)

- A RPC `lancamentos_da_minha_equipe(p_edicao)` devolve as regras da edição e, por encontro:
  - as presenças dos integrantes;
  - as notas de participação;
  - as questões: acertos e total, só depois do prazo;
  - a avaliação: notas de entrega e apresentação, não avaliável, feedback e situação da entrega;
  - o atraso da última entrega e se há prorrogação.
- O domínio `montarLancamentos` converte isso em `LancamentosDoEncontro`. O cálculo é o
  `calcularEncontro`, já testado com os casos de contrato.
- Um componente sem registro aparece como "aguardando registro", inclusive a presença sem
  marcação. Isso é responsabilidade do domínio do módulo `atividades`.

## R7. Arquivos órfãos

Quando o upload termina mas a RPC falha (rede, prazo), sobra um arquivo sem entrega. Para
descartar esses arquivos com segurança, é preciso usar a API do Storage com privilégio de
servidor: apagar direto em `storage.objects` deixa o binário para trás.

- **Decisão** (confirmada pelo usuário em 2026-10-30): nada é exposto ao aluno, porque o arquivo não tem versão nem comprovante. A limpeza
  periódica fica registrada como pendência operacional em `docs/decisoes-e-pendencias.md` (job
  com a Storage API no ambiente de produção).
- **Risco**: aceito, porque o bucket é privado e o espaço é pequeno no piloto.

## R8. Quem faz o quê

| Ação                                                | Docente da turma | Mentor da turma | Coordenação da edição |
| --------------------------------------------------- | ---------------- | --------------- | --------------------- |
| Criar, editar, publicar e encerrar desafio ou lista | Sim              | Sim             | Não                   |
| Registrar presença e participação                   | Sim              | Sim             | Só corrigir           |
| Avaliar entrega e apresentação                      | Sim              | Sim             | Só corrigir           |
| Registrar prorrogação ou impedimento                | Sim              | Sim             | Sim                   |
| Ver entregas e arquivos                             | Sim              | Sim             | Sim                   |

A coordenação "supervisiona" (spec): lê tudo da edição, corrige com justificativa e registra
prorrogação. O mentor tem as mesmas permissões do docente na turma (decidido em 2026-10-30).

## R9. Vários desafios e listas por encontro (esclarecimento de 2026-10-30, opção B)

- Uma turma pode ter vários desafios e várias listas publicados no mesmo encontro (FR-026).
- A pontuação do encontro em cada componente é a média simples dos itens publicados para a turma.
  O cálculo fica no domínio TS (`montarLancamentos`), que gera as notas médias por critério antes
  de chamar `calcularEncontro`:
  - **entrega e apresentação**: a média das pontuações de cada desafio, com o desconto de atraso
    aplicado em cada desafio antes da média. Um desafio avaliado sem entrega conta 0.
  - **questões**: a média das pontuações das listas encerradas. Uma lista sem submissão conta 0.
- Se algum item do componente estiver pendente, o componente inteiro fica "aguardando registro".
- O PRD não define essa agregação. A regra é instrução explícita do usuário (governança da
  constituição) e fica **[validar]** com a coordenação.

## R10. Demonstração

O repositório da demonstração devolve os desafios e lançamentos fictícios já existentes em
`modules/demo`, sem lista de questões. Toda escrita é recusada com a mensagem padrão da
demonstração, e o E2E da demo continua verificando que nada é simulado como recebido.
