import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { verificarA11y } from '../e2e/a11y';

test('publicação pela interface confirma servidor e retirada abre diálogo acessível', async ({
  page,
}, info) => {
  const sb = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  expect(
    (
      await sb.auth.signInWithPassword({
        email: 'coordenacao@exemplo.invalid',
        password: 'senha-local-123',
      })
    ).error,
  ).toBeNull();
  const edicoes = await sb.rpc('edicoes_que_coordeno');
  expect(edicoes.error).toBeNull();
  const e = (
    edicoes.data as { id: string; nome: string; estado: string; regulamentoPublico: boolean }[]
  ).find((item) => item.estado === 'ativa');
  expect(e).toBeDefined();
  if (!e) return;
  try {
    expect(
      (await sb.rpc('definir_regulamento_publico', { p_id: e.id, p_publico: false })).error,
    ).toBeNull();
    await page.goto('/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill('coordenacao@exemplo.invalid');
    await page.getByLabel('Senha', { exact: true }).fill('senha-local-123');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/coordenacao$/);
    await page.goto('/coordenacao/edicoes');
    await page.getByRole('button', { name: 'Publicar regulamento', exact: true }).click();
    await expect(page.getByText('Regulamento publicado.', { exact: true })).toBeVisible();
    const publico = await sb.rpc('regulamento_publico');
    expect(publico.error).toBeNull();
    expect(
      (publico.data as { edicoes: { id: string }[] }).edicoes.some((item) => item.id === e.id),
    ).toBe(true);
    await page.getByRole('button', { name: 'Retirar regulamento', exact: true }).click();
    const dialogo = page.getByRole('dialog', { name: 'Retirar regulamento?' });
    await expect(dialogo).toBeVisible();
    await verificarA11y(page, info);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Retirar regulamento', exact: true }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Retirar regulamento', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Retirar regulamento', exact: true })
      .click();
    await expect(page.getByText('Regulamento retirado.', { exact: true })).toBeVisible();
    const retirado = await sb.rpc('regulamento_publico');
    expect(
      (retirado.data as { edicoes: { id: string }[] }).edicoes.some((item) => item.id === e.id),
    ).toBe(false);
  } finally {
    await sb.rpc('definir_regulamento_publico', { p_id: e.id, p_publico: e.regulamentoPublico });
    await sb.auth.signOut();
  }
});
