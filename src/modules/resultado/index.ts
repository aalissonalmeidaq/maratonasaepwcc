// Módulo resultado — prova oficial, ocorrências, ranking publicado, revisão e avisos (API pública).
export * from './domain/tipos';
export {
  podeManifestar,
  podePedirRevisao,
  prazoAberto,
  rotuloEstadoOcorrencia,
  rotuloEstadoRanking,
  ROTULO_COMPONENTE,
  objetoDoPedido,
  type AlvoDeRevisao,
} from './domain/prazos';
export { criarRepositorioResultadoSupabase } from './data/repositorioSupabase';
export { FormResultadosProva } from './ui/FormResultadosProva';
export { FormOcorrencia } from './ui/FormOcorrencia';
export { ListaOcorrencias } from './ui/ListaOcorrencias';
export { FormManifestacao } from './ui/FormManifestacao';
export { FormDecisao } from './ui/FormDecisao';
export { FormExcecaoPrazo } from './ui/FormExcecaoPrazo';
export { ContadorAvisos } from './ui/ContadorAvisos';
export { ListaAvisos } from './ui/ListaAvisos';
export { PreviaPontos } from './ui/PreviaPontos';
export { TabelaRanking } from './ui/TabelaRanking';
export { PainelPublicacao } from './ui/PainelPublicacao';
export { HistoricoPublicacoes } from './ui/HistoricoPublicacoes';
export { FormPedidoRevisao } from './ui/FormPedidoRevisao';
export { ListaRevisoes } from './ui/ListaRevisoes';
export { FormRespostaRevisao } from './ui/FormRespostaRevisao';
