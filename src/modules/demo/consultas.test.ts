import { describe, expect, it, vi } from 'vitest';
import { calcularEncontro, REGRAS_PILOTO } from '@/modules/pontuacao';
import { desafios, lancamentos } from './dados';
import { painelAluno, painelCoordenacao, painelDocente, rankingPorCategoria } from './consultas';

describe('consultas do modo demonstração', () => {
  it('antecipa a tarefa futura mesmo quando o próximo encontro não tem desafio', () => {
    const p = painelAluno('e01');
    expect(p?.proximoDesafio?.id).toBe('ds4');
    expect(p?.proximoDesafio?.encontroId).not.toBe(p?.proximoEncontro?.id);
  });

  it('não apresenta uma tarefa expirada como próxima', () => {
    vi.useFakeTimers();
    try {
      const ultimoPrazo = Math.max(...desafios.map((d) => new Date(d.prazo).getTime()));
      vi.setSystemTime(ultimoPrazo + 1);
      expect(painelAluno('e01')?.proximoDesafio).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it('a pontuação exibida ao aluno é a calculada pelo núcleo de regras', () => {
    const p = painelAluno('e01');
    const esperado = Object.values(lancamentos.d1!).reduce(
      (t, l) => t + calcularEncontro(l, REGRAS_PILOTO).total,
      0,
    );
    expect(p?.dupla.nome).toBe('Dupla Órbita');
    expect(p?.totais.total).toBeCloseTo(esperado, 2);
    expect(p?.maximo).toBe(400);
  });

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

  it('docente vê apenas as duplas das turmas vinculadas', () => {
    const p = painelDocente('u-doc-b');
    expect(p.turmas.map((t) => t.id)).toEqual(['t-b']);
    expect(p.duplas.every((d) => d.turmaId === 't-b')).toBe(true);
  });

  it('coordenação recebe pendências reais dos lançamentos', () => {
    const p = painelCoordenacao();
    expect(p.indicadores.duplas).toBe(6);
    expect(p.pendencias.avaliacoesEmAberto).toBeGreaterThan(0);
  });

  it('aluno inexistente não recebe painel', () => {
    expect(painelAluno('nao-existe')).toBeNull();
  });
});
