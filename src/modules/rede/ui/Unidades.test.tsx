import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { Unidade } from '../domain/tipos';
import { Unidades, type AcoesDeUnidades } from './Unidades';

const unidades: Unidade[] = [
  {
    id: 'u1',
    nome: 'SENAI Juazeiro do Norte',
    ativa: true,
    desativadaEm: null,
    justificativaDesativacao: null,
    gestao: [],
  },
  {
    id: 'u2',
    nome: 'Unidade B',
    ativa: true,
    desativadaEm: null,
    justificativaDesativacao: null,
    gestao: [
      {
        usuarioId: 'g1',
        nome: 'Ana Gestão',
        email: 'ana@exemplo.invalid',
        situacaoAcesso: 'ativo',
        ativa: true,
      },
      {
        usuarioId: 'g2',
        nome: 'Bia Gestão',
        email: 'bia@exemplo.invalid',
        situacaoAcesso: 'aguardando',
        ativa: true,
      },
    ],
  },
  {
    id: 'u3',
    nome: 'Unidade C',
    ativa: false,
    desativadaEm: '2026-11-04T12:00:00Z',
    justificativaDesativacao: 'Encerramento do convênio.',
    gestao: [
      {
        usuarioId: 'g3',
        nome: 'Caio Gestão',
        email: 'caio@exemplo.invalid',
        situacaoAcesso: 'ativo',
        ativa: false,
      },
    ],
  },
];

function acoes(extra: Partial<AcoesDeUnidades> = {}): AcoesDeUnidades {
  return {
    cadastrar: vi.fn().mockResolvedValue({ conviteEnviado: null }),
    renomear: vi.fn().mockResolvedValue(undefined),
    definirSituacao: vi.fn().mockResolvedValue(undefined),
    acrescentarGestao: vi.fn().mockResolvedValue({ conviteEnviado: true }),
    definirGestao: vi.fn().mockResolvedValue(undefined),
    reenviarConvite: vi.fn().mockResolvedValue({ conviteEnviado: true }),
    ...extra,
  };
}

function renderizar(a = acoes(), extra: { bloqueio?: string } = {}) {
  const r = render(<Unidades unidades={unidades} acoes={a} {...extra} />);
  return { ...r, acoes: a };
}

const cartao = (nome: string) => screen.getByRole('article', { name: new RegExp(nome) });

