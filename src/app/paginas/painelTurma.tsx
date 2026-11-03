import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '@/modules/auth';
import { PainelTurma, type DadosPainelTurma } from '@/modules/painel-turma';
import { GestaoDaTurma, type Edicao, type Turma } from '@/modules/organizacao';
import {
  EncontrosDaTurma,
  FormAjustesTurma,
  HistoricoRegras,
  PontuacaoMaxima,
} from '@/modules/pontuacao';
import { Card, EmptyState, PageHeader, SelectField } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  useBloqueioDeEscrita,
  useEncontros,
  useGravar,
  useHistoricoRegras,
  usePainelTurma,
  useRegrasDaTurma,
  useSituacaoDeAcesso,
  useTurmas,
  useVinculos,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';
import { ComEdicao } from './ComEdicao';

const hoje = () => new Date().toLocaleDateString('sv-SE');

const descricaoDaTurma = ({ turma }: DadosPainelTurma) =>
  [turma.cursoNome, turma.categoria, turma.anoLetivo].filter(Boolean).join(' · ');

/** Troca de turma para quem acompanha mais de uma (Edge Cases da spec 004). */
export function SeletorDeTurma({
  turmas,
  atual,
  base,
}: {
  turmas: Turma[];
  atual: string;
  base: string;
}) {
  const navegar = useNavigate();
  if (turmas.length < 2) return null;
  return (
    <div className="mb-6 max-w-sm">
      <SelectField
        rotulo="Trocar de turma"
        // Turma fora da lista (ex.: de outra edição): nenhuma outra aparece como aberta.
        value={turmas.some((t) => t.id === atual) ? atual : ''}
        placeholder="Escolha uma turma"
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

/** Enturmação da turma pela coordenação (spec 010, US3); o servidor confere a permissão. */
function AlunosEDocentes({ edicao, turma }: { edicao: Edicao; turma: Turma }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const vinculos = useVinculos(edicao.id);
  const acessos = useSituacaoDeAcesso(edicao.id).data ?? [];
  return (
    <Card id="alunos-e-docentes" titulo="Alunos e docentes" icone="usuarios" className="mt-6">
      <Consulta consulta={vinculos}>
        {(lista) => (
          <GestaoDaTurma
            turma={turma}
            vinculos={lista}
            acessos={acessos}
            podeGerir={edicao.estado !== 'encerrada'}
            bloqueio={bloqueio}
            onBuscar={(busca) => r.organizacao.pessoasParaVincular(edicao.id, busca)}
            onVincular={(usuarioId, papel) =>
              gravar(() =>
                r.organizacao.vincular({
                  usuarioId,
                  edicaoId: edicao.id,
                  papel,
                  turmaId: turma.id,
                }),
              )()
            }
            onDesvincular={(id) => gravar(() => r.organizacao.definirVinculoAtivo(id, false))()}
            onCriarConta={(d) =>
              gravar(() => r.organizacao.criarConta({ ...d, edicaoId: edicao.id }))()
            }
            onImportar={(turmaId, linhas) =>
              gravar(() => r.organizacao.importarAlunos({ edicaoId: edicao.id, turmaId, linhas }))()
            }
          />
        )}
      </Consulta>
    </Card>
  );
}

/** Regras próprias da turma (spec 011, US2): só para quem pode ajustar algum grupo. */
function RegrasDaTurmaCard({ edicao, turma }: { edicao: Edicao; turma: Turma }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const consulta = useRegrasDaTurma(turma.id);
  const podeAjustar = (consulta.data?.podeAjustar.length ?? 0) > 0;
  const historico = useHistoricoRegras(podeAjustar ? edicao.id : undefined, turma.id);
  if (!consulta.data || !podeAjustar) return null;
  const dados = consulta.data;
  return (
    <Card id="regras-da-turma" titulo="Regras da turma" icone="pontuacao" className="mt-6">
      <p className="mb-4 text-sm text-text-secondary">
        A turma herda as regras da edição (versão {dados.versao}); defina só o que for próprio dela.
      </p>
      <FormAjustesTurma
        key={turma.id}
        dados={dados}
        bloqueio={edicao.estado === 'encerrada' ? 'Edição encerrada.' : bloqueio}
        onGravar={(grupos, justificativa) =>
          gravar(() =>
            r.regras.gravarAjustesTurma(turma.id, dados.ajusteId, grupos, justificativa),
          )()
        }
      />
      <h3 className="mt-6 mb-2 font-semibold">Histórico das regras da turma</h3>
      <Consulta consulta={historico}>{(itens) => <HistoricoRegras itens={itens} />}</Consulta>
    </Card>
  );
}

/** Pontuação máxima da turma no topo do painel (spec 011, US3). */
function MaximoDaTurma({ edicao, turmaId }: { edicao: Edicao; turmaId: string }) {
  const regras = useRegrasDaTurma(turmaId).data;
  const encontros = useEncontros(edicao.id).data;
  if (!regras || !encontros) return null;
  const daTurma = encontros.filter((e) => !regras.encontrosExcluidos.includes(e.id)).length;
  return (
    <div className="mb-4">
      <PontuacaoMaxima maximo={regras.maximo} encontros={daTurma} />
    </div>
  );
}

/** Encontros de que a turma participa, pela coordenação (spec 011, US3). */
function EncontrosDaTurmaCard({ edicao, turma }: { edicao: Edicao; turma: Turma }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const regras = useRegrasDaTurma(turma.id).data;
  const encontros = useEncontros(edicao.id).data;
  if (!regras || !encontros) return null;
  return (
    <Card id="encontros-da-turma" titulo="Encontros da turma" icone="calendario" className="mt-6">
      <EncontrosDaTurma
        key={turma.id}
        encontros={encontros}
        excluidos={regras.encontrosExcluidos}
        bloqueados={regras.encontrosBloqueados ?? []}
        bloqueio={edicao.estado === 'encerrada' ? 'Edição encerrada.' : bloqueio}
        onGravar={(excluidos) =>
          gravar(() => r.regras.definirEncontrosDaTurma(turma.id, excluidos))()
        }
      />
    </Card>
  );
}

/** Docente/mentor e coordenação: painel de uma turma da rota. */
function PainelDeGestao({ edicao, area }: { edicao: Edicao; area: 'docente' | 'coordenacao' }) {
  const { turmaId = '' } = useParams();
  const turmas = useTurmas(edicao.id);
  const base = area === 'docente' ? '/docente/turmas' : '/coordenacao/turmas';
  const turma = turmas.data?.find((t) => t.id === turmaId);
  return (
    <>
      <PainelDaTurma
        key={turmaId}
        edicao={edicao}
        turmaId={turmaId}
        cabecalho={
          <>
            <SeletorDeTurma turmas={turmas.data ?? []} atual={turmaId} base={base} />
            {turma && <MaximoDaTurma edicao={edicao} turmaId={turma.id} />}
          </>
        }
        links={() => ({
          linkAlterarEquipes: area === 'docente' ? '/docente/turmas' : '/coordenacao/duplas',
        })}
      />
      {turma && <RegrasDaTurmaCard edicao={edicao} turma={turma} />}
      {area === 'coordenacao' && turma && <EncontrosDaTurmaCard edicao={edicao} turma={turma} />}
      {area === 'coordenacao' && turma && <AlunosEDocentes edicao={edicao} turma={turma} />}
    </>
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
