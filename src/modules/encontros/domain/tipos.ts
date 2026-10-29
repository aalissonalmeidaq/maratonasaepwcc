import type { AvaliacaoObjetiva, EstadoEncontro } from './encontro';

export interface Ambiente {
  id: string;
  nome: string;
  observacoes: string | null;
}

export interface Encontro {
  id: string;
  numero: number;
  titulo: string;
  data: string;
  inicio: string | null;
  fim: string | null;
  ambienteId: string | null;
  ambienteNome: string | null;
  avaliacaoObjetiva: AvaliacaoObjetiva;
  orientacoes: string | null;
  estado: EstadoEncontro;
}

export type DadosNovoEncontro = Omit<Encontro, 'id' | 'ambienteNome'> & { id?: string };

export interface RepositorioEncontros {
  ambientes(edicaoId: string): Promise<Ambiente[]>;
  salvarAmbiente(edicaoId: string, dados: Omit<Ambiente, 'id'> & { id?: string }): Promise<void>;
  removerAmbiente(id: string): Promise<void>;
  encontros(edicaoId: string): Promise<Encontro[]>;
  salvarEncontro(edicaoId: string, dados: DadosNovoEncontro): Promise<void>;
  removerEncontro(id: string): Promise<void>;
}
