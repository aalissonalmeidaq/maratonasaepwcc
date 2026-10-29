import { describe, expect, it } from 'vitest';
import { areaInicial, papeisDaArea, podeAcessarArea } from './permissoes';

describe('área inicial por papel', () => {
  it('direciona cada perfil central ao seu painel', () => {
    expect(areaInicial(['coordenacao'])).toBe('coordenacao');
    expect(areaInicial(['docente'])).toBe('docente');
    expect(areaInicial(['mentor'])).toBe('docente');
    expect(areaInicial(['aluno'])).toBe('aluno');
  });

  it('apoio e analista sem atribuição explícita não recebem painel amplo', () => {
    expect(areaInicial(['apoio'])).toBe('aguardando-permissao');
    expect(areaInicial(['analista'])).toBe('aguardando-permissao');
    expect(areaInicial([])).toBe('aguardando-permissao');
  });

  it('com mais de um papel, prioriza coordenação, depois docência', () => {
    expect(areaInicial(['aluno', 'docente'])).toBe('docente');
    expect(areaInicial(['docente', 'coordenacao'])).toBe('coordenacao');
  });
});

describe('acesso às áreas', () => {
  it('aluno não acessa coordenação nem docência', () => {
    expect(podeAcessarArea(['aluno'], 'aluno')).toBe(true);
    expect(podeAcessarArea(['aluno'], 'coordenacao')).toBe(false);
    expect(podeAcessarArea(['aluno'], 'docente')).toBe(false);
  });

  it('docente e mentor acessam a área docente, mas não a coordenação', () => {
    expect(podeAcessarArea(['docente'], 'docente')).toBe(true);
    expect(podeAcessarArea(['mentor'], 'docente')).toBe(true);
    expect(podeAcessarArea(['docente'], 'coordenacao')).toBe(false);
  });

  it('coordenação não herda automaticamente a área do aluno', () => {
    expect(podeAcessarArea(['coordenacao'], 'aluno')).toBe(false);
  });

  it('expõe os papéis aceitos por área', () => {
    expect(papeisDaArea('docente')).toEqual(['docente', 'mentor']);
  });
});
