export type EstadoEncontro = 'agendado' | 'realizado' | 'cancelado';
export type AvaliacaoObjetiva = 'questoes' | 'prova_oficial';

export interface DadosEncontro {
  numero: number;
  titulo: string;
  /** AAAA-MM-DD */
  data: string;
  /** HH:MM ou vazio (a confirmar) */
  inicio?: string;
  fim?: string;
}

export interface ContextoEncontro {
  quantidadeEncontros: number;
  numerosExistentes: number[];
  /** Número do encontro em edição (não conta como repetido). */
  numeroAtual?: number;
}

export type ErrosEncontro = Partial<Record<keyof DadosEncontro, string>>;

/** Validação prévia (FR-007). O servidor repete as mesmas regras. */
export function validarEncontro(e: DadosEncontro, ctx: ContextoEncontro): ErrosEncontro {
  const erros: ErrosEncontro = {};
  if (e.titulo.trim().length < 3) erros.titulo = 'Informe um título com pelo menos 3 caracteres.';
  if (!e.data) erros.data = 'Informe a data.';

  if (!Number.isInteger(e.numero) || e.numero < 1) {
    erros.numero = 'Informe um número inteiro a partir de 1.';
  } else if (e.numero > ctx.quantidadeEncontros) {
    erros.numero = `A edição está configurada com ${ctx.quantidadeEncontros} encontros. Ajuste a configuração antes de criar o encontro ${e.numero}.`;
  } else if (e.numero !== ctx.numeroAtual && ctx.numerosExistentes.includes(e.numero)) {
    erros.numero = 'Já existe um encontro com esse número.';
  }

  if (e.inicio && e.fim && e.fim <= e.inicio) erros.fim = 'O término deve ser depois do início.';
  return erros;
}

export type SituacaoEncontro = 'agendado' | 'hoje' | 'realizado' | 'cancelado';

export function situacaoEncontro(
  e: { data: string; estado: EstadoEncontro },
  hoje: string,
): SituacaoEncontro {
  if (e.estado === 'cancelado') return 'cancelado';
  if (e.estado === 'realizado' || e.data < hoje) return 'realizado';
  return e.data === hoje ? 'hoje' : 'agendado';
}
