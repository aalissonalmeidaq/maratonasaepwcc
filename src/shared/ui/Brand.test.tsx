import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarcaSenai } from './Brand';

describe('MarcaSenai', () => {
  it('em fundo escuro usa o arquivo oficial totalmente branco', () => {
    render(<MarcaSenai fundo="escuro" />);
    expect(screen.getByRole('img', { name: 'SENAI Ceará' })).toHaveAttribute(
      'src',
      '/brand/senai-ceara-branco.svg',
    );
  });

  it('em fundo claro mantém a área provisória (versão colorida ainda não fornecida)', () => {
    render(<MarcaSenai fundo="claro" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/arquivo oficial pendente/i)).toBeInTheDocument();
  });
});
