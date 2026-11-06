import { describe, expect, it } from 'vitest';
import {
  areaInicial,
  areaInicialDoAcesso,
  areasDoAcesso,
  papeisDaArea,
  podeAcessar,
  podeAcessarArea,
} from './permissoes';

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

describe('áreas pelo acesso completo (spec 016, FR-006b)', () => {
  const unidade = { ativa: true };

  it('master só tem a área master, mesmo sem papéis nem unidade', () => {
    expect(areasDoAcesso({ papeis: [], master: true })).toEqual(['master']);
    expect(areaInicialDoAcesso({ papeis: [], master: true })).toBe('master');
  });

  it('gestão por função, sem precisar de papel em edição', () => {
    const acesso = { papeis: [], funcoes: ['gestao'] as const, unidade };
    expect(areasDoAcesso(acesso)).toEqual(['gestao']);
    expect(areaInicialDoAcesso(acesso)).toBe('gestao');
  });

  it('funções acumuladas dão as duas áreas, com a prioridade master → gestão → coordenação → docente → analista → aluno', () => {
    const acesso = {
      papeis: ['coordenacao', 'docente', 'aluno'] as const,
      funcoes: ['gestao', 'analista'] as const,
      unidade,
    };
    expect(areasDoAcesso(acesso)).toEqual([
      'gestao',
      'coordenacao',
      'docente',
      'analista',
      'aluno',
    ]);
    expect(areaInicialDoAcesso(acesso)).toBe('gestao');
  });

  it('analista por função (ou papel) tem a área analista', () => {
    expect(areasDoAcesso({ papeis: [], funcoes: ['analista'], unidade })).toEqual(['analista']);
    expect(areasDoAcesso({ papeis: ['analista'], unidade })).toEqual(['analista']);
  });

  it('função de coordenação sem edição não abre a área da coordenação (precisa do papel na edição)', () => {
    expect(areasDoAcesso({ papeis: [], funcoes: ['coordenacao'], unidade })).toEqual([]);
    expect(areaInicialDoAcesso({ papeis: [], funcoes: ['coordenacao'], unidade })).toBe(
      'aguardando-permissao',
    );
  });

  it('unidade desativada leva à página própria (exceto o master)', () => {
    const desativada = { papeis: ['coordenacao'] as const, unidade: { ativa: false } };
    expect(areaInicialDoAcesso(desativada)).toBe('unidade-desativada');
    expect(areasDoAcesso(desativada)).toEqual([]);
    expect(areaInicialDoAcesso({ papeis: [], master: true, unidade: { ativa: false } })).toBe(
      'master',
    );
  });

  it('sem nada: aguardando permissão; podeAcessar confere pela lista de áreas', () => {
    expect(areaInicialDoAcesso({ papeis: [] })).toBe('aguardando-permissao');
    expect(podeAcessar({ papeis: ['aluno'] }, 'aluno')).toBe(true);
    expect(podeAcessar({ papeis: ['aluno'] }, 'gestao')).toBe(false);
    expect(podeAcessar({ papeis: [], master: true }, 'coordenacao')).toBe(false);
  });
});
