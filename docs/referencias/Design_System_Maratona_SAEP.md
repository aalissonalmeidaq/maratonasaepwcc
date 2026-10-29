# Sistema de design — Maratona de Competências SAEP

**Versão:** 1.0 — proposta para desenvolvimento  
**Aplicação:** web responsiva e PWA  
**Referência:** imagens do painel do estudante, identidade da maratona, telas dos perfis e pranchas de ícones apresentadas na conversa.

## 1. Análise visual

A referência usa fundo claro, navegação lateral azul-marinho, textos escuros, botões azuis, cartões brancos com bordas suaves e ícones coloridos. As faixas diagonais da marca aparecem nos destaques e no banner, enquanto cores de apoio diferenciam atalhos e estados. No celular, o conteúdo passa para uma coluna e a navegação principal é recolhida.

A tela representa a **pontuação da dupla**, o próximo encontro e os desafios. Nomes, datas e números das imagens são ilustrativos; no produto, use os dados reais e as regras do PRD. As imagens geradas são referências visuais, não arquivos oficiais de produção.

## 2. Princípios

- **Clareza:** destaque a próxima ação, os prazos e o estado atual.
- **Consistência:** os três perfis compartilham navegação, componentes, ícones e escala visual.
- **Acessibilidade:** contraste, foco visível, texto e ícone juntos; não depender somente da cor.
- **Responsividade:** a mesma função deve ser utilizável no celular, tablet e computador.
- **Identidade com equilíbrio:** reservar as faixas coloridas para capa, banner ou pontos de destaque, sem competir com o conteúdo.

## 3. Cores

Os valores a seguir são **propostas aproximadas** inspiradas nas imagens e devem ser validados com a identidade aprovada. Os valores do CSS são a referência para a implementação inicial.

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-navy-900` | `#062457` | Menu, títulos e fundo institucional |
| `--color-navy-950` | `#041B42` | Fundo institucional mais escuro |
| `--color-blue-700` | `#0050C7` | Botão principal e links |
| `--color-blue-600` | `#0063E6` | Acentos e componentes |
| `--color-blue-500` | `#1676FF` | Grafismos e destaques |
| `--color-cyan-500` | `#22D3EE` | Detalhes e categorias |
| `--color-yellow-500` | `#FFB820` | Destaque e conquistas |
| `--color-coral-500` | `#FF5866` | Acentos e ilustrações |
| `--color-purple-500` | `#8B6DFF` | Destaque secundário e pontuação |
| `--color-white` | `#FFFFFF` | Superfícies e texto em fundo escuro |
| `--color-gray-50` | `#F7F9FC` | Fundo da aplicação |
| `--color-gray-100` | `#EEF3F8` | Superfície secundária |
| `--color-gray-200` | `#DCE5EF` | Bordas |
| `--color-gray-700` | `#33465F` | Texto secundário |

**Tokens semânticos:** use `--color-bg`, `--color-surface`, `--color-text`, `--color-action`, `--color-success`, `--color-warning` e `--color-error` nos componentes. Isso permite trocar a paleta sem alterar cada tela.

**Contraste:** amarelo, ciano, coral e roxo são principalmente cores de apoio. Para texto, escolha combinações verificadas. Como meta de projeto, texto normal deve atingir 4,5:1; texto grande e indicadores visuais essenciais, 3:1. Valide também foco e componentes nos fundos reais. Nunca presuma acessibilidade apenas pela escolha da paleta.

## 4. Tipografia

A prancha de identidade propõe **Montserrat**. Adotar como direção inicial, com `Arial, sans-serif` como alternativas. Verificar disponibilidade e licença dos arquivos de fonte antes da publicação.

| Papel | Token | Tamanho base | Peso | Entrelinhas |
| --- | --- | --- | --- | --- |
| Título de página | `--font-size-3xl` | 32 px | 700 | 1,2 |
| Título de seção | `--font-size-2xl` | 24 px | 700 | 1,2 |
| Título de cartão | `--font-size-lg` | 18 px | 600 | 1,2–1,5 |
| Corpo | `--font-size-md` | 16 px | 400 | 1,5 |
| Texto auxiliar | `--font-size-sm` | 14 px | 400–500 | 1,5 |
| Rótulo curto | `--font-size-xs` | 12 px | 600 | 1,5 |

Use 12 px somente para rótulos complementares. Formulários e textos principais devem priorizar 16 px. Os tamanhos em `rem` acompanham as configurações de fonte do usuário.

## 5. Espaçamento, raio e profundidade

Escala base: **4, 8, 12, 16, 20, 24, 32, 40 e 48 px**, expressos como `--space-1` a `--space-12` no CSS. Recomenda-se 16 px em componentes, 24 px entre seções e 8 px entre rótulo e campo; adapte conforme o conteúdo.

| Elemento | Token inicial |
| --- | --- |
| Campo e botão | `--radius-md` — 10 px |
| Cartão | `--radius-lg` — 14 px |
| Avatar e marcador | `--radius-full` |
| Sombra de cartão | `--shadow-sm` |
| Sombra de menu suspenso | `--shadow-md` |

## 6. Layout responsivo

| Largura proposta | Comportamento |
| --- | --- |
| Até 639 px | Uma coluna; menu recolhido; ações principais acessíveis sem rolagem horizontal |
| 640 a 1023 px | Uma ou duas colunas, conforme o espaço e a legibilidade |
| A partir de 1024 px | Menu lateral e conteúdo em duas ou mais colunas |

