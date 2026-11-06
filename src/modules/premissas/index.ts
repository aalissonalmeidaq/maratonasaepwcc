// Módulo premissas — premissas em validação e respostas da coordenação (API pública, spec 015).
export * from './domain/tipos';
export { ROTULO_SITUACAO, contarPorSituacao } from './domain/situacao';
export { criarRepositorioPremissasSupabase } from './data/repositorioSupabase';
export { PremissasPage } from './ui/PremissasPage';
export { FormResposta } from './ui/FormResposta';
