// Módulo 1 — autenticação e usuários (API pública).
export { criarAdaptadorDemo, type ContaDemo } from './data/adaptadorDemo';
export { criarAdaptadorSupabase } from './data/adaptadorSupabase';
export {
  ErroDeAutenticacao,
  type AdaptadorAuth,
  type Credenciais,
  type Sessao,
} from './domain/sessao';
export { AuthContext, useAuth, type ValorAuth } from './ui/AuthContext';
export { AuthProvider } from './ui/AuthProvider';
export { CAMINHO_DO_DESTINO } from './ui/caminhos';
export { RedirecionarParaPainel, RotaProtegida } from './ui/RotaProtegida';
export { PaginaDeAcesso, PrimeiroAcessoPage } from './ui/PrimeiroAcessoPage';
export { EsqueciSenhaPage, RedefinirSenhaPage } from './ui/RecuperacaoDeSenha';
