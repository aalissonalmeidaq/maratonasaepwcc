import { createContext, useContext } from 'react';
import type { ModoAmbiente } from '@/shared/lib/env';
import type { Credenciais, Sessao } from '../domain/sessao';

export interface ValorAuth {
  modo: ModoAmbiente;
  carregando: boolean;
  sessao: Sessao | null;
  entrar: (credenciais: Credenciais) => Promise<void>;
  /** Disponível apenas no modo demonstração. */
  entrarDemo: ((usuarioId: string) => Promise<void>) | null;
  sair: () => Promise<void>;
}

export const AuthContext = createContext<ValorAuth | null>(null);

export function useAuth(): ValorAuth {
  const valor = useContext(AuthContext);
  if (!valor) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return valor;
}
