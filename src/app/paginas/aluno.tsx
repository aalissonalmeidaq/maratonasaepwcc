import { Link } from 'react-router';
import { useAuth } from '@/modules/auth';
import { maximoPorEncontro, REGRAS_PILOTO } from '@/modules/pontuacao';
import { PainelAluno } from '@/modules/relatorios';
import { Alert, Card, PageHeader } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import { useConvitesPendentes, usePainelDoAluno } from '../dados/consultas';
import { Atalhos } from '../layout/Atalhos';
import { ComEdicao } from './ComEdicao';

/** Convites de equipe recebidos que esperam resposta (FR-016). */
function CardConvitesEquipe() {
  const pendentes = useConvitesPendentes(true);
  return (
    <Card icone="dupla" titulo="Convites de equipe" className="mt-4">
      <p>
        {pendentes === 0
          ? 'Nenhum convite pendente.'
          : `Você tem ${pendentes} ${pendentes === 1 ? 'convite pendente' : 'convites pendentes'}.`}
      </p>
      <Link
        to="/aluno/dupla"
        className="mt-3 inline-flex min-h-11 items-center rounded-md font-semibold text-link underline-offset-4 hover:underline"
      >
        Ver convites de equipe
      </Link>
    </Card>
  );
}

function PainelDaEdicao({ edicaoId }: { edicaoId: string }) {
  const { sessao } = useAuth();
  return (
    <Consulta consulta={usePainelDoAluno(edicaoId)}>
      {(painel) => (
        <>
          <PainelAluno painel={painel} nome={sessao?.nome ?? ''} ficticio={sessao?.demo} />
          <CardConvitesEquipe />
        </>
      )}
    </Consulta>
  );
}

/** Painel inicial do aluno com dados do servidor (spec 008, US1); na demonstração, fictícios. */
export function AlunoInicioPage() {
  return (
    <>
      <ComEdicao>{(edicao) => <PainelDaEdicao edicaoId={edicao.id} />}</ComEdicao>
      <section aria-label="Acessos do aluno" className="mt-6">
        <Atalhos area="aluno" compacto />
      </section>
    </>
  );
}

export function AlunoRegulamentoPage() {
  const r = REGRAS_PILOTO;
  return (
    <>
      <PageHeader
        icone="conhecimento"
        titulo="Regulamento e avisos"
        descricao={`Regras da edição — versão ${r.versao}`}
      />
      <Alert tom="alerta" titulo="Resumo em validação">
        Este é um resumo das regras do piloto. O regulamento oficial aprovado prevalece e será
        publicado aqui pela coordenação.
      </Alert>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card icone="pontuacao" titulo="Pontuação por encontro">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              Presença: {r.presenca.pontosPorIntegrante} por integrante, até{' '}
              {r.presenca.maximoPorDupla} por dupla.
            </li>
            <li>
              Participação: até {r.participacao.criterios.reduce((t, c) => t + c.maximo, 0)} (
              {r.participacao.criterios
                .map((c) => `${c.rotulo.toLowerCase()} ${c.maximo}`)
                .join(', ')}
              ).
            </li>
            <li>Questões: acertos ÷ total × {r.questoes.maximo}.</li>
            <li>
              Entrega prática: até {r.entrega.criterios.reduce((t, c) => t + c.maximo, 0)} (4
              critérios de até 10).
            </li>
            <li>Apresentação: até {r.apresentacao.criterios.reduce((t, c) => t + c.maximo, 0)}.</li>
            <li>Total: até {maximoPorEncontro(r)} por encontro.</li>
          </ul>
        </Card>
        <Card icone="prova" titulo="Prova oficial, atrasos e ocorrências">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              Prova oficial: {r.provaOficial.pontosRealizacao} pontos por estudante com realização
              confirmada e +{r.provaOficial.pontosBonus} com nota confirmada ≥{' '}
              {r.provaOficial.notaMinimaBonus}. Nota pendente não gera bônus.
            </li>
            <li>
              Atraso até 15 min: −2 no critério organização; até 30 min: −5; acima de 30 min:
              entrega não realizada, salvo exceção registrada.
            </li>
            <li>
              Descontos por ocorrências distintas: até {r.penalidades.tetoDescontosPorEncontro}{' '}
              pontos por encontro; nunca duas penalidades pelo mesmo fato.
            </li>
            <li>A pontuação do encontro nunca fica negativa.</li>
            <li>Pedido de revisão: até 24 horas após a publicação.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
