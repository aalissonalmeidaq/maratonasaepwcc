import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { ErroDeDados } from '@/shared/dados/erros';
import { criarRepositorioPremissasSupabase } from './repositorioSupabase';

function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { sb: { rpc } as unknown as SupabaseClient, rpc };
}

describe('repositório Supabase das premissas (spec 015)', () => {
  it('lê o catálogo pela RPC do contrato', async () => {
    const catalogo = { podeResponder: false, premissas: [] };
    const { sb, rpc } = clienteFalso({ data: catalogo, error: null });
    expect(await criarRepositorioPremissasSupabase(sb).premissas()).toEqual(catalogo);
    expect(rpc).toHaveBeenCalledWith('premissas_em_validacao');
  });

  it('recusa do servidor vira ErroDeDados com a mensagem pronta', async () => {
    const { sb } = clienteFalso({
      data: null,
      error: {
        code: '42501',
        message: 'Somente coordenação, docentes e mentores consultam as premissas.',
      },
    });
    const erro = await criarRepositorioPremissasSupabase(sb)
      .premissas()
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDeDados);
    expect((erro as Error).message).toBe(
      'Somente coordenação, docentes e mentores consultam as premissas.',
    );
  });

  it('responder envia a decisão, a justificativa sem espaços nas pontas e a resposta-base', async () => {
    const nova = {
      id: 'r9',
      decisao: 'confirmada',
      justificativa: 'Ok.',
      autorNome: 'C',
      registradoEm: 'x',
    };
    const { sb, rpc } = clienteFalso({ data: nova, error: null });
    const r = await criarRepositorioPremissasSupabase(sb).responder({
      codigo: 'P09',
      decisao: 'confirmada',
      justificativa: '  Conferido com o regulamento.  ',
      respostaBase: null,
    });
    expect(r).toEqual(nova);
    expect(rpc).toHaveBeenCalledWith('responder_premissa', {
      p_codigo: 'P09',
      p_decisao: 'confirmada',
      p_justificativa: 'Conferido com o regulamento.',
      p_resposta_base: null,
    });
  });
});
