import { describe, expect, it } from 'vitest';
import {
  convitesRecebidosPendentes,
  nomeDeExibicao,
  turmaPermiteTrio,
  validarConvite,
  validarNomeEquipe,
} from './equipes';

describe('validarNomeEquipe (FR-008)', () => {
  it('aceita de 2 a 80 caracteres úteis', () => {
    expect(validarNomeEquipe('  Equipe Órbita ')).toBeNull();
    expect(validarNomeEquipe(' X ')).toBe('Informe um nome de 2 a 80 caracteres.');
    expect(validarNomeEquipe('a'.repeat(81))).toBe('Informe um nome de 2 a 80 caracteres.');
  });
});

describe('nomeDeExibicao', () => {
  const integrantes = [
    { estudanteId: 'a', nome: 'Ana Exemplo' },
    { estudanteId: 'b', nome: 'Bruno Exemplo' },
  ];

  it('usa os primeiros nomes enquanto a equipe não escolheu nome', () => {
    expect(nomeDeExibicao({ nome: null, integrantes })).toBe('Ana e Bruno');
  });

  it('lista três integrantes com vírgula e "e"', () => {
    expect(
      nomeDeExibicao({
        nome: null,
        integrantes: [...integrantes, { estudanteId: 'c', nome: 'Carla Exemplo' }],
      }),
    ).toBe('Ana, Bruno e Carla');
  });

  it('usa o nome escolhido quando existe', () => {
    expect(nomeDeExibicao({ nome: 'Equipe Órbita', integrantes })).toBe('Equipe Órbita');
  });

  it('equipe sem integrantes ativos', () => {
    expect(nomeDeExibicao({ nome: null, integrantes: [] })).toBe('Equipe sem integrantes');
  });
});

describe('turmaPermiteTrio', () => {
  it('só em turma com número ímpar de alunos ativos e sem trio', () => {
    expect(turmaPermiteTrio(7, false)).toBe(true);
    expect(turmaPermiteTrio(6, false)).toBe(false);
    expect(turmaPermiteTrio(7, true)).toBe(false);
  });
});

describe('validarConvite', () => {
  const colegas = [
    { id: 'b', nome: 'Bruno', temEquipe: false },
    { id: 'c', nome: 'Carla', temEquipe: false },
    { id: 'd', nome: 'Davi', temEquipe: true },
  ];

  it('aceita um convidado sem equipe', () => {
    expect(
      validarConvite({ remetenteId: 'a', convidados: ['b'], colegas, permiteTrio: false }),
    ).toBe(null);
  });

  it('exige ao menos um convidado', () => {
    expect(validarConvite({ remetenteId: 'a', convidados: [], colegas, permiteTrio: true })).toBe(
      'Escolha um colega para convidar.',
    );
  });

  it('dois convidados só quando a turma permite trio', () => {
    expect(
      validarConvite({ remetenteId: 'a', convidados: ['b', 'c'], colegas, permiteTrio: false }),
    ).toBe('Nesta turma só é possível formar dupla: escolha um colega.');
    expect(
      validarConvite({ remetenteId: 'a', convidados: ['b', 'c'], colegas, permiteTrio: true }),
    ).toBe(null);
  });

  it('no máximo dois convidados', () => {
    expect(
      validarConvite({
        remetenteId: 'a',
        convidados: ['b', 'c', 'e'],
        colegas,
        permiteTrio: true,
      }),
    ).toBe('Escolha no máximo dois colegas.');
  });

  it('recusa a si mesmo, repetidos e colegas com equipe', () => {
    expect(
      validarConvite({ remetenteId: 'a', convidados: ['a'], colegas, permiteTrio: false }),
    ).toBe('Você não pode convidar a si mesmo.');
    expect(
      validarConvite({ remetenteId: 'a', convidados: ['b', 'b'], colegas, permiteTrio: true }),
    ).toBe('Escolha colegas diferentes.');
    expect(
      validarConvite({ remetenteId: 'a', convidados: ['d'], colegas, permiteTrio: false }),
    ).toBe('Davi já está em uma equipe.');
    expect(
      validarConvite({ remetenteId: 'a', convidados: ['x'], colegas, permiteTrio: false }),
    ).toBe('Convide apenas colegas da sua turma.');
  });
});

describe('convitesRecebidosPendentes (FR-016)', () => {
  const base = {
    tipo: 'dupla' as const,
    motivo: null,
    remetenteId: 'b',
    remetenteNome: 'Bruno',
    criadoEm: '2026-10-30T12:00:00Z',
    encerradoEm: null,
  };

  it('conta só os recebidos ainda pendentes para a pessoa', () => {
    const convites = [
      {
        ...base,
        id: '1',
        situacao: 'pendente' as const,
        souRemetente: false,
        convidados: [{ id: 'a', nome: 'Ana', resposta: 'pendente' as const }],
      },
      {
        ...base,
        id: '2',
        situacao: 'pendente' as const,
        souRemetente: true,
        convidados: [{ id: 'c', nome: 'Carla', resposta: 'pendente' as const }],
      },
      {
        ...base,
        id: '3',
        situacao: 'cancelado' as const,
        souRemetente: false,
        convidados: [{ id: 'a', nome: 'Ana', resposta: 'pendente' as const }],
      },
      {
        ...base,
        id: '4',
        tipo: 'trio' as const,
        situacao: 'pendente' as const,
        souRemetente: false,
        convidados: [
          { id: 'a', nome: 'Ana', resposta: 'aceito' as const },
          { id: 'c', nome: 'Carla', resposta: 'pendente' as const },
        ],
      },
    ];
    expect(convitesRecebidosPendentes(convites, 'a').map((c) => c.id)).toEqual(['1']);
  });
});
