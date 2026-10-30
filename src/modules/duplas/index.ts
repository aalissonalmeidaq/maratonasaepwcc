// Módulo 4 — equipes (duplas e trios) e integrantes (API pública).
export { criarRepositorioDuplasSupabase } from './data/repositorioSupabase';
export { MINIMO_JUSTIFICATIVA, validarJustificativa } from './domain/composicao';
export {
  convitesRecebidosPendentes,
  nomeDeExibicao,
  turmaPermiteTrio,
  validarConvite,
  validarNomeEquipe,
} from './domain/equipes';
export type {
  Colega,
  ConviteEquipe,
  Dupla,
  Equipe,
  EquipeGestao,
  IntegranteAtual,
  RegistroHistorico,
  RepositorioDuplas,
} from './domain/tipos';
export { ContadorConvites, ConvitesEquipe } from './ui/ConvitesEquipe';
export { AcoesDupla } from './ui/AcoesDupla';
export { FormEquipeDocente } from './ui/FormEquipeDocente';
export { NomeEquipe } from './ui/NomeEquipe';
