# Contratos de tela: gestão de edições, turmas e vínculos

Componentes em `src/modules/organizacao/ui`, exportados por `index.ts`; páginas em
`src/app/paginas/edicoes.tsx` e `src/app/paginas/organizacao.tsx`. Todos passam no axe, funcionam a
partir de 360 px e são operáveis por teclado.

## Fluxo guiado da coordenação

A página "Edições" mostra, para a edição escolhida, os passos do fluxo com a situação de cada um:
1 Criar edição · 2 Vincular turmas · 3 Alunos e docentes por turma · 4 Mentores por curso ·
5 Ativar. Cada passo leva à tela correspondente.

## `/coordenacao/edicoes` ("Edições", novo item no menu)

1. `ListaEdicoes`: edições que a pessoa coordena, com nome, período, selo de estado (Em preparação,
   Ativa, Encerrada) e versão das regras; botão "Nova edição".
2. `FormEdicao`: nome, início, fim e base das regras (rádios "Regras do piloto (a confirmar)" e
   "Copiar de uma edição que coordeno"). Ao criar, a edição nova passa a ser a escolhida.
3. Detalhe da edição: dados (nome e período editáveis), passos do fluxo, coordenação (lista,
   "Adicionar coordenação" por busca, "Desativar" sem o botão para si mesma e para a última ativa)
   e estado: "Ativar edição" (lista o que falta) e "Encerrar edição" com `DialogoEncerrar`
   (pendências por tipo, justificativa, texto "Depois de encerrada, a edição só pode ser lida.").
   "Apagar edição" só em preparação vazia, com `ConfirmDialog`.
4. Edição encerrada: tudo só leitura, com o alerta "Edição encerrada em DD/MM/AAAA:
   (justificativa)".

## `/coordenacao/cadastro` ("Cursos e turmas", novo item no menu)

- `CadastroCursosTurmas`: cursos do cadastro com categoria e as turmas de cada um; criar e corrigir
  curso e turma; "Apagar" só para itens que nunca participaram de edição. Cada turma mostra as
  edições de que participa.

## `/coordenacao/organizacao` (organização da edição, reorganizada)

1. `VincularTurmas`: turmas do cadastro agrupadas por curso, com caixas de seleção; "Vincular
   selecionadas". Lista das turmas vinculadas com contagem de alunos e docentes, link "Gerir
   turma" e "Desvincular" (só quando permitido).
2. `MentoresDoCurso`: por curso na edição, lista de mentores, "Vincular mentor" (busca) e
   "Desvincular", com o texto "O mentor atua em todas as turmas deste curso nesta edição."
3. Edição ativa com correções pendentes no cadastro: alerta "O cadastro tem correções de nome ou
   categoria para esta edição" com a lista e o botão "Atualizar a partir do cadastro".
4. Os cards atuais "Cursos e categorias" e "Turmas" saem (substituídos pelo cadastro e pelo
   vínculo); "Pessoas e vínculos" fica para apoio, analista e coordenação.

## `/coordenacao/turmas/:turmaId` (painel da turma, seção nova "Alunos e docentes")

- `GestaoDaTurma`: listas de alunos, docentes e mentores (estes com "pelo curso") com a situação de
  acesso; "Cadastrar aluno" (`FormConta` com a turma fixa), "Importar alunos (CSV)"
  (`ImportarAlunos` com a turma fixa), "Vincular pessoa com conta" (busca; papel aluno ou docente),
  "Desvincular".

## Todas as áreas: seletor de edição (`SeletorEdicao` no `AppShell`)

- Aparece só com duas ou mais edições visíveis na área atual. `select` nativo com o rótulo "Edição
  em uso"; opções "Nome — Estado". A escolha fica lembrada no dispositivo.
- Selo "Em preparação" ao lado do nome da edição no topo quando ela está em rascunho.

## Demonstração

- Duas edições fictícias (uma ativa, uma em preparação), cadastro com dois cursos e turmas, gestão
  por turma visível; botões de gravação desabilitados com o aviso de demonstração.
