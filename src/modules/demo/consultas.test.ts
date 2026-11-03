import { describe, expect, it } from 'vitest';
import { painelCoordenacao, rankingPorCategoria } from './consultas';

describe('consultas do modo demonstração', () => {
  it('o ranking contém só agregados da dupla, sem dados individuais', () => {
    const json = JSON.stringify(rankingPorCategoria());
    expect(json).not.toMatch(/estudanteId|e0\d|nota/);
  });

  it('empate persistente aparece como colocação compartilhada', () => {
    const categoriaA = rankingPorCategoria().find((c) => c.categoria.startsWith('Categoria A'));
    const compartilhadas = categoriaA?.posicoes.filter((p) => p.compartilhada) ?? [];
    expect(compartilhadas.map((p) => p.nome).sort()).toEqual(['Dupla Circuito', 'Dupla Órbita']);
    expect(new Set(compartilhadas.map((p) => p.posicao)).size).toBe(1);
  });

  it('coordenação recebe pendências reais dos lançamentos', () => {
    const p = painelCoordenacao();
    expect(p.indicadores.duplas).toBe(6);
    expect(p.pendencias.avaliacoesEmAberto).toBeGreaterThan(0);
  });
});
