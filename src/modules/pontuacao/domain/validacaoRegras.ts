import { REGRAS_PILOTO } from './regras-piloto';
import type { CriterioRubrica, RegrasDaEdicao } from './tipos';

/** Caminho do campo (ex.: `entrega.criterios.1.rotulo`) → mensagem. */
export type ErrosDeRegras = Record<string, string>;

const RUBRICAS = ['participacao', 'entrega', 'apresentacao'] as const;
// Limites de proteção contra erro de digitação, não regras do PRD (research R4). [validar]
const MAX_CRITERIOS = 20;
const MAX_ROTULO = 80;

const naoNegativo = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const normalizar = (s: string) => s.trim().toLowerCase();

function validarRubrica(caminho: string, criterios: CriterioRubrica[], erros: ErrosDeRegras) {
  if (criterios.length < 1 || criterios.length > MAX_CRITERIOS) {
    erros[`${caminho}.criterios`] = `Cada rubrica tem de 1 a ${MAX_CRITERIOS} critérios.`;
    return;
  }
  const nomes = new Set<string>();
  const ids = new Set<string>();
  criterios.forEach((c, i) => {
    const base = `${caminho}.criterios.${i}`;
    const rotulo = c.rotulo.trim();
    if (rotulo.length < 1 || rotulo.length > MAX_ROTULO)
      erros[`${base}.rotulo`] = `Informe um nome de 1 a ${MAX_ROTULO} caracteres.`;
    else if (nomes.has(normalizar(rotulo)))
      erros[`${base}.rotulo`] = 'Já existe um critério com esse nome nesta rubrica.';
    nomes.add(normalizar(rotulo));
    if (!c.id || ids.has(c.id)) erros[`${base}.id`] = 'Identificador de critério repetido.';
    ids.add(c.id);
    if (!(typeof c.maximo === 'number' && c.maximo > 0))
      erros[`${base}.maximo`] = 'A pontuação máxima precisa ser maior que zero.';
  });
}

/**
 * Mesmas regras do servidor (`app.validar_regras`, research R4). `escopo` 'turma' valida só os
 * grupos presentes (ajustes); 'edicao' valida o conjunto completo.
 */
/** Mesmos campos e valores da prova oficial do piloto, em qualquer ordem de chaves (jsonb). */
function igualAoPiloto(prova: RegrasDaEdicao['provaOficial'] | undefined): boolean {
  const piloto = REGRAS_PILOTO.provaOficial as Record<string, unknown>;
  const p = (prova ?? {}) as Record<string, unknown>;
  const chaves = Object.keys(piloto);
  return Object.keys(p).length === chaves.length && chaves.every((k) => p[k] === piloto[k]);
}

