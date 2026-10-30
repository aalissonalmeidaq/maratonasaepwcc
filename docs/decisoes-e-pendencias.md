# Decisões, premissas e pendências

Atualizado em 2026-10-29 (ciclo 1 — spec 001). Itens marcados **[validar]** dependem da
coordenação/unidade e devem ser resolvidos antes de usar dados reais.

## 1. Documentos e ativos

| Item                                                                                   | Situação                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PRD, Documento de Visão, Design System, `tokens_maratona.css`                          | Encontrados em `docs/referencias/` e usados                                                                                                                                                                                                                  |
| SVGs da marca Maratona (horizontal, branca, negativo, cinza, preta, vertical, símbolo) | Encontrados em `docs/referencias/identidade visual/`; copiados sem alteração para `public/brand/`                                                                                                                                                            |
| Pranchas PNG (paleta, tipografia, ícones, interface, mockups)                          | Usadas como referência visual; dados ilustrativos ignorados                                                                                                                                                                                                  |
| `docs/VETORIZADAS CLAUDE/`                                                             | Versão anterior dos SVGs (prefixo `saep-`), arquivos diferentes dos de `referencias/`. Usamos os de `referencias/` (mais recentes). **[validar]** qual é a versão aprovada                                                                                   |
| **Projeto pedagógico / livro de regras / regulamento**                                 | **AUSENTE.** Regras implementadas a partir do PRD e das instruções do usuário, versão `piloto-2026.0-a-confirmar`                                                                                                                                            |
| **Marca SENAI Ceará** (colorida e totalmente branca)                                   | **AUSENTE.** Área provisória identificada no menu e na tela de entrada; nada foi redesenhado                                                                                                                                                                 |
| **Ícones do projeto em SVG individual**                                                | **Vetorizados (2026-10-29)**: 103 ícones redesenhados à mão a partir da prancha em `src/shared/ui/icones/dados.ts`; arquivos em `docs/icones/svg` e galeria em `docs/icones/galeria.html`. Não é rastreio automático: **[validar]** fidelidade com a unidade |
| Licença/arquivos de fonte                                                              | Montserrat (SIL OFL) via `@fontsource`, auto-hospedada. **[validar]** confirmação institucional                                                                                                                                                              |

## 2. Divergências registradas

- A prancha "Diretrizes de marca" mostra hex diferentes dos tokens (ex.: azul-marinho `#0B2D6B`
  vs `#062457`; amarelo `#FFC02E` vs `#FFB820`). O Design System diz que o CSS é a referência
  inicial → usamos `tokens_maratona.css`. **[validar]**
- O prompt cita "seta da marca em laranja"; os SVGs oficiais usam coral `#FC4B55`. Mantivemos os
  arquivos como estão (não alteramos a marca). **[validar]**
- Tokens têm `--color-coral-500 #FF5866` e os SVGs `#FC4B55` (diferença pequena). Sem ação.

## 2.1 Identidade visual — pranchas recebidas em 2026-10-29

- O usuário indicou as pranchas (variações da marca, paleta, tipografia, universo fotográfico,
  aplicações, elementos de interface, iconografia, padrões gráficos e acabamentos) como a
  identidade visual da aplicação.
- **Padrões gráficos** (prancha 08) recriados em SVG em `src/shared/ui/padroes/dados.ts`;
  arquivos em `docs/padroes/svg` e galeria em `docs/padroes/galeria.html` (`npm run padroes`).
  **[validar]**
- **13 ícones** das pranchas "Navegação e conta", "Maratona e aprendizagem" e "Avaliação e
  administração" acrescentados (116 no total). **[validar]**
- **Paleta da prancha × tokens em uso:** azul-marinho `#0B2D6B` × `#062457`; amarelo `#FFC02E` ×
  `#FFB820`; borda sutil `#E6EBF2` × `#DCE5EF`. Os padrões gráficos usam a paleta da prancha; os
  tokens da interface **não foram alterados** (estão documentados em `DESIGN.md`). **[decidir]**
  se os tokens devem migrar para a paleta da prancha.
- Ilustrações de pessoas enviadas como modelo não chegaram como arquivos; aguardam
  `docs/referencias/ilustracoes/`.

## 3. Premissas de regra (configuração `REGRAS_PILOTO`)

