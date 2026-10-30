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

  it('em fundo claro usa o arquivo colorido fornecido', () => {
    render(<MarcaSenai fundo="claro" />);
    expect(screen.getByRole('img', { name: 'SENAI Ceará' })).toHaveAttribute(
      'src',
      '/brand/senai-ceara-colorido.svg',
    );
  });
});
