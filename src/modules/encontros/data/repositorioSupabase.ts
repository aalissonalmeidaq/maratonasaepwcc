import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type { RepositorioEncontros } from '../domain/tipos';

/** "13:30:00" → "13:30" */
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export function criarRepositorioEncontrosSupabase(sb: SupabaseClient): RepositorioEncontros {
  return {
    async ambientes(edicaoId) {
      return verificar(
        await sb
          .from('ambientes')
          .select('id, nome, observacoes')
          .eq('edicao_id', edicaoId)
          .order('nome'),
      );
    },
    async salvarAmbiente(edicaoId, { id, nome, observacoes }) {
      const linha = {
        edicao_id: edicaoId,
        nome: nome.trim(),
        observacoes: observacoes?.trim() || null,
      };
      if (id) {
        verificar(await sb.from('ambientes').update(linha).eq('id', id).select('id').single());
      } else {
        verificarGravacao(await sb.from('ambientes').insert(linha));
      }
    },
    async removerAmbiente(id) {
      verificarGravacao(await sb.from('ambientes').delete().eq('id', id));
    },
    async encontros(edicaoId) {
      const dados = verificar(
        await sb
          .from('encontros')
          .select(
            'id, numero, titulo, data, inicio, fim, ambiente_id, avaliacao_objetiva, orientacoes, estado, ambientes(nome)',
          )
          .eq('edicao_id', edicaoId)
          .order('numero'),
      );
      return dados.map((e) => ({
        id: e.id,
        numero: e.numero,
        titulo: e.titulo,
        data: e.data,
        inicio: hhmm(e.inicio),
        fim: hhmm(e.fim),
        ambienteId: e.ambiente_id,
        ambienteNome: (e.ambientes as unknown as { nome: string } | null)?.nome ?? null,
        avaliacaoObjetiva: e.avaliacao_objetiva,
        orientacoes: e.orientacoes,
        estado: e.estado,
      }));
    },
    async salvarEncontro(edicaoId, d) {
      const linha = {
        edicao_id: edicaoId,
        numero: d.numero,
        titulo: d.titulo.trim(),
        data: d.data,
        inicio: d.inicio || null,
        fim: d.fim || null,
        ambiente_id: d.ambienteId || null,
        avaliacao_objetiva: d.avaliacaoObjetiva,
        orientacoes: d.orientacoes?.trim() || null,
        estado: d.estado,
      };
      verificarGravacao(
        d.id
          ? await sb.from('encontros').update(linha).eq('id', d.id)
          : await sb.from('encontros').insert(linha),
      );
    },
    async removerEncontro(id) {
      verificarGravacao(await sb.from('encontros').delete().eq('id', id));
    },
  };
}
