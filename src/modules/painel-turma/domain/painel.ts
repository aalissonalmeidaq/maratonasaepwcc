/**
 * Regras puras do painel da turma (spec 004). Os indicadores são derivados das mesmas listas
 * exibidas, para que sempre batam com elas (SC-003).
 */
import type { AlunoDoPainel, EncontroDoPainel, PainelTurma } from './tipos';

export interface IndicadoresPainel {
  alunosAtivos: number;
  comEquipe: number;
  semEquipe: number;
  equipes: number;
  /** `null` na visão do aluno. */
  convitesPendentes: number | null;
}

export function alunosSemEquipe(p: PainelTurma): AlunoDoPainel[] {
  return p.alunos.filter((a) => !a.temEquipe);
}

export function indicadores(p: PainelTurma): IndicadoresPainel {
  const semEquipe = alunosSemEquipe(p).length;
  return {
    alunosAtivos: p.alunos.length,
    comEquipe: p.alunos.length - semEquipe,
    semEquipe,
    equipes: p.equipes.length,
    convitesPendentes: p.convitesPendentes,
  };
}

export interface EncontrosAgrupados {
  proximo: EncontroDoPainel | null;
  agendados: EncontroDoPainel[];
  realizados: EncontroDoPainel[];
  cancelados: EncontroDoPainel[];
}

const porData = (a: EncontroDoPainel, b: EncontroDoPainel) =>
  a.data.localeCompare(b.data) || a.numero - b.numero;

/** Mesma regra de `situacaoEncontro` (módulo encontros); `hoje` no formato AAAA-MM-DD. */
export function agruparEncontros(encontros: EncontroDoPainel[], hoje: string): EncontrosAgrupados {
  const ordenados = [...encontros].sort(porData);
  const cancelados = ordenados.filter((e) => e.estado === 'cancelado');
  const realizados = ordenados.filter(
    (e) => e.estado !== 'cancelado' && (e.estado === 'realizado' || e.data < hoje),
  );
  const agendados = ordenados.filter((e) => e.estado === 'agendado' && e.data >= hoje);
  return { proximo: agendados[0] ?? null, agendados, realizados, cancelados };
}
