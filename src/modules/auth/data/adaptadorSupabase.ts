import type { SupabaseClient } from '@supabase/supabase-js';
import type { Papel } from '@/modules/acesso';
import { ErroDeAutenticacao, type AdaptadorAuth, type Sessao } from '../domain/sessao';

/**
 * Autenticação real via Supabase Auth (e-mail e senha, contas criadas pela coordenação).
 * Papéis vêm da tabela `atribuicoes`; a RLS só devolve as linhas da própria pessoa.
 */
export function criarAdaptadorSupabase(supabase: SupabaseClient): AdaptadorAuth {
  async function montarSessao(usuarioId: string): Promise<Sessao> {
    const [perfil, atribuicoes] = await Promise.all([
      supabase.from('perfis').select('nome').eq('id', usuarioId).maybeSingle(),
      supabase.from('atribuicoes').select('papel').eq('usuario_id', usuarioId).eq('ativo', true),
    ]);
    if (perfil.error || atribuicoes.error) {
      throw new ErroDeAutenticacao('Não foi possível carregar o seu perfil. Tente novamente.');
    }
    const papeis = [...new Set((atribuicoes.data ?? []).map((a) => a.papel as Papel))];
    return {
      usuarioId,
      nome: (perfil.data?.nome as string | undefined) ?? 'Pessoa usuária',
      papeis,
      demo: false,
    };
  }

  return {
    async sessaoAtual() {
      const { data } = await supabase.auth.getSession();
      return data.session ? montarSessao(data.session.user.id) : null;
    },
    async entrar({ email, senha }) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error || !data.user) throw new ErroDeAutenticacao('E-mail ou senha incorretos.');
      return montarSessao(data.user.id);
    },
    async sair() {
      await supabase.auth.signOut();
    },
    aoMudar(callback) {
      const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
        if (!sessao) callback(null);
        else void montarSessao(sessao.user.id).then(callback, () => callback(null));
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
