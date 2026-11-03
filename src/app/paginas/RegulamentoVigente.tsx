import { ResumoRegulamento } from '@/modules/comunicados';
import type { Edicao } from '@/modules/organizacao';
import { useRegrasDaTurma, useTurmas } from '../dados/consultas';

/**
 * Resumo do regulamento com as regras vigentes da turma de quem consulta (spec 011, US5): quem tem
 * uma turma só (estudante, docente de uma turma) vê as da turma, com o que foi definido para ela e
 * a pontuação máxima; os demais, as da edição.
 */
export function RegulamentoVigente({ edicao }: { edicao: Edicao }) {
  const turmas = useTurmas(edicao.id).data;
  const turmaId = turmas?.length === 1 ? turmas[0]!.id : undefined;
  const daTurma = useRegrasDaTurma(turmaId).data;
  if (daTurma) {
    return (
      <ResumoRegulamento
        regras={daTurma.regras}
        versao={daTurma.versao}
        gruposAjustados={daTurma.gruposAjustados}
        maximo={daTurma.maximo}
      />
    );
  }
  return <ResumoRegulamento regras={edicao.regras} versao={edicao.regrasVersao} />;
}
