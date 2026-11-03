import { describe, expect, it } from 'vitest';
import { gerarCsv, nomeDoArquivo } from './csv';
import type { Relatorio } from './tipos';

const BOM = '﻿';

const relatorio = (linhas: Relatorio['linhas']): Relatorio => ({
  colunas: [
    { id: 'equipe', rotulo: 'Equipe', tipo: 'texto' },
    { id: 'total', rotulo: 'Total', tipo: 'numero' },
    { id: 'recebidaEm', rotulo: 'Recebida em', tipo: 'data_hora' },
    { id: 'presente', rotulo: 'Presente', tipo: 'sim_nao' },
  ],
  linhas,
});

describe('gerarCsv (R5, FR-010, SC-005)', () => {
  it('começa com o BOM, usa ";" e CRLF e traz o cabeçalho com os rótulos', () => {
    const csv = gerarCsv(
      relatorio([{ equipe: 'Órbita', total: 81, recebidaEm: null, presente: true }]),
    );
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Equipe;Total;Recebida em;Presente',
      'Órbita;81;;Sim',
    ]);
  });

  it('mantém íntegros campos com ";", aspas ou quebra de linha', () => {
    const csv = gerarCsv(
      relatorio([
        { equipe: 'Vetor; Pixel', total: 1, recebidaEm: null, presente: false },
        { equipe: 'Equipe "Faísca"', total: 2, recebidaEm: null, presente: false },
        { equipe: 'Linha 1\nLinha 2', total: 3, recebidaEm: null, presente: false },
      ]),
    );
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas[1]).toBe('"Vetor; Pixel";1;;Não');
    expect(linhas[2]).toBe('"Equipe ""Faísca""";2;;Não');
    expect(linhas[3]).toBe('"Linha 1\nLinha 2";3;;Não');
  });

  it('números com vírgula decimal e sem separador de milhar', () => {
    const csv = gerarCsv(
      relatorio([{ equipe: 'A', total: 88.33, recebidaEm: null, presente: null }]),
    );
    expect(csv.slice(1).split('\r\n')[1]).toBe('A;88,33;;');
    const grande = gerarCsv(
      relatorio([{ equipe: 'B', total: 1234.5, recebidaEm: null, presente: null }]),
    );
    expect(grande.slice(1).split('\r\n')[1]).toBe('B;1234,5;;');
  });

  it('data e hora em DD/MM/AAAA HH:MM no horário de Brasília', () => {
    const csv = gerarCsv(
      relatorio([
        { equipe: 'A', total: 0, recebidaEm: '2026-11-02T02:05:00Z', presente: true },
        { equipe: 'B', total: 0, recebidaEm: '2026-11-02T15:30:00-03:00', presente: false },
      ]),
    );
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas[1]).toBe('A;0;01/11/2026 23:05;Sim');
    expect(linhas[2]).toBe('B;0;02/11/2026 15:30;Não');
  });

  it('protege contra fórmulas em textos que começam com =, +, -, @, tabulação ou CR', () => {
    const csv = gerarCsv(
      relatorio(
        ['=1+1', '+SOMA(A1)', '-2', '@cmd', '\tx', '\rx'].map((equipe) => ({
          equipe,
          total: -1,
          recebidaEm: null,
          presente: null,
        })),
      ),
    );
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas.slice(1, 5)).toEqual(["'=1+1;-1;;", "'+SOMA(A1);-1;;", "'-2;-1;;", "'@cmd;-1;;"]);
    expect(linhas[5]).toBe("'\tx;-1;;");
    // O CR obriga as aspas; o apóstrofo fica dentro delas.
    expect(csv).toContain(`"'\rx";-1;;`);
  });

  it('nulo e ausente viram célula vazia; sem linhas, só o cabeçalho', () => {
    expect(
      gerarCsv(relatorio([{ equipe: null }]))
        .slice(1)
        .split('\r\n')[1],
    ).toBe(';;;');
    expect(gerarCsv(relatorio([]))).toBe(`${BOM}Equipe;Total;Recebida em;Presente`);
  });
});

describe('nomeDoArquivo', () => {
  it('usa maratona-<tipo>-<AAAA-MM-DD>.csv com a data de Brasília', () => {
    expect(nomeDoArquivo('pontos', new Date('2026-11-02T12:00:00Z'))).toBe(
      'maratona-pontos-2026-11-02.csv',
    );
    expect(nomeDoArquivo('presenca', new Date('2026-11-03T01:00:00Z'))).toBe(
      'maratona-presenca-2026-11-02.csv',
    );
  });
});
