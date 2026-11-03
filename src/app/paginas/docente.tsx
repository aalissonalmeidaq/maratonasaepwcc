import { useAuth } from '@/modules/auth';
import { PainelGestao } from '@/modules/relatorios';
import { Consulta } from '../dados/Consulta';
import { usePainelDaGestao } from '../dados/consultas';
import { Atalhos } from '../layout/Atalhos';
import { ComEdicao } from './ComEdicao';

function PainelDaEdicao({ edicaoId }: { edicaoId: string }) {
  const { sessao } = useAuth();
  return (
    <Consulta consulta={usePainelDaGestao(edicaoId)}>
      {(painel) => (
        <PainelGestao painel={painel} nome={sessao?.nome ?? 'docente'} ficticio={sessao?.demo} />
      )}
    </Consulta>
  );
}

/** Painel inicial da equipe docente com dados do servidor (spec 008, US2). */
export function DocenteInicioPage() {
  return (
    <>
      <ComEdicao>{(edicao) => <PainelDaEdicao edicaoId={edicao.id} />}</ComEdicao>
      <section aria-label="Acessos da equipe docente" className="mt-6">
        <Atalhos area="docente" compacto />
      </section>
    </>
  );
}
