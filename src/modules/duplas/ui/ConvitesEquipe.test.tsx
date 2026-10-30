import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { Colega, ConviteEquipe } from '../domain/tipos';
import { ContadorConvites, ConvitesEquipe } from './ConvitesEquipe';

const colegas: Colega[] = [
  { id: 'b', nome: 'Bruno Exemplo', temEquipe: false },
  { id: 'c', nome: 'Carla Exemplo', temEquipe: false },
  { id: 'd', nome: 'Davi Exemplo', temEquipe: true },
];

function convite(parcial: Partial<ConviteEquipe>): ConviteEquipe {
  return {
    id: 'c1',
    tipo: 'dupla',
    situacao: 'pendente',
    motivo: null,
    remetenteId: 'b',
    remetenteNome: 'Bruno Exemplo',
    convidados: [{ id: 'a', nome: 'Ana Exemplo', resposta: 'pendente' }],
    criadoEm: '2026-10-30T12:00:00Z',
    encerradoEm: null,
    souRemetente: false,
    ...parcial,
  };
}

const acoes = () => ({
  onEnviar: vi.fn().mockResolvedValue(undefined),
  onResponder: vi.fn().mockResolvedValue(undefined),
  onCancelar: vi.fn().mockResolvedValue(undefined),
  onRetirar: vi.fn().mockResolvedValue(undefined),
  onErro: vi.fn(),
});

