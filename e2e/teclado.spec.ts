import { expect, test, type Page } from '@playwright/test';
async function tabAte(page: Page, corresponde: (texto: string) => boolean) {
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press('Tab');
    // As animações de abertura/fechamento precisam terminar antes de medir geometria.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      ),
    );
    const foco = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      if (!e || e === document.body) return null;
      const r = e.getBoundingClientRect(),
        s = getComputedStyle(e);
      const acima = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        texto:
          e.getAttribute('aria-label') ??
          (e.textContent?.trim() ||
            e.querySelector('[aria-label]')?.getAttribute('aria-label') ||
            ''),
        visivel: r.width > 0 && r.height > 0,
        contorno:
          (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none',
        descoberto: acima === e || !!(acima && e.contains(acima)),
      };
    });
    if (!foco) continue;
    expect(foco.visivel).toBe(true);
    expect(foco.contorno).toBe(true);
    expect(foco.descoberto, `Foco encoberto: ${foco.texto}`).toBe(true);
    if (corresponde(foco.texto)) return;
  }
  throw new Error('Destino não encontrado usando somente Tab.');
}
for (const perfil of [
  { conta: 'Coordenação', ranking: '/coordenacao/ranking', texto: 'Ranking' },
  { conta: 'Lúcia', ranking: '/docente/turmas/t-a', texto: 'Minhas turmas' },
  { conta: 'Ana Exemplo', ranking: '/aluno/ranking', texto: 'Ranking' },
])
  test(`jornada só com teclado: ${perfil.conta}`, async ({ page }) => {
    await page.goto('/entrar', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: new RegExp(perfil.conta, 'i') })).toBeVisible();
    await tabAte(page, (t) => t.includes(perfil.conta));
    await page.keyboard.press('Enter');
    await expect(page).not.toHaveURL(/entrar$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await tabAte(page, (t) => /menu/i.test(t));
      await page.keyboard.press('Enter');
    }
    await tabAte(page, (t) =>
      perfil.conta === 'Lúcia' ? /Turmas e atividades/.test(t) : /^Resultados?$/.test(t.trim()),
    );
    await page.keyboard.press('Enter');
    await tabAte(page, (t) => t.includes(perfil.texto));
    await page.keyboard.press('Enter');
    if (perfil.conta === 'Lúcia') {
      await tabAte(page, (t) => /3º ano A/.test(t));
      await page.keyboard.press('Enter');
    }
    await expect(page).toHaveURL(new RegExp(perfil.ranking));
    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await tabAte(page, (t) => /menu/i.test(t));
      await page.keyboard.press('Enter');
    }
    await tabAte(page, (t) => t.trim() === 'Sair');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/entrar$/);
  });
