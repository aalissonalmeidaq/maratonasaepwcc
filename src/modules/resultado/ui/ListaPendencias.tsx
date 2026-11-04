import { Alert } from '@/shared/ui';
import type { PendenciasDoRanking } from '../domain/tipos';

const COMPONENTE: Record<string, string> = {
  participacao: 'participação',
  avaliacaoObjetiva: 'questões/prova oficial',
  entrega: 'entrega',
  apresentacao: 'apresentação',
};

/** O que impede a publicação definitiva da turma (FR-004), com todos os encontros da turma. */
export function ListaPendencias({ pendencias }: { pendencias: PendenciasDoRanking }) {
  const itens = [
    ...pendencias.componentes.map(
      (c) =>
        `${c.duplaNome} — encontro ${c.encontroNumero}: ${COMPONENTE[c.componente] ?? c.componente}`,
    ),
    ...pendencias.ocorrencias.map((o) => `${o.duplaNome} — ocorrência sem decisão`),
    ...pendencias.revisoes.map((r) => `${r.duplaNome} — revisão aberta`),
  ];
  if (itens.length === 0) return <Alert tom="sucesso" titulo="Nenhuma pendência na turma." />;
  return (
    <Alert
      tom="alerta"
      titulo={`${itens.length} ${itens.length === 1 ? 'pendência impede' : 'pendências impedem'} o definitivo`}
    >
      <ul className="list-disc pl-5">
        {itens.slice(0, 20).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {itens.length > 20 && <p className="mt-1">E mais {itens.length - 20}.</p>}
    </Alert>
  );
}
