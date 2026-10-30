import { createContext, useContext } from 'react';
import type { RepositorioDuplas } from '@/modules/duplas';
import type { RepositorioEncontros } from '@/modules/encontros';
import type { RepositorioOrganizacao } from '@/modules/organizacao';
import type { RepositorioPainelTurma } from '@/modules/painel-turma';

export interface Repositorios {
  somenteLeitura: boolean;
  organizacao: RepositorioOrganizacao;
  duplas: RepositorioDuplas;
  encontros: RepositorioEncontros;
  painelTurma: RepositorioPainelTurma;
}

export const ContextoRepositorios = createContext<Repositorios | null>(null);

export function useRepositorios(): Repositorios {
  const r = useContext(ContextoRepositorios);
  if (!r) throw new Error('Repositórios indisponíveis: aplicação não configurada.');
  return r;
}
