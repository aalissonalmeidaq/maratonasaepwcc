import { beforeEach, describe, expect, it, vi } from 'vitest';
import { regulamentoPublicoFixture as fixture } from '@/test/fixtures/regulamentoPublico';
import { lerRegulamento } from './lerRegulamento';
import { salvarCopia } from './copiaLocal';
describe('leitura pública (FR-006/006a)', () => {
  beforeEach(() => localStorage.clear());
  it('usa cópia offline e não tenta acessar o servidor', async () => {
    salvarCopia('c', fixture);
    const repo = { regulamentoPublico: vi.fn() };
    expect((await lerRegulamento(repo, 'c', false)).origem).toBe('copia');
    expect(repo.regulamentoPublico).not.toHaveBeenCalled();
  });
  it('mantém conteúdo online quando a gravação falha', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError');
    });
    expect(await lerRegulamento({ regulamentoPublico: async () => fixture }, 'c', true)).toEqual({
      origem: 'servidor',
      conteudo: fixture,
      persistencia: 'falhou',
    });
  });
  it('uma falha de rede usa cópia e erro HTTP não é mascarado', async () => {
    salvarCopia('c', fixture);
    expect(
      (
        await lerRegulamento(
          {
            regulamentoPublico: async () => {
              throw new TypeError('fetch');
            },
          },
          'c',
          true,
        )
      ).origem,
    ).toBe('copia');
    await expect(
      lerRegulamento(
        {
          regulamentoPublico: async () => {
            throw new Error('HTTP 500');
          },
        },
        'c',
        true,
      ),
    ).rejects.toThrow('HTTP 500');
  });
  it('sem cópia informa estado próprio', async () => {
    expect(await lerRegulamento({ regulamentoPublico: vi.fn() }, 'c', false)).toEqual({
      origem: 'sem-copia',
    });
  });
});
