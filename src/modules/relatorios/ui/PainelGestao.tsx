import { BannerDestaque, Card, EmptyState, StatusBadge } from '@/shared/ui';
import type { PainelDaGestao, TipoPendenciaGestao, TurmaDoPainel } from '../domain/tipos';
import {
  AcaoDoBanner,
  FaixaDeIndicadores,
  Indicador,
  IndicadorEncontro,
  LinkDoPainel,
  SeloFicticio,
} from './comum';
import { nomeDeSaudacao, plural } from './texto';

const TIPOS: TipoPendenciaGestao[] = ['presenca', 'participacao', 'avaliacao', 'ocorrencia'];
const ROTULO_DO_TIPO: Record<TipoPendenciaGestao, string> = {
  presenca: 'Presença',
  participacao: 'Participação',
  avaliacao: 'Avaliação',
  ocorrencia: 'Ocorrência',
};

function Turma({ turma: t }: { turma: TurmaDoPainel }) {
  return (
    <Card
      icone="turma"
      titulo={t.nome}
      acao={
        <LinkDoPainel para={`/docente/turmas/${t.id}`}>
          <span aria-hidden="true">Abrir painel</span>
          <span className="sr-only">Abrir painel da turma {t.nome}</span>
        </LinkDoPainel>
      }
    >
      <p className="text-sm text-text-secondary">{t.categoria}</p>
      <p className="mt-1 font-semibold">
        {t.equipesPendentes} de {plural(t.equipes, 'equipe', 'equipes')} com pendência
      </p>
      {t.pendencias.length ? (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {t.pendencias.map((p) => (
            <li
              key={`${p.tipo}-${p.encontroNumero}-${p.descricao}`}
              className="flex flex-wrap items-center justify-between gap-2 py-1"
            >
              <LinkDoPainel para={p.caminho}>{p.descricao}</LinkDoPainel>
              <StatusBadge estado="pendente" rotulo={`Encontro ${p.encontroNumero}`} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3">Nenhuma pendência nos encontros realizados</p>
      )}
    </Card>
  );
}

/**
 * Painel inicial da equipe docente (US2): só as turmas em que a pessoa atua, com as pendências
 * de registro dos encontros já realizados. Cada item leva à página da ação.
 */
export function PainelGestao({
  painel: p,
  nome,
  ficticio = false,
}: {
  painel: PainelDaGestao;
  nome: string;
  ficticio?: boolean;
}) {
  const equipes = p.turmas.reduce((soma, t) => soma + t.equipes, 0);
  const equipesPendentes = p.turmas.reduce((soma, t) => soma + t.equipesPendentes, 0);
  const pendencias = p.turmas.flatMap((t) => t.pendencias);
  const porTipo = (tipo: TipoPendenciaGestao) => pendencias.filter((x) => x.tipo === tipo).length;
  return (
    <>
      <BannerDestaque
        titulo={`Olá, ${nomeDeSaudacao(nome) || nome}!`}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            Pendências de registro dos encontros já realizados nas suas turmas.
            {ficticio && <SeloFicticio />}
          </span>
        }
        acao={
          <AcaoDoBanner para="/docente/relatorios" icone="relatorio">
            Relatórios
          </AcaoDoBanner>
        }
      />
      <FaixaDeIndicadores>
        <Indicador titulo="Turmas" icone="turma" valor={String(p.turmas.length)}>
          {plural(equipes, 'equipe', 'equipes')} nas suas turmas
        </Indicador>
        <Indicador
          titulo="Equipes com pendência"
          icone="dupla"
          acento={equipesPendentes > 0 ? 'amarelo' : 'ciano'}
          valor={`${equipesPendentes} de ${equipes}`}
        >
          {equipesPendentes > 0 ? (
            <StatusBadge estado="pendente" rotulo="Registros a completar" />
          ) : (
            <StatusBadge estado="concluido" rotulo="Tudo registrado" />
          )}
        </Indicador>
        <Indicador
          titulo="Pendências de registro"
          icone="checklist"
          acento={pendencias.length > 0 ? 'coral' : 'ciano'}
          valor={String(pendencias.length)}
        >
          {pendencias.length > 0
            ? TIPOS.filter((tipo) => porTipo(tipo) > 0)
                .map((tipo) => `${ROTULO_DO_TIPO[tipo]}: ${porTipo(tipo)}`)
                .join(' · ')
            : 'Nenhuma nos encontros realizados'}
        </Indicador>
        <IndicadorEncontro encontro={p.proximoEncontro} />
      </FaixaDeIndicadores>
      <h2 className="mb-3 font-display text-xl font-semibold">Pendências por turma</h2>
      {p.turmas.length ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {p.turmas.map((t) => (
            <Turma key={t.id} turma={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          titulo="Nenhuma turma vinculada ao seu perfil."
          descricao="Procure a coordenação."
        />
      )}
    </>
  );
}
