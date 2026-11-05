# Roteiro de leitor de tela — spec 014

Este roteiro deve ser executado pela unidade. Os resultados abaixo estão **não executados**.
Não representa certificação de conformidade. Usar somente contas e dados fictícios no ambiente
de teste; não registrar nomes, notas ou credenciais reais nas evidências.

## Registro da execução

| Campo                                       | Registro      |
| ------------------------------------------- | ------------- |
| Data e executor                             | Não executado |
| Versão/commit do aplicativo                 | Não executado |
| Computador, Windows, navegador, versão NVDA | Não executado |
| Aparelho, Android, Chrome, versão TalkBack  | Não executado |
| Ambiente e perfil testado                   | Não executado |
| Evidências e problemas encontrados          | Não executado |

Executar a matriz inteira separadamente em NVDA (Windows, Chrome ou Firefox) e TalkBack
(Android, Chrome). Em cada resultado obtido informar o leitor utilizado; repetir a tabela
em uma nova cópia para cada execução, sem substituir resultados anteriores.

## Preparação

1. Abrir o ambiente de teste com internet e ativar o leitor de tela. No NVDA, navegar por
   títulos com H, landmarks com D, controles com Tab/Shift+Tab e ativar com Enter/Espaço.
   Alternar modo de foco/navegação quando necessário. No TalkBack, deslizar para percorrer,
   tocar duas vezes para ativar e usar a navegação por títulos/controles disponível no aparelho.
2. Confirmar que o idioma é português do Brasil e que não há extensões alterando a página.
3. Executar sem mouse no computador; no Android executar pelos gestos do leitor. Conferir
   nome, papel e estado dos controles, ordem de leitura e anúncios de erro/sucesso.
4. Ao encontrar falha, registrar tela, sequência, esperado/obtido e evidência; não incluir dados
   pessoais nas capturas. Repetir após correção, mantendo o registro da primeira execução.

## Telas principais (FR-013)

| Tela                   | Passo                                                       | Resultado esperado                                                                   | Resultado obtido | OK? |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------- | --- |
| Entrada                | Ler título, campos e ajuda; enviar formulário vazio         | Título único, rótulos E-mail/Senha e erros associados; senha não exposta             | Não executado    | —   |
| Entrada                | Localizar “Regulamento da Maratona” e ativar                | Link identificado e página pública aberta sem login                                  | Não executado    | —   |
| Regulamento público    | Navegar por título principal e seções das edições           | Cada edição tem título; regras e aviso de resumo em validação são compreensíveis     | Não executado    | —   |
| Regulamento público    | Ler encontros com/sem horário, realizado/cancelado          | Número, título, data, horário a confirmar e situação anunciados em texto             | Não executado    | —   |
| Regulamento público    | Testar sem edições publicadas                               | “Nenhum regulamento publicado no momento.” legível                                   | Não executado    | —   |
| Início aluno           | Entrar com conta fictícia de aluno; navegar títulos e ações | Nome da área e ações identificados sem leitura de decoração                          | Não executado    | —   |
| Início docente         | Entrar como docente; navegar títulos, turmas e ações        | Estrutura, nomes dos links e estados compreensíveis                                  | Não executado    | —   |
| Início coordenação     | Entrar como coordenação; navegar títulos e ações            | Estrutura e ações de gestão identificadas                                            | Não executado    | —   |
| Ranking da turma       | Abrir ranking como aluno e painel da turma como docente     | Posição/equipe/pontos têm contexto de cabeçalhos; texto informa estado da publicação | Não executado    | —   |
| Pontuação da equipe    | Abrir pontuação como aluno e percorrer detalhes             | Critérios/valores e pendências compreensíveis sem depender da cor                    | Não executado    | —   |
| Encontros              | Abrir encontro nas áreas permitidas e percorrer listagem    | Cabeçalhos, datas e situações associados ao encontro correto                         | Não executado    | —   |
| Presença               | Abrir como docente e coordenação; localizar controles       | Rótulos identificam encontro/pessoa fictícia; estado marcado é anunciado             | Não executado    | —   |
| Presença               | Testar validação e gravação em ambiente local               | Erro é anunciado; sucesso só após resposta do servidor                               | Não executado    | —   |
| Avaliações             | Abrir como docente e coordenação; percorrer critérios       | Critério, limites e campo associados; erros compreensíveis                           | Não executado    | —   |
| Ranking da coordenação | Abrir ranking e percorrer filtros/listagem                  | Filtros rotulados, tabela contextualizada e estado em texto                          | Não executado    | —   |
| Edições                | Abrir lista, escolher edição ativa e localizar publicação   | Edição/estado identificados; publicar e retirar têm nomes claros                     | Não executado    | —   |
| Edições                | Abrir e cancelar diálogo de retirada                        | Foco fica no diálogo e volta ao controle de origem ao cancelar                       | Não executado    | —   |

## Jornadas e estados transversais

| Passo                                                        | Resultado esperado                                                             | Resultado obtido | OK? |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------- | --- |
| Nos três perfis: entrar → menu → ranking → sair              | Jornada concluída; foco visível, ordem lógica e nenhuma armadilha              | Não executado    | —   |
| Abrir/fechar menu do celular, inclusive Escape no computador | Estado expandido anunciado; foco não entra em conteúdo oculto                  | Não executado    | —   |
| Salvar regulamento online, desligar rede e reabrir           | Cópia legível e “Conteúdo salvo em … Pode estar desatualizado.”                | Não executado    | —   |
| Simular armazenamento bloqueado com internet                 | Conteúdo atual legível e aviso de falha ao salvar anunciado; sem sucesso falso | Não executado    | —   |
| Sem rede, abrir tela interna sem dados e tentar escrita      | Motivo comunicado; nenhuma gravação anunciada como concluída                   | Não executado    | —   |
| Reconectar                                                   | Leitura retoma sem reload manual e sem deslocamento inesperado de foco         | Não executado    | —   |
| Ampliar texto/zoom 200%                                      | Texto e ações permanecem acessíveis, sem sobreposição ou corte                 | Não executado    | —   |
| Disponibilizar nova versão e escolher atualizar depois       | Aviso compreensível; versão só muda ao acionar “Atualizar agora”               | Não executado    | —   |

## Registro de problemas e reteste

| Identificador            | Tela/leitor   | Passos e resultado obtido | Evidência     | Correção/reteste |
| ------------------------ | ------------- | ------------------------- | ------------- | ---------------- |
| A preencher pela unidade | Não executado | Não executado             | Não executado | Não executado    |
