// Módulo — painel da turma (spec 004): leitura consolidada de uma turma (API pública).
export { criarRepositorioPainelTurmaSupabase } from './data/repositorioSupabase';
export {
  agruparEncontros,
  alunosSemEquipe,
  indicadores,
  type EncontrosAgrupados,
  type IndicadoresPainel,
} from './domain/painel';
export type {
  AlunoDoPainel,
  EncontroDoPainel,
  EquipeDoPainel,
  EstadoClassificacao,
  PontuacaoDaEquipe,
  PontuacaoDoPainel,
  PainelTurma as DadosPainelTurma,
  RepositorioPainelTurma,
  TurmaDoPainel,
  VisaoPainel,
} from './domain/tipos';
export { PainelTurma } from './ui/PainelTurma';
