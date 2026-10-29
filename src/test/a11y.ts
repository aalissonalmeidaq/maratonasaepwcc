import axe from 'axe-core';

/** Executa o axe-core e devolve violações graves/críticas em formato legível. */
export async function violacoesA11y(elemento: Element): Promise<string[]> {
  const resultado = await axe.run(elemento, {
    // Contraste depende de CSS real, que não é carregado no jsdom; é verificado no E2E.
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return resultado.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help}`);
}
