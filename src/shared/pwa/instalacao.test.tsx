import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appInstalado, navegadorIos } from './instalacao';
import { BotaoInstalar } from './BotaoInstalar';
import { OrientacaoInstalacao } from './OrientacaoInstalacao';
describe('instalação (FR-010)', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('reconhece iPhone e iPadOS com identificação desktop', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone' });
    expect(navegadorIos()).toBe(true);
    vi.stubGlobal('navigator', { userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 });
    expect(navegadorIos()).toBe(true);
  });
  it('reconhece standalone tanto no Safari quanto por display-mode', () => {
    vi.stubGlobal('navigator', { standalone: true });
    expect(appInstalado()).toBe(true);
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(appInstalado()).toBe(true);
  });
  it('só oferece o convite após o navegador autorizar e o consome ao instalar', async () => {
    render(<BotaoInstalar />);
    expect(screen.queryByRole('button', { name: 'Instalar aplicativo' })).toBeNull();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    act(() => {
      window.dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Instalar aplicativo' }));
    expect(prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Instalar aplicativo' })).toBeNull();
  });
  it('remove o convite quando recebe appinstalled', () => {
    render(<BotaoInstalar />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    expect(screen.getByRole('button', { name: 'Instalar aplicativo' })).toBeVisible();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.queryByRole('button', { name: 'Instalar aplicativo' })).toBeNull();
  });
  it('orienta o iOS e oculta orientação e convite quando já instalado', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone', standalone: false });
    const { rerender } = render(
      <>
        <OrientacaoInstalacao />
        <BotaoInstalar />
      </>,
    );
    expect(screen.getByText(/Para instalar: toque em Compartilhar/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Instalar aplicativo' })).toBeNull();
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone', standalone: true });
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    rerender(
      <>
        <OrientacaoInstalacao />
        <BotaoInstalar />
      </>,
    );
    expect(screen.queryByText(/Para instalar: toque em Compartilhar/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Instalar aplicativo' })).toBeNull();
  });
});
