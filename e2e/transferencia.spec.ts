import { expect, test, type Page } from '@playwright/test';

// Spec 019 — o master vê a equipe de uma unidade. Na demonstração toda gravação é bloqueada (a
// tela avisa e os botões de escrita ficam desabilitados); o diálogo e as recusas do servidor são
// cobertos pelos testes de componente e pela jornada contra o Supabase local.
async function entrarComoMaster(page: Page) {
  await page.goto('/entrar');
  await page.getByRole('button', { name: /master/i }).click();
  await expect(page).toHaveURL(/\/master/);
}

test('master: vê a equipe da unidade e a transferência fica bloqueada na demonstração', async ({
  page,
}) => {
  await entrarComoMaster(page);
  await page.goto('/master/unidades');
  const ver = page.getByRole('button', { name: /Ver equipe de Unidade Fictícia A/ });
  await expect(ver).toHaveAttribute('aria-expanded', 'false');
  await ver.click();
  await expect(
    page.getByRole('button', { name: /Ocultar equipe de Unidade Fictícia A/ }),
  ).toHaveAttribute('aria-expanded', 'true');
  const lista = page.getByRole('list', { name: 'Equipe de Unidade Fictícia A' });
  await expect(lista).toBeVisible();
  await expect(lista.getByText(/u-doc-a@exemplo\.invalid/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Transferir Profa\. Lúcia Exemplo/ }),
  ).toBeDisabled();
  // A unidade sem equipe mostra a mensagem própria.
  await page.getByRole('button', { name: /Ver equipe de Unidade Fictícia B/ }).click();
  await expect(page.getByText('Nenhuma conta de equipe nesta unidade.')).toBeVisible();
});
