import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO } from './regras-piloto';
import type { RegrasDaEdicao } from './tipos';
import { idDoCriterio, sugerirRotulo, validarRegras } from './validacaoRegras';

const copia = (): RegrasDaEdicao => structuredClone(REGRAS_PILOTO);

describe('validarRegras (spec 011, FR-001, FR-007, FR-016)', () => {
  it('aceita as regras do piloto', () => {
    expect(validarRegras(REGRAS_PILOTO, 'edicao')).toEqual({});
  });

  it('aceita critério novo e renomeado', () => {
    const r = copia();
    r.entrega.criterios.push({ id: 'documentacao', rotulo: 'Documentação', maximo: 5 });
    r.apresentacao.criterios[0]!.rotulo = 'Clareza da fala';
    expect(validarRegras(r, 'edicao')).toEqual({});
  });

  it('recusa critério sem nome, nome repetido, máximo zero e rubrica vazia', () => {
    const r = copia();
    r.participacao.criterios[0]!.rotulo = ' ';
    r.entrega.criterios[1]!.rotulo = r.entrega.criterios[0]!.rotulo;
    r.apresentacao.criterios[0]!.maximo = 0;
    const erros = validarRegras(r, 'edicao');
    expect(erros['participacao.criterios.0.rotulo']).toBeDefined();
    expect(erros['entrega.criterios.1.rotulo']).toBe(
      'Já existe um critério com esse nome nesta rubrica.',
    );
    expect(erros['apresentacao.criterios.0.maximo']).toBeDefined();
    const vazia = copia();
    vazia.participacao.criterios = [];
    expect(validarRegras(vazia, 'edicao')['participacao.criterios']).toBeDefined();
  });

  it('o critério de atraso precisa existir na entrega', () => {
    const r = copia();
    r.entrega.criterios = r.entrega.criterios.filter((c) => c.id !== r.entrega.criterioDeAtraso);
    expect(validarRegras(r, 'edicao')['entrega.criterioDeAtraso']).toBe(
      'Escolha outro critério de atraso antes de remover este.',
    );
  });

  it('faixas de atraso crescentes e dentro do limite', () => {
    const r = copia();
    r.entrega.faixasDeAtraso = [
      { ateMinutos: 30, desconto: 2 },
      { ateMinutos: 15, desconto: 5 },
    ];
    expect(validarRegras(r, 'edicao')['entrega.faixasDeAtraso']).toBeDefined();
    const acima = copia();
    acima.entrega.limiteAtrasoMinutos = 20;
    expect(validarRegras(acima, 'edicao')['entrega.faixasDeAtraso']).toBeDefined();
  });

  it('tipos de penalidade com nome único e pontos não negativos', () => {
    const r = copia();
    r.penalidades.tipos.push({ id: 'outro', rotulo: r.penalidades.tipos[0]!.rotulo, pontos: -1 });
    const erros = validarRegras(r, 'edicao');
    expect(Object.keys(erros).some((k) => k.startsWith('penalidades.tipos.'))).toBe(true);
  });

  it('limites de proteção: encontros 1 a 20, casas decimais 0 a 4, prazos positivos', () => {
    const r = copia();
    r.quantidadeEncontros = 21;
    r.casasDecimais = 5;
    r.prazos.revisaoHoras = 0;
    const erros = validarRegras(r, 'edicao');
    expect(erros.quantidadeEncontros).toBeDefined();
    expect(erros.casasDecimais).toBeDefined();
    expect(erros['prazos.revisaoHoras']).toBeDefined();
  });

  it('a prova oficial segue o PRD (HU04) e não muda', () => {
    const r = copia();
    r.provaOficial.pontosBonus = 20;
    expect(validarRegras(r, 'edicao').provaOficial).toBe(
      'A prova oficial segue os valores do PRD e não pode ser alterada.',
    );
  });

  it('a prova oficial vinda do banco, com as chaves em outra ordem, é aceita', () => {
    const r = copia();
    r.provaOficial = {
      pontosBonus: 10,
      maximoPorDupla: 30,
      notaMinimaBonus: 70,
      pontosRealizacao: 5,
    };
    expect(validarRegras(r, 'edicao').provaOficial).toBeUndefined();
  });
});

describe('idDoCriterio e sugerirRotulo', () => {
  it('gera id a partir do nome, sem acento, único na rubrica', () => {
    expect(idDoCriterio('Documentação técnica', [])).toBe('documentacao-tecnica');
    expect(idDoCriterio('Clareza', ['clareza'])).toBe('clareza-2');
  });

  it('sugere o próximo rótulo', () => {
    expect(sugerirRotulo('2027.1')).toBe('2027.2');
    expect(sugerirRotulo('v9')).toBe('v10');
    expect(sugerirRotulo('piloto-2026.0-a-confirmar')).toBe('piloto-2026.0-a-confirmar.1');
  });
});
