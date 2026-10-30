import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/modules/auth';
import { criarRepositoriosDemo } from '@/modules/demo';
import { criarRepositorioDuplasSupabase } from '@/modules/duplas';
import { criarRepositorioEncontrosSupabase } from '@/modules/encontros';
import { criarRepositorioOrganizacaoSupabase } from '@/modules/organizacao';
import { criarRepositorioPainelTurmaSupabase } from '@/modules/painel-turma';
import { obterSupabase } from '@/shared/lib/supabase';
import { ContextoRepositorios, type Repositorios } from './useRepositorios';

function criarRepositoriosSupabase(): Repositorios {
  const sb = obterSupabase();
  return {
    somenteLeitura: false,
    organizacao: criarRepositorioOrganizacaoSupabase(sb),
    duplas: criarRepositorioDuplasSupabase(sb),
    encontros: criarRepositorioEncontrosSupabase(sb),
    painelTurma: criarRepositorioPainelTurmaSupabase(sb),
  };
}

function LimparCacheAoTrocarUsuario({ usuarioId }: { usuarioId: string | null }) {
  const cliente = useQueryClient();
  useEffect(() => {
    // Nenhum dado de uma pessoa permanece em memória para a próxima (laboratórios compartilhados).
    return () => cliente.clear();
  }, [usuarioId, cliente]);
  return null;
}

export function ProvedorDeDados({ children }: { children: ReactNode }) {
  const { modo, sessao } = useAuth();
  const usuarioId = sessao?.usuarioId ?? null;
  const [cliente] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
          mutations: { retry: false },
        },
      }),
  );

  const repositorios = useMemo<Repositorios | null>(() => {
    if (modo === 'supabase') return criarRepositoriosSupabase();
    if (modo === 'demo') return criarRepositoriosDemo(() => usuarioId);
    return null;
  }, [modo, usuarioId]);

  return (
    <QueryClientProvider client={cliente}>
      <LimparCacheAoTrocarUsuario usuarioId={usuarioId} />
      <ContextoRepositorios.Provider value={repositorios}>{children}</ContextoRepositorios.Provider>
    </QueryClientProvider>
  );
}
