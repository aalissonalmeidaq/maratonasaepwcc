import { describe, expect, it } from 'vitest';
import { TEMAS } from '@/modules/premissas';
import { CATALOGO_PREMISSAS, criarPremissasDemo } from './premissas';

// Apêndice A da spec 015: código → tema.
const APENDICE_A: Record<string, string> = {
  ...Object.fromEntries(
    ['01', '02', '03', '04', '05', '06', '07', '08'].map((n) => [`P${n}`, 'Identidade visual']),
  ),
  ...Object.fromEntries(
    ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'].map((n) => [
      `P${n}`,
      'Pontuação',
    ]),
  ),
  ...Object.fromEntries(
    ['20', '21', '22', '23', '24'].map((n) => [`P${n}`, 'Equipes e atividades']),
  ),
  ...Object.fromEntries(['25', '26', '27', '28'].map((n) => [`P${n}`, 'Acesso e edições'])),
  ...Object.fromEntries(['29', '30', '31'].map((n) => [`P${n}`, 'Comunicados e relatórios'])),
  P32: 'Operação',
};

describe('catálogo de premissas da demonstração (spec 015, Apêndice A)', () => {
  it('tem exatamente P01–P32 com os temas do Apêndice A', () => {
    expect(Object.fromEntries(CATALOGO_PREMISSAS.map((p) => [p.codigo, p.tema]))).toEqual(
      APENDICE_A,
    );
  });

  it('textos dentro dos limites do banco e temas conhecidos', () => {
    for (const p of CATALOGO_PREMISSAS) {
      expect(TEMAS).toContain(p.tema);
      expect(p.pergunta.length).toBeGreaterThanOrEqual(10);
      expect(p.pergunta.length).toBeLessThanOrEqual(300);
      expect(p.pergunta.endsWith('?')).toBe(true);
      expect(p.premissaEmUso.length).toBeGreaterThanOrEqual(10);
      expect(p.premissaEmUso.length).toBeLessThanOrEqual(500);
      expect(p.ondeAfeta.length).toBeGreaterThanOrEqual(10);
      expect(p.ondeAfeta.length).toBeLessThanOrEqual(500);
      expect(p.referencia).not.toBe('');
    }
  });

  it('todas resolvidas (P25 pela spec 016, as demais pelo projeto); respostas fictícias só no histórico', async () => {
    const { premissas } = await criarPremissasDemo(() => true).premissas();
    expect(premissas.filter((p) => !p.resolvidaPor)).toHaveLength(0);
    expect(premissas.find((p) => p.codigo === 'P25')?.resolvidaPor).toBe('spec 016');
    expect(premissas.find((p) => p.codigo === 'P01')?.resolvidaPor).toBe(
      'decisão do projeto de 06/11/2026',
    );
    const p06 = premissas.find((p) => p.codigo === 'P06')!;
    expect(p06.situacao).toBe('precisa_mudar');
    expect(p06.historico).toHaveLength(2);
    expect(p06.atual).toEqual(p06.historico[1]);
  });

  it('só o master pode responder na leitura; os demais não; registrar é recusado', async () => {
    expect((await criarPremissasDemo(() => true).premissas()).podeResponder).toBe(true);
    expect((await criarPremissasDemo(() => false).premissas()).podeResponder).toBe(false);
    await expect(
      criarPremissasDemo(() => true).responder({
        codigo: 'P09',
        decisao: 'confirmada',
        justificativa: 'Conferido com o regulamento.',
        respostaBase: null,
      }),
    ).rejects.toThrow(/demonstração/);
  });
});
