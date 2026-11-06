import type { EntradaComunicado } from './tipos';

/** Limites do título e do texto (premissas técnicas da spec 009; em validação como P30, spec 015). */
export const LIMITE_TITULO = 200;
export const LIMITE_TEXTO = 5000;

export type ErrosComunicado = Partial<Record<keyof EntradaComunicado, string>>;

/**
 * Mensagens por campo, iguais às regras do servidor (FR-001, FR-002). Docente e mentor publicam
 * só para turmas, então precisam escolher ao menos uma; a coordenação pode deixar sem turma.
 */
export function validarComunicado(
  entrada: EntradaComunicado,
  perfil: 'coordenacao' | 'docente',
): ErrosComunicado {
  const erros: ErrosComunicado = {};
  const titulo = entrada.titulo.trim();
  const texto = entrada.texto.trim();
  if (!titulo) erros.titulo = 'Informe o título.';
  else if (titulo.length > LIMITE_TITULO) erros.titulo = 'O título pode ter até 200 caracteres.';
  if (!texto) erros.texto = 'Escreva o texto.';
  else if (texto.length > LIMITE_TEXTO) erros.texto = 'O texto pode ter até 5.000 caracteres.';
  if (!entrada.publico) erros.publico = 'Escolha o público.';
  if (perfil === 'docente' && entrada.turmaIds.length === 0) {
    erros.turmaIds = 'Escolha pelo menos uma turma.';
  }
  return erros;
}
