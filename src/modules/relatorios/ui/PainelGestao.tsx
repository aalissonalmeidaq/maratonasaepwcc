import { BannerDestaque, Card, EmptyState, StatusBadge } from '@/shared/ui';
import type { PainelDaGestao, TurmaDoPainel } from '../domain/tipos';
import { LinkDoPainel, SeloFicticio, TextoEncontro } from './comum';
import { plural } from './texto';

function Turma({ turma: t }: { turma: TurmaDoPainel }) {
  return (
    <Card icone="turma" titulo={t.nome}>
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
  return (
    <>
      <BannerDestaque
        titulo={`Olá, ${nome}`}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            Pendências de registro dos encontros já realizados nas suas turmas.
            {ficticio && <SeloFicticio />}
          </span>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card icone="calendario" titulo="Próximo encontro">
          <TextoEncontro encontro={p.proximoEncontro} />
        </Card>
        <Card icone="relatorio" titulo="Exportação">
          <p>Baixe em CSV os dados das turmas em que você atua.</p>
          <LinkDoPainel para="/docente/relatorios">Relatórios</LinkDoPainel>
        </Card>
      </div>
      {p.turmas.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