describe('Unidades (spec 016, US1)', () => {
  it('lista as unidades com a situação e as contas de gestão com a situação do acesso', () => {
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Unidades' })).toBeInTheDocument();
    const b = cartao('Unidade B');
    expect(within(b).getByText('Ativa')).toBeInTheDocument();
    expect(within(b).getByText('Ana Gestão')).toBeInTheDocument();
    expect(within(b).getByText(/ana@exemplo\.invalid/)).toBeInTheDocument();
    expect(within(b).getByText(/Acesso ativo/)).toBeInTheDocument();
    expect(within(b).getByText(/Convite pendente/)).toBeInTheDocument();
    const c = cartao('Unidade C');
    expect(within(c).getByText('Desativada')).toBeInTheDocument();
    expect(within(c).getByText(/Encerramento do convênio\./)).toBeInTheDocument();
  });

  it('unidade sem gestão é destacada', () => {
    renderizar();
    expect(
      within(cartao('SENAI Juazeiro do Norte')).getByText('Unidade sem gestão'),
    ).toBeInTheDocument();
  });

  it('cadastrar só com o nome: sem conta de gestão; confirma só depois do servidor', async () => {
    let resolver: (v: { conviteEnviado: boolean | null }) => void = () => undefined;
    const a = acoes({ cadastrar: vi.fn(() => new Promise((r) => (resolver = r))) as never });
    renderizar(a);
    await userEvent.type(screen.getByLabelText('Nome da unidade'), '  Unidade D ');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar unidade' }));
    expect(a.cadastrar).toHaveBeenCalledWith(expect.stringMatching(/.+/), {
      nome: 'Unidade D',
      gestao: null,
    });
    expect(screen.queryByText(/Unidade cadastrada/)).not.toBeInTheDocument();
    resolver({ conviteEnviado: null });
    expect(
      await screen.findByText(
        'Unidade cadastrada. Ela está sem gestão: acrescente a conta de gestão na lista.',
      ),
    ).toBeInTheDocument();
  });

  it('cadastrar com a gestão avisa do convite', async () => {
    const a = acoes({ cadastrar: vi.fn().mockResolvedValue({ conviteEnviado: true }) });
    renderizar(a);
    await userEvent.type(screen.getByLabelText('Nome da unidade'), 'Unidade D');
    await userEvent.type(screen.getByLabelText('Nome da pessoa da gestão'), 'Dani Gestão');
    await userEvent.type(screen.getByLabelText('E-mail da gestão'), 'DANI@exemplo.invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar unidade' }));
    expect(a.cadastrar).toHaveBeenCalledWith(expect.any(String), {
      nome: 'Unidade D',
      gestao: { nome: 'Dani Gestão', email: 'dani@exemplo.invalid' },
    });
    expect(
      await screen.findByText(/Unidade cadastrada\. Convite enviado para dani@exemplo\.invalid\./),
    ).toBeInTheDocument();
  });

  it('convite que não saiu aparece como alerta (a conta existe e dá para reenviar)', async () => {
    renderizar(acoes({ cadastrar: vi.fn().mockResolvedValue({ conviteEnviado: false }) }));
    await userEvent.type(screen.getByLabelText('Nome da unidade'), 'Unidade D');
    await userEvent.type(screen.getByLabelText('Nome da pessoa da gestão'), 'Dani Gestão');
    await userEvent.type(screen.getByLabelText('E-mail da gestão'), 'dani@exemplo.invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar unidade' }));
    expect(await screen.findByText(/o convite não saiu/i)).toBeInTheDocument();
  });

  it('valida antes de enviar, com erro ligado ao campo', async () => {
    const { acoes: a } = renderizar();
    await userEvent.type(screen.getByLabelText('Nome da unidade'), 'U');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar unidade' }));
    expect(a.cadastrar).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome da unidade')).toHaveAccessibleDescription(
      /de 2 a 120 caracteres/,
    );
  });

  it('recusa do servidor aparece como erro anunciado', async () => {
    renderizar(
      acoes({
        cadastrar: vi.fn().mockRejectedValue(new Error('Já existe uma unidade com esse nome.')),
      }),
    );
    await userEvent.type(screen.getByLabelText('Nome da unidade'), 'Unidade B');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar unidade' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma unidade com esse nome.',
    );
  });

  it('renomear', async () => {
    const { acoes: a } = renderizar();
    const b = cartao('Unidade B');
    await userEvent.click(within(b).getByRole('button', { name: /Renomear/ }));
    const campo = within(b).getByLabelText('Novo nome');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Unidade Bê');
    await userEvent.click(within(b).getByRole('button', { name: 'Salvar nome' }));
    expect(a.renomear).toHaveBeenCalledWith('u2', 'Unidade Bê');
  });

  it('desativar exige justificativa de 10 caracteres e mostra a recusa do servidor no diálogo', async () => {
    const a = acoes({
      definirSituacao: vi
        .fn()
        .mockRejectedValueOnce(new Error('Falha do servidor.'))
        .mockResolvedValue(undefined),
    });
    renderizar(a);
    await userEvent.click(
      within(cartao('Unidade B')).getByRole('button', { name: /Desativar unidade/ }),
    );
    const dialogo = screen.getByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText('Justificativa'), 'curta');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar unidade' }));
    expect(a.definirSituacao).not.toHaveBeenCalled();
    expect(
      within(dialogo).getByText('Justifique com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    await userEvent.clear(within(dialogo).getByLabelText('Justificativa'));
    await userEvent.type(
      within(dialogo).getByLabelText('Justificativa'),
      'Encerramento do convênio.',
    );
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar unidade' }));
    expect(a.definirSituacao).toHaveBeenCalledWith('u2', false, 'Encerramento do convênio.');
    expect(
      await within(screen.getByRole('dialog')).findByText('Falha do servidor.'),
    ).toBeInTheDocument();
  });

  it('reativar não pede justificativa', async () => {
    const { acoes: a } = renderizar();
    await userEvent.click(
      within(cartao('Unidade C')).getByRole('button', { name: /Reativar unidade/ }),
    );
    expect(a.definirSituacao).toHaveBeenCalledWith('u3', true, null);
  });

  it('acrescentar gestão cria a conta pela Edge Function e avisa do convite', async () => {
    const { acoes: a } = renderizar();
    const b = cartao('Unidade B');
    await userEvent.click(within(b).getByRole('button', { name: /Acrescentar gestão/ }));
    await userEvent.type(within(b).getByLabelText('Nome'), 'Eva Gestão');
    await userEvent.type(within(b).getByLabelText('E-mail'), 'eva@exemplo.invalid');
    await userEvent.click(within(b).getByRole('button', { name: 'Criar conta de gestão' }));
    expect(a.acrescentarGestao).toHaveBeenCalledWith('u2', {
      nome: 'Eva Gestão',
      email: 'eva@exemplo.invalid',
    });
    expect(
      await within(b).findByText(/Convite enviado para eva@exemplo\.invalid/),
    ).toBeInTheDocument();
  });

  it('desativar gestão pede justificativa; a recusa da última gestão vem do servidor', async () => {
    const a = acoes({
      definirGestao: vi
        .fn()
        .mockRejectedValue(
          new Error('A unidade precisa manter ao menos uma conta de gestão ativa.'),
        ),
    });
    renderizar(a);
    await userEvent.click(
      within(cartao('Unidade B')).getByRole('button', { name: /Desativar gestão de Ana Gestão/ }),
    );
    const dialogo = screen.getByRole('dialog');
    await userEvent.type(
      within(dialogo).getByLabelText('Justificativa'),
      'Troca de gestão da unidade.',
    );
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar gestão' }));
    expect(a.definirGestao).toHaveBeenCalledWith('g1', false, 'Troca de gestão da unidade.');
    expect(
      await within(screen.getByRole('dialog')).findByText(
        /manter ao menos uma conta de gestão ativa/,
      ),
    ).toBeInTheDocument();
  });

  it('reativar gestão desativada', async () => {
    const { acoes: a } = renderizar();
    await userEvent.click(
      within(cartao('Unidade C')).getByRole('button', { name: /Reativar gestão de Caio Gestão/ }),
    );
    expect(a.definirGestao).toHaveBeenCalledWith('g3', true, null);
  });

  it('reenviar convite só para quem ainda não fez o primeiro acesso', async () => {
    const { acoes: a } = renderizar();
    const b = cartao('Unidade B');
    expect(
      within(b).queryByRole('button', { name: /Reenviar convite para Ana Gestão/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(b).getByRole('button', { name: /Reenviar convite para Bia Gestão/ }),
    );
    expect(a.reenviarConvite).toHaveBeenCalledWith('g2');
    expect(
      await within(b).findByText(/Convite reenviado para bia@exemplo\.invalid/),
    ).toBeInTheDocument();
  });

  it('com bloqueio (demonstração ou sem conexão), as ações ficam desabilitadas com o motivo', () => {
    renderizar(acoes(), {
      bloqueio: 'Indisponível no modo demonstração: nenhuma alteração é gravada.',
    });
    expect(
      screen.getByText('Indisponível no modo demonstração: nenhuma alteração é gravada.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar unidade' })).toBeDisabled();
    expect(
      within(cartao('Unidade B')).getByRole('button', { name: /Desativar unidade/ }),
    ).toBeDisabled();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
