import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { criarRepositorioResultadoSupabase } from './repositorioSupabase';

function clienteFalso({
  upload = { error: null as null | { message: string } },
  rpc = { data: {} as unknown, error: null as unknown },
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

const pdf = new File(['%PDF'], 'Evidência.PDF', { type: 'application/pdf' });
const ocorrencia = {
  chave: 'k1',
  edicaoId: 'ed',
  encontroId: 'en1',
  duplaId: 'e1',
  tipo: 'uso_nao_autorizado',
  fato: 'Uso de IA sem registro na entrega.',
  evidencia: 'Relato do docente.',
};

describe('repositório Supabase do resultado — ocorrência com evidência (R9)', () => {
  it('envia a evidência à pasta da equipe e só então registra a ocorrência', async () => {
    const { sb, enviar, chamar, from } = clienteFalso({
      rpc: { data: { id: 'o1', prazoManifestacao: '2026-11-02T12:00:00Z' }, error: null },
    });
    const r = await criarRepositorioResultadoSupabase(sb).registrarOcorrencia({
      ...ocorrencia,
      arquivo: pdf,
    });
    expect(from).toHaveBeenCalledWith('evidencias');
    expect(enviar).toHaveBeenCalledWith('ed/e1/k1.pdf', pdf, {
      contentType: 'application/pdf',
      upsert: false,
    });
    expect(chamar).toHaveBeenCalledWith('registrar_ocorrencia', {
      p_chave: 'k1',
      p_encontro: 'en1',
      p_dupla: 'e1',
      p_tipo: 'uso_nao_autorizado',
      p_fato: 'Uso de IA sem registro na entrega.',
      p_evidencia: 'Relato do docente.',
      p_desafio: null,
      p_fato_chave: null,
      p_evidencia_path: 'ed/e1/k1.pdf',
      p_evidencia_nome: 'Evidência.PDF',
    });
    expect(enviar.mock.invocationCallOrder[0]).toBeLessThan(chamar.mock.invocationCallOrder[0]!);
    expect(r).toEqual({ id: 'o1', prazoManifestacao: '2026-11-02T12:00:00Z' });
  });

  it('falha no upload: nada é registrado', async () => {
    const { sb, chamar } = clienteFalso({ upload: { error: { message: 'Network error' } } });
    await expect(
      criarRepositorioResultadoSupabase(sb).registrarOcorrencia({ ...ocorrencia, arquivo: pdf }),
    ).rejects.toBeTruthy();
    expect(chamar).not.toHaveBeenCalled();
  });

  it('repetição da mesma tentativa reaproveita o objeto já enviado', async () => {
    const { sb, chamar } = clienteFalso({
      upload: { error: { message: 'The resource already exists' } },
      rpc: { data: { id: 'o1', prazoManifestacao: 'x' }, error: null },
    });
    await criarRepositorioResultadoSupabase(sb).registrarOcorrencia({
      ...ocorrencia,
      arquivo: pdf,
    });
    expect(chamar).toHaveBeenCalledOnce();
  });

  it('sem arquivo: registra só o texto da evidência', async () => {
    const { sb, enviar, chamar } = clienteFalso({
      rpc: { data: { id: 'o1', prazoManifestacao: 'x' }, error: null },
    });
    await criarRepositorioResultadoSupabase(sb).registrarOcorrencia(ocorrencia);
    expect(enviar).not.toHaveBeenCalled();
    expect(chamar.mock.calls[0]![1]).toMatchObject({
      p_evidencia_path: null,
      p_evidencia_nome: null,
    });
  });
});

describe('repositório Supabase do resultado — RPCs e erros', () => {
  it('tipos de ocorrência vêm das regras da edição (FR-006)', async () => {
    const tipos = [{ id: 'reincidencia', rotulo: 'Reincidência', pontos: 2 }];
    const single = vi
      .fn()
      .mockResolvedValue({ data: { regras: { penalidades: { tipos } } }, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient;
    expect(await criarRepositorioResultadoSupabase(sb).tiposDeOcorrencia('ed')).toEqual(tipos);
    expect(select).toHaveBeenCalledWith('regras');
    expect(eq).toHaveBeenCalledWith('id', 'ed');
  });

  it('recusa do servidor vira mensagem em português; nada é dado como concluído', async () => {
    const { sb } = clienteFalso({
      rpc: {
        data: null,
        error: { code: '23514', message: 'O prazo de manifestação ainda está aberto.' },
      },
    });
    await expect(
      criarRepositorioResultadoSupabase(sb).decidirOcorrencia({
        ocorrenciaId: 'o1',
        resultado: 'confirmada',
        justificativa: 'Fato comprovado pela evidência.',
        apresentacaoDependente: false,
      }),
    ).rejects.toThrow('O prazo de manifestação ainda está aberto.');
  });

  it('ranking sem publicação devolve nulo', async () => {
    const { sb } = clienteFalso({ rpc: { data: null, error: null } });
    expect(await criarRepositorioResultadoSupabase(sb).rankingPublicado('ed', null)).toBeNull();
  });

  it('pedido de revisão e correção ligada usam os nomes do contrato', async () => {
    const { sb, chamar } = clienteFalso({
      rpc: { data: { id: 'r1', criadoEm: 'x' }, error: null },
    });
    const repo = criarRepositorioResultadoSupabase(sb);
    await repo.pedirRevisao({
      chave: 'k2',
      objeto: 'publicacao',
      publicacaoId: 'p1',
      componente: 'presenca',
      encontroId: 'en1',
      justificativa: 'A presença do encontro 1 não foi registrada.',
    });
    expect(chamar).toHaveBeenCalledWith('pedir_revisao', {
      p_chave: 'k2',
      p_objeto: 'publicacao',
      p_ocorrencia: null,
      p_publicacao: 'p1',
      p_componente: 'presenca',
      p_encontro: 'en1',
      p_justificativa: 'A presença do encontro 1 não foi registrada.',
    });
    await repo.registrarResultadosProva({
      encontroId: 'en4',
      resultados: [
        {
          estudanteId: 'a',
          realizacao: 'confirmada',
          escalaConfirmada: true,
          autorizacaoConfirmada: true,
        },
      ],
      justificativa: 'Correção pedida na revisão.',
      pedidoId: 'r1',
    });
    expect(chamar).toHaveBeenLastCalledWith('registrar_resultados_prova', {
      p_encontro: 'en4',
      p_resultados: [
        {
          estudanteId: 'a',
          realizacao: 'confirmada',
          escalaConfirmada: true,
          autorizacaoConfirmada: true,
        },
      ],
      p_justificativa: 'Correção pedida na revisão.',
      p_pedido: 'r1',
    });
  });

  it('avisos e marcação de lidos', async () => {
    const { sb, chamar } = clienteFalso({ rpc: { data: 2, error: null } });
    expect(await criarRepositorioResultadoSupabase(sb).marcarAvisosLidos(['a1', 'a2'])).toBe(2);
    expect(chamar).toHaveBeenCalledWith('marcar_avisos_lidos', { p_ids: ['a1', 'a2'] });
  });
});

describe('repositório Supabase do resultado — ranking por turma (spec 012)', () => {
  it('publicação em lote envia turmas com a versão base, estado e justificativa', async () => {
    const lote = [
      { turmaId: 't1', turma: 'KA', publicada: true, versao: 2, motivo: null },
      { turmaId: 't2', turma: 'KB', publicada: false, versao: null, motivo: 'Pendências.' },
    ];
    const { sb, chamar } = clienteFalso({ rpc: { data: lote, error: null } });
    const r = await criarRepositorioResultadoSupabase(sb).publicarRankingTurmas({
      edicaoId: 'ed',
      turmas: [
        { turmaId: 't1', versaoBase: 1 },
        { turmaId: 't2', versaoBase: null },
      ],
      estado: 'definitivo',
      justificativa: '  Fechamento das turmas.  ',
    });
    expect(chamar).toHaveBeenCalledWith('publicar_ranking_turmas', {
      p_edicao: 'ed',
      p_turmas: [
        { turmaId: 't1', versaoBase: 1 },
        { turmaId: 't2', versaoBase: null },
      ],
      p_estado: 'definitivo',
      p_justificativa: 'Fechamento das turmas.',
    });
    expect(r).toEqual(lote);
  });

  it('justificativa vazia vai como nula', async () => {
    const { sb, chamar } = clienteFalso({ rpc: { data: [], error: null } });
    await criarRepositorioResultadoSupabase(sb).publicarRankingTurmas({
      edicaoId: 'ed',
      turmas: [{ turmaId: 't1', versaoBase: null }],
      estado: 'parcial',
      justificativa: '   ',
    });
    expect(chamar).toHaveBeenCalledWith(
      'publicar_ranking_turmas',
      expect.objectContaining({ p_justificativa: null }),
    );
  });

  it('leituras por turma e por edição usam os nomes do contrato', async () => {
    const { sb, chamar } = clienteFalso({ rpc: { data: [], error: null } });
    const r = criarRepositorioResultadoSupabase(sb);
    await r.rankingDaEdicao('ed');
    await r.pendenciasRankingTurma('t1');
    await r.historicoPublicacoesTurma('t1');
    await r.publicacoesAnteriores('ed');
    await r.premiacaoDaEdicao('ed');
    expect(chamar.mock.calls).toEqual([
      ['ranking_da_edicao', { p_edicao: 'ed' }],
      ['pendencias_ranking_turma', { p_turma: 't1' }],
      ['historico_publicacoes_turma', { p_turma: 't1' }],
      ['publicacoes_anteriores', { p_edicao: 'ed' }],
      ['premiacao_da_edicao', { p_edicao: 'ed' }],
    ]);
  });

  it('turma sem publicação devolve nulo', async () => {
    const { sb, chamar } = clienteFalso({ rpc: { data: null, error: null } });
    expect(await criarRepositorioResultadoSupabase(sb).rankingDaTurma('t1')).toBeNull();
    expect(chamar).toHaveBeenCalledWith('ranking_da_turma', { p_turma: 't1' });
  });

  it('decisão de empate da premiação usa os nomes do contrato', async () => {
    const { sb, chamar } = clienteFalso({
      rpc: { data: { id: 'dp1', decididoEm: 'agora' }, error: null },
    });
    const r = await criarRepositorioResultadoSupabase(sb).decidirPremiacaoEmpate({
      publicacaoId: 'p1',
      posicao: 1,
      premiadas: ['e1', 'e2'],
      decisao: 'Dividir o prêmio.',
      justificativa: 'Empate após todos os critérios.',
    });
    expect(chamar).toHaveBeenCalledWith('decidir_premiacao_empate', {
      p_publicacao: 'p1',
      p_posicao: 1,
      p_premiadas: ['e1', 'e2'],
      p_decisao: 'Dividir o prêmio.',
      p_justificativa: 'Empate após todos os critérios.',
    });
    expect(r).toEqual({ id: 'dp1', decididoEm: 'agora' });
  });
});
