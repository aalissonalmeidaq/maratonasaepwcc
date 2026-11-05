import { describe, expect, it } from 'vitest';
import { premissa, resposta } from '@/test/fixtures/premissas';
import { relatorioDasPremissas } from './linhasCsv';

describe('linhas do CSV das premissas (spec 015, FR-004a)', () => {
  it('colunas do contrato, na ordem', () => {
    expect(relatorioDasPremissas([]).colunas.map((c) => c.rotulo)).toEqual([
      'Código',
      'Tema',
      'Pergunta',
      'Em uso hoje',
      'Situação',
      'Última decisão',
      'Justificativa',
      'Registrada por',
      'Registrada em',
    ]);
  });

  it('uma linha por premissa recebida, com a última resposta ou vazia', () => {
    const r = relatorioDasPremissas([
      premissa({
        codigo: 'P09',
        historico: [resposta({ decisao: 'precisa_mudar', justificativa: '=SOMA(A1)' })],
      }),
      premissa({ codigo: 'P10' }),
    ]);
    expect(r.linhas).toEqual([
      {
        codigo: 'P09',
        tema: 'Pontuação',
        pergunta: 'Como as notas fracionárias devem ser arredondadas?',
        emUso: 'Duas casas decimais, meio para cima.',
        situacao: 'Precisa mudar',
        decisao: 'Precisa mudar',
        justificativa: '=SOMA(A1)',
        autor: 'Coordenação Teste',
        registradoEm: '2026-11-05T13:30:00.000Z',
      },
      {
        codigo: 'P10',
        tema: 'Pontuação',
        pergunta: 'Como as notas fracionárias devem ser arredondadas?',
        emUso: 'Duas casas decimais, meio para cima.',
        situacao: 'Aguardando resposta',
        decisao: null,
        justificativa: null,
        autor: null,
        registradoEm: null,
      },
    ]);
    // A proteção contra fórmula e o formato DD/MM/AAAA HH:MM ficam com `gerarCsv` (spec 008):
    // a coluna da justificativa é texto e a da data é data_hora.
    expect(r.colunas.find((c) => c.id === 'justificativa')?.tipo).toBe('texto');
    expect(r.colunas.find((c) => c.id === 'registradoEm')?.tipo).toBe('data_hora');
  });
});