describe('ConvitesEquipe (US1)', () => {
  it('lista só colegas sem equipe e envia o convite em uma ação', async () => {
    const a = acoes();
    const { container } = render(
      <ConvitesEquipe eu="a" colegas={colegas} convites={[]} permiteTrio={false} {...a} />,
    );
    const lista = screen.getByRole('group', { name: 'Convidar colegas' });
    expect(
      within(lista)
        .getAllByRole('checkbox')
        .map((c) => c.getAttribute('name')),
    ).toEqual(['b', 'c']);
    expect(screen.queryByLabelText('Davi Exemplo')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Bruno Exemplo'));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(a.onEnviar).toHaveBeenCalledWith(['b']);
    expect(await screen.findByRole('status')).toHaveTextContent('Convite enviado.');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('em turma sem trio permitido, aceita só um colega', async () => {
    render(
      <ConvitesEquipe eu="a" colegas={colegas} convites={[]} permiteTrio={false} {...acoes()} />,
    );
    await userEvent.click(screen.getByLabelText('Bruno Exemplo'));
    expect(screen.getByLabelText('Carla Exemplo')).toBeDisabled();
  });

  it('não mostra sucesso enquanto o servidor não responde e evita envio duplo', async () => {
    let concluir!: () => void;
    const a = acoes();
    a.onEnviar.mockImplementation(() => new Promise<void>((r) => (concluir = r)));
    render(<ConvitesEquipe eu="a" colegas={colegas} convites={[]} permiteTrio={false} {...a} />);
    await userEvent.click(screen.getByLabelText('Bruno Exemplo'));
    const botao = screen.getByRole('button', { name: 'Enviar convite' });
    await userEvent.click(botao);
    await userEvent.click(botao);
    expect(a.onEnviar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Convite enviado.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Convite enviado.')).toBeInTheDocument();
  });

  it('em falha, mostra o erro do servidor e pede nova leitura dos dados', async () => {
    const a = acoes();
    a.onResponder.mockRejectedValue(new Error('Este convite não está mais pendente.'));
    render(
      <ConvitesEquipe
        eu="a"
        colegas={colegas}
        convites={[convite({})]}
        permiteTrio={false}
        {...a}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar convite de Bruno Exemplo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('não está mais pendente');
    expect(a.onErro).toHaveBeenCalled();
  });

  it('convite recebido: aceitar e recusar; convite enviado: cancelar', async () => {
    const a = acoes();
    render(
      <ConvitesEquipe
        eu="a"
        colegas={colegas}
        permiteTrio={false}
        convites={[
          convite({}),
          convite({
            id: 'c2',
            souRemetente: true,
            remetenteId: 'a',
            remetenteNome: 'Ana Exemplo',
            convidados: [{ id: 'c', nome: 'Carla Exemplo', resposta: 'pendente' }],
          }),
        ]}
        {...a}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Recusar convite de Bruno Exemplo' }));
    expect(a.onResponder).toHaveBeenCalledWith('c1', false);
    const enviados = screen.getByRole('region', { name: 'Convites enviados' });
    expect(enviados).toHaveTextContent('Carla Exemplo');
    expect(enviados).toHaveTextContent('Aguardando resposta');
    await userEvent.click(within(enviados).getByRole('button', { name: 'Cancelar convite' }));
    expect(a.onCancelar).toHaveBeenCalledWith('c2');
  });

  it('sem colegas disponíveis e sem convites, explica o estado vazio', () => {
    render(
      <ConvitesEquipe
        eu="a"
        colegas={[colegas[2] as Colega]}
        convites={[]}
        permiteTrio={false}
        {...acoes()}
      />,
    );
    expect(screen.getByText('Todos os colegas da turma já estão em equipes.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum convite recebido.')).toBeInTheDocument();
  });

  it('bloqueado (offline ou demonstração): nenhuma ação chega ao servidor', () => {
    const a = acoes();
    render(
      <ConvitesEquipe
        eu="a"
        colegas={colegas}
        convites={[convite({})]}
        permiteTrio={false}
        bloqueio="Sem conexão: nada é gravado."
        {...a}
      />,
    );
    expect(screen.getByText('Sem conexão: nada é gravado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aceitar convite de Bruno Exemplo' })).toBeDisabled();
  });
});

describe('ConvitesEquipe — trio (US2)', () => {
  const trio = convite({
    tipo: 'trio',
    convidados: [
      { id: 'a', nome: 'Ana Exemplo', resposta: 'pendente' },
      { id: 'c', nome: 'Carla Exemplo', resposta: 'pendente' },
    ],
  });

  it('com trio permitido, aceita dois colegas no mesmo convite', async () => {
    const a = acoes();
    render(<ConvitesEquipe eu="a" colegas={colegas} convites={[]} permiteTrio {...a} />);
    expect(screen.getByText(/dois para o trio da turma/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Bruno Exemplo'));
    await userEvent.click(screen.getByLabelText('Carla Exemplo'));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(a.onEnviar).toHaveBeenCalledWith(['b', 'c']);
  });

  it('mostra que o convite é para um trio e quem mais foi convidado', () => {
    render(<ConvitesEquipe eu="a" colegas={colegas} convites={[trio]} permiteTrio {...acoes()} />);
    expect(
      screen.getByText(/convidou você e Carla Exemplo para formar um trio/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retirar aceite' })).not.toBeInTheDocument();
  });

  it('depois do próprio aceite, aguarda o outro convidado e permite retirar o aceite', async () => {
    const a = acoes();
    const parcial = {
      ...trio,
      convidados: [
        { id: 'a', nome: 'Ana Exemplo', resposta: 'aceito' as const },
        { id: 'c', nome: 'Carla Exemplo', resposta: 'pendente' as const },
      ],
    };
    render(<ConvitesEquipe eu="a" colegas={colegas} convites={[parcial]} permiteTrio {...a} />);
    expect(screen.getByText(/Aguardando outro aceite/)).toBeInTheDocument();
    expect(screen.getByText(/retirar o aceite cancela o convite inteiro/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aceitar/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retirar aceite' }));
    expect(a.onRetirar).toHaveBeenCalledWith('c1');
    expect(await screen.findByRole('status')).toHaveTextContent('Aceite retirado.');
  });
});

describe('ContadorConvites (FR-016)', () => {
  it('mostra a quantidade com texto acessível', () => {
    render(<ContadorConvites quantidade={2} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('2 convites pendentes')).toBeInTheDocument();
  });

  it('usa o singular para um convite', () => {
    render(<ContadorConvites quantidade={1} />);
    expect(screen.getByText('1 convite pendente')).toBeInTheDocument();
  });

  it('some quando não há pendentes', () => {
    const { container } = render(<ContadorConvites quantidade={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
