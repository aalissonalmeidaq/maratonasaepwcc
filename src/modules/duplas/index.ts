// Módulo 4 — duplas e integrantes (API pública).
export { criarRepositorioDuplasSupabase } from './data/repositorioSupabase';
export {
  MINIMO_JUSTIFICATIVA,
  validarComposicao,
  validarJustificativa,
  type EstudanteElegivel,
  type NovaDupla,
} from './domain/composicao';
export type { Dupla, IntegranteAtual, RegistroHistorico, RepositorioDuplas } from './domain/tipos';
export { AcoesDupla } from './ui/AcoesDupla';
export { FormDupla } from './ui/FormDupla';
