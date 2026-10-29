// Módulo 5 — encontros e ambientes (API pública).
export { criarRepositorioEncontrosSupabase } from './data/repositorioSupabase';
export {
  situacaoEncontro,
  validarEncontro,
  type AvaliacaoObjetiva,
  type ErrosEncontro,
  type EstadoEncontro,
  type SituacaoEncontro,
} from './domain/encontro';
export type { Ambiente, DadosNovoEncontro, Encontro, RepositorioEncontros } from './domain/tipos';
export { FormAmbiente } from './ui/FormAmbiente';
export { FormEncontro } from './ui/FormEncontro';
