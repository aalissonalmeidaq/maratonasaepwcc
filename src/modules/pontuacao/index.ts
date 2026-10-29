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
