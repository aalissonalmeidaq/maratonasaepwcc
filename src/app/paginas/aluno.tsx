import { Link } from 'react-router';
import { useAuth } from '@/modules/auth';
import { PainelAluno } from '@/modules/relatorios';
import { Card, PageHeader } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import { useConvitesPendentes, usePainelDoAluno } from '../dados/consultas';
import { Atalhos } from '../layout/Atalhos';
import { ComEdicao } from './ComEdicao';
import { ComunicadosRecebidos } from './comunicados';
import { RegulamentoVigente } from './RegulamentoVigente';

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
  return (
    <>
      <PageHeader
        icone="conhecimento"
        titulo="Regulamento e avisos"
        descricao="Comunicados da edição e o resumo das regras."
      />
      <ComEdicao>
        {(edicao) => (
          <div className="grid gap-4">
            <Card icone="noticia" titulo="Comunicados">
              <ComunicadosRecebidos edicao={edicao} />
            </Card>
            <RegulamentoVigente edicao={edicao} />
          </div>
        )}
      </ComEdicao>
    </>
  );
}
