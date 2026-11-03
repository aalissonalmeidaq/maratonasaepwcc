# Research: Regras da edição e das turmas

Decisões técnicas da spec 011. Formato: decisão, motivo e alternativas.

## R1. Versões das regras da edição

- **Decisão:** tabela `versoes_regras` (edição, rótulo único na edição, regras completas, `vale_desde`,
  autor, justificativa). `edicoes.regras` e `edicoes.regras_versao` continuam como cópia da versão
  vigente (leituras atuais, criação de edição por cópia, demonstração). A migração cria, para cada
  edição existente, a versão inicial com o rótulo atual e `vale_desde = '-infinity'`; `criar_edicao`
  passa a criar também a versão inicial.
- **Motivo:** FR-002 e FR-010 exigem consultar a versão de qualquer instante; a auditoria guarda o
  antes, mas não serve para cálculo.
- **Alternativas:** copiar as regras em cada encontro; rejeitada (duplica e não acompanha a troca de
  data do encontro).

## R2. Ajustes da turma por grupo

- **Decisão:** tabela `ajustes_regras_turma` (turma na edição, `grupos jsonb` com só os grupos
  ajustados, `vale_desde`, autor, papel do autor, justificativa). Cada gravação guarda o conjunto
  completo de grupos ajustados da turma naquele instante (desfazer um ajuste = gravar o conjunto sem
  aquele grupo). Grupos ajustáveis: `presenca`, `participacao`, `questoes`, `entrega`,
  `apresentacao` (mentor e coordenação) e `penalidades`, `prazos` (só coordenação). `provaOficial`,
  `casasDecimais`, `quantidadeEncontros` e `versao` não são ajustáveis.
- **Regras vigentes:** `app.regras_vigentes(turma, instante)` = versão da edição de maior
  `vale_desde <= instante` `||` grupos do ajuste da turma de maior `vale_desde <= instante` (troca
  de grupo inteiro, `jsonb ||`).
- **Motivo:** FR-005 (herdar o resto, inclusive mudanças posteriores da edição) com a forma mais
  simples de combinar: grupo inteiro da turma sobrepõe o grupo da edição.
- **Alternativas:** ajuste por valor avulso; rejeitado porque, com critérios criados e removidos
  (esclarecimento 5), misturar valores de duas listas de critérios não tem significado claro.

## R3. Regras de um encontro para uma turma

- **Decisão:** `app.inicio_do_encontro(encontro)` = `(data + coalesce(inicio, '00:00'))` no fuso
  `America/Sao_Paulo`; `app.regras_do_encontro(encontro, turma)` = `app.regras_vigentes(turma,
inicio)`. As funções ligadas a um encontro e a uma equipe/turma passam a usá-la no lugar de
  `app.regras_da_edicao`:
  - cálculo oficial: `app.lancamentos_oficiais`, `app.pontos_do_encontro`, `app.entrega_com_desconto`;
  - lançamentos: presença e participação da turma, avaliação de entrega e apresentação
    (`painel_avaliacao`, validação de notas), limite de atraso do desafio;
  - ocorrências: tipos e teto de descontos (`registrar_ocorrencia`, `decidir_ocorrencia`), prazos de
    manifestação e revisão (turma da equipe, encontro da ocorrência).
    Leituras sem encontro (rótulos nos painéis, regulamento) usam as regras vigentes agora da turma.
- **Motivo:** FR-010 e FR-011; avaliações gravam notas por id de critério e já são validadas contra
  a lista de critérios recebida (`app.validar_notas`), então critérios novos funcionam sem mudar o
  formato das avaliações.

## R4. Estrutura das regras: critérios, faixas e tipos

- **Decisão:** a estrutura passa a ser editável (esclarecimento 5). Regras de validação
  (`app.validar_regras(regras, escopo)` no servidor e `validarRegras` no domínio TS):
  - rubricas (`participacao`, `entrega`, `apresentacao`): 1 a 20 critérios; `id` único na rubrica
    (gerado de `rotulo` em minúsculas sem acento e com hífens quando novo; mantido quando
    renomeado); `rotulo` 1 a 80 caracteres e único na rubrica; `maximo > 0`;
  - `entrega.criterioDeAtraso` precisa existir em `entrega.criterios`; `faixasDeAtraso` com
    `ateMinutos` crescentes, `desconto >= 0`, a última `<= limiteAtrasoMinutos`;
  - `penalidades.tipos`: `id` único, `rotulo` 1 a 80, `pontos >= 0` ou `zeraEntrega = true`;
    `tetoDescontosPorEncontro >= 0`;
  - números não negativos; `quantidadeEncontros` 1 a 20 e `>=` encontros cadastrados;
    `casasDecimais` 0 a 4; `prazos` em horas > 0;
  - `provaOficial` igual à de `app.regras_piloto()` (PRD HU04, FR-016).
- **Motivo:** FR-001, FR-007, FR-016. Os limites (20, 4, 80) são proteção contra erro de digitação.
  **[validar]**

## R5. Rótulo e concorrência

- **Decisão:** edição: `app.sugerir_rotulo` (último número + 1; sem número, `.1`); `gravar_regras`
  recebe `p_versao_base` (rótulo vigente carregado), trava a edição e recusa com `23514` "As regras
  mudaram desde que você abriu a tela; recarregue." quando a vigente já é outra; rótulo repetido é
  recusado; reenvio idêntico (mesmo rótulo e mesmas regras vigentes) não grava. Turma:
  `gravar_ajustes_turma` recebe `p_ajuste_base` (id do ajuste vigente carregado ou nulo), trava a
  turma e aplica a mesma recusa; conjunto igual ao vigente não grava.
