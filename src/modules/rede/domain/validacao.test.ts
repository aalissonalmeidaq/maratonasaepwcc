import { describe, expect, it } from 'vitest';
import {
  validarCadastroDePessoa,
  validarEdicaoDaUnidade,
  validarCadastroDeUnidade,
  validarContaDaRede,
  validarJustificativa,
  validarNomeDaUnidade,
} from './validacao';

describe('validação da rede (spec 016)', () => {
  it('nome da unidade: 2 a 120 caracteres, sem contar espaços nas pontas', () => {
    expect(validarNomeDaUnidade('  X ')).toBe('O nome da unidade deve ter de 2 a 120 caracteres.');
    expect(validarNomeDaUnidade('a'.repeat(121))).toBe(
      'O nome da unidade deve ter de 2 a 120 caracteres.',
    );
    expect(validarNomeDaUnidade('  Unidade B ')).toBeUndefined();
  });

  it('justificativa: ao menos 10 caracteres', () => {
    expect(validarJustificativa('curta')).toBe('Justifique com pelo menos 10 caracteres.');
    expect(validarJustificativa('  Encerramento do convênio.  ')).toBeUndefined();
  });

  it('conta: nome de 2 a 160 caracteres e e-mail válido', () => {
    expect(validarContaDaRede({ nome: 'A', email: 'a@b.co' })).toEqual({
      nome: 'Informe o nome (2 a 160 caracteres).',
    });
    expect(validarContaDaRede({ nome: 'Ana', email: 'sem-arroba' })).toEqual({
      email: 'Informe um e-mail válido.',
    });
    expect(validarContaDaRede({ nome: 'Ana Exemplo', email: 'ana@exemplo.invalid' })).toEqual({});
  });

  it('cadastro de unidade: gestão é opcional; se começar a preencher, valida a conta', () => {
    expect(
      validarCadastroDeUnidade({ nome: 'Unidade C', gestaoNome: '', gestaoEmail: '' }),
    ).toEqual({});
    expect(validarCadastroDeUnidade({ nome: 'U', gestaoNome: '', gestaoEmail: '' })).toEqual({
      nome: 'O nome da unidade deve ter de 2 a 120 caracteres.',
    });
    expect(
      validarCadastroDeUnidade({ nome: 'Unidade C', gestaoNome: 'Ana', gestaoEmail: '' }),
    ).toEqual({
      gestaoEmail: 'Informe um e-mail válido.',
    });
    expect(
      validarCadastroDeUnidade({
        nome: 'Unidade C',
        gestaoNome: '',
        gestaoEmail: 'ana@exemplo.invalid',
      }),
    ).toEqual({ gestaoNome: 'Informe o nome (2 a 160 caracteres).' });
  });

  it('pessoa da equipe: conta válida e ao menos uma função', () => {
    expect(
      validarCadastroDePessoa({ nome: 'Ana', email: 'ana@exemplo.invalid', funcoes: [] }),
    ).toEqual({
      funcoes: 'Escolha ao menos uma função.',
    });
    expect(validarCadastroDePessoa({ nome: 'A', email: 'x', funcoes: ['docente'] })).toEqual({
      nome: 'Informe o nome (2 a 160 caracteres).',
      email: 'Informe um e-mail válido.',
    });
    expect(
      validarCadastroDePessoa({
        nome: 'Ana Exemplo',
        email: 'ana@exemplo.invalid',
        funcoes: ['docente'],
      }),
    ).toEqual({});
  });

  it('edição da unidade: nome de 3 a 160, período coerente e coordenação escolhida', () => {
    const ok = {
      nome: 'Maratona 2027',
      inicio: '2027-03-01',
      fim: '2027-12-01',
      coordenacaoId: 'p1',
    };
    expect(validarEdicaoDaUnidade(ok)).toEqual({});
    expect(validarEdicaoDaUnidade({ ...ok, nome: 'ab' })).toEqual({
      nome: 'Informe um nome de 3 a 160 caracteres.',
    });
    expect(validarEdicaoDaUnidade({ ...ok, inicio: '2027-12-02' })).toEqual({
      fim: 'O fim não pode ser antes do início.',
    });
    expect(validarEdicaoDaUnidade({ ...ok, coordenacaoId: '' })).toEqual({
      coordenacaoId: 'Escolha quem coordena a edição.',
    });
  });
});
