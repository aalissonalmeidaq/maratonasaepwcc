// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec 018 — o registro das 32 premissas vive em docs/premissas.md (fora do site). Este teste
// guarda o documento: P01–P32 sem lacunas nem repetição, cada uma com os seis campos.
const TEXTO = readFileSync(resolve(import.meta.dirname, '..', 'docs/premissas.md'), 'utf-8');

const TEMAS = [
  'Pontuação',
  'Equipes e atividades',
  'Acesso e edições',
  'Comunicados e relatórios',
  'Identidade visual',
  'Operação',
];
const CAMPOS = [
  'Pergunta',
  'Premissa em uso',
  'Onde afeta',
  'Opções',
  'Referência',
  'Resolução',
] as const;

/** Blocos "### Pnn — …" até o próximo bloco. */
function blocos(): Map<string, string> {
  const mapa = new Map<string, string>();
  const partes = TEXTO.split(/^### (P\d{2})\b/m);
  for (let i = 1; i < partes.length; i += 2) {
    const codigo = partes[i]!;
    expect(mapa.has(codigo), `${codigo} repetida`).toBe(false);
    mapa.set(codigo, partes[i + 1]!);
  }
  return mapa;
}

describe('docs/premissas.md (spec 018)', () => {
  const mapa = blocos();

  it('tem P01–P32 sem lacunas nem repetição', () => {
    const esperados = Array.from({ length: 32 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`);
    expect([...mapa.keys()].sort()).toEqual(esperados);
  });

  it('agrupa por tema e usa só os seis temas', () => {
    const titulos = [...TEXTO.matchAll(/^## (.+)$/gm)].map((m) => m[1]!.trim());
    for (const t of TEMAS) expect(titulos, `tema ${t}`).toContain(t);
  });

  it('cada premissa tem os seis campos preenchidos', () => {
    for (const [codigo, corpo] of mapa) {
      for (const campo of CAMPOS) {
        const m = new RegExp(`^- \*\*${campo}:\*\* (.+)$`, 'm').exec(corpo);
        expect(m?.[1]?.trim().length ?? 0, `${codigo} — ${campo}`).toBeGreaterThan(0);
      }
      expect(/^- \*\*Pergunta:\*\* .+\?$/m.test(corpo), `${codigo} termina com ?`).toBe(true);
    }
  });

  it('registra a resolução: P25 pela spec 016, as demais pela decisão do projeto', () => {
    for (const [codigo, corpo] of mapa) {
      const esperado = codigo === 'P25' ? 'spec 016' : 'decisão do projeto de 06/11/2026';
      expect(corpo, codigo).toContain(`- **Resolução:** ${esperado}`);
    }
  });
});
