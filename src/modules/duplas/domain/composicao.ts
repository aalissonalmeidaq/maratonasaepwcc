/**
 * Validação prévia da composição de duplas, usada para orientar o formulário.
 * A autoridade é o servidor (RPC `formar_dupla`), que repete estas regras.
 */
export interface EstudanteElegivel {
  id: string;
  nome: string;
  turmaId: string;
  duplaAtivaId: string | null;
}

export interface NovaDupla {
  turmaId: string;
  nome: string;
  integrantes: string[];
}

export const TAMANHO_DA_DUPLA = 2;
export const MINIMO_JUSTIFICATIVA = 10;

export function validarComposicao(dupla: NovaDupla, estudantes: EstudanteElegivel[]): string[] {
  const erros: string[] = [];
  const nome = dupla.nome.trim();
  if (nome.length < 2 || nome.length > 80)
    erros.push('Informe um nome para a dupla (2 a 80 caracteres).');

  if (dupla.integrantes.length !== TAMANHO_DA_DUPLA) {
    erros.push('Selecione exatamente dois estudantes.');
    return erros;
  }
  if (new Set(dupla.integrantes).size !== dupla.integrantes.length) {
    erros.push('Escolha dois estudantes diferentes.');
    return erros;
  }
  for (const id of dupla.integrantes) {
    const e = estudantes.find((x) => x.id === id);
    if (!e || e.turmaId !== dupla.turmaId) {
      erros.push(`${e?.nome ?? 'Estudante'} não é aluno ativo desta turma.`);
    } else if (e.duplaAtivaId) {
      erros.push(`${e.nome} já participa de outra dupla ativa.`);
    }
  }
  return erros;
}

export function validarJustificativa(texto: string): string | null {
  return texto.trim().length >= MINIMO_JUSTIFICATIVA
    ? null
    : `Informe uma justificativa com pelo menos ${MINIMO_JUSTIFICATIVA} caracteres.`;
}
