/**
 * Validações compartilhadas das alterações de equipe. A autoridade é o servidor, que repete
 * estas regras nas RPCs de gestão (spec 003).
 */
export const MINIMO_JUSTIFICATIVA = 10;

export function validarJustificativa(texto: string): string | null {
  return texto.trim().length >= MINIMO_JUSTIFICATIVA
    ? null
    : `Informe uma justificativa com pelo menos ${MINIMO_JUSTIFICATIVA} caracteres.`;
}
