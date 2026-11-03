import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO } from './regras-piloto';
import { combinarRegras, pontuacaoMaximaDoEncontro } from './regrasVigentes';

describe('combinarRegras (spec 011, FR-005)', () => {
  it('o grupo da turma substitui o grupo inteiro da edição; o resto é herdado', () => {
    const apresentacao = { criterios: [{ id: 'demo', rotulo: 'Demonstração', maximo: 12 }] };
    const r = combinarRegras(REGRAS_PILOTO, { apresentacao });
    expect(r.apresentacao).toEqual(apresentacao);
    expect(r.entrega).toEqual(REGRAS_PILOTO.entrega);
    expect(r.versao).toBe(REGRAS_PILOTO.versao);
  });

  it('sem ajustes, devolve as regras da edição', () => {
    expect(combinarRegras(REGRAS_PILOTO, {})).toEqual(REGRAS_PILOTO);
  });
});

describe('pontuacaoMaximaDoEncontro (spec 011, FR-009)', () => {
  it('encontro de questões: presença + participação + questões + entrega + apresentação', () => {
    expect(pontuacaoMaximaDoEncontro(REGRAS_PILOTO, 'questoes')).toBe(10 + 10 + 30 + 40 + 10);
  });

  it('encontro de prova oficial usa o máximo da prova no lugar das questões', () => {
    expect(pontuacaoMaximaDoEncontro(REGRAS_PILOTO, 'prova_oficial')).toBe(10 + 10 + 30 + 40 + 10);
    const r = combinarRegras(REGRAS_PILOTO, { questoes: { maximo: 20 } });
    expect(pontuacaoMaximaDoEncontro(r, 'questoes')).toBe(90);
    expect(pontuacaoMaximaDoEncontro(r, 'prova_oficial')).toBe(100);
  });
});
