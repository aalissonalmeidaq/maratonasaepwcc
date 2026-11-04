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
export {
  premiacaoDaTurma,
  type ItemPremiacaoConfigurado,
  type PerfilDaPremiacao,
} from './domain/premiacao';
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
export { PainelPublicacao, type TurmaMarcada } from './ui/PainelPublicacao';
export { ListaTurmasRanking } from './ui/ListaTurmasRanking';
export { ListaPendencias } from './ui/ListaPendencias';
export { ResultadoDoLote } from './ui/ResultadoDoLote';
export { PremiacaoPorTurma } from './ui/PremiacaoPorTurma';
export { FormDecisaoEmpate } from './ui/FormDecisaoEmpate';
export { HistoricoPublicacoes } from './ui/HistoricoPublicacoes';
export { FormPedidoRevisao } from './ui/FormPedidoRevisao';
export { ListaRevisoes } from './ui/ListaRevisoes';
export { FormRespostaRevisao } from './ui/FormRespostaRevisao';
