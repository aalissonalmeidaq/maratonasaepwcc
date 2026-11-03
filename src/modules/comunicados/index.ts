// Módulo comunicados — comunicados por público e resumo do regulamento (API pública, spec 009).
export * from './domain/tipos';
export { validarComunicado, LIMITE_TEXTO, LIMITE_TITULO } from './domain/validacao';
export { criarRepositorioComunicadosSupabase } from './data/repositorioSupabase';
export { FormComunicado } from './ui/FormComunicado';
export { GestaoComunicados, type AcoesComunicado } from './ui/GestaoComunicados';
export { ListaComunicados } from './ui/ListaComunicados';
export { ResumoRegulamento } from './ui/ResumoRegulamento';
export {
  resumoDoRegulamento,
  type ItemRegulamento,
  type ResumoRegulamento as ResumoDoRegulamento,
} from './domain/regulamento';
