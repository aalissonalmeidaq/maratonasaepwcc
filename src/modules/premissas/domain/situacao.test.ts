import { describe, expect, it } from 'vitest';
import { premissa, resposta } from '@/test/fixtures/premissas';
import {
  agruparPorTema,
  contarPorSituacao,
  filtrarPremissas,
  pendentesEResolvidas,
} from './situacao';

const lista = [
  premissa({ codigo: 'P01', tema: 'Identidade visual' }),
  premissa({ codigo: 'P09', historico: [resposta()] }),
  premissa({
    codigo: 'P10',
    ordem: 2,
    historico: [resposta(), resposta({ id: 'r2', decisao: 'precisa_mudar' })],
  }),
  premissa({ codigo: 'P21', tema: 'Equipes e atividades' }),
  premissa({ codigo: 'P90', tema: 'Operação', resolvidaPor: 'spec 016' }),
];

describe('situação das premissas (spec 015, FR-003)', () => {
  it('separa pendentes das resolvidas por especificação', () => {
    const { pendentes, resolvidas } = pendentesEResolvidas(lista);
    expect(pendentes.map((p) => p.codigo)).toEqual(['P01', 'P09', 'P10', 'P21']);
    expect(resolvidas.map((p) => p.codigo)).toEqual(['P90']);
  });

  it('conta por situação só as pendentes', () => {
    expect(contarPorSituacao(lista)).toEqual({ aguardando: 2, confirmada: 1, precisa_mudar: 1 });
  });

  it('filtra por situação e por tema; "todas"/"todos" não filtram', () => {
    const codigos = (f: Parameters<typeof filtrarPremissas>[1]) =>
      filtrarPremissas(lista, f).map((p) => p.codigo);
    expect(codigos({ situacao: 'todas', tema: 'todos' })).toEqual(['P01', 'P09', 'P10', 'P21']);
    expect(codigos({ situacao: 'aguardando', tema: 'todos' })).toEqual(['P01', 'P21']);
    expect(codigos({ situacao: 'precisa_mudar', tema: 'todos' })).toEqual(['P10']);
    expect(codigos({ situacao: 'todas', tema: 'Pontuação' })).toEqual(['P09', 'P10']);
    expect(codigos({ situacao: 'confirmada', tema: 'Identidade visual' })).toEqual([]);
  });

  it('agrupa por tema na ordem de TEMAS, sem temas vazios', () => {
    const grupos = agruparPorTema(filtrarPremissas(lista, { situacao: 'todas', tema: 'todos' }));
    expect(grupos.map((g) => [g.tema, g.premissas.map((p) => p.codigo)])).toEqual([
      ['Pontuação', ['P09', 'P10']],
      ['Equipes e atividades', ['P21']],
      ['Identidade visual', ['P01']],
    ]);
  });
});
