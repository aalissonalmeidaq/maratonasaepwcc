import { maximoPorEncontro, type CriterioRubrica, type RegrasDaEdicao } from '@/modules/pontuacao';
import { Card, StatusBadge } from '@/shared/ui';
import { calcularParcial, type ComponenteParcial } from '../domain/lancamentos';
import type { EncontroDaEquipe } from '../domain/tipos';

const pontos = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const soma = (c: CriterioRubrica[]) => c.reduce((t, x) => t + x.maximo, 0);

/**
 * Pontuação parcial da equipe num encontro (US5, FR-021): componentes calculados pelas regras da
 * edição; o que ainda não foi registrado aparece como "Aguardando registro", nunca como zero.
 */
export function PontuacaoDoEncontro({
  encontro,
  regras,
}: {
  encontro: EncontroDaEquipe;
  regras: RegrasDaEdicao;
}) {
  const { pontuacao, aguardando } = calcularParcial(encontro, regras);
  const linhas: { id: ComponenteParcial; rotulo: string; valor: number; maximo: number }[] = [
    {
      id: 'presenca',
      rotulo: 'Presença',
      valor: pontuacao.presenca,
      maximo: regras.presenca.maximoPorDupla,
    },
    {
      id: 'participacao',
      rotulo: 'Participação',
      valor: pontuacao.participacao,
      maximo: soma(regras.participacao.criterios),
    },
    {
      id: 'avaliacaoObjetiva',
      rotulo: 'Questões / prova oficial',
      valor: pontuacao.avaliacaoObjetiva,
      maximo: regras.questoes.maximo,
    },
    {
      id: 'entrega',
      rotulo: 'Entrega prática',
      valor: pontuacao.entrega,
      maximo: soma(regras.entrega.criterios),
    },
    {
      id: 'apresentacao',
      rotulo: 'Apresentação',
      valor: pontuacao.apresentacao,
      maximo: soma(regras.apresentacao.criterios),
    },
  ];
  const feedbacks = encontro.desafios.flatMap((d) =>
    d.avaliacao?.feedback ? [d.avaliacao.feedback] : [],
  );

  return (
    <Card
      icone="calendario"
      titulo={`${encontro.numero}. ${encontro.titulo}`}
      acao={<StatusBadge estado="parcial" rotulo="Parcial" />}
    >
      <dl className="flex flex-col gap-1">
        {linhas.map((l) => (
          <div key={l.id} className="flex justify-between gap-2 text-sm">
            <dt>{l.rotulo}</dt>
            <dd className="tabular-nums">
              {aguardando.includes(l.id) ? (
                <span className="text-text-secondary">Aguardando registro</span>
              ) : (
                `${pontos(l.valor)} / ${l.maximo}`
              )}
            </dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-2 border-t border-border pt-2 font-semibold">
          <dt>Total parcial</dt>
          <dd className="tabular-nums">
            {pontos(pontuacao.total)} / {maximoPorEncontro(regras)}
          </dd>
        </div>
      </dl>
      {feedbacks.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold">Feedback</p>
          {feedbacks.map((f, i) => (
            <p key={i} className="whitespace-pre-line text-sm">
              {f}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