Esses pontos de quebra são **premissas iniciais**: validar com o conteúdo real. Em telas largas, limitar a largura do conteúdo com `--content-max`. Em celular, tabelas devem ser convertidas em listas/cartões ou permitir rolagem identificável sem esconder rótulos. Respeitar áreas seguras do dispositivo.

## 7. Componentes

### Navegação

- Menu lateral azul-marinho no desktop, com ícone e rótulo.
- Item atual: fundo azul, texto claro e indicação acessível de página atual.
- No celular: menu recolhível com nome, botão de abrir/fechar e foco gerenciado.
- Menus de coordenação, docente e aluno mostram apenas funções autorizadas.

### Botões

| Tipo | Aparência | Uso |
| --- | --- | --- |
| Primário | Fundo `--color-action`, texto branco | Ação principal, como “Ver desafio” |
| Secundário | Fundo branco, borda azul, texto azul escuro | Ação alternativa |
| Terciário | Texto/link sem fundo preenchido | Ações de menor destaque |
| Destrutivo | Cor semântica de erro, com rótulo explícito | Ação que remove ou invalida dados |

Altura mínima proposta: `--control-min-height` (44 px). Definir estados padrão, hover, pressionado, foco, carregando e desabilitado. Não depender de hover em telas sensíveis ao toque.

### Campos e formulários

Rótulo acima do campo; dica e mensagem de erro associadas; borda visível; foco com `--focus-ring`; erros indicados por texto e ícone. Não usar placeholder como substituto do rótulo. O estado desabilitado não deve impedir a leitura das informações necessárias.

### Cartões e indicadores

Cartões brancos com borda `--color-border`, raio `--radius-lg`, sombra leve e conteúdo alinhado. Mostrar números junto a um rótulo claro. No painel do aluno, apresentar “Pontuação da dupla” e a referência “até 400 pontos”; o sistema não deve inventar valores.

### Estados e feedback

Usar texto e ícone além de cor: “Em andamento”, “Enviado”, “Avaliado”, “Pendente”, “Em atraso” e “Não enviado”. Para ranking, indicar “Parcial”, “Provisório” ou “Definitivo”. Exibir confirmação de entrega somente após resposta bem-sucedida do servidor.

### Tabelas, modais e alertas

Tabelas devem ter cabeçalhos e ações identificáveis; usar modal apenas quando for necessária decisão contextual. Modal abre com foco controlado, permite fechamento e devolve foco ao acionador. Alertas devem explicar o problema e uma ação possível. Dados pessoais e ocorrências exigem acesso restrito.

## 8. Iconografia

Usar a biblioteca visual desenvolvida para o projeto como referência: contorno arredondado, base azul-marinho/azul e acentos de marca. Tamanhos propostos: 16, 20 e 24 px; em atalhos destacados, permitir tamanho maior. Em interfaces pequenas, preferir desenho simplificado e rótulo visível.

Estados recomendados: padrão, selecionado, foco e desabilitado. O foco deve ser uma propriedade do controle interativo, não apenas uma mudança no desenho do ícone. As imagens de referência precisam ser convertidas e revisadas como **ícones individuais em SVG** antes de uso em produção; não presumir que a imagem em grade seja uma biblioteca vetorial.

## 9. Diretrizes por perfil

- **Aluno:** próximo encontro, desafio da dupla, entrega, pontuação e regulamento em posição prioritária. Não mostrar notas individuais de terceiros.
- **Docente:** turmas autorizadas, presença, entregas para avaliação, rubricas e feedback. Indicadores devem permitir localizar pendências.
- **Coordenação:** visão geral, turmas, duplas, encontros, ocorrências, relatórios e publicação do ranking; dados sensíveis com acesso limitado.

A hierarquia muda por perfil, mas os tokens e componentes são compartilhados.

## 10. PWA e conectividade

O sistema deve informar o estado da rede. Conteúdo público previamente carregado pode ficar disponível offline; não armazenar notas individuais, ocorrências ou dados sensíveis em cache público. Na versão inicial, submissões, avaliações e alterações de pontos exigem conexão. Oferecer opção de instalação quando o navegador suportar e preservar a experiência para quem não instalar.

## 11. Checklist para desenvolvimento

- [ ] Validar logomarca e arquivos originais com a unidade.
- [ ] Confirmar a paleta e a licença/uso da tipografia.
- [ ] Preparar biblioteca de ícones vetoriais com rótulos e estados.
- [ ] Testar contraste de textos, botões, bordas e foco.
- [ ] Testar teclado, leitor de tela e alvos de toque.
- [ ] Verificar celular, tablet e desktop com conteúdo real.
- [ ] Verificar estados de rede e confirmação de entrega.
- [ ] Garantir permissões por perfil no servidor.
- [ ] Substituir datas e pontuações fictícias das imagens pelos dados reais.

## 12. Arquivo de tokens

Os valores propostos estão no arquivo `tokens_maratona.css`, em variáveis CSS. Os pontos de quebra são documentados acima porque custom properties não são substituídas em condições de `@media` tradicionais. A implementação deve definir breakpoints no CSS ou na configuração da ferramenta utilizada.
