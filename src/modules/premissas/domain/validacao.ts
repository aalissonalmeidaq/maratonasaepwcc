import type { Decisao } from './tipos';

/** Mesmo limite do servidor (`responder_premissa`): 10 a 2.000 caracteres sem espaços nas pontas. */
export const LIMITE_JUSTIFICATIVA = 2000;
const MINIMO_JUSTIFICATIVA = 10;

export interface RascunhoResposta {
  decisao: Decisao | null;
  justificativa: string;
}

export type ErrosResposta = Partial<Record<keyof RascunhoResposta, string>>;

/** Validação no navegador da resposta à premissa (FR-006); o servidor repete a validação. */
export function validarResposta(r: RascunhoResposta): ErrosResposta {
  const erros: ErrosResposta = {};
  if (!r.decisao) erros.decisao = 'Escolha "Confirmada" ou "Precisa mudar".';
  const tamanho = r.justificativa.trim().length;
  if (tamanho < MINIMO_JUSTIFICATIVA || tamanho > LIMITE_JUSTIFICATIVA)
    erros.justificativa = 'Justifique com 10 a 2.000 caracteres.';
  return erros;
}
