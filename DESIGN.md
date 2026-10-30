---
name: Maratona de Competências SAEP
description: Painel educacional, dinâmico e motivador para acompanhar a competição.
colors:
  navy-900: '#062457'
  navy-950: '#041b42'
  blue-700: '#0050c7'
  blue-600: '#0063e6'
  blue-500: '#1676ff'
  cyan-500: '#22d3ee'
  yellow-500: '#ffb820'
  coral-500: '#ff5866'
  purple-500: '#8b6dff'
  white: '#ffffff'
  gray-50: '#f7f9fc'
  gray-100: '#eef3f8'
  gray-200: '#dce5ef'
  gray-500: '#66768a'
  gray-700: '#33465f'
  green-700: '#087148'
  red-700: '#b42332'
  amber-800: '#805000'
  focus: '#0047b3'
typography:
  headline:
    fontFamily: 'Montserrat, Arial, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: 'Montserrat, Arial, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: 'Montserrat, Arial, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Montserrat, Arial, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: '0.375rem'
  md: '0.625rem'
  lg: '0.875rem'
  full: '9999px'
spacing:
  '1': '0.25rem'
  '2': '0.5rem'
  '3': '0.75rem'
  '4': '1rem'
  '5': '1.25rem'
  '6': '1.5rem'
  '8': '2rem'
  '10': '2.5rem'
  '12': '3rem'
components:
  button-primary:
    backgroundColor: '{colors.blue-700}'
    textColor: '{colors.white}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '0 1rem'
  button-primary-hover:
    backgroundColor: '{colors.navy-900}'
  button-primary-active:
    backgroundColor: '{colors.navy-950}'
  button-secondary:
    backgroundColor: '{colors.white}'
    textColor: '{colors.navy-900}'
    rounded: '{rounded.md}'
    padding: '0 1rem'
  button-tertiary:
    backgroundColor: 'transparent'
    textColor: '{colors.blue-700}'
    rounded: '{rounded.md}'
    padding: '0 1rem'
  button-destructive:
    backgroundColor: '{colors.red-700}'
    textColor: '{colors.white}'
    rounded: '{rounded.md}'
    padding: '0 1rem'
  input:
    backgroundColor: '{colors.white}'
    textColor: '{colors.navy-900}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0 0.75rem'
  card:
    backgroundColor: '{colors.white}'
    textColor: '{colors.navy-900}'
    rounded: '{rounded.lg}'
    padding: '1rem'
  nav-active:
    backgroundColor: '{colors.blue-700}'
    textColor: '{colors.white}'
    rounded: '{rounded.md}'
    padding: '0 0.75rem'
  badge-success:
    backgroundColor: 'rgb(8 113 72 / 10%)'
    textColor: '{colors.green-700}'
    rounded: '{rounded.full}'
    padding: '0.125rem 0.625rem'
---

# Design System: Maratona de Competências SAEP

## Overview

**Creative North Star: "Painel da Maratona"**

Uma interface educacional, dinâmica e motivadora para acompanhar a competição.
A estrutura institucional organiza a leitura; os acentos coloridos identificam
atalhos, indicadores e momentos de destaque. Botões, cartões e campos são claros,
acessíveis e convidativos.

Camadas discretas delimitam e organizam a informação. O sistema combina fundo
claro, navegação azul-marinho e cartões brancos, com identidade concentrada nos
ativos oficiais, ícones e faixas diagonais usadas com moderação.

**Key Characteristics:**

- Estrutura institucional com acentos coloridos.
- Tipografia Montserrat compartilhada entre títulos, conteúdo e controles.
- Camadas discretas e componentes claros, acessíveis e convidativos.
- Navegação adaptada a celular, tablet e desktop.

Registro da implementação em 29/10/2026, com linguagem confirmada pelo usuário.
Fontes: `src/shared/styles/tema.css`, `src/index.css`, `src/shared/ui/`,
`src/app/layout/AppShell.tsx` e `docs/referencias/Design_System_Maratona_SAEP.md`.
Os tokens documentam o estado existente, ainda sujeito à validação institucional
registrada em PRODUCT.md. Extração por código; não houve inspeção no navegador.

