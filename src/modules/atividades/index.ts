// Módulo — atividades dos encontros (spec 006): desafios e entregas, presença e participação,
// avaliação por rubrica, questões e pontuação parcial (API pública).
export { criarRepositorioAtividadesSupabase } from './data/repositorioSupabase';
export {
  EXTENSOES_ACEITAS,
  LIMITE_ARQUIVO_BYTES,
  atrasoPrevisto,
  situacaoDesafio,
  validarArquivo,
  validarLink,
  type SituacaoDesafio,
} from './domain/regras';
export type * from './domain/tipos';
export { EnvioEntrega, type EnviarEntrega } from './ui/EnvioEntrega';
export { paraDataHoraLocal } from './domain/datas';
export { FormDesafio, GrupoDeMarcacao, Marcacao } from './ui/FormDesafio';
export { CamposDeNotas, FormParticipacao } from './ui/FormParticipacao';
export { RegistroPresenca } from './ui/RegistroPresenca';
export { useNotas } from './ui/useNotas';
export { AvaliacaoDaEquipe } from './ui/AvaliacaoDaEquipe';
export { FormAvaliacao } from './ui/FormAvaliacao';
export { FormProrrogacao } from './ui/FormProrrogacao';
export { FormLista } from './ui/FormLista';
export { ResponderLista, type EnviarRespostas } from './ui/ResponderLista';
export { ResultadoLista } from './ui/ResultadoLista';
export { calcularParcial, type ComponenteParcial } from './domain/lancamentos';
export { PontuacaoDoEncontro } from './ui/PontuacaoDoEncontro';
