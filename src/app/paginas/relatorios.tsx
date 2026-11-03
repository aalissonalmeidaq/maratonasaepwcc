import type { Edicao } from '@/modules/organizacao';
import { FormRelatorio } from '@/modules/relatorios';
import { useOnline } from '@/shared/pwa';
import { Card, PageHeader } from '@/shared/ui';
import { useCursos, useEncontros, useTurmas } from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';
import { ComEdicao } from './ComEdicao';

/** Exportar exige o servidor: nada é montado a partir de cache nem na demonstração (FR-012, FR-015). */
function useBloqueioDeExportacao(): string | undefined {
  const { somenteLeitura } = useRepositorios();
  const online = useOnline();
  if (somenteLeitura) return 'Indisponível no modo demonstração: a exportação exige o servidor.';
  if (!online) return 'Sem conexão: a exportação exige conexão com o servidor.';
  return undefined;
}

function Exportacao({ edicao, perfil }: { edicao: Edicao; perfil: 'coordenacao' | 'docente' }) {
  const r = useRepositorios();
  const bloqueio = useBloqueioDeExportacao();
  const cursos = useCursos(edicao.id);
  const turmas = useTurmas(edicao.id);
  const encontros = useEncontros(edicao.id);
  return (
    <Card icone="exportar" titulo="Exportar relatório">
      <FormRelatorio
        perfil={perfil}
        categorias={[...new Set((cursos.data ?? []).map((c) => c.categoria))].sort()}
        turmas={(turmas.data ?? []).map((t) => ({ id: t.id, nome: t.nome }))}
        encontros={(encontros.data ?? []).map((e) => ({
          id: e.id,
          rotulo: `${e.numero}. ${e.titulo}`,
        }))}
        bloqueio={bloqueio}
        onExportar={(tipo, filtros) =>
          r.paineis.relatorio(tipo, { edicaoId: edicao.id, ...filtros })
        }
      />
    </Card>
  );
}

export function CoordenacaoRelatoriosPage() {
  return (
    <>
      <PageHeader
        icone="relatorio"
        titulo="Relatórios"
        descricao="Exporte em CSV os dados de toda a edição: pontos, presença, entregas, ocorrências e pedidos de revisão."
      />
      <ComEdicao>{(edicao) => <Exportacao edicao={edicao} perfil="coordenacao" />}</ComEdicao>
    </>
  );
}

export function DocenteRelatoriosPage() {
  return (
    <>
      <PageHeader
        icone="relatorio"
        titulo="Relatórios"
        descricao="Exporte em CSV os dados das turmas em que você atua: pontos, presença, entregas e ocorrências."
      />
      <ComEdicao>{(edicao) => <Exportacao edicao={edicao} perfil="docente" />}</ComEdicao>
    </>
  );
}
