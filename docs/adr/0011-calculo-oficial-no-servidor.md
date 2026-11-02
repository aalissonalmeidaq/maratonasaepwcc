# ADR 0011 — Cálculo oficial dos pontos no servidor

- **Status:** aceita (2026-11-01)
- **Contexto:** a spec 007 exige que os pontos oficiais e o ranking sejam calculados no
  servidor, numa única fonte (RF14, FR-012), de forma atômica, idempotente e auditada
  (Constituição V). O núcleo de cálculo existe em TypeScript (`src/modules/pontuacao`) e está
  coberto pelos casos de contrato.
- **Decisão:**
  1. reimplementar o cálculo em PL/pgSQL: `app.calcular_encontro(lancamentos jsonb, regras
jsonb)` é pura e usa o mesmo formato JSON de `LancamentosDoEncontro`;
     `app.lancamentos_oficiais` monta esses lançamentos a partir das tabelas;
     `app.classificar` reproduz o desempate de `classificar`;
  2. os esperados ficam num arquivo único (`casos-contrato.json` e `casos-ranking.json`): o
     Vitest confere o TS e `scripts/testar-paridade-calculo.mjs` confere o SQL contra os mesmos
     casos;
  3. a publicação do ranking calcula e congela as posições na mesma transação.
- **Alternativas rejeitadas:** Edge Function em Deno importando o núcleo TS (exige segredo no
  servidor, outra implantação e uma chamada fora da transação); cálculo no navegador gravado
  pelo cliente (viola a Constituição V).
- **Consequências:** o cálculo existe em duas linguagens; qualquer mudança de regra exige
  atualizar os dois e os casos compartilhados. A paridade é verificada a cada execução do
  script; uma divergência aparece como teste vermelho.
