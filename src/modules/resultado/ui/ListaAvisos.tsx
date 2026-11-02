import { formatarDataHora } from '@/shared/lib/formatacao';
import { Alert, Button, EmptyState, RetornoEnvio, StatusBadge, useEnvio } from '@/shared/ui';
import type { Aviso } from '../domain/tipos';

/** Avisos da pessoa (FR-026): a leitura só é marcada depois da resposta do servidor. */
export function ListaAvisos({
  avisos,
  onMarcar,
  bloqueio,
}: {
  avisos: Aviso[];
  onMarcar: (ids: string[]) => Promise<unknown>;
  bloqueio?: string;
}) {
  const { estado, enviando, enviar } = useEnvio();
  if (avisos.length === 0) return <EmptyState titulo="Nenhum aviso por enquanto." />;
  return (
    <div className="flex flex-col gap-3">
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <ul className="flex flex-col gap-3">
        {avisos.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{a.titulo}</p>
              <p className="text-sm text-text-secondary">{formatarDataHora(a.criadoEm)}</p>
            </div>
            {a.lidoEm ? (
              <StatusBadge estado="concluido" rotulo="Lido" />
            ) : (
              <div className="flex items-center gap-2">
                <StatusBadge estado="pendente" rotulo="Não lido" />
                <Button
                  variante="secundario"
                  disabled={Boolean(bloqueio) || enviando}
                  aria-label={`Marcar como lido: ${a.titulo}`}
                  onClick={() => void enviar(() => onMarcar([a.id]), 'Aviso marcado como lido.')}
                >
                  Marcar como lido
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
