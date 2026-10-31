import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { criarRepositorioAtividadesSupabase } from './repositorioSupabase';

const COMPROVANTE = {
  protocolo: 'ENT-20261105-ABC123',
  recebidaEm: '2026-11-05T19:30:00Z',
  versao: 1,
  atrasoMinutos: 0,
  descontoPrevisto: 0,
};

function clienteFalso({
  upload = { error: null as null | { message: string } },
  rpc = { data: COMPROVANTE as unknown, error: null as unknown },
} = {}) {
  const enviar = vi.fn().mockResolvedValue(upload);
  const assinar = vi
    .fn()
    .mockResolvedValue({ data: { signedUrl: 'https://assinada' }, error: null });
  const chamar = vi.fn().mockResolvedValue(rpc);
  const from = vi.fn(() => ({ upload: enviar, createSignedUrl: assinar }));
  const sb = { rpc: chamar, storage: { from } } as unknown as SupabaseClient;
  return { sb, enviar, chamar, from, assinar };
}

const arquivo = new File(['%PDF'], 'Trabalho Final.PDF', { type: 'application/pdf' });

describe('repositório Supabase de atividades — envio da entrega (FR-003/004, R1)', () => {
  it('envia o arquivo à pasta da equipe e só então registra a entrega', async () => {
    const { sb, enviar, chamar, from } = clienteFalso();
    const comprovante = await criarRepositorioAtividadesSupabase(sb).enviarEntrega({
      desafioId: 'd1',
      duplaId: 'e1',
      chave: 'k1',
      arquivo,
    });
    expect(from).toHaveBeenCalledWith('entregas');
    expect(enviar).toHaveBeenCalledWith('d1/e1/k1.pdf', arquivo, {
      contentType: 'application/pdf',
      upsert: false,
    });
    expect(chamar).toHaveBeenCalledWith('registrar_entrega', {
      p_desafio: 'd1',
      p_chave: 'k1',
      p_arquivo: 'd1/e1/k1.pdf',
      p_arquivo_nome: 'Trabalho Final.PDF',
      p_link: null,
    });
    expect(enviar.mock.invocationCallOrder[0]).toBeLessThan(chamar.mock.invocationCallOrder[0]!);
    expect(comprovante).toEqual(COMPROVANTE);
  });

  it('falha no upload: nada é registrado', async () => {
    const { sb, chamar } = clienteFalso({ upload: { error: { message: 'Network error' } } });
    await expect(
      criarRepositorioAtividadesSupabase(sb).enviarEntrega({
        desafioId: 'd1',
        duplaId: 'e1',
        chave: 'k1',
        arquivo,
      }),
    ).rejects.toBeTruthy();
    expect(chamar).not.toHaveBeenCalled();
  });

  it('repetição da mesma tentativa: arquivo já existente segue para o registro', async () => {
    const { sb, chamar } = clienteFalso({
      upload: { error: { message: 'The resource already exists' } },
    });
    await criarRepositorioAtividadesSupabase(sb).enviarEntrega({
      desafioId: 'd1',
      duplaId: 'e1',
      chave: 'k1',
      arquivo,
    });
    expect(chamar).toHaveBeenCalledOnce();
  });

  it('erro do servidor no registro: propaga e não devolve comprovante', async () => {
    const { sb } = clienteFalso({
      rpc: {
        data: null,
        error: {
          code: '23514',
          message: 'O prazo de entrega terminou e a entrega não é mais aceita.',
        },
      },
    });
    await expect(
      criarRepositorioAtividadesSupabase(sb).enviarEntrega({
        desafioId: 'd1',
        duplaId: 'e1',
        chave: 'k1',
        link: 'https://a.b',
      }),
    ).rejects.toThrow('O prazo de entrega terminou e a entrega não é mais aceita.');
  });

  it('link: sem upload, só o registro', async () => {
    const { sb, enviar, chamar } = clienteFalso();
    await criarRepositorioAtividadesSupabase(sb).enviarEntrega({
      desafioId: 'd1',
      duplaId: 'e1',
      chave: 'k2',
      link: ' https://exemplo.invalid/x ',
    });
    expect(enviar).not.toHaveBeenCalled();
    expect(chamar).toHaveBeenCalledWith(
      'registrar_entrega',
      expect.objectContaining({ p_link: 'https://exemplo.invalid/x', p_arquivo: null }),
    );
  });

  it('link assinado curto para baixar o arquivo', async () => {
    const { sb, assinar } = clienteFalso();
    expect(await criarRepositorioAtividadesSupabase(sb).urlArquivo('d1/e1/k1.pdf')).toBe(
      'https://assinada',
    );
    expect(assinar).toHaveBeenCalledWith('d1/e1/k1.pdf', 300);
  });
});
