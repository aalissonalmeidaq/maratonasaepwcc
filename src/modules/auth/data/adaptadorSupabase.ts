import type { SupabaseClient } from '@supabase/supabase-js';
import type { FuncaoUnidade, Papel } from '@/modules/acesso';
import { ErroDeAutenticacao, type AdaptadorAuth, type Sessao } from '../domain/sessao';

/**
 * Autenticação real via Supabase Auth (e-mail e senha, contas criadas pela coordenação).
 * Papéis, funções e unidade vêm de `minha_conta()` (spec 016); o servidor só devolve os da própria pessoa.
 */
export function criarAdaptadorSupabase(supabase: SupabaseClient): AdaptadorAuth {
  async function montarSessao(usuarioId: string): Promise<Sessao> {
    // A conta inteira vem de `minha_conta()`: papéis nas edições, funções, unidade e master.
    const { data, error } = await supabase.rpc('minha_conta');
    if (error || !data) {
      throw new ErroDeAutenticacao('Não foi possível carregar o seu perfil. Tente novamente.');
    }
    const conta = data as {
      nome?: string;
      master?: boolean;
      unidade?: { id: string; nome: string; ativa: boolean } | null;
      funcoes?: FuncaoUnidade[];
      papeis?: Papel[];
    };
    return {
      usuarioId,
      nome: conta.nome ?? 'Pessoa usuária',
      papeis: conta.papeis ?? [],
      master: conta.master ?? false,
      funcoes: conta.funcoes ?? [],
      unidade: conta.unidade ?? null,
      demo: false,
    };
  }

  return {
    async sessaoAtual() {
      const { data } = await supabase.auth.getSession();
      return data.session ? montarSessao(data.session.user.id) : null;
    },
    async entrar({ email, senha }) {
      let resultado;
      try {
        resultado = await supabase.auth.signInWithPassword({ email, password: senha });
      } catch {
        throw new ErroDeAutenticacao(
          'Não foi possível conectar. Verifique sua conexão e tente novamente.',
        );
      }
      const { data, error } = resultado;
      if (error) {
        if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
          throw new ErroDeAutenticacao(
            'Não foi possível conectar. Verifique sua conexão e tente novamente.',
          );
        }
        if (error.code === 'invalid_credentials') {
          throw new ErroDeAutenticacao(
            'E-mail ou senha incorretos. Confira os dados e tente novamente.',
          );
        }
        if (error.status === 429 || error.code === 'over_request_rate_limit') {
          throw new ErroDeAutenticacao(
            'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
          );
        }
        throw new ErroDeAutenticacao(
          'O acesso está indisponível no momento. Tente novamente em alguns instantes.',
        );
      }
      if (!data.user)
        throw new ErroDeAutenticacao('Não foi possível concluir o acesso. Tente novamente.');
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