| Premissa                             | Escolha provisória                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Arredondamento                       | 2 casas, meio para cima, só no resultado do componente e no total. **[validar]**                         |
| Teto de 10 pontos                    | Vale para descontos gerais de ocorrências; zerar entrega por plágio não entra no teto. **[validar]**     |
| Atraso com exceção autorizada        | Prorrogação/impedimento registrado ⇒ sem desconto de atraso. **[validar]**                               |
| Penalidade duplicada (mesmo fato)    | Mantém a primeira registrada e informa as ignoradas. **[validar]**                                       |
| Ranking                              | Por categoria; no piloto, categoria = curso. **[validar]**                                               |
| Desempate "questões e prova oficial" | Soma do componente objetivo (30) de todos os encontros                                                   |
| Prova oficial                        | Encontro em que o componente objetivo é a prova; realização "pendente" também deixa o resultado pendente |
| Pedido de revisão                    | 24 h, exceção registrada pela coordenação (fluxo no Incremento 4)                                        |
| Premiação                            | Itens registrados como configuração; valores, quantidade, validade e entrega **[validar]**               |
| Cronograma                           | Nada fixado no código; demo usa datas relativas ao dia atual                                             |

## 4. Decisões técnicas (ver `docs/adr/`)

- ADR 0001 monólito modular; 0002 npm; 0003 versões e compatibilidade; 0004 modo demonstração;
  0005 PWA e cache; 0006 Supabase local, RLS e auditoria; 0007 repositórios + TanStack Query;
  0008 criação de contas.

## 5. Pendências técnicas

- Impeccable 4.8.0 (`pbakaus/impeccable`, via `npx skills add`) instalado a pedido do usuário
  em 2026-10-30, em `.agents/skills/impeccable` e `.claude/skills/impeccable` (cópia idêntica;
  versão travada em `skills-lock.json`). É código de terceiros com permissões do agente:
  revisar ao atualizar. UI/UX Pro Max **não está instalado**.
- `npm audit`: 4 vulnerabilidades **baixas** em `deepmerge` via `workbox-build` (ferramenta de
  build do PWA; não vai ao navegador). A correção sugerida rebaixa o plugin e quebra o build.
  Acompanhar nova versão de `workbox-build`.
- Bundle JS principal ~670 kB (197 kB gzip). Sem meta de desempenho definida (PRD RNF08);
  dividir por área com `import()` quando as metas forem acordadas.
- Contas criadas pela coordenação via Edge Function `criar-conta` (ADR 0008). **[validar]** entrega da
  senha provisória, troca no primeiro acesso e importação em lote (CSV).
- Criação de edições: sem política de INSERT para `authenticated` (somente administração do
  banco) até a spec de organização definir o papel administrador.
- Ícones PWA gerados a partir de `maratona-simbolo.svg` com fundo branco no maskable. **[validar]**
- Contraste foi verificado apenas por inspeção dos tokens; auditoria axe no navegador real e
  testes com leitor de tela ficam para o Incremento 5.
- O CLI `claude` não está no PATH (sessão via extensão do VS Code); `specify init` rodou com
  `--ignore-agent-tools`. As skills `/speckit-*` foram instaladas em `.claude/skills/`.
- Porta do Supabase local alterada para 5442x porque outro projeto local usa as portas padrão.

## 6. Decisões da spec 002 a validar

- Dupla = 2 estudantes da **mesma turma**; trios e duplas entre turmas recusados até decisão. **[validar]**
- Encontros valem para todas as turmas da edição. **[validar]**
- Justificativa mínima de 10 caracteres para substituir integrante ou desfazer dupla. **[validar]**
- Edição de curso e turma pela interface: implementada em 2026-10-30. Mudar o curso de uma turma
  é permitido; vínculos e duplas da turma são mantidos. **[validar]** se a troca de curso deve
  ser bloqueada quando a turma já tiver duplas (muda a categoria do ranking).
- Os testes E2E reais deixam registros fictícios no banco local (rodar `supabase db reset`).

## 6.1 Spec 005 — busca e paginação

- Busca e paginação são feitas no navegador sobre os registros que a RLS já entregou (volume
  pequeno por edição). Se as listagens crescerem (ex.: centenas de estudantes por edição), migrar
  para paginação e busca no servidor (`range` + filtro no PostgREST).
- Tamanho de página: 10. **[validar]** com a coordenação.
- Resumos dos painéis iniciais não são listagens e não têm busca.

## 7. Questões em aberto (PRD §19)

Unidade, cursos e volume de usuários; forma de login (institucional?); hospedagem e domínio;
autorização e prazo da nota oficial e sua escala; formatos e limites de arquivo; regra para
trios, presença parcial e turmas mistas; quem pode reabrir avaliação; retenção de dados e
política para menores.
