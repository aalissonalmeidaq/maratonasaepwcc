import type {
  ComponentePendente,
  CriterioRubrica,
  LancamentosDoEncontro,
  Notas,
  Penalidade,
  PontuacaoDoEncontro,
  RegistroPresenca,
  RegrasDaEdicao,
  ResultadoProvaOficial,
} from './tipos';

export class ErroDeRegra extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeRegra';
  }
}

/** Arredonda meio para cima com a quantidade de casas da edição (evita erro de ponto flutuante). */
export function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

export function pontuarQuestoes(acertos: number, total: number, regras: RegrasDaEdicao): number {
  if (!Number.isInteger(total) || total <= 0) {
    throw new ErroDeRegra('O total de questões deve ser um inteiro maior que zero.');
  }
  if (!Number.isInteger(acertos) || acertos < 0 || acertos > total) {
    throw new ErroDeRegra('Os acertos devem estar entre 0 e o total de questões.');
  }
  return arredondar((acertos * regras.questoes.maximo) / total, regras.casasDecimais);
}

export function pontuarPresenca(presencas: RegistroPresenca[], regras: RegrasDaEdicao): number {
  const presentes = presencas.filter((p) => p.presente).length;
  return Math.min(presentes * regras.presenca.pontosPorIntegrante, regras.presenca.maximoPorDupla);
}

export function pontuarRubrica(notas: Notas, criterios: CriterioRubrica[]): number {
  const conhecidos = new Set(criterios.map((c) => c.id));
  for (const id of Object.keys(notas)) {
    if (!conhecidos.has(id)) throw new ErroDeRegra(`Critério desconhecido: ${id}.`);
  }
  let soma = 0;
  for (const c of criterios) {
    const nota = notas[c.id];
    if (nota === undefined) throw new ErroDeRegra(`Nota ausente para "${c.rotulo}".`);
    if (!Number.isFinite(nota) || nota < 0 || nota > c.maximo) {
      throw new ErroDeRegra(`A nota de "${c.rotulo}" deve estar entre 0 e ${c.maximo}.`);
    }
    soma += nota;
  }
  return soma;
}

export function descontoPorAtraso(
  minutos: number,
  regras: RegrasDaEdicao,
): { desconto: number; naoRealizada: boolean } {
  if (!Number.isFinite(minutos) || minutos < 0) {
    throw new ErroDeRegra('O atraso não pode ser negativo.');
  }
  if (minutos === 0) return { desconto: 0, naoRealizada: false };
  if (minutos > regras.entrega.limiteAtrasoMinutos) return { desconto: 0, naoRealizada: true };
  const faixa = regras.entrega.faixasDeAtraso.find((f) => minutos <= f.ateMinutos);
  return { desconto: faixa?.desconto ?? 0, naoRealizada: false };
}

export function pontuarProvaOficial(
  resultados: ResultadoProvaOficial[],
  regras: RegrasDaEdicao,
): { pontos: number; pendente: boolean } {
  const p = regras.provaOficial;
  let pontos = 0;
  let pendente = false;
  for (const r of resultados) {
    if (r.realizacao === 'pendente') pendente = true;
    if (r.realizacao !== 'confirmada') continue;
    pontos += p.pontosRealizacao;
    if (r.nota.estado === 'pendente') {
      pendente = true;
    } else if (r.nota.valor >= p.notaMinimaBonus) {
      pontos += p.pontosBonus;
    }
  }
  return { pontos: Math.min(pontos, p.maximoPorDupla), pendente };
}

export function consolidarPenalidades(
  penalidades: Penalidade[],
  regras: RegrasDaEdicao,
): { desconto: number; duplicadasIgnoradas: string[] } {
  const fatos = new Set<string>();
  const duplicadasIgnoradas: string[] = [];
  let soma = 0;
  for (const p of penalidades) {
    if (!Number.isFinite(p.pontos) || p.pontos < 0) {
      throw new ErroDeRegra('Os pontos de uma penalidade não podem ser negativos.');
    }
    if (fatos.has(p.fatoId)) {
      duplicadasIgnoradas.push(p.id);
      continue;
    }
    fatos.add(p.fatoId);
    soma += p.pontos;
  }
  return {
    desconto: Math.min(soma, regras.penalidades.tetoDescontosPorEncontro),
    duplicadasIgnoradas,
  };
}

function pontuarEntrega(
  entrega: LancamentosDoEncontro['entrega'],
  regras: RegrasDaEdicao,
): number | null {
  if (entrega.situacao === 'pendente') return null;
  if (entrega.situacao === 'nao_entregue' || entrega.plagioComprovado) return 0;

  const bruto = pontuarRubrica(entrega.notas, regras.entrega.criterios);
  const atraso = entrega.excecaoAutorizada
    ? { desconto: 0, naoRealizada: false }
    : descontoPorAtraso(entrega.atrasoMinutos, regras);
  if (atraso.naoRealizada) return 0;

  const notaAtraso = entrega.notas[regras.entrega.criterioDeAtraso] ?? 0;
  return bruto - Math.min(atraso.desconto, notaAtraso);
}

export function calcularEncontro(
  lancamentos: LancamentosDoEncontro,
  regras: RegrasDaEdicao,
): PontuacaoDoEncontro {
  const pendencias: ComponentePendente[] = [];

  const presenca = pontuarPresenca(lancamentos.presencas, regras);

  let participacao = 0;
  if (lancamentos.participacao) {
    participacao = pontuarRubrica(lancamentos.participacao, regras.participacao.criterios);
  } else {
    pendencias.push('participacao');
  }

  let avaliacaoObjetiva = 0;
  const objetiva = lancamentos.avaliacaoObjetiva;
  if (!objetiva) {
    pendencias.push('avaliacaoObjetiva');
  } else if (objetiva.tipo === 'questoes') {
    avaliacaoObjetiva = pontuarQuestoes(objetiva.acertos, objetiva.total, regras);
  } else {
    const prova = pontuarProvaOficial(objetiva.resultados, regras);
    avaliacaoObjetiva = prova.pontos;
    if (prova.pendente) pendencias.push('avaliacaoObjetiva');
  }

  const entregaPts = pontuarEntrega(lancamentos.entrega, regras);
  if (entregaPts === null) pendencias.push('entrega');
  const entrega = entregaPts ?? 0;

  let apresentacao = 0;
  const ap = lancamentos.apresentacao;
  if (ap.situacao === 'pendente') pendencias.push('apresentacao');
  else if (ap.situacao === 'avaliada') {
    apresentacao = pontuarRubrica(ap.notas, regras.apresentacao.criterios);
  }

  const { desconto: descontos } = consolidarPenalidades(lancamentos.penalidades, regras);
  const bruto = presenca + participacao + avaliacaoObjetiva + entrega + apresentacao;
  const total = arredondar(Math.max(0, bruto - descontos), regras.casasDecimais);

  return {
    presenca,
    participacao,
    avaliacaoObjetiva,
    entrega,
    apresentacao,
    descontos,
    total,
    pendencias,
  };
}
