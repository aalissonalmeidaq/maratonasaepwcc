import { ErroDeAutenticacao, type AdaptadorAuth, type Sessao } from '../domain/sessao';

export interface ContaDemo {
  usuarioId: string;
  nome: string;
  papeis: Sessao['papeis'];
}

const CHAVE = 'maratona-demo-conta';

function lerContaSalva(): string | null {
  try {
    return sessionStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

/**
 * Adaptador de DEMONSTRAÇÃO. Não autentica ninguém: apenas escolhe uma conta fictícia.
 * Nunca deve ser usado com dados reais (ver ADR 0004).
 */
export function criarAdaptadorDemo(contas: ContaDemo[]) {
  const ouvintes = new Set<(s: Sessao | null) => void>();
  const paraSessao = (c: ContaDemo): Sessao => ({ ...c, papeis: [...c.papeis], demo: true });
  const avisar = (s: Sessao | null) => ouvintes.forEach((o) => o(s));

  const adaptador: AdaptadorAuth & { entrarComo(usuarioId: string): Promise<Sessao> } = {
    async sessaoAtual() {
      const id = lerContaSalva();
      const conta = contas.find((c) => c.usuarioId === id);
      return conta ? paraSessao(conta) : null;
    },
    async entrar() {
      throw new ErroDeAutenticacao(
        'No modo demonstração não há login com senha. Escolha um perfil fictício.',
      );
    },
    async entrarComo(usuarioId) {
      const conta = contas.find((c) => c.usuarioId === usuarioId);
      if (!conta) throw new ErroDeAutenticacao('Perfil de demonstração não encontrado.');
      try {
        sessionStorage.setItem(CHAVE, usuarioId);
      } catch {
        // Sem armazenamento disponível: a sessão vale só enquanto a página estiver aberta.
      }
      const sessao = paraSessao(conta);
      avisar(sessao);
      return sessao;
    },
    async sair() {
      try {
        sessionStorage.removeItem(CHAVE);
      } catch {
        // ignora
      }
      avisar(null);
    },
    aoMudar(callback) {
      ouvintes.add(callback);
      return () => ouvintes.delete(callback);
    },
  };
  return adaptador;
}
