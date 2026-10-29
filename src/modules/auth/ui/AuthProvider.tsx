import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ModoAmbiente } from '@/shared/lib/env';
import type { AdaptadorAuth, Sessao } from '../domain/sessao';
import { AuthContext, type ValorAuth } from './AuthContext';

interface AuthProviderProps {
  modo: ModoAmbiente;
  adaptador: AdaptadorAuth | null;
  entrarComo?: (usuarioId: string) => Promise<Sessao>;
  children: ReactNode;
}

export function AuthProvider({ modo, adaptador, entrarComo, children }: AuthProviderProps) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(adaptador !== null);

  useEffect(() => {
    if (!adaptador) return;
    let ativo = true;
    adaptador
      .sessaoAtual()
      .then((s) => ativo && setSessao(s))
      .catch(() => ativo && setSessao(null))
      .finally(() => ativo && setCarregando(false));
    const cancelar = adaptador.aoMudar((s) => setSessao(s));
    return () => {
      ativo = false;
      cancelar();
    };
  }, [adaptador]);

  const valor = useMemo<ValorAuth>(
    () => ({
      modo,
      carregando,
      sessao,
      entrar: async (credenciais) => {
        if (!adaptador) throw new Error('Autenticação não configurada.');
        setSessao(await adaptador.entrar(credenciais));
      },
      entrarDemo: entrarComo
        ? async (usuarioId) => {
            setSessao(await entrarComo(usuarioId));
          }
        : null,
      sair: async () => {
        await adaptador?.sair();
        setSessao(null);
      },
    }),
    [modo, carregando, sessao, adaptador, entrarComo],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
