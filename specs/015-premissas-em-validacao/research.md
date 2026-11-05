# Pesquisa (Fase 0): Premissas em validação

Base: `docs/decisoes-e-pendencias.md`, auditoria genérica (`app.registrar_auditoria`, spec 001),
`app.e_coordenacao_em_alguma()` (spec 001), CSV da spec 008 (`gerarCsv`), menus por perfil
(`src/app/navegacao.ts`) e o início da coordenação (`PainelCoordenacao`). Nenhum item ficou como
NEEDS CLARIFICATION.

## R1. Onde fica o catálogo

- **Decisão:** tabela `public.premissas` (código, tema, ordem, pergunta, premissa em uso, onde
  afeta, opções, referência, `resolvida_por`), preenchida pela migration da spec com as 32
  premissas do Apêndice A. Premissas futuras entram por migration; premissa resolvida recebe
  `resolvida_por = 'spec NNN'` (não é apagada).
- **Motivo:** FR-001, FR-002; o servidor precisa do código para validar respostas (chave
  estrangeira) e para devolver catálogo e respostas numa leitura só, inclusive a docentes.
- **Alternativas:** catálogo só no front (constante TS): o servidor aceitaria códigos inexistentes
  e o texto lido pela coordenação poderia divergir do que foi respondido.

## R2. Respostas e histórico

- **Decisão:** tabela `public.respostas_premissas` só de inserção: `id`, `premissa`, `decisao`
  (`confirmada` | `precisa_mudar`), `justificativa` (10 a 2.000 caracteres, sem espaços nas
  pontas), `autor_id`, `autor_nome` (cópia de `perfis.nome` no registro), `registrado_em`. A
  situação é a da resposta mais recente (por `registrado_em`, `id`). Sem `update`/`delete` para
  ninguém. Gatilho `app.registrar_auditoria` com a justificativa em `app.justificativa`.
- **Motivo:** FR-006, FR-007, FR-010; o nome copiado mantém o histórico legível se a pessoa deixar
  a coordenação ou mudar o nome.

## R3. Acesso

- **Decisão:** as duas tabelas com RLS ligada e **sem** políticas nem grants para `anon` e
  `authenticated`; leitura e escrita só por RPC `security definer`:
  - `premissas_em_validacao()`: coordenação em alguma edição (`app.e_coordenacao_em_alguma()`) ou
    docente/mentor com vínculo ativo em alguma edição (`app.atua_como_docente_em_alguma()`, nova);
    demais → `42501`. Devolve `{podeResponder, premissas: [...]}` com a situação atual e o
    histórico de cada premissa.
  - `responder_premissa(p_codigo, p_decisao, p_justificativa, p_resposta_base)`: só coordenação
    em alguma edição (inclusive encerrada — o vínculo continua ativo). Premissa inexistente ou
    resolvida → `23514`.
- **Motivo:** FR-004, SC-004; o mesmo padrão das specs 010–014 (escrita por RPC, recusa no
  servidor, nenhuma leitura direta).

## R4. Concorrência

- **Decisão:** `p_resposta_base` é o `id` da resposta atual que a tela carregou (`null` quando
  "Aguardando resposta"). A RPC trava a premissa (`select … for update` na linha do catálogo) e,
  se a resposta atual for outra, recusa com `40001` "Esta premissa foi respondida por outra
  pessoa. Veja a resposta atual antes de registrar." A tela recarrega e mostra a atual.
- **Motivo:** FR-008; mesmo padrão de versão-base da spec 012 (`versaoBase`).

## R5. Tela, menu e início

- **Decisão:** módulo `@/modules/premissas` (domínio, repositório Supabase, UI). Rotas
  `/coordenacao/premissas` e `/docente/premissas` (mesma página; formulário só com
  `podeResponder`). Item "Premissas em validação" (ícone existente) no grupo "Preparação" da
  coordenação (junto de Edições) e no grupo "Comunicação" do docente e do mentor. Filtros por situação e tema com `useListagem` não se
  aplicam (lista fixa de 32); filtros simples por `SelectField`, contagem por situação sempre
  visível. Início da coordenação: cartão "Premissas aguardando resposta" com o total e link,
  escondido quando zero.
- **Motivo:** FR-003, FR-005; reaproveita componentes (`Card`, `StatusBadge`, `TextAreaField`,
  `useEnvio`, `RodapeDoFormulario`).

## R6. CSV e impressão

- **Decisão:** linhas do CSV montadas em `domain/linhasCsv.ts` (TS puro); o arquivo é gerado na
  UI com `gerarCsv` de
  `@/modules/relatorios` (o `index.ts` dele exporta componentes React, que não podem entrar
  em `domain/`) (BOM, `;`, proteção contra fórmula); nome
  `maratona-premissas-AAAA-MM-DD.csv` (`nomeDoArquivo` passa a aceitar `'premissas'`). Impressão
  por CSS `@media print`: esconde menu, cabeçalho, filtros e botões; cada premissa com
  `break-inside: avoid`; mostra todas as premissas, ignorando filtros só se a pessoa escolher
  "Imprimir lista completa" (botão que limpa filtros e chama `window.print()`).
- **Motivo:** FR-004a; reaproveita o padrão de CSV já testado.

## R7. Fuso `America/Fortaleza`

- **Decisão:** migration recria, com o literal trocado e o resto idêntico à última versão de
  cada uma, as funções que usam `America/Sao_Paulo`: `app.encontro_realizado`,
  `app.proximo_encontro_json`, `app.inicio_do_encontro` e `public.relatorio`
  (conferir na implementação se há versão mais recente em migration posterior). Teste pgTAP:
  nenhuma função dos esquemas `app` e `public` contém `America/Sao_Paulo` em `prosrc`. No front,
  `FUSO` do CSV passa a `America/Fortaleza`; testes que citam Brasília passam a citar o horário
  de Juazeiro do Norte. Testes pgTAP 009 e 012 usam o novo fuso.
- **Motivo:** FR-013; os dois fusos têm UTC−3 sem horário de verão desde 2019: resultados atuais
  iguais (a migration não altera dados).

## R8. Demonstração

- **Decisão:** `src/modules/demo/premissas.ts` com o mesmo catálogo (texto da migration) e
  respostas fictícias (uma "Confirmada", uma "Precisa mudar" com histórico de duas respostas);
  `responderPremissa` recusado como as demais escritas. Teste Vitest confere que os códigos e
  temas da demonstração são os 32 do Apêndice A; pgTAP confere os mesmos códigos no banco.
- **Motivo:** US1 cenário 5; ADR 0004.

## R9. Limpeza da documentação

- **Decisão:** em `docs/decisoes-e-pendencias.md`, cada marca em aberto vira "**[P07 — em
  validação]**" (aponta para o catálogo) ou "~~[validar]~~ resolvido por …" (Apêndice B). Código
  com comentários `[validar]` passa a citar o código da premissa; migrations já existentes não
  são editadas (os dois comentários antigos ficam cobertos por P26 e P27 na documentação). Verificação por
  busca: `rg "\[(validar|decidir|pendência)\]" docs src supabase/tests` e nas migrations desta spec sem resultados em aberto
  (SC-003); specs antigas ficam como registro histórico e não entram na busca.
- **Motivo:** FR-012, FR-014.
