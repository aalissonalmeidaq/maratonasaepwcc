import { formatarDataHora } from '@/shared/lib/formatacao';
import { BannerDestaque, Card, StatCard, StatusBadge } from '@/shared/ui';
import type { CategoriaDoPainel, PainelDaCoordenacao } from '../domain/tipos';
import { LinkDoPainel, SeloFicticio } from './comum';
import { plural } from './texto';

function Categoria({ c }: { c: CategoriaDoPainel }) {
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
    <Card icone="ranking" titulo={c.categoria}>
      <ul className="flex flex-col">
        {itens.map((i) => (
          <li key={i.rotulo}>
            <LinkDoPainel para={i.para}>
              {i.rotulo}: {i.valor}
            </LinkDoPainel>
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
          <p>Ranking ainda não publicado</p>
        )}
      </div>
    </Card>
  );
}

/**
 * Painel inicial da coordenação (US3): indicadores da edição e, por categoria, as pendências dos
 * encontros realizados e a última publicação. Os números são os das páginas de origem.
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
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icone="turma"
          rotulo="Cursos e turmas"
          valor={`${i.cursos} / ${i.turmas}`}
          complemento="cursos / turmas"
        />
        <StatCard
          icone="dupla"
          acento="ciano"
          rotulo="Equipes ativas"
          valor={i.equipes}
          complemento={plural(i.estudantes, 'estudante ativo', 'estudantes ativos')}
        />
        <StatCard
          icone="calendario"
          acento="roxo"
          rotulo="Encontros realizados"
          valor={`${i.encontrosRealizados} de ${i.encontrosTotal}`}
          complemento="sem contar os cancelados"
        />
        <StatCard
          icone="relatorio"
          acento="amarelo"
          rotulo="Exportação CSV"
          valor={<LinkDoPainel para="/coordenacao/relatorios">Relatórios</LinkDoPainel>}
        />
      </div>
      <h2 className="mb-3 font-display text-xl font-semibold">
        Pendências dos encontros realizados
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {p.categorias.map((c) => (
          <Categoria key={c.categoria} c={c} />
        ))}
      </div>
    </>
  );
}
