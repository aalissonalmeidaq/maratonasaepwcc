import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type {
  EdicaoDaUnidade,
  MasterDaRede,
  MembroDaUnidade,
  PedidoDeContaDaRede,
  RepositorioRede,
  ResultadoDaConta,
  Unidade,
} from '../domain/tipos';

/** Chama a Edge Function e transforma a recusa em erro com a mensagem pronta do servidor. */
async function invocar(sb: SupabaseClient, corpo: object, padrao: string): Promise<unknown> {
  const { data, error } = await sb.functions.invoke('contas-da-rede', { body: corpo });
  if (!error) return data;
  const resposta = await (error as { context?: { json?: () => Promise<unknown> } }).context
    ?.json?.()
    .catch(() => null);
  throw new Error((resposta as { erro?: string } | null)?.erro ?? padrao);
}

/**
 * Repositório Supabase da rede: uma RPC por operação (contracts/rpc.md) e a Edge Function
 * `contas-da-rede` para criar contas por convite. Permissão e regras ficam no servidor; nada é
 * dado como feito antes da resposta.
 */
export function criarRepositorioRedeSupabase(sb: SupabaseClient): RepositorioRede {
  const texto = (t: string | null) => (t === null ? null : t.trim());
  return {
    async unidades() {
      return verificar(await sb.rpc('unidades_da_rede')) as Unidade[];
    },
    async masters() {
      return verificar(await sb.rpc('masters_da_rede')) as MasterDaRede[];
    },
    async cadastrarUnidade(chave, nome) {
      return verificar(
        await sb.rpc('cadastrar_unidade', { p_chave: chave, p_nome: nome.trim() }),
      ) as string;
    },
    async renomearUnidade(id, nome) {
      verificarGravacao(await sb.rpc('renomear_unidade', { p_id: id, p_nome: nome.trim() }));
    },
    async definirSituacaoUnidade(id, ativa, justificativa) {
      verificarGravacao(
        await sb.rpc('definir_situacao_unidade', {
          p_id: id,
          p_ativa: ativa,
          p_justificativa: texto(justificativa),
        }),
      );
    },
    async definirGestao(usuarioId, ativa, justificativa) {
      verificarGravacao(
        await sb.rpc('definir_gestao', {
          p_usuario: usuarioId,
          p_ativa: ativa,
          p_justificativa: texto(justificativa),
        }),
      );
    },
    async definirMaster(usuarioId, ativo, justificativa) {
      verificarGravacao(
        await sb.rpc('definir_master', {
          p_usuario: usuarioId,
          p_ativo: ativo,
          p_justificativa: texto(justificativa),
        }),
      );
    },
    async criarConta(pedido: PedidoDeContaDaRede) {
      const dados = (await invocar(
        sb,
        pedido,
        'Não foi possível criar a conta.',
      )) as ResultadoDaConta;
      return { usuarioId: dados.usuarioId, conviteEnviado: Boolean(dados.conviteEnviado) };
    },
    async equipe() {
      return verificar(await sb.rpc('equipe_da_unidade')) as MembroDaUnidade[];
    },
    async definirFuncoes(usuarioId, funcoes, justificativa) {
      verificarGravacao(
        await sb.rpc('definir_funcoes', {
          p_usuario: usuarioId,
          p_funcoes: funcoes,
          p_justificativa: justificativa.trim(),
        }),
      );
    },
    async desativarMembro(usuarioId, justificativa) {
      verificarGravacao(
        await sb.rpc('desativar_membro', {
          p_usuario: usuarioId,
          p_justificativa: justificativa.trim(),
        }),
      );
    },
    async reativarMembro(usuarioId) {
      verificarGravacao(await sb.rpc('reativar_membro', { p_usuario: usuarioId }));
    },
    async edicoes() {
      return verificar(await sb.rpc('edicoes_da_unidade')) as EdicaoDaUnidade[];
    },
    async criarEdicao(dados) {
      return verificar(
        await sb.rpc('criar_edicao', {
          p_chave: dados.chave,
          p_nome: dados.nome.trim(),
          p_inicio: dados.inicio,
          p_fim: dados.fim,
          p_base_edicao: null,
          p_coordenacao: dados.coordenacaoId,
        }),
      ) as string;
    },
    async definirCoordenacao(edicaoId, usuarioId, ativa, justificativa) {
      verificarGravacao(
        await sb.rpc('definir_coordenacao_da_edicao', {
          p_edicao: edicaoId,
          p_usuario: usuarioId,
          p_ativa: ativa,
          p_justificativa: texto(justificativa),
        }),
      );
    },
    async reenviarConvite(usuarioId, novoEmail = null) {
      const dados = (await invocar(
        sb,
        { acao: 'reenviar', usuarioId, novoEmail },
        'Não foi possível reenviar o convite.',
      )) as { conviteEnviado?: boolean };
      return { conviteEnviado: Boolean(dados.conviteEnviado) };
    },
  };
}
