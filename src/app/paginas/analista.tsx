import { useState, type ReactNode } from 'react';
import { useAuth } from '@/modules/auth';
import type { EdicaoDaUnidade } from '@/modules/rede';
import { PainelCoordenacao } from '@/modules/relatorios';
import { EmptyState, PageHeader, SelectField } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import { useEdicoesDaUnidade, usePainelDaCoordenacao } from '../dados/consultas';
import { Exportacao } from './relatorios';

const ROTULO_ESTADO = {
  rascunho: 'em preparação',
  ativa: 'ativa',
  encerrada: 'encerrada',
} as const;

/**
 * Edições da unidade do analista (spec 016): abre na ativa e troca pelo seletor. O analista não
 * tem vínculo com as edições; a lista vem do servidor, sem dados de estudantes.
 */
function ComEdicaoDaUnidade({ children }: { children: (edicao: EdicaoDaUnidade) => ReactNode }) {
  const [escolhida, setEscolhida] = useState('');
  return (
    <Consulta consulta={useEdicoesDaUnidade()}>
      {(edicoes) => {
        if (edicoes.length === 0) return <EmptyState titulo="Nenhuma edição na unidade." />;
        const atual =
          edicoes.find((e) => e.id === escolhida) ??
          edicoes.find((e) => e.estado === 'ativa') ??
          edicoes[0]!;
        return (
          <>
            <div className="mb-4 max-w-md">
              <SelectField
                rotulo="Edição"
                value={atual.id}
                onChange={(e) => setEscolhida(e.target.value)}
                opcoes={edicoes.map((e) => ({
                  valor: e.id,
                  rotulo: `${e.nome} (${ROTULO_ESTADO[e.estado]})`,
                }))}
              />
            </div>
            {children(atual)}
          </>
        );
      }}
    </Consulta>
  );
}

function PainelDaEdicao({ edicao }: { edicao: EdicaoDaUnidade }) {
  const { sessao } = useAuth();
  return (
    <Consulta consulta={usePainelDaCoordenacao(edicao.id)}>
      {(painel) => (
        <PainelCoordenacao
          painel={painel}
          edicaoNome={edicao.nome}
          ficticio={sessao?.demo}
          somenteLeitura
        />
      )}
    </Consulta>
  );
}

/** Início do analista: o painel da edição escolhida, só para leitura. */
export function AnalistaInicioPage() {
  return <ComEdicaoDaUnidade>{(edicao) => <PainelDaEdicao edicao={edicao} />}</ComEdicaoDaUnidade>;
}

export function AnalistaRelatoriosPage() {
  return (
    <>
      <PageHeader
        icone="relatorio"
        titulo="Relatórios"
        descricao="Exporte em CSV os dados da edição: pontos, presença, entregas e ocorrências. Os pedidos de revisão ficam com a coordenação."
      />
      <ComEdicaoDaUnidade>
        {(edicao) => <Exportacao edicaoId={edicao.id} perfil="analista" />}
      </ComEdicaoDaUnidade>
    </>
  );
}
