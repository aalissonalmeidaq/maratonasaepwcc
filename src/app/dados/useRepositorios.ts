import { createContext, useContext } from 'react';
import type { RepositorioAtividades } from '@/modules/atividades';
import type { RepositorioComunicados } from '@/modules/comunicados';
import type { RepositorioDuplas } from '@/modules/duplas';
import type { RepositorioEncontros } from '@/modules/encontros';
import type { RepositorioOrganizacao } from '@/modules/organizacao';
import type { RepositorioPainelTurma } from '@/modules/painel-turma';
import type { RepositorioRede } from '@/modules/rede';
import type { RepositorioRegras } from '@/modules/pontuacao';
import type { RepositorioPaineis } from '@/modules/relatorios';
import type { RepositorioResultado } from '@/modules/resultado';

export interface Repositorios {
  somenteLeitura: boolean;
  organizacao: RepositorioOrganizacao;
  duplas: RepositorioDuplas;
  encontros: RepositorioEncontros;
  painelTurma: RepositorioPainelTurma;
  atividades: RepositorioAtividades;
  resultado: RepositorioResultado;
  paineis: RepositorioPaineis;
  comunicados: RepositorioComunicados;
  regras: RepositorioRegras;
  rede: RepositorioRede;
}

export const ContextoRepositorios = createContext<Repositorios | null>(null);

export function useRepositorios(): Repositorios {
  const r = useContext(ContextoRepositorios);
  if (!r) throw new Error('Repositórios indisponíveis: aplicação não configurada.');
  return r;
}
