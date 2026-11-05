import { Link } from 'react-router';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { BannerDestaque, Card, ProgressBar, StatusBadge, cx } from '@/shared/ui';
import type { PainelDaCoordenacao, TurmaDoPainelCoordenacao } from '../domain/tipos';
import { AcaoDoBanner, FaixaDeIndicadores, Indicador, SeloFicticio } from './comum';
import { plural } from './texto';

function Turma({ c }: { c: TurmaDoPainelCoordenacao }) {
  const itens = [
    {
      rotulo: 'Componentes sem registro',
      valor: c.componentesPendentes,
      para: '/coordenacao/ranking',
    },
    {
      rotulo: 'Prova oficial pendente',
      valor: c.provasPendentes,
      para: '/coordenacao/prova-oficial',
    },
    {
      rotulo: 'Ocorrências sem decisão',
      valor: c.ocorrenciasSemDecisao,
      para: '/coordenacao/ocorrencias',
    },
    { rotulo: 'Revisões abertas', valor: c.revisoesAbertas, para: '/coordenacao/revisoes' },
  ];
  return (
    <Card icone="turma" titulo={c.turma}>
      <p className="-mt-2 mb-2 text-sm text-text-secondary">{c.categoria}</p>
      {/* Linhas com contador: o que pede atenção (valor acima de zero) se destaca dos zeros. */}
      <ul className="-mx-2 flex flex-col">
        {itens.map((i) => (
          <li key={i.rotulo}>
            <Link
              to={i.para}
              className="group flex min-h-11 items-center justify-between gap-3 rounded-md px-2 transition-colors hover:bg-surface-muted"
            >
              <span
                className={cx(
                  'font-medium underline-offset-4 group-hover:underline',
                  i.valor > 0 ? 'text-link' : 'text-text-secondary',
                )}
              >
                {i.rotulo}
              </span>
              <span
                className={cx(
                  'min-w-8 rounded-full px-2.5 py-0.5 text-center text-sm font-bold tabular-nums',
                  i.valor > 0 ? 'bg-yellow-500 text-navy-950' : 'bg-gray-100 text-text-secondary',
                )}
              >
                {i.valor}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-border pt-3 text-sm">
        {c.publicacao ? (
          <p className="flex flex-wrap items-center gap-2">
            Versão {c.publicacao.versao}, publicada em {formatarDataHora(c.publicacao.publicadoEm)}
            <StatusBadge estado={c.publicacao.estado} />
          </p>
        ) : (
          <p>Ranking da turma ainda não publicado</p>
        )}
      </div>
    </Card>
  );
}

/**
 * Painel inicial da coordenação (US3): indicadores da edição e, por turma (spec 012), as
 * pendências dos encontros realizados e a última publicação. Os números são os das páginas de origem.
 */
export function PainelCoordenacao({
  painel: p,
  edicaoNome,
  ficticio = false,
}: {
  painel: PainelDaCoordenacao;
  edicaoNome: string;
  ficticio?: boolean;
}) {
  const i = p.indicadores;
  const totalDa = (c: TurmaDoPainelCoordenacao) =>
    c.componentesPendentes + c.provasPendentes + c.ocorrenciasSemDecisao + c.revisoesAbertas;
  const pendencias = p.turmas.reduce((soma, c) => soma + totalDa(c), 0);
  const comPendencia = p.turmas.filter((c) => totalDa(c) > 0).length;
  return (
    <>
      <BannerDestaque
        titulo="Visão geral"
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            {edicaoNome}
            {ficticio && <SeloFicticio />}
          </span>
        }
        acao={
          <AcaoDoBanner para="/coordenacao/relatorios" icone="relatorio">
            Relatórios
          </AcaoDoBanner>
        }
      />
      <FaixaDeIndicadores>
        <Indicador titulo="Cursos e turmas" icone="turma" valor={`${i.cursos} / ${i.turmas}`}>
          cursos / turmas
        </Indicador>
        <Indicador titulo="Equipes ativas" icone="dupla" acento="ciano" valor={String(i.equipes)}>
          {plural(i.estudantes, 'estudante ativo', 'estudantes ativos')}
        </Indicador>
        <Indicador
          titulo="Encontros realizados"
          icone="calendario"
          acento="roxo"
          valor={`${i.encontrosRealizados} de ${i.encontrosTotal}`}
        >
          <ProgressBar
            valor={i.encontrosRealizados}
            maximo={i.encontrosTotal}
            rotulo="Encontros realizados"
          />
          <p className="mt-2">sem contar os cancelados</p>
        </Indicador>
        <Indicador
          titulo="Pendências abertas"
          icone="checklist"
          acento={pendencias > 0 ? 'coral' : 'ciano'}
          valor={String(pendencias)}
        >
          {pendencias > 0 ? (
            <StatusBadge
              estado="pendente"
              rotulo={`Em ${plural(comPendencia, 'turma', 'turmas')}`}
            />
          ) : (
            <StatusBadge estado="concluido" rotulo="Tudo em dia" />
          )}
        </Indicador>
      </FaixaDeIndicadores>
      <h2 className="mb-3 font-display text-xl font-semibold">
        Pendências dos encontros realizados
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {p.turmas.map((c) => (
          <Turma key={c.turmaId} c={c} />
        ))}
      </div>
    </>
  );
}
