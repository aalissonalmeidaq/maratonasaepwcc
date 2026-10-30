import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type { ConviteEquipe, EquipeGestao, RepositorioDuplas } from '../domain/tipos';

type LinhaIntegrante = {
  estudante_id: string;
  entrada_em: string;
  saida_em: string | null;
  motivo_saida: string | null;
  perfis: { nome: string } | null;
};

type LinhaConvite = {
  id: string;
  tipo: ConviteEquipe['tipo'];
  situacao: ConviteEquipe['situacao'];
  motivo: string | null;
  remetente_id: string;
  remetente_nome: string;
  convidados: ConviteEquipe['convidados'] | null;
  criado_em: string;
  encerrado_em: string | null;
  sou_remetente: boolean;
};

type LinhaGestao = {
  id: string;
  turma_id: string;
  nome: string | null;
  ativa: boolean;
  integrantes: EquipeGestao['integrantes'];
  trio_em_turma_par: boolean;
};

const INTEGRANTES =
  'dupla_integrantes(estudante_id, entrada_em, saida_em, motivo_saida, perfis!dupla_integrantes_estudante_id_fkey(nome))';

/** Escrita somente pelas RPCs transacionais do servidor (specs 002 e 003). */
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
    async colegas(turmaId) {
      const dados = verificar(await sb.rpc('colegas_da_turma', { p_turma: turmaId })) as {
        id: string;
        nome: string;
        tem_equipe: boolean;
      }[];
      return dados.map((c) => ({ id: c.id, nome: c.nome, temEquipe: c.tem_equipe }));
    },
    async convites(edicaoId) {
      const dados = verificar(
        await sb.rpc('meus_convites_equipe', { p_edicao: edicaoId }),
      ) as LinhaConvite[];
      return dados.map((c) => ({
        id: c.id,
        tipo: c.tipo,
        situacao: c.situacao,
        motivo: c.motivo,
        remetenteId: c.remetente_id,
        remetenteNome: c.remetente_nome,
        convidados: c.convidados ?? [],
        criadoEm: c.criado_em,
        encerradoEm: c.encerrado_em,
        souRemetente: c.sou_remetente,
      }));
    },
    async enviarConvite({ turmaId, convidados }) {
      verificarGravacao(
        await sb.rpc('enviar_convite_equipe', { p_turma: turmaId, p_convidados: convidados }),
      );
    },
    async responderConvite({ conviteId, aceitar }) {
      verificarGravacao(
        await sb.rpc('responder_convite_equipe', { p_convite: conviteId, p_aceitar: aceitar }),
      );
    },
    async cancelarConvite(conviteId) {
      verificarGravacao(await sb.rpc('cancelar_convite_equipe', { p_convite: conviteId }));
    },
    async retirarAceite(conviteId) {
      verificarGravacao(await sb.rpc('retirar_aceite_convite_equipe', { p_convite: conviteId }));
    },
    async permiteTrio(turmaId) {
      return Boolean(verificar(await sb.rpc('turma_permite_trio', { p_turma: turmaId })));
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
    async incluir({ duplaId, estudante, justificativa }) {
      verificarGravacao(
        await sb.rpc('incluir_integrante', {
          p_dupla: duplaId,
          p_estudante: estudante,
          p_justificativa: justificativa,
        }),
      );
    },
    async remover({ duplaId, estudante, justificativa }) {
      verificarGravacao(
        await sb.rpc('remover_integrante', {
          p_dupla: duplaId,
          p_estudante: estudante,
          p_justificativa: justificativa,
        }),
      );
    },
    async formarPorDocente({ turmaId, estudantes, justificativa }) {
      verificarGravacao(
        await sb.rpc('formar_equipe_docente', {
          p_turma: turmaId,
          p_estudantes: estudantes,
          p_justificativa: justificativa,
        }),
      );
    },
    async equipesGestao(turmaId) {
      const dados = verificar(
        await sb.rpc('equipes_da_turma_gestao', { p_turma: turmaId }),
      ) as LinhaGestao[];
      return dados.map((e) => ({
        id: e.id,
        turmaId: e.turma_id,
        nome: e.nome,
        ativa: e.ativa,
        integrantes: e.integrantes,
        trioEmTurmaPar: e.trio_em_turma_par,
      }));
    },
    async definirNome({ duplaId, nome }) {
      verificarGravacao(await sb.rpc('definir_nome_equipe', { p_dupla: duplaId, p_nome: nome }));
    },
    async renomear({ duplaId, nome, justificativa }) {
      verificarGravacao(
        await sb.rpc('renomear_equipe', {
          p_dupla: duplaId,
          p_nome: nome,
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
