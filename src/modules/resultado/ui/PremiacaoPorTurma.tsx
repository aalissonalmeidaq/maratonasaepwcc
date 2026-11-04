import type { ReactNode } from 'react';
import { Alert, Card, StatusBadge, type EstadoVisual } from '@/shared/ui';
import type { ItemPremiacaoDaTurma, PremiacaoDaTurma, SituacaoPremiacao } from '../domain/tipos';

const SITUACAO: Record<SituacaoPremiacao, { rotulo: string; estado: EstadoVisual }> = {
  a_definir: { rotulo: 'A definir', estado: 'parcial' },
  provisorio: { rotulo: 'Provisório — não final', estado: 'provisorio' },
  final: { rotulo: 'Final', estado: 'definitivo' },
  empate_a_decidir: { rotulo: 'Empate a decidir', estado: 'pendente' },
};

function Equipes({ item, situacao }: { item: ItemPremiacaoDaTurma; situacao: SituacaoPremiacao }) {
  if (item.semEquipePorEmpate) return <>Sem equipe nesta posição (empate na posição anterior)</>;
  if (item.equipes.length === 0)
    return <>{situacao === 'a_definir' ? 'Aguardando a publicação definitiva' : 'Sem equipe'}</>;
  const nomes = item.equipes.map((e) => e.nome).join(', ');
  return <>{item.empate && !item.decisao ? `${nomes} (empate)` : nomes}</>;
}

/**
 * Premiação por turma (spec 012, FR-018, FR-018a): os prêmios configurados na edição valem para
 * cada turma, com as equipes da última publicação. A situação vem do servidor e aparece em texto.
 */
export function PremiacaoPorTurma({
  premiacoes,
  renderizarDecisao,
}: {
  premiacoes: PremiacaoDaTurma[];
  /** Formulário de decisão do empate (só para a coordenação). */
  renderizarDecisao?: (premiacao: PremiacaoDaTurma, item: ItemPremiacaoDaTurma) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Alert tom="alerta" titulo="Detalhes dos prêmios a confirmar">
        Valores, quantidade e condições dos prêmios ainda não foram confirmados pela coordenação.
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        {premiacoes.map((p) => {
          const s = SITUACAO[p.situacao];
          return (
            <section key={p.turmaId} aria-label={`Premiação — ${p.turma}`}>
              <Card
                icone="trofeu"
                titulo={p.turma}
                nivel={3}
                acao={<StatusBadge estado={s.estado} rotulo={s.rotulo} />}
              >
                <ol className="flex flex-col divide-y divide-border">
                  {p.itens.map((item) => (
                    <li key={item.posicao} className="flex flex-col gap-1 py-2">
                      <p className="font-semibold">
                        {item.posicao}º lugar: <span className="font-normal">{item.descricao}</span>
                      </p>
                      {item.detalhes && (
                        <p className="text-sm text-text-secondary">{item.detalhes}</p>
                      )}
                      <p className="text-sm">
                        <Equipes item={item} situacao={p.situacao} />
                      </p>
                      {item.decisao && (
                        <p className="text-sm text-text-secondary">
                          Decisão da coordenação: {item.decisao.decisao}
                        </p>
                      )}
                      {p.situacao === 'empate_a_decidir' &&
                        item.empate &&
                        !item.decisao &&
                        renderizarDecisao?.(p, item)}
                    </li>
                  ))}
                </ol>
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
}
