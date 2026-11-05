import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, type Page, type TestInfo } from '@playwright/test';
import type { AxeResults } from 'axe-core';
const require = createRequire(import.meta.url);
const source = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
export async function verificarA11y(page: Page, info: TestInfo) {
  await page.evaluate(() => document.fonts.ready);
  // Medir o estado aberto/fechado, sem cores intermediárias da transição de opacidade.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animacao) => animacao.effect?.getComputedTiming().iterations !== Infinity)
        .map((animacao) => animacao.finished.catch(() => undefined)),
    ),
  );
  await page.addScriptTag({ content: source });
  const resultado = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (opcoes: object) => Promise<AxeResults> } })
      .axe;
    return axe.run({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
  });
  await info.attach('axe', {
    body: JSON.stringify({
      url: resultado.url,
      violations: resultado.violations,
      incomplete: resultado.incomplete,
    }),
    contentType: 'application/json',
  });
  expect(resultado.violations).toEqual([]);
}
