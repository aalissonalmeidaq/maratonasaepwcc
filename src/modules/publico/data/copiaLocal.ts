import type { RegulamentoPublico } from '../domain/tipos';
import { copiaPublicaSchema, regulamentoPublicoSchema } from '../domain/validacao';
export function chaveDaCopia(modo: string, projeto: string) {
  return `maratona:regulamento-publico:v1:${modo}:${projeto}`;
}
export function lerCopia(
  chave: string,
  storage?: Storage,
): { salvoEm: string; conteudo: RegulamentoPublico } | null {
  try {
    const texto = (storage ?? localStorage).getItem(chave);
    return texto ? copiaPublicaSchema.parse(JSON.parse(texto)) : null;
  } catch {
    return null;
  }
}
export function salvarCopia(
  chave: string,
  conteudo: RegulamentoPublico,
  storage?: Storage,
): string | null {
  try {
    const copia = {
      salvoEm: new Date().toISOString(),
      conteudo: regulamentoPublicoSchema.parse(conteudo),
    };
    (storage ?? localStorage).setItem(chave, JSON.stringify(copia));
    return copia.salvoEm;
  } catch {
    return null;
  }
}
