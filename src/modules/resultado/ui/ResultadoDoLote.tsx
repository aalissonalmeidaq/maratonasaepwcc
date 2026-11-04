import { Alert, Button } from '@/shared/ui';
import type { ResultadoLote } from '../domain/tipos';

const MUDOU = /recarregue/i;

/**
 * Resposta do servidor a uma publicação em lote (spec 012, FR-007a): cada turma foi publicada ou
 * recusada de forma independente, com o motivo.
 */
export function ResultadoDoLote({
  resultado,
  onRecarregar,
}: {
  resultado: ResultadoLote;
  onRecarregar: () => void;
}) {
  const publicadas = resultado.filter((r) => r.publicada);
  const recusadas = resultado.filter((r) => !r.publicada);
  return (
    <section aria-label="Resultado da publicação" className="flex flex-col gap-3">
      {publicadas.length > 0 && (
        <Alert
          tom="sucesso"
          titulo={`${publicadas.length} ${publicadas.length === 1 ? 'turma publicada' : 'turmas publicadas'}. As equipes foram avisadas.`}
        >
          <ul aria-label="Publicadas" className="list-disc pl-5">
            {publicadas.map((r) => (
              <li key={r.turmaId}>
                {r.turma} — versão {r.versao}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {recusadas.length > 0 && (
        <Alert
          tom="erro"
          titulo={`${recusadas.length} ${recusadas.length === 1 ? 'turma recusada' : 'turmas recusadas'}`}
        >
          <ul aria-label="Recusadas" className="list-disc pl-5">
            {recusadas.map((r) => (
              <li key={r.turmaId}>
                <strong>{r.turma}:</strong> {r.motivo}
              </li>
            ))}
          </ul>
          {recusadas.some((r) => MUDOU.test(r.motivo ?? '')) && (
            <Button variante="secundario" className="mt-2" onClick={onRecarregar}>
              Recarregar
            </Button>
          )}
        </Alert>
      )}
    </section>
  );
}
