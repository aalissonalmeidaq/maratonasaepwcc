import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { ComunicadoGerido } from '../domain/tipos';
import { GestaoComunicados, type AcoesComunicado } from './GestaoComunicados';

const base: ComunicadoGerido = {
  id: 'c1',
  titulo: 'Mudança de sala',
  texto: 'Laboratório 2.',
  publico: 'estudantes',
  turmas: [{ id: 't-a', nome: '3º ano A' }],
  autor: { nome: 'Prof.ª Ana', papel: 'docente' },
  estado: 'rascunho',
  versao: 1,
  publicadoEm: null,
  corrigidoEm: null,
  retiradoEm: null,
  justificativaRetirada: null,
  podeEditar: true,
};
const publicado: ComunicadoGerido = {
  ...base,
  id: 'c2',
  titulo: 'Aviso geral',
  publico: 'todos',
  turmas: [],
  autor: { nome: 'Coordenação', papel: 'coordenacao' },
  estado: 'publicado',
  publicadoEm: '2026-11-02T15:00:00Z',
};

const acoes = (sobrescrever: Partial<AcoesComunicado> = {}): AcoesComunicado => ({
  salvar: vi.fn(() => Promise.resolve('novo-id')),
  publicar: vi.fn(() => Promise.resolve()),
  apagar: vi.fn(() => Promise.resolve()),
  corrigir: vi.fn(() => Promise.resolve()),
  retirar: vi.fn(() => Promise.resolve()),
  ...sobrescrever,
});
const turmas = [{ id: 't-a', nome: '3º ano A' }];