## Colors

Azul-marinho institucional e azul de ação organizam uma paleta de acentos vivos
e neutros frios. As chaves do frontmatter preservam a correspondência com o CSS.

### Primary

- **Azul-marinho institucional** (`navy-900`): navegação, títulos e texto principal.
- **Azul-marinho profundo** (`navy-950`): estado pressionado e fundos escuros.
- **Azul de ação** (`blue-700`): botões principais, links e navegação selecionada.
- `blue-600`: progresso e marcadores de andamento; `blue-500`: acento disponível.

### Secondary

- **Ciano vibrante** (`cyan-500`): detalhes, atalhos e foco na navegação escura.
- **Amarelo conquista** (`yellow-500`): destaques e marcadores de pendência.
- **Coral** (`coral-500`) e **roxo de apoio** (`purple-500`): ícones, atalhos e grafismos.

### Tertiary

- `green-700`: sucesso e conclusão; `red-700`: erro e ação destrutiva.
- `amber-800`: aviso e estado provisório; `focus`: foco no conteúdo claro.

### Neutral

- `white`: cartões, controles e texto sobre ações escuras.
- `gray-50`: fundo; `gray-100`: superfície secundária; `gray-200`: bordas.
- `gray-500`: bordas de campos e marcadores parciais; `gray-700`: texto secundário.

**The Estado Legível Rule.** Cor nunca é a única informação de estado: manter rótulos e marcadores.

Priorizar os aliases semânticos existentes no CSS: fundo, superfície, texto,
ação, sucesso, aviso e erro. Acessibilidade exige verificação das combinações
reais; a presença de um token não certifica seu contraste em qualquer aplicação.

## Typography

Montserrat, com Arial e sans-serif como alternativas, é usada em todo o sistema.
As fontes são auto-hospedadas pelo projeto. Pesos disponíveis nos tokens:
regular (400), médio (500), seminegrito (600) e negrito (700).

- **Título de página:** papel headline do frontmatter; no celular reduz para
  1.5rem, crescendo no breakpoint sm.
- **Título de cartão:** papel title; seminegrito e entrelinha curta herdada dos títulos.
- **Corpo:** papel body; leitura e campos de formulário.
- **Rótulo:** papel label; botões e campos. Textos auxiliares podem usar peso regular.
- **Complemento:** 0.75rem para badges e metadados; não substitui o corpo.
- **Indicadores:** 1.5rem em negrito, algarismos tabulares.

Os demais passos declarados são 1.125rem e 1.25rem; não existe uma escala
exponencial única. Títulos usam entrelinha 1.2 e o corpo 1.5.

## Layout

O shell usa navegação lateral fixa de 16rem a partir de lg (64rem). Abaixo desse
ponto, um botão abre o menu sobre a área abaixo do cabeçalho. O breakpoint sm
(40rem) adapta espaçamentos, ações e informações da sessão.

Conteúdo centralizado, largura máxima 90rem, margens internas horizontais de
1rem, 1.5rem em sm e 2rem em lg; espaçamento vertical de 1.5rem. Cartões usam
1rem de preenchimento e 1.25rem em sm. A escala de espaçamento está no frontmatter.

A barra superior implementada tem altura mínima de 4rem; o token topbar-height
declara 4.5rem, mas não governa esse elemento. Preservar essa distinção ao reutilizar.
Áreas seguras laterais usam env(safe-area-inset-left/right).

## Elevation & Depth

Camadas discretas; sombras delimitam e organizam. Cartões combinam superfície
branca, borda suave e sombra baixa. Diálogos usam sombra média sobre sobreposição
azul-marinho profundo com 60% de opacidade. O cabeçalho combina superfície com
95% de opacidade e desfoque do fundo.

