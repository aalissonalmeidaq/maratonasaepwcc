import { Link } from 'react-router';
import { useAuth } from '@/modules/auth';
import type { Edicao } from '@/modules/organizacao';
import { contarPorSituacao } from '@/modules/premissas';
import { PainelCoordenacao } from '@/modules/relatorios';
import { FormDecisaoEmpate, PremiacaoPorTurma } from '@/modules/resultado';
import { Alert, EmptyState, PageHeader } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  useBloqueioDeEscrita,
  useGravar,
  usePainelDaCoordenacao,
  usePremissas,
  usePremiacaoDaEdicao,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';
import { ComEdicao } from './ComEdicao';

function PainelDaEdicao({ edicao }: { edicao: Edicao }) {
  const { sessao } = useAuth();
  return (
    <Consulta consulta={usePainelDaCoordenacao(edicao.id)}>
      {(painel) => (
        <PainelCoordenacao painel={painel} edicaoNome={edicao.nome} ficticio={sessao?.demo} />
      )}
    </Consulta>
  );
}

/** Premissas que aguardam resposta da unidade (spec 015, FR-005); some quando não há nenhuma. */
export function AvisoDePremissas() {
  const { data } = usePremissas();
  const aguardando = data ? contarPorSituacao(data.premissas).aguardando : 0;
  if (aguardando === 0) return null;
  return (
    <div className="mb-6">
      <Alert tom="info" titulo={`Premissas aguardando resposta: ${aguardando}`}>
        Escolhas que o sistema adotou sem decisão da unidade.{' '}
        <Link to="/coordenacao/premissas" className="font-semibold text-link underline">
          Ver premissas
        </Link>
      </Alert>
    </div>
  );
}

/** Painel inicial da coordenação com dados do servidor (spec 008, US3). */
export function CoordenacaoInicioPage() {
  return (
    <>
      <AvisoDePremissas />
      <ComEdicao>{(edicao) => <PainelDaEdicao edicao={edicao} />}</ComEdicao>
    </>
  );
}

/** Premiação por turma com os dados do servidor (spec 012, FR-018, FR-018a, FR-018b). */
function PremiacaoDaCoordenacao({ edicao }: { edicao: Edicao }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  return (
    <>
      <PageHeader
        icone="trofeu"
        titulo="Premiação"
        descricao="Os prêmios configurados na edição valem para cada turma, pela publicação definitiva."
      />
      <Consulta consulta={usePremiacaoDaEdicao(edicao.id)}>
        {(premiacoes) =>
          premiacoes.length === 0 ? (
            <EmptyState titulo="Nenhuma turma cadastrada nesta edição." />
          ) : (
            <PremiacaoPorTurma
              premiacoes={premiacoes}
              renderizarDecisao={(p, item) =>
                p.publicacaoId && (
                  <FormDecisaoEmpate
                    item={item}
                    bloqueio={bloqueio}
                    onDecidir={(d) =>
                      gravar(() =>
                        r.resultado.decidirPremiacaoEmpate({
                          publicacaoId: p.publicacaoId as string,
                          posicao: item.posicao,
                          ...d,
                        }),
                      )()
                    }
                  />
                )
              }
            />
          )
        }
      </Consulta>
    </>
  );
}

export function CoordenacaoPremiacaoPage() {
  return <ComEdicao>{(edicao) => <PremiacaoDaCoordenacao edicao={edicao} />}</ComEdicao>;
}
