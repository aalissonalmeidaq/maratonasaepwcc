import { render } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PadraoGrafico } from '../PadraoGrafico';
import { PADROES, PALETA_DA_PRANCHA, svgDoPadrao, type IdPadrao } from './dados';

const ids = Object.keys(PADROES) as IdPadrao[];
const paleta = new Set(Object.values(PALETA_DA_PRANCHA).map((c) => c.toLowerCase()));

describe('padrões gráficos da marca (prancha 08)', () => {
  it('inclui elementos base, padrões modulares, composições e textura', () => {
    for (const id of ['faixas', 'diagonal', 'setas', 'entrelacado', 'canto', 'textura'] as const) {
      expect(ids).toContain(id);
    }
  });

  it.each(ids)('%s gera SVG válido apenas com a paleta da prancha', (id) => {
    const svg = svgDoPadrao(id, 'teste');
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    for (const cor of svg.match(/#[0-9a-fA-F]{6}/g) ?? []) {
      expect(paleta.has(cor.toLowerCase()), `${id}: ${cor}`).toBe(true);
    }
  });

  it.each(ids)('%s usa ids prefixados (várias instâncias na mesma página)', (id) => {
    const a = svgDoPadrao(id, 'a1');
    const b = svgDoPadrao(id, 'b2');
    const idsA = [...a.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const idsB = [...b.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    for (const x of idsA) expect(idsB).not.toContain(x);
  });

  it('arquivos .svg gerados estão em sincronia com a fonte (rode `npm run padroes`)', () => {
    const pasta = resolve(import.meta.dirname, '../../../../docs/padroes/svg');
    for (const id of ids) {
      const arquivo = resolve(pasta, `${id}.svg`);
      expect(existsSync(arquivo), arquivo).toBe(true);
      expect(readFileSync(arquivo, 'utf8')).toBe(svgDoPadrao(id, id));
    }
  });
});

describe('componente PadraoGrafico', () => {
  it('é decorativo e não captura cliques', () => {
    const { container } = render(<PadraoGrafico nome="canto" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg?.getAttribute('class')).toContain('pointer-events-none');
  });

  it('espelha a composição de canto conforme a posição', () => {
    const { container } = render(<PadraoGrafico nome="canto" posicao="inferior-esquerdo" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toMatch(/-scale-x-100/);
    expect(container.querySelector('svg')?.getAttribute('class')).toMatch(/-scale-y-100/);
  });

  it('duas instâncias na mesma página não compartilham ids', () => {
    const { container } = render(
      <>
        <PadraoGrafico nome="textura" />
        <PadraoGrafico nome="textura" />
      </>,
    );
    const todos = [...container.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(todos).size).toBe(todos.length);
  });
});
