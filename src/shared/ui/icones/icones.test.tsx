import { render } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Icon } from '../Icon';
import { CORES_DE_ACENTO, ICONES, svgIndependente, type IdIcone } from './dados';

const ids = Object.keys(ICONES) as IdIcone[];
const ELEMENTOS_PERMITIDOS = new Set(['path', 'circle', 'rect', 'ellipse', 'title']);

describe('biblioteca de ícones SVG', () => {
  it('cobre a prancha da Maratona e os utilitários de interface', () => {
    expect(ids.length).toBeGreaterThanOrEqual(100);
  });

  it.each(ids)('%s é SVG válido, só com formas simples e cores da paleta', (id) => {
    const doc = new DOMParser().parseFromString(svgIndependente(id), 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    const elementos = [...doc.documentElement.querySelectorAll('*')];
    expect(elementos.length).toBeGreaterThan(1);
    for (const el of elementos) expect(ELEMENTOS_PERMITIDOS.has(el.tagName)).toBe(true);
    const cores = svgIndependente(id).match(/#[0-9A-Fa-f]{6}/g) ?? [];
    const paleta = new Set<string>(['#062457', ...Object.values(CORES_DE_ACENTO)]);
    for (const c of cores) expect(paleta.has(c)).toBe(true);
  });

  it('arquivos .svg gerados estão em sincronia com a fonte (rode `npm run icones`)', () => {
    const pasta = resolve(import.meta.dirname, '../../../../docs/icones/svg');
    for (const id of ids) {
      const arquivo = resolve(pasta, `${id}.svg`);
      expect(existsSync(arquivo), arquivo).toBe(true);
      expect(readFileSync(arquivo, 'utf8')).toBe(svgIndependente(id));
    }
  });
});

describe('componente Icon', () => {
  it('é decorativo por padrão (oculto para leitores de tela)', () => {
    const { container } = render(<Icon nome="dupla" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it('com rótulo, é anunciado como imagem', () => {
    const { getByRole } = render(<Icon nome="ranking" rotulo="Ranking da categoria" />);
    expect(getByRole('img', { name: 'Ranking da categoria' })).toBeInTheDocument();
  });

  it('modo marca usa a cor de apoio; modo mono herda a cor do texto', () => {
    const { container, rerender } = render(<Icon nome="desafio" cor="marca" />);
    expect(container.querySelector('svg')?.style.getPropertyValue('--ic-a')).toBe(
      'var(--color-coral-500)',
    );
    rerender(<Icon nome="desafio" />);
    expect(container.querySelector('svg')?.style.getPropertyValue('--ic-a')).toBe('currentColor');
  });
});
