import type { CriterioRubrica, Notas, RegrasDaEdicao } from '@/modules/pontuacao';
import { formatarDataHora } from '@/shared/lib/formatacao';
import type { AvaliacaoRegistrada } from '../domain/tipos';

const pontos = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const soma = (c: CriterioRubrica[]) => c.reduce((t, x) => t + x.maximo, 0);

function Notas({ criterios, notas }: { criterios: CriterioRubrica[]; notas: Notas }) {
  return (
    <ul className="ml-4 list-disc text-sm">
      {criterios.map((c) => (
        <li key={c.id}>
          {c.rotulo}: {pontos(notas[c.id] ?? 0)} / {c.maximo}
        </li>
      ))}
    </ul>
  );
}

/** Avaliação vista pela equipe assim que registrada (FR-015); desconto de atraso à parte (FR-013). */
export function AvaliacaoDaEquipe({
  avaliacao,
  regras,
  descontoAtraso,
}: {
  avaliacao: AvaliacaoRegistrada;
  regras: RegrasDaEdicao;
  descontoAtraso: number;
}) {
  const { entrega, apresentacao } = regras;
  const totalEntrega = avaliacao.notasEntrega
    ? entrega.criterios.reduce((t, c) => t + (avaliacao.notasEntrega?.[c.id] ?? 0), 0)
    : null;
  const totalApresentacao = avaliacao.notasApresentacao
    ? apresentacao.criterios.reduce((t, c) => t + (avaliacao.notasApresentacao?.[c.id] ?? 0), 0)
    : null;
  const criterioAtraso =
    entrega.criterios.find((c) => c.id === entrega.criterioDeAtraso)?.rotulo ??
    entrega.criterioDeAtraso;

  return (
    <section
      aria-label="Avaliação da equipe"
      className="flex flex-col gap-2 rounded-lg bg-surface-muted p-3"
    >
      <h4 className="text-sm font-semibold">
        Avaliação registrada em {formatarDataHora(avaliacao.registradoEm)}
      </h4>
      <p className="text-sm font-medium">
        {totalEntrega === null
          ? 'Entrega prática: sem entrega (0)'
          : `Entrega prática: ${pontos(totalEntrega)} de ${soma(entrega.criterios)}`}
      </p>
      {avaliacao.notasEntrega && (
        <Notas criterios={entrega.criterios} notas={avaliacao.notasEntrega} />
      )}
      {totalEntrega !== null && descontoAtraso > 0 && (
        <p className="text-sm text-amber-800">
          Desconto de atraso: −{pontos(descontoAtraso)} em {criterioAtraso} (aplicado à parte da
          nota).
        </p>
      )}
      <p className="text-sm font-medium">
        {avaliacao.apresentacaoNaoAvaliavel || totalApresentacao === null
          ? 'Apresentação: não avaliável (0)'
          : `Apresentação: ${pontos(totalApresentacao)} de ${soma(apresentacao.criterios)}`}
      </p>
      {avaliacao.notasApresentacao && (
        <Notas criterios={apresentacao.criterios} notas={avaliacao.notasApresentacao} />
      )}
      {avaliacao.feedback && (
        <div>
          <p className="text-sm font-semibold">Feedback</p>
          <p className="whitespace-pre-line text-sm">{avaliacao.feedback}</p>
        </div>
      )}
    </section>
  );
}