- **Motivo:** FR-003 e o detalhe deixado para o plano no esclarecimento (mesma regra para a turma).

## R6. Encontros da turma

- **Decisão:** tabela `encontros_fora_da_turma (turma_id, encontro_id)` guarda só as exclusões;
  sem linha, a turma participa (padrão: todos, inclusive encontros criados depois e turmas
  vinculadas depois). `app.encontro_da_turma(encontro, turma)`; `definir_encontros_da_turma(turma,
encontros_excluidos)` recusa excluir encontro com presença, participação, avaliação, submissão,
  resultado de prova ou ocorrência de equipe da turma. Aplicado em: totais da equipe
  (`app.totais_da_equipe`), listas de encontros e atividades da turma, presença da turma, painel da
  turma e pontuação máxima.
- **Motivo:** FR-008; guardar exclusões mantém o padrão "todos" sem tarefa extra ao criar encontros.
- **Alternativas:** tabela de participações; rejeitada (cada encontro novo exigiria inserir uma linha
  por turma).

## R7. Pontuação máxima

- **Decisão:** `app.maximo_do_encontro(regras, avaliacao_objetiva)` = presença `maximoPorDupla` +
  soma dos máximos da participação + (`questoes.maximo` ou `provaOficial.maximoPorDupla`, conforme o
  encontro) + soma dos máximos da entrega + soma dos máximos da apresentação.
  `app.maximo_da_turma(turma)` = soma de `maximo_do_encontro(regras_do_encontro(e, turma), e.avaliacao_objetiva)`
  para os encontros da turma. Exposto em `pontos_da_minha_equipe`, `pontos_da_turma` e nos painéis;
  no TS, `pontuacaoMaximaDoEncontro(regras, avaliacaoObjetiva)` com paridade.
- **Motivo:** FR-009 e a premissa **[validar]** sobre encontros diferentes.

## R8. Permissões

- **Decisão:** `app.pode_ajustar_turma(turma, grupos)`: coordenação da edição para qualquer grupo;
  mentor com vínculo ativo ao curso da turma (`atribuicoes.curso_id = turmas.curso_id`) só para os
  grupos de avaliação. Regras da edição e encontros da turma: só coordenação. Leitura de regras
  vigentes: quem participa da edição (turma própria para estudantes e docentes); histórico:
  coordenação e mentor da turma.
- **Motivo:** FR-004, FR-012 e esclarecimento sobre o mentor.

## R9. Cálculo parcial no navegador (paridade)

- **Decisão:** as RPCs que devolvem `regras` para o cálculo parcial (`lancamentos_da_minha_equipe`,
  `atividades_da_turma`, `presencas_da_turma`, `painel_avaliacao`) passam a devolver as regras de
  cada encontro para a turma; `PontuacaoDoEncontro` e os formulários de avaliação usam essas
  regras. `scripts/testar-paridade-calculo.mjs` ganha cenários com duas versões, critério novo e
  ajuste de turma.
- **Motivo:** ADR 0011 e SC-004.

## R10. Telas

- **Decisão:** componentes em `@/modules/pontuacao/ui` (dono do contrato de regras): `FormRegras`
  (grupos com valores e editor de critérios, faixas e tipos), `FormAjustesTurma` (por grupo:
  "herdar da edição" ou "definir para a turma"), `HistoricoRegras`, `EncontrosDaTurma` e
  `PontuacaoMaxima`. Páginas: seção "Regras" em `/coordenacao/edicoes` (edição), seção "Regras da
  turma" e "Encontros da turma" no painel da turma (coordenação e mentor), regulamento do aluno com
  as regras da turma. Demonstração com dados fictícios e escrita desabilitada.
- **Motivo:** arquitetura (módulo 11, pontuação) e constituição III.

## R12. Menu em categorias

- **Decisão:** `MENUS` em `src/app/navegacao.ts` passa a ter, por área, o item "Início" e uma lista de
  grupos `{ titulo, itens }` com as categorias da User Story 6; uma função `itensDoMenu(area)` devolve
  a lista plana na ordem dos grupos (usada pelos atalhos e pelos testes). O `AppShell` renderiza cada
  grupo como `<section>`/lista com título (`aria-labelledby`), na barra lateral e no menu do celular;
  os atalhos da tela inicial (`Atalhos.tsx`) mostram os mesmos grupos com títulos. Grupos não são
  recolhíveis (menos cliques e nada escondido do leitor de tela).
- **Coordenação por fluxo da edição** (esclarecimento): Preparação, Durante os encontros (com
  Ocorrências), Resultado e Comunicação; estudante e docente com as categorias da User Story 6.
- **Motivo:** FR-017, FR-018 e SC-007; mudança só de apresentação, sem tocar rotas nem permissões.
- **Alternativas:** grupos recolhíveis; rejeitada por esconder itens e acrescentar interação.

## R11. Ranking até a spec 012

- **Decisão:** o ranking por categoria da spec 007 continua, com os totais calculados pelas regras
  de cada encontro e turma. Publicações existentes são imutáveis (posições gravadas) e não mudam.
- **Motivo:** divisão de escopo; a spec 012 troca o ranking por turma.
