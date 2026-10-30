# Research: Painel da turma

## R1. Uma RPC de leitura ou consultas separadas

- **Decisão**: criar uma RPC única, `public.painel_da_turma(p_turma uuid) returns jsonb`.
- **Motivo**: as políticas atuais não deixam o aluno ver as equipes dos colegas (`pode_ver_dupla`
  só abrange os integrantes). Ampliar a RLS de `duplas` e `dupla_integrantes` exporia campos que
  o aluno não precisa ver, como histórico, autor e motivos de saída. A RPC devolve só as colunas
  coletivas e decide o acesso num único ponto, testável com pgTAP. Uma chamada por painel também
  evita estados intermediários em que os indicadores não batem com as listas.
- **Alternativas rejeitadas**:
  - Uma visão com RLS: não consegue mudar as colunas conforme o perfil.
  - Reaproveitar `equipes_da_turma_gestao` e `colegas_da_turma`: a primeira recusa alunos, e
    seriam três ou mais consultas.

## R2. Indicadores calculados no servidor ou no cliente

- **Decisão**: o servidor entrega as listas; o domínio TS calcula os totais (`indicadores()`).
- **Motivo**: SC-003 exige que os indicadores batam com as listas. Derivá-los das mesmas listas
  garante isso por construção, e um teste de domínio cobre a regra. O pgTAP confere que as listas
  correspondem ao banco: alunos ativos e equipes ativas.
- **Exceção**: o total de convites pendentes vem do servidor (`convitesPendentes`), porque a
  lista de convites não é exibida. Para aluno, o valor é `null`.

## R3. Erros de acesso

| Situação                                                                          | Erro do servidor                            | Mensagem na tela                    |
| --------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| Turma inexistente                                                                 | `P0002` "Turma não encontrada."             | "Turma não encontrada."             |
| Id que não é um UUID, na rota                                                     | `22P02`                                     | "Turma não encontrada."             |
| Sem vínculo, docente de outra turma, aluno inativo ou coordenação de outra edição | `42501` "Você não tem acesso a esta turma." | "Você não tem acesso a esta turma." |

O repositório converte esses códigos nas mensagens da spec. Uma turma de outra edição que a pessoa
consiga ler (por exemplo, a coordenação de duas edições) aparece na tela como "Turma não
encontrada", pois o painel trabalha sempre com a edição em uso.

## R4. Ações de alterar equipes no painel

- **Decisão**: o painel da equipe docente e da coordenação mostra o link "Alterar equipes", que
  leva à tela já existente da spec 003. Para docente e mentor, é "Minhas turmas"; para a
  coordenação, é "Equipes".
- **Motivo**: evita duplicar os formulários com justificativa e mantém o painel somente leitura
  (Constituição VII). Atende ao cenário 3 da US1 ("tem acesso às ações de alterar equipes").

## R5. Pontuação e ranking (US3)

- **Decisão**: o contrato do painel ganha o campo `pontuacao: PontuacaoDoPainel | null`.
  - A RPC real devolve `null`, porque não existem tabelas de lançamento nem de ranking; elas
    chegam nos Incrementos 3 e 4. Nesse caso, o bloco mostra o aviso "Pontuação disponível a
    partir dos lançamentos de avaliação.", sem números.
  - Na demonstração (esclarecimento B de 2026-10-30), o repositório de demonstração preenche o
    campo com o `rankingPorCategoria()` fictício de `modules/demo`, filtrado às equipes da turma.
    O bloco mostra o estado da classificação e o selo "Dados fictícios".
- **Publicação**: publicar é um ato da coordenação, independente do estado. Pelo PRD (RF16,
  HU05), um ranking publicado pode estar parcial, provisório ou definitivo, e sempre mostra o
  estado. Na demonstração, o ranking fictício conta como publicado (`publicada = true`), como na
  tela "Ranking". Com dados reais, a publicação chega no Incremento 4. Enquanto não houver
  publicação, a visão do aluno recebe `publicada = false` com `equipes = []` e a interface mostra
  "Classificação ainda não publicada".
  - Revisão de 2026-10-30: a regra anterior ("`parcial` não conta como publicado") contrariava o
    PRD e foi revogada.
- **Privacidade**: a tabela mostra só o total da equipe e a posição na categoria, sem notas
  individuais nem componentes (Constituição VI).
- **Alternativas rejeitadas**:
  - Calcular pontuação no painel a partir de lançamentos: os lançamentos não existem fora da
    demonstração.
  - Mostrar números também fora da demonstração: violaria FR-004 e a Constituição X.
- **Pendente**: os cenários 1 e 2 da US3 com dados reais (registrado em
  `docs/decisoes-e-pendencias.md`).

## R6. Situação dos encontros

O domínio do painel replica a regra de `situacaoEncontro` (módulo `encontros`):

- **cancelado**: separado dos demais;
- **realizado**: se o estado é realizado ou a data já passou;
- **agendado**: os demais, incluindo os de hoje.

O próximo encontro é o primeiro agendado em ordem de data e número. A regra é replicada porque o
domínio deve ser TS puro, e o índice de `encontros` exporta componentes React.
