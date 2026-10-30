import type { ReactNode } from 'react';
import type { Edicao } from '@/modules/organizacao';
import { EmptyState } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import { useEdicaoAtual } from '../dados/consultas';

/** Carrega a edição em uso e entrega para a tela. */
export function ComEdicao({ children }: { children: (edicao: Edicao) => ReactNode }) {
  return (
    <Consulta consulta={useEdicaoAtual()}>
      {(edicao) =>
        edicao ? (
          children(edicao)
        ) : (
          <EmptyState
            titulo="Nenhuma edição disponível para o seu perfil."
            descricao="Procure a coordenação."
          />
        )
      }
    </Consulta>
  );
}
