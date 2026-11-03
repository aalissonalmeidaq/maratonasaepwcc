import { useAuth } from '@/modules/auth';
import { painelCoordenacao } from '@/modules/demo';
import type { Edicao } from '@/modules/organizacao';
import { PainelCoordenacao } from '@/modules/relatorios';
import { Alert, PageHeader, StatCard, StatusBadge } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import { usePainelDaCoordenacao } from '../dados/consultas';
import { Atalhos } from '../layout/Atalhos';
import { ComDadosDemo } from './comum';
import { ComEdicao } from './ComEdicao';

type Painel = ReturnType<typeof painelCoordenacao>;
const carregar = () => painelCoordenacao();

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

/** Painel inicial da coordenação com dados do servidor (spec 008, US3). */
export function CoordenacaoInicioPage() {
  return (
    <>
      <ComEdicao>{(edicao) => <PainelDaEdicao edicao={edicao} />}</ComEdicao>
      <section aria-label="Acessos da coordenação" className="mt-6">
        <Atalhos area="coordenacao" compacto />
      </section>
    </>
  );
}

export function CoordenacaoPremiacaoPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            icone="trofeu"
            titulo="Premiação"
            descricao="Configuração da edição — não fixada no código."
          />
          <Alert tom="alerta" titulo="Detalhes a confirmar pela coordenação">
            Valores, quantidade de itens por dupla, validade dos vouchers e condições de entrega
            ainda não foram informados.
          </Alert>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {p.edicao.premiacao.map((item) => (
              <StatCard
                key={item.posicao}
                icone="medalha"
                acento={item.posicao === 1 ? 'amarelo' : item.posicao === 2 ? 'ciano' : 'coral'}
                rotulo={`${item.posicao}º lugar`}
                valor={<span className="text-lg">{item.descricao}</span>}
                complemento={item.detalhes ?? <StatusBadge estado="a_confirmar" />}
              />
            ))}
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}