export function validarRegras(
  regras: Partial<RegrasDaEdicao>,
  escopo: 'edicao' | 'turma',
): ErrosDeRegras {
  const erros: ErrosDeRegras = {};
  const tem = (k: keyof RegrasDaEdicao) => escopo === 'edicao' || k in regras;

  for (const r of RUBRICAS) if (tem(r) && regras[r]) validarRubrica(r, regras[r].criterios, erros);

  if (tem('presenca') && regras.presenca) {
    if (!naoNegativo(regras.presenca.pontosPorIntegrante))
      erros['presenca.pontosPorIntegrante'] = 'Informe um número maior ou igual a zero.';
    if (!naoNegativo(regras.presenca.maximoPorDupla))
      erros['presenca.maximoPorDupla'] = 'Informe um número maior ou igual a zero.';
  }
  if (tem('questoes') && regras.questoes && !naoNegativo(regras.questoes.maximo))
    erros['questoes.maximo'] = 'Informe um número maior ou igual a zero.';

  if (tem('entrega') && regras.entrega) {
    const e = regras.entrega;
    if (!e.criterios.some((c) => c.id === e.criterioDeAtraso))
      erros['entrega.criterioDeAtraso'] = 'Escolha outro critério de atraso antes de remover este.';
    if (!naoNegativo(e.limiteAtrasoMinutos))
      erros['entrega.limiteAtrasoMinutos'] = 'Informe um número maior ou igual a zero.';
    const ordem = e.faixasDeAtraso.every(
      (f, i, l) =>
        naoNegativo(f.desconto) &&
        f.ateMinutos > 0 &&
        (i === 0 || f.ateMinutos > l[i - 1]!.ateMinutos),
    );
    const ultima = e.faixasDeAtraso[e.faixasDeAtraso.length - 1];
    if (!ordem || (ultima && ultima.ateMinutos > e.limiteAtrasoMinutos))
      erros['entrega.faixasDeAtraso'] =
        'As faixas precisam ter minutos crescentes, descontos não negativos e caber no limite de atraso.';
  }

  if (tem('penalidades') && regras.penalidades) {
    const p = regras.penalidades;
    if (!naoNegativo(p.tetoDescontosPorEncontro))
      erros['penalidades.tetoDescontosPorEncontro'] = 'Informe um número maior ou igual a zero.';
    const nomes = new Set<string>();
    const ids = new Set<string>();
    p.tipos.forEach((t, i) => {
      const base = `penalidades.tipos.${i}`;
      const rotulo = t.rotulo.trim();
      if (rotulo.length < 1 || rotulo.length > MAX_ROTULO || nomes.has(normalizar(rotulo)))
        erros[`${base}.rotulo`] = `Nome de 1 a ${MAX_ROTULO} caracteres, sem repetir.`;
      nomes.add(normalizar(rotulo));
      if (!t.id || ids.has(t.id)) erros[`${base}.id`] = 'Identificador de tipo repetido.';
      ids.add(t.id);
      if ('pontos' in t && !naoNegativo(t.pontos))
        erros[`${base}.pontos`] = 'Informe um número maior ou igual a zero.';
    });
  }

  if (tem('prazos') && regras.prazos) {
    if (!(regras.prazos.manifestacaoHoras > 0))
      erros['prazos.manifestacaoHoras'] = 'Informe um prazo maior que zero.';
    if (!(regras.prazos.revisaoHoras > 0))
      erros['prazos.revisaoHoras'] = 'Informe um prazo maior que zero.';
  }

  if (escopo === 'edicao') {
    const n = regras.quantidadeEncontros;
    if (!(Number.isInteger(n) && n! >= 1 && n! <= 20))
      erros.quantidadeEncontros = 'Informe de 1 a 20 encontros.';
    const c = regras.casasDecimais;
    if (!(Number.isInteger(c) && c! >= 0 && c! <= 4))
      erros.casasDecimais = 'Informe de 0 a 4 casas decimais.';
    if (!igualAoPiloto(regras.provaOficial))
      erros.provaOficial = 'A prova oficial segue os valores do PRD e não pode ser alterada.';
  }
  return erros;
}

/** Garante id em critérios e tipos novos (gerado a partir do nome, único na lista). */
export function completarIds(r: RegrasDaEdicao): RegrasDaEdicao {
  const comIds = <T extends { id: string; rotulo: string }>(lista: T[]): T[] => {
    const usados: string[] = [];
    return lista.map((c) => {
      const id = c.id || idDoCriterio(c.rotulo, [...usados, ...lista.map((x) => x.id)]);
      usados.push(id);
      return { ...c, id };
    });
  };
  return {
    ...r,
    participacao: { criterios: comIds(r.participacao.criterios) },
    entrega: { ...r.entrega, criterios: comIds(r.entrega.criterios) },
    apresentacao: { criterios: comIds(r.apresentacao.criterios) },
    penalidades: { ...r.penalidades, tipos: comIds(r.penalidades.tipos) },
  };
}

/** Id estável de um critério novo: nome em minúsculas, sem acento, com hífens, único na rubrica. */
export function idDoCriterio(rotulo: string, existentes: string[]): string {
  const base =
    rotulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'criterio';
  let id = base;
  for (let n = 2; existentes.includes(id); n += 1) id = `${base}-${n}`;
  return id;
}

/** Próximo rótulo sugerido: incrementa o último número; sem número no fim, acrescenta ".1". */
export function sugerirRotulo(rotulo: string): string {
  const m = /^(.*?)(\d+)$/.exec(rotulo);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${rotulo}.1`;
}
