export type {
  RegulamentoPublico,
  EdicaoPublica,
  EncontroPublico,
  RepositorioPublico,
  LeituraDoRegulamento,
} from './domain/tipos';
export { regulamentoPublicoSchema, regrasPublicasSchema } from './domain/validacao';
export { criarRepositorioPublicoSupabase } from './data/repositorioSupabase';
export { RegulamentoPublico as ConteudoRegulamentoPublico } from './ui/RegulamentoPublico';
export { lerRegulamento } from './data/lerRegulamento';
export { chaveDaCopia } from './data/copiaLocal';
