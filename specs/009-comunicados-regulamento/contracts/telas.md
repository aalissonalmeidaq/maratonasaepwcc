# Contratos de tela: comunicados e regulamento

Componentes em `src/modules/comunicados/ui`, exportados por `index.ts`; páginas em
`src/app/paginas/comunicados.tsx`. Todas passam no axe e funcionam a partir de 360 px.

## Estudante — `/aluno/regulamento` ("Regulamento e avisos")

1. Card "Comunicados" com `ListaComunicados` (recebidos), mais recentes primeiro:
   título, "Publicado em DD/MM/AAAA HH:MM por Nome (papel)", "Atualizado em …" quando houver,
   texto com quebras de linha, selo de texto "Novo" e botão "Marcar como lido" (nome acessível
   com o título). Vazio: "Nenhum comunicado publicado para você nesta edição."
2. `ResumoRegulamento` com os valores da edição; "a definir" para valor ausente; alerta "Resumo em
   validação: o regulamento oficial aprovado prevalece".

## Docente e mentor — `/docente/comunicados` (novo item "Comunicados" no menu)

1. Seção "Recebidos": `ListaComunicados`.
2. Seção "Escritos por mim": `GestaoComunicados` com botão "Novo comunicado".
3. `FormComunicado`: título, texto (contador de caracteres), público (rádios: Estudantes, Equipe
   docente, Todos), turmas (caixas de seleção só com as turmas em que atua; ao menos uma) e o
   lembrete "Não inclua dados pessoais de estudantes no texto". Botões "Guardar rascunho" e
   "Publicar".
4. `ResumoRegulamento` ao final da página.

## Coordenação — `/coordenacao/comunicados` ("Comunicados e regulamento")

1. `GestaoComunicados` com todos os comunicados da edição: filtro por estado (Rascunho,
   Publicado, Retirado), autor e papel em cada item.
2. `FormComunicado` com as turmas da edição como opcionais (nenhuma = edição inteira).
3. Em publicados: "Corrigir" (abre título/texto + justificativa) e "Retirar" (justificativa,
   confirmação). Em rascunhos: "Editar", "Publicar" e "Apagar". Retirados mostram a justificativa.
4. `ResumoRegulamento`.

## Comportamentos comuns

- Sucesso só depois da resposta do servidor: "Comunicado publicado.", "Rascunho guardado.",
  "Comunicado corrigido; o público foi avisado de novo.", "Comunicado retirado."
- Sem conexão ou na demonstração, botões de escrita desabilitados com o motivo em texto
  (`RodapeDoFormulario`/`bloqueio`), como nas specs 006–008.
- Erros do servidor mostrados com a mensagem em português; campos com mensagem própria.
- Demonstração: selo "Dados fictícios" nas listas.
- Avisos (`/avisos`): os tipos novos aparecem com o título do comunicado.
