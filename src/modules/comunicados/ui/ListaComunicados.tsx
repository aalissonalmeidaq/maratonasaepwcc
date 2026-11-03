import { useId } from 'react';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { Alert, Button, EmptyState, RetornoEnvio, StatusBadge, useEnvio } from '@/shared/ui';
import type { ComunicadoRecebido } from '../domain/tipos';
import { PAPEL_DO_AUTOR } from './texto';

/**
 * Comunicados recebidos pela pessoa (US2), do mais recente ao mais antigo. O texto é exibido
 * como texto puro, com as quebras de linha; "Novo" vem dos avisos não lidos (R4).
 */
export function ListaComunicados({
  comunicados,
  onMarcarLido,
  bloqueio,
  ficticio,
}: {
  comunicados: ComunicadoRecebido[];
  onMarcarLido: (id: string) => Promise<unknown>;
  bloqueio?: string;
  ficticio?: boolean;
}) {
  if (comunicados.length === 0) {
    return <EmptyState titulo="Nenhum comunicado publicado para você nesta edição." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {ficticio && (
        <div>
          <StatusBadge estado="a_confirmar" rotulo="Dados fictícios" />
        </div>
      )}
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <ul className="flex flex-col gap-3">
        {comunicados.map((c) => (
          <li key={c.id}>
            <ItemRecebido comunicado={c} onMarcarLido={onMarcarLido} bloqueio={bloqueio} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemRecebido({
  comunicado: c,
  onMarcarLido,
  bloqueio,
}: {
  comunicado: ComunicadoRecebido;
  onMarcarLido: (id: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const tituloId = useId();
  const { estado, enviando, enviar } = useEnvio();
  return (
    <article
      aria-labelledby={tituloId}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={tituloId} className="font-semibold">
          {c.titulo}
        </h3>
        {c.novo && <StatusBadge estado="em_andamento" rotulo="Novo" />}
      </div>
      <p className="text-sm text-text-secondary">
        Publicado em {formatarDataHora(c.publicadoEm)} por {c.autor.nome} (
        {PAPEL_DO_AUTOR[c.autor.papel]})
        {c.corrigidoEm && ` · Atualizado em ${formatarDataHora(c.corrigidoEm)}`}
      </p>
      <p className="whitespace-pre-line">{c.texto}</p>
      <RetornoEnvio estado={estado} />
      {c.novo && (
        <div>
          <Button
            variante="secundario"
            disabled={Boolean(bloqueio) || enviando}
            carregando={enviando}
            aria-label={`Marcar como lido: ${c.titulo}`}
            onClick={() => void enviar(() => onMarcarLido(c.id), 'Comunicado marcado como lido.')}
          >
            Marcar como lido
          </Button>
        </div>
      )}
    </article>
  );
}
