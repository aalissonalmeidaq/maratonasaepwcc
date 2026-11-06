// Módulo rede — unidades, master e gestão da unidade (API pública, spec 016).
export * from './domain/tipos';
export {
  validarCadastroDeUnidade,
  validarContaDaRede,
  validarJustificativa,
  validarNomeDaUnidade,
  validarTransferencia,
} from './domain/validacao';
export { criarRepositorioRedeSupabase } from './data/repositorioSupabase';
export { EdicoesDaUnidade, type AcoesDeEdicoes } from './ui/EdicoesDaUnidade';
export { EquipeDaUnidade, type AcoesDaEquipe } from './ui/EquipeDaUnidade';
export { Masters, type AcoesDeMasters } from './ui/Masters';
export { Unidades, type AcoesDeUnidades } from './ui/Unidades';
export { TransferirConta, type AcoesDeTransferencia } from './ui/TransferirConta';
