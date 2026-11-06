import { describe, expect, it } from 'vitest';
import { areaInicialDoAcesso, areasDoAcesso } from '@/modules/acesso';
import { criarAdaptadorDemo } from '@/modules/auth';
import { contasDemo, unidadesDemo } from './dados';

const conta = (nome: RegExp) => {
  const c = contasDemo.find((x) => nome.test(x.nome));
  if (!c) throw new Error(`conta demo não encontrada: ${nome}`);
  return c;
};

describe('contas da demonstração (spec 016)', () => {
  it('master, gestão e analista fictícios, cada um na sua área', () => {
    expect(areasDoAcesso(conta(/master/i))).toEqual(['master']);
    expect(areaInicialDoAcesso(conta(/gestão/i))).toBe('gestao');
    expect(areaInicialDoAcesso(conta(/analista/i))).toBe('analista');
  });

  it('o master não tem unidade; as demais contas têm a unidade fictícia A', () => {
    expect(conta(/master/i).unidade).toBeNull();
    for (const c of contasDemo.filter((x) => !/master/i.test(x.nome))) {
      expect(c.unidade?.nome).toBe(unidadesDemo[0]!.nome);
      expect(c.unidade?.ativa).toBe(true);
    }
  });

  it('coordenação, docente e aluna continuam nas áreas de antes', () => {
    expect(areaInicialDoAcesso(conta(/coordenação/i))).toBe('coordenacao');
    expect(areaInicialDoAcesso(conta(/lúcia/i))).toBe('docente');
    expect(areaInicialDoAcesso(conta(/ana exemplo/i))).toBe('aluno');
  });

  it('há duas unidades fictícias, ambas marcadas como fictícias', () => {
    expect(unidadesDemo).toHaveLength(2);
    expect(unidadesDemo.every((u) => /fictíci/i.test(u.nome))).toBe(true);
  });

  it('a sessão demo preserva master, funções e unidade', async () => {
    const adaptador = criarAdaptadorDemo(contasDemo);
    const sessao = await adaptador.entrarComo(conta(/gestão/i).usuarioId);
    expect(sessao).toMatchObject({ demo: true, funcoes: ['gestao'], unidade: { ativa: true } });
  });
});
