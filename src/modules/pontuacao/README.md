# Módulo: Pontuação e classificação

**Responsabilidade:** núcleo do cálculo da pontuação e da classificação (RF14) e contrato das regras
da edição e das turmas (RF02).

**Situação:** cálculo nas specs 002 e 007 (paridade com `app.calcular_encontro`, ADR 0011); regras
com versões, ajustes por turma, regras por encontro e pontuação máxima na spec 011
(`specs/011-regras-edicao/`).

- `domain/`: tipos das regras, `REGRAS_PILOTO`, `calcularEncontro`, `classificar`, validação das
  regras (`validarRegras`), combinação edição + turma (`combinarRegras`) e máximo por encontro
  (TS puro). Os casos de contrato (`casos-contrato.json`) valem para o TS e para o servidor.
- `data/`: repositório Supabase das regras, uma operação por RPC de `contracts/rpc.md` da spec 011.
- `ui/`: formulário das regras da edição, ajustes da turma, histórico, encontros da turma e
  pontuação máxima.
- `index.ts`: API pública. Outros módulos importam só por `@/modules/pontuacao`.

As regras valem no servidor: cada encontro usa a versão da edição e o ajuste da turma vigentes no
seu início (`app.regras_do_encontro`). O navegador só mostra prévias com as regras recebidas.
