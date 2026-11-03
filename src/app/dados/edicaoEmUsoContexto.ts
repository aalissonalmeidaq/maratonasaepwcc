import { createContext, useContext } from 'react';
import { edicaoPadrao, type Edicao } from '@/modules/organizacao';

interface EdicaoEmUso {
  escolhidaId: string | null;
  escolher: (id: string) => void;
}

export const ContextoEdicaoEmUso = createContext<EdicaoEmUso>({
  escolhidaId: null,
  escolher: () => {},
});

export const useEdicaoEmUso = () => useContext(ContextoEdicaoEmUso);

/** A escolhida, se ainda for visível; senão, a edição padrão (ativa de maior início). */
export function resolverEdicaoEmUso(edicoes: Edicao[], escolhidaId: string | null): Edicao | null {
  return edicoes.find((e) => e.id === escolhidaId) ?? edicaoPadrao(edicoes);
}
