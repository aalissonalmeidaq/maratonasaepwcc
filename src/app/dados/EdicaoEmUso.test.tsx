import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Edicao } from '@/modules/organizacao';
import { ProvedorEdicaoEmUso } from './EdicaoEmUso';
import { resolverEdicaoEmUso, useEdicaoEmUso } from './edicaoEmUsoContexto';

const edicao = (id: string, estado: Edicao['estado'], inicio: string | null): Edicao => ({
  id,
  nome: id,
  estado,
  inicio,
  fim: null,
  quantidadeEncontros: 4,
  regrasVersao: 'v',
  regras: {},
});
const lista = [edicao('e1', 'ativa', '2026-03-01'), edicao('e2', 'rascunho', null)];

function Mostrar() {
  const { escolhidaId, escolher } = useEdicaoEmUso();
  return (
    <>
      <span>em uso: {resolverEdicaoEmUso(lista, escolhidaId)?.id ?? 'nenhuma'}</span>
      <button onClick={() => escolher('e2')}>escolher e2</button>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('edição em uso (spec 010, US7, FR-019)', () => {
  it('sem escolha, usa a edição padrão; a escolha vale e fica lembrada por usuário', () => {
    const { unmount } = render(
      <ProvedorEdicaoEmUso usuarioId="u1">
        <Mostrar />
      </ProvedorEdicaoEmUso>,
    );
    expect(screen.getByText('em uso: e1')).toBeInTheDocument();
    act(() => screen.getByRole('button').click());
    expect(screen.getByText('em uso: e2')).toBeInTheDocument();
    expect(localStorage.getItem('maratona:edicao:u1')).toBe('e2');
    unmount();
    render(
      <ProvedorEdicaoEmUso usuarioId="u1">
        <Mostrar />
      </ProvedorEdicaoEmUso>,
    );
    expect(screen.getByText('em uso: e2')).toBeInTheDocument();
  });

  it('a escolha de outra pessoa não vale; escolha que deixou de ser visível é descartada', () => {
    localStorage.setItem('maratona:edicao:u1', 'e2');
    localStorage.setItem('maratona:edicao:u2', 'removida');
    render(
      <ProvedorEdicaoEmUso usuarioId="u2">
        <Mostrar />
      </ProvedorEdicaoEmUso>,
    );
    expect(screen.getByText('em uso: e1')).toBeInTheDocument();
    expect(resolverEdicaoEmUso([], 'e1')).toBeNull();
  });

  it('armazenamento indisponível não quebra a escolha', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    render(
      <ProvedorEdicaoEmUso usuarioId="u1">
        <Mostrar />
      </ProvedorEdicaoEmUso>,
    );
    expect(screen.getByText('em uso: e1')).toBeInTheDocument();
    act(() => screen.getByRole('button').click());
    expect(screen.getByText('em uso: e2')).toBeInTheDocument();
  });
});
