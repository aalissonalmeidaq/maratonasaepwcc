// Módulo relatorios — painéis com dados reais e relatórios CSV (API pública, spec 008).
export * from './domain/tipos';
export { gerarCsv, nomeDoArquivo } from './domain/csv';
export { criarRepositorioPaineisSupabase } from './data/repositorioSupabase';
export { PainelAluno } from './ui/PainelAluno';
export { PainelGestao } from './ui/PainelGestao';
export { PainelCoordenacao } from './ui/PainelCoordenacao';
export { FormRelatorio } from './ui/FormRelatorio';
