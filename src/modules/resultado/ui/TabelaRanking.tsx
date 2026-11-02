import { formatarDataHora, formatarPontos } from '@/shared/lib/formatacao';
import { EmptyState, ResponsiveTable, StatusBadge } from '@/shared/ui';
import { rotuloEstadoRanking } from '../domain/prazos';
import type { PosicaoPublicada, PublicacaoRanking } from '../domain/tipos';

/**
 * Versão publicada do ranking de uma categoria (US4, FR-016, FR-019): só posição, equipe e
 * total — sem notas individuais. O detalhe por encontro aparece apenas nas linhas em que o
 * servidor o enviou (a própria equipe, ou as equipes da gestão).
 */
export function TabelaRanking({ publicacao }: { publicacao: PublicacaoRanking | null }) {
  if (!publicacao) {
    return (
      <EmptyState
        icone="ranking"
        titulo="O ranking ainda não foi publicado."
        descricao="A coordenação publica a classificação como parcial, provisória ou definitiva."
      />
    );
  }
  const comDetalhe = publicacao.posicoes.filter(
    (p): p is PosicaoPublicada & { detalhe: NonNullable<PosicaoPublicada['detalhe']> } =>
      Boolean(p.detalhe),
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge estado={publicacao.estado} rotulo={rotuloEstadoRanking(publicacao.estado)} />
        <span>
          Versão {publicacao.versao}, publicada em {formatarDataHora(publicacao.publicadoEm)}
        </span>
      </div>
      <ResponsiveTable
        legenda={`Classificação — ${publicacao.categoria}`}
        chave={(p) => p.duplaId}
        linhas={publicacao.posicoes}
        colunas={[
          {
            id: 'pos',
            titulo: 'Posição',
            compacta: true,
            valor: (p) => (
              <span className="font-semibold">
                {p.posicao}º
                {p.compartilhada && (
                  <span className="ml-1 text-xs font-medium text-text-secondary">(empate)</span>
                )}
              </span>
            ),
          },
          {
            id: 'equipe',
            titulo: 'Equipe',
            texto: (p) => p.nome,
            valor: (p) => (
              <span className={p.minha ? 'font-bold text-blue-700' : undefined}>
                {p.nome}
                {p.minha && <span className="ml-1">(sua equipe)</span>}
              </span>
            ),
          },
          {
            id: 'total',
            titulo: 'Pontos',
            numerica: true,
            valor: (p) => formatarPontos(p.total),
          },
          {
            id: 'situacao',
            titulo: 'Situação',
            valor: (p) =>
              p.pendente ? (
                <StatusBadge estado="pendente" rotulo="Lançamentos pendentes" />
              ) : (
                <StatusBadge estado="concluido" rotulo="Completo" />
              ),
          },
        ]}
      />
      {comDetalhe.map((p) => (
        <section
          key={p.duplaId}
          aria-labelledby={`detalhe-${p.duplaId}`}
          className="rounded-lg border border-border p-3"
        >
          <h3 id={`detalhe-${p.duplaId}`} className="mb-2 font-semibold">
            Detalhe — {p.nome}
          </h3>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {p.detalhe.map((e) => (
              <li key={e.encontroId} className="flex justify-between gap-2">
                <span>
                  {e.numero}. {e.titulo}
                </span>
                <span className="tabular-nums">
                  {formatarPontos(e.pontuacao.total)} pontos
                  {e.pontuacao.descontos > 0 &&
                    ` (descontos −${formatarPontos(e.pontuacao.descontos)})`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
