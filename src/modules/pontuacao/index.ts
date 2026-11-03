// Módulo 11 — pontuação e classificação (API pública).
export * from './domain/tipos';
export {
  ErroDeRegra,
  arredondar,
  calcularEncontro,
  consolidarPenalidades,
  descontoPorAtraso,
  pontuarPresenca,
  pontuarProvaOficial,
  pontuarQuestoes,
  pontuarRubrica,
} from './domain/calculo';
export {
  acumularEncontros,
  classificar,
  type DuplaParaRanking,
  type PosicaoNoRanking,
} from './domain/ranking';
export { REGRAS_PILOTO, maximoDaEdicao, maximoPorEncontro } from './domain/regras-piloto';
export * from './domain/regrasTipos';
export { combinarRegras, pontuacaoMaximaDoEncontro } from './domain/regrasVigentes';
export {
  idDoCriterio,
  sugerirRotulo,
  validarRegras,
  type ErrosDeRegras,
} from './domain/validacaoRegras';
export { criarRepositorioRegrasSupabase } from './data/repositorioRegrasSupabase';
export { EditorDeCriterios } from './ui/EditorDeCriterios';
export { CamposDoGrupo, FormRegras } from './ui/FormRegras';
export { HistoricoRegras } from './ui/HistoricoRegras';
export { FormAjustesTurma } from './ui/FormAjustesTurma';
export { EncontrosDaTurma } from './ui/EncontrosDaTurma';
export { PontuacaoMaxima } from './ui/PontuacaoMaxima';
