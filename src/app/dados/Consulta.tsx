import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useOnline } from '@/shared/pwa/useOnline';
import { Alert, Button, Spinner } from '@/shared/ui';

/** Estados padronizados de carregamento e erro (FR-009). */
export function Consulta<T>({
  consulta,
  children,
}: {
  consulta: UseQueryResult<T>;
  children: (dados: T) => ReactNode;
}) {
  const online = useOnline();
  if (!online && consulta.data !== undefined) return <>{children(consulta.data)}</>;
  if (consulta.data === undefined && (!online || consulta.fetchStatus === 'paused'))
    return (
      <Alert
        tom="info"
        titulo="Sem conexão: esta tela precisa de internet para carregar."
        anunciar
      />
    );
  if (consulta.isPending) return <Spinner rotulo="Carregando…" />;
  if (consulta.isError) {
    return (
      <Alert
        tom="erro"
        titulo={consulta.error.message || 'Não foi possível carregar os dados.'}
        anunciar
      >
        <Button
          variante="secundario"
          icone="tentar"
          className="mt-2"
          onClick={() => void consulta.refetch()}
        >
          Tentar novamente
        </Button>
      </Alert>
    );
  }
  return <>{children(consulta.data)}</>;
}
