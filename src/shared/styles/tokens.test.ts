// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function variaveis(css: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, nome, valor] = m;
    // Só a primeira declaração (a de :root; a de prefers-reduced-motion é a variação).
    if (nome && valor && !mapa.has(nome)) mapa.set(nome, valor.trim().toLowerCase());
  }
  return mapa;
}

describe('tokens do Design System', () => {
  it('replicam exatamente os valores do arquivo oficial', () => {
    const raiz = resolve(import.meta.dirname, '../../..');
    const oficial = variaveis(
      readFileSync(resolve(raiz, 'docs/referencias/tokens_maratona.css'), 'utf8'),
    );
    const tema = variaveis(readFileSync(resolve(raiz, 'src/shared/styles/tema.css'), 'utf8'));

    expect(oficial.size).toBeGreaterThan(50);
    for (const [nome, valor] of oficial) {
      expect(tema.get(nome), nome).toBe(valor);
    }
  });
});