describe('GestaoComunicados (US1, FR-003, FR-006, FR-013)', () => {
  it('lista com estado em texto, autor, papel e público', async () => {
    const { container } = render(
      <GestaoComunicados
        comunicados={[base, publicado]}
        perfil="coordenacao"
        turmas={turmas}
        acoes={acoes()}
      />,
    );
    const rascunho = screen.getByRole('article', { name: 'Mudança de sala' });
    expect(within(rascunho).getByText('Rascunho')).toBeInTheDocument();
    expect(within(rascunho).getByText(/Prof.ª Ana \(docente\)/)).toBeInTheDocument();
    expect(within(rascunho).getByText('Estudantes — 3º ano A')).toBeInTheDocument();
    const geral = screen.getByRole('article', { name: 'Aviso geral' });
    expect(within(geral).getByText('Publicado')).toBeInTheDocument();
    expect(within(geral).getByText('Todos — edição inteira')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('filtra por estado', async () => {
    const usuario = userEvent.setup();
    render(
      <GestaoComunicados
        comunicados={[base, publicado]}
        perfil="coordenacao"
        turmas={turmas}
        acoes={acoes()}
      />,
    );
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'publicado');
    expect(screen.queryByRole('article', { name: 'Mudança de sala' })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Aviso geral' })).toBeInTheDocument();
  });

  it('novo comunicado: guarda o rascunho e publica com a mesma chave e o id devolvido', async () => {
    const usuario = userEvent.setup();
    const a = acoes();
    render(<GestaoComunicados comunicados={[]} perfil="docente" turmas={turmas} acoes={a} />);
    expect(screen.getByText('Nenhum comunicado escrito ainda.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Novo comunicado' }));
    await usuario.type(screen.getByLabelText('Título'), 'Prova adiada');
    await usuario.type(screen.getByLabelText('Texto'), 'Nova data em breve.');
    await usuario.click(screen.getByRole('radio', { name: 'Estudantes' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar rascunho' }));
    await screen.findByText('Rascunho guardado.');
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));
    await screen.findByText('Comunicado publicado.');
    const chamadas = vi.mocked(a.salvar).mock.calls;
    expect(chamadas[0]?.[1]).toBeNull();
    expect(chamadas[1]?.[0]).toBe(chamadas[0]?.[0]);
    expect(chamadas[1]?.[1]).toBe('novo-id');
    expect(a.publicar).toHaveBeenCalledWith('novo-id');
  });

  it('rascunho: publicar e apagar (com confirmação)', async () => {
    const usuario = userEvent.setup();
    const a = acoes();
    render(<GestaoComunicados comunicados={[base]} perfil="docente" turmas={turmas} acoes={a} />);
    const item = screen.getByRole('article', { name: 'Mudança de sala' });
    await usuario.click(within(item).getByRole('button', { name: 'Publicar: Mudança de sala' }));
    expect(a.publicar).toHaveBeenCalledWith('c1');
    expect(await within(item).findByText('Comunicado publicado.')).toBeInTheDocument();
    await usuario.click(within(item).getByRole('button', { name: 'Apagar: Mudança de sala' }));
    await usuario.click(screen.getByRole('button', { name: 'Apagar rascunho' }));
    expect(a.apagar).toHaveBeenCalledWith('c1');
  });

  it('editar o rascunho abre o formulário com os dados e o mesmo id', async () => {
    const usuario = userEvent.setup();
    const a = acoes();
    render(<GestaoComunicados comunicados={[base]} perfil="docente" turmas={turmas} acoes={a} />);
    await usuario.click(screen.getByRole('button', { name: 'Editar: Mudança de sala' }));
    expect(screen.getByLabelText('Título')).toHaveValue('Mudança de sala');
    await usuario.click(screen.getByRole('button', { name: 'Guardar rascunho' }));
    await screen.findByText('Rascunho guardado.');
    expect(vi.mocked(a.salvar).mock.calls[0]?.[1]).toBe('c1');
  });

  it('publicado: corrigir com justificativa avisa o público de novo (US3)', async () => {
    const usuario = userEvent.setup();
    let concluir!: () => void;
    const a = acoes({ corrigir: vi.fn(() => new Promise<void>((r) => (concluir = r))) });
    const { container } = render(
      <GestaoComunicados
        comunicados={[publicado]}
        perfil="coordenacao"
        turmas={turmas}
        acoes={a}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Corrigir: Aviso geral' }));
    const texto = screen.getByLabelText('Texto');
    await usuario.clear(texto);
    await usuario.type(texto, 'Texto corrigido.');
    await usuario.type(screen.getByLabelText('Justificativa'), 'curta');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    expect(a.corrigir).not.toHaveBeenCalled();
    await usuario.type(screen.getByLabelText('Justificativa'), ' — data trocada.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(a.corrigir).toHaveBeenCalledWith(
      'c2',
      'Aviso geral',
      'Texto corrigido.',
      'curta — data trocada.',
    );
    expect(screen.queryByText(/público foi avisado de novo/)).not.toBeInTheDocument();
    concluir();
    expect(
      await screen.findByText('Comunicado corrigido; o público foi avisado de novo.'),
    ).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('publicado: retirar com justificativa; retirado mostra o motivo e não tem ações', async () => {
    const usuario = userEvent.setup();
    const a = acoes();
    const { rerender } = render(
      <GestaoComunicados
        comunicados={[publicado]}
        perfil="coordenacao"
        turmas={turmas}
        acoes={a}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Retirar: Aviso geral' }));
    await usuario.type(screen.getByLabelText('Justificativa da retirada'), 'Publicado por engano.');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar retirada' }));
    expect(a.retirar).toHaveBeenCalledWith('c2', 'Publicado por engano.');
    expect(await screen.findByText('Comunicado retirado.')).toBeInTheDocument();
    rerender(
      <GestaoComunicados
        comunicados={[
          {
            ...publicado,
            estado: 'retirado',
            retiradoEm: '2026-11-03T10:00:00Z',
            justificativaRetirada: 'Publicado por engano.',
            podeEditar: false,
          },
        ]}
        perfil="coordenacao"
        turmas={turmas}
        acoes={a}
      />,
    );
    const item = screen.getByRole('article', { name: 'Aviso geral' });
    expect(within(item).getByText('Retirado')).toBeInTheDocument();
    expect(within(item).getByText('Publicado por engano.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Corrigir:|Retirar:/ })).not.toBeInTheDocument();
  });

  it('sem podeEditar ou com bloqueio, as ações de escrita não aparecem ou ficam desabilitadas', () => {
    const { rerender } = render(
      <GestaoComunicados
        comunicados={[{ ...base, podeEditar: false }]}
        perfil="coordenacao"
        turmas={turmas}
        acoes={acoes()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Publicar:/ })).not.toBeInTheDocument();
    rerender(
      <GestaoComunicados
        comunicados={[base]}
        perfil="coordenacao"
        turmas={turmas}
        acoes={acoes()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Publicar: Mudança de sala' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Novo comunicado' })).toBeDisabled();
  });
});
