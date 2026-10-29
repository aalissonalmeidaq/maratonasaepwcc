import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type { RepositorioDuplas } from '../domain/tipos';

type LinhaIntegrante = {
  estudante_id: string;
  entrada_em: string;
  saida_em: string | null;
  motivo_saida: string | null;
  perfis: { nome: string } | null;
};

const INTEGRANTES =
  'dupla_integrantes(estudante_id, entrada_em, saida_em, motivo_saida, perfis!dupla_integrantes_estudante_id_fkey(nome))';

/** Escrita somente pelas RPCs transacionais do servidor (FR-006). */
export function criarRepositorioDuplasSupabase(sb: SupabaseClient): RepositorioDuplas {
  return {
    async duplas(edicaoId) {
      const dados = verificar(
        await sb
          .from('duplas')
          .select(`id, nome, turma_id, ativa, ${INTEGRANTES}`)
          .eq('edicao_id', edicaoId)
          .order('nome'),
      );
      return dados.map((d) => ({
        id: d.id,
        nome: d.nome,
        turmaId: d.turma_id,
        ativa: d.ativa,
        integrantes: (d.dupla_integrantes as unknown as LinhaIntegrante[])
          .filter((i) => i.saida_em === null)
          .map((i) => ({ estudanteId: i.estudante_id, nome: i.perfis?.nome ?? '—' })),
      }));
    },
    async historico(duplaId) {
      const dados = verificar(
        await sb
          .from('dupla_integrantes')
          .select(
            'estudante_id, entrada_em, saida_em, motivo_saida, perfis!dupla_integrantes_estudante_id_fkey(nome)',
          )
          .eq('dupla_id', duplaId)
          .order('entrada_em'),
      ) as unknown as LinhaIntegrante[];
      return dados.map((i) => ({
        estudanteId: i.estudante_id,
        nome: i.perfis?.nome ?? '—',
        entradaEm: i.entrada_em,
        saidaEm: i.saida_em,
        motivo: i.motivo_saida,
      }));
    },
    async formar({ turmaId, nome, integrantes }) {
      verificarGravacao(
        await sb.rpc('formar_dupla', { p_turma: turmaId, p_nome: nome, p_estudantes: integrantes }),
      );
    },
    async substituir({ duplaId, sai, entra, justificativa }) {
      verificarGravacao(
        await sb.rpc('substituir_integrante', {
          p_dupla: duplaId,
          p_sai: sai,
          p_entra: entra,
          p_justificativa: justificativa,
        }),
      );
    },
    async desfazer({ duplaId, justificativa }) {
      verificarGravacao(
        await sb.rpc('desfazer_dupla', { p_dupla: duplaId, p_justificativa: justificativa }),
      );
    },
  };
}