- **Baixa:** `0 1px 3px rgb(6 36 87 / 10%)`, em cartões e suportes de ícones.
- **Média:** `0 4px 14px rgb(6 36 87 / 12%)`, no diálogo.
- **Foco:** anel branco de 3px e azul de 5px nos controles; foco global com
  contorno de 3px e afastamento de 2px. Navegação escura usa anel ciano de 3px.

Transições de controles usam 120ms; o token normal é 200ms, com ease-out
disponível. O botão não aplica explicitamente esse easing. Em movimento reduzido,
os tokens de duração passam a 0ms. Não presumir que toda animação use esses tokens.

## Shapes

Cantos suavemente arredondados: sm em pequenos grafismos, md em controles e
itens de menu, lg em cartões e diálogos. Badges e progresso usam arredondamento
completo. Valores normativos no frontmatter; bordas usuais têm 1px.
As faixas diagonais decorativas do shell têm rotação de 35 graus e não recebem interação.

## Components

### Botões

Claros, acessíveis e convidativos. Altura mínima de 2.75rem, rótulo seminegrito,
ícone opcional e distância de 0.5rem entre itens. Primário azul, hover marinho e
pressionado marinho profundo; secundário branco com borda azul, hover em superfície
suave e pressionado em gray-200. Terciário transparente com sublinhado no hover;
destrutivo vermelho com brilho reduzido a 90% no hover. Desabilitados usam opacidade
de 55%; carregamento desabilita o botão, mostra spinner e mantém o rótulo.

### Campos

Altura mínima igual à dos botões, corpo de texto normal e borda gray-500.
Rótulo acima com distância de 0.5rem. Erro muda a borda e acrescenta texto e ícone;
dicas e erros são associados ao campo. Desabilitados usam superfície secundária.

### Cartões e indicadores

Cartões com título e ação opcionais; título pode ocupar nível 2 ou 3. Indicadores
numéricos mantêm rótulo e ícone, com número tabular. Blocos de ícones usam os acentos
existentes; acentos claros recebem texto marinho profundo.

### Navegação

Itens com ícone, rótulo e altura mínima de 2.75rem. Ativo azul com texto branco;
inativo branco a 85%, hover branco a 10% sobre o fundo marinho. Menu móvel fecha
ao navegar e com Escape; ao abrir, foca o primeiro link, e Escape devolve o foco.

### Badges

Pílulas com rótulo seminegrito de 0.75rem e ponto decorativo. Sucesso usa verde,
andamento usa azul, pendência usa âmbar e amarelo, erro usa vermelho; agendamento
usa roxo e estado parcial usa neutros. Fundos são suaves, sem depender só da cor.

### Diálogo

Superfície arredondada com preenchimento de 1.5rem e largura máxima de 28rem.
No celular alinha ao rodapé; em sm centraliza. Ações empilham no celular e passam
à linha em sm. Foco inicial em Cancelar; Tab fica no diálogo, Escape fecha e o
foco retorna ao elemento de origem.

### Marca e ícones

Usar os SVGs existentes em public/brand e os ícones de src/shared/ui/icones/dados.ts.
SENAI Ceará: em fundo claro usar `public/brand/senai-ceara-colorido.svg`, cópia integral de
`logo-senai.svg` fornecido pelo usuário em 30/10/2026. Em fundo escuro usar
`public/brand/senai-ceara-branco.svg`. Preservar cores e proporções dos arquivos originais.
Ícones podem herdar a cor do texto ou usar a combinação de marca já implementada.
Não redesenhar marcas oficiais nem interpretar pranchas ilustrativas como dados reais.

## Do's and Don'ts

- **Do** reutilizar tokens semânticos e componentes existentes.
- **Do** manter foco visível, rótulos e sinais de estado além da cor.
- **Do** reservar faixas coloridas para destaques sem competir com o conteúdo.
- **Do** preservar os ativos institucionais e registrar validações pendentes.
- **Don't** alterar marcas oficiais ou inventar ativos institucionais ausentes.
- **Don't** apresentar números e personagens ilustrativos como resultados reais.
- **Don't** presumir contraste aprovado apenas porque uma cor pertence à paleta.
