import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '@/modules/auth';
import { PainelTurma, type DadosPainelTurma } from '@/modules/painel-turma';
import type { Edicao, Turma } from '@/modules/organizacao';
import { EmptyState, PageHeader, SelectField } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import { usePainelTurma, useTurmas } from '../dados/consultas';
import { ComEdicao } from './organizacao';

const hoje = () => new Date().toLocaleDateString('sv-SE');

const descricaoDaTurma = ({ turma }: DadosPainelTurma) =>
  [turma.cursoNome, turma.categoria, turma.anoLetivo].filter(Boolean).join(' · ');

/** Troca de turma para quem acompanha mais de uma (Edge Cases da spec 004). */
function SeletorDeTurma({ turmas, atual, base }: { turmas: Turma[]; atual: string; base: string }) {
  const navegar = useNavigate();
  if (turmas.length < 2) return null;
  return (
    <div className="mb-6 max-w-sm">
      <SelectField
        rotulo="Trocar de turma"
        value={atual}
        opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
        onChange={(e) => void navegar(`${base}/${e.target.value}`)}
      />
    </div>
  );
}

function PainelDaTurma({
  edicao,
  turmaId,
  cabecalho,
  links,
}: {
  edicao: Edicao;
  turmaId: string;
  cabecalho?: ReactNode;
  links: (p: DadosPainelTurma) => { linkAlterarEquipes?: string; linkConvidar?: string };
}) {
  const painel = usePainelTurma(turmaId);
  // Turma de outra edição: o painel trabalha sempre na edição em uso (research R3).
  const deOutraEdicao = painel.data && painel.data.turma.edicaoId !== edicao.id;
  return (
    <>
      <PageHeader
        icone="turma"
        titulo={painel.data && !deOutraEdicao ? painel.data.turma.nome : 'Painel da turma'}
        descricao={painel.data && !deOutraEdicao ? descricaoDaTurma(painel.data) : edicao.nome}
      />
      {cabecalho}
      <Consulta consulta={painel}>
        {(p) =>
          deOutraEdicao ? (
            <EmptyState
              titulo="Turma não encontrada."
              descricao="Escolha uma turma desta edição."
            />
          ) : (
            <PainelTurma painel={p} hoje={hoje()} {...links(p)} />
          )
        }
      </Consulta>
    </>
  );
}

/** Docente/mentor e coordenação: painel de uma turma da rota. */
function PainelDeGestao({ edicao, area }: { edicao: Edicao; area: 'docente' | 'coordenacao' }) {
  const { turmaId = '' } = useParams();
  const turmas = useTurmas(edicao.id);
  const base = area === 'docente' ? '/docente/turmas' : '/coordenacao/turmas';
  return (
    <PainelDaTurma
      key={turmaId}
      edicao={edicao}
      turmaId={turmaId}
      cabecalho={<SeletorDeTurma turmas={turmas.data ?? []} atual={turmaId} base={base} />}
      links={() => ({
        linkAlterarEquipes: area === 'docente' ? '/docente/turmas' : '/coordenacao/duplas',
      })}
    />
  );
}

export function DocentePainelTurmaPage() {
  return <ComEdicao>{(edicao) => <PainelDeGestao edicao={edicao} area="docente" />}</ComEdicao>;
}

export function CoordenacaoPainelTurmaPage() {
  return <ComEdicao>{(edicao) => <PainelDeGestao edicao={edicao} area="coordenacao" />}</ComEdicao>;
}

function MinhaTurma({ edicao }: { edicao: Edicao }) {
  const { sessao } = useAuth();
  const turmas = useTurmas(edicao.id);
  return (
    <Consulta consulta={turmas}>
      {(lista) => {
        const turma = lista[0];
        if (!turma) {
          return (
            <>
              <PageHeader icone="turma" titulo="Minha turma" descricao={edicao.nome} />
              <EmptyState
                titulo="Você ainda não está vinculado a uma turma nesta edição."
                descricao="Procure a coordenação."
                icone="turma"
              />
            </>
          );
        }
        return (
          <PainelDaTurma
            edicao={edicao}
            turmaId={turma.id}
            links={(p) => ({
              // Só quem ainda está sem equipe recebe o atalho para convidar.
              linkConvidar: p.alunos.some((a) => a.id === sessao?.usuarioId && !a.temEquipe)
                ? '/aluno/dupla'
                : undefined,
            })}
          />
        );
      }}
    </Consulta>
  );
}

export function AlunoTurmaPage() {
  return <ComEdicao>{(edicao) => <MinhaTurma edicao={edicao} />}</ComEdicao>;
}
