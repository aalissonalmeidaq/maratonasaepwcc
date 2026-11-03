/**
 * Resumo do regulamento a partir das regras gravadas na edição (US4, R8). Nenhum número é fixo
 * aqui: valor ausente ou inválido vira `null` e a tela mostra "a definir" (Constituição X).
 * `fixo` marca regras do PRD que não dependem de configuração.
 */
export interface ItemRegulamento {
  rotulo: string;
  valor: string | null;
  fixo?: boolean;
  /** Grupo de regras de onde vem o valor (spec 011). */
  grupo?: string;
  /** Valor definido para a turma, e não herdado da edição (spec 011, FR-014). */
  daTurma?: boolean;
}

export interface ResumoRegulamento {
  versao: string | null;
  grupos: { titulo: string; itens: ItemRegulamento[] }[];
}

type Objeto = Record<string, unknown>;

const objeto = (v: unknown): Objeto | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Objeto) : null;
const numero = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const em = (raiz: unknown, ...caminho: string[]): unknown =>
  caminho.reduce<unknown>((atual, chave) => objeto(atual)?.[chave], raiz);

interface Criterio {
  id: string;
  rotulo: string;
  maximo: number;
}

/** Critérios válidos de uma rubrica, ou `null` se a lista faltar ou tiver item inválido. */
function criterios(v: unknown): Criterio[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const lista = v.map((c) => {
    const o = objeto(c);
    const maximo = numero(o?.maximo);
    return o && typeof o.rotulo === 'string' && maximo !== null
      ? { id: String(o.id ?? ''), rotulo: o.rotulo, maximo }
      : null;
  });
  return lista.every((c): c is Criterio => c !== null) ? lista : null;
}

const soma = (c: Criterio[] | null) => (c ? c.reduce((t, x) => t + x.maximo, 0) : null);
const fmt = (n: number) => n.toLocaleString('pt-BR');
/** "Até N (critério máximo, ...)." com os critérios vigentes. */
const rubrica = (c: Criterio[] | null) =>
  c
    ? `Até ${fmt(soma(c)!)} (${c.map((x) => `${x.rotulo.toLowerCase()} ${fmt(x.maximo)}`).join(', ')}).`
    : null;

function faixasDeAtraso(entrega: unknown, rubrica: Criterio[] | null): string | null {
  const faixas = em(entrega, 'faixasDeAtraso');
  const limite = numero(em(entrega, 'limiteAtrasoMinutos'));
  const criterio = rubrica?.find((c) => c.id === em(entrega, 'criterioDeAtraso'));
  if (!Array.isArray(faixas) || faixas.length === 0 || limite === null || !criterio) return null;
  const partes: string[] = [];
  for (const f of faixas) {
    const ate = numero(objeto(f)?.ateMinutos);
    const desconto = numero(objeto(f)?.desconto);
    if (ate === null || desconto === null) return null;
    partes.push(`${partes.length ? 'até' : 'Até'} ${fmt(ate)} min: −${fmt(desconto)}`);
  }
  partes[0] += ` em “${criterio.rotulo}”`;
  return `${partes.join('; ')}; acima de ${fmt(limite)} min: entrega não realizada, salvo exceção registrada.`;
}

/**
 * Com `gruposAjustados` (regras vigentes da turma), os itens desses grupos saem marcados
 * `daTurma`; com `maximo`, entra a pontuação máxima da turma.
 */
export function resumoDoRegulamento(
  regras: unknown,
  opcoes: { gruposAjustados?: readonly string[]; maximo?: number } = {},
): ResumoRegulamento {
  const presenca = numero(em(regras, 'presenca', 'pontosPorIntegrante'));
  const presencaMax = numero(em(regras, 'presenca', 'maximoPorDupla'));
  const participacao = criterios(em(regras, 'participacao', 'criterios'));
  const questoes = numero(em(regras, 'questoes', 'maximo'));
  const entrega = criterios(em(regras, 'entrega', 'criterios'));
  const apresentacao = criterios(em(regras, 'apresentacao', 'criterios'));
  const partesDoTotal = [
    presencaMax,
    soma(participacao),
    questoes,
    soma(entrega),
    soma(apresentacao),
  ];
  const total = partesDoTotal.every((p): p is number => p !== null)
    ? partesDoTotal.reduce((t, p) => t + p, 0)
    : null;

  const realizacao = numero(em(regras, 'provaOficial', 'pontosRealizacao'));
  const bonus = numero(em(regras, 'provaOficial', 'pontosBonus'));
  const notaMinima = numero(em(regras, 'provaOficial', 'notaMinimaBonus'));
  const teto = numero(em(regras, 'penalidades', 'tetoDescontosPorEncontro'));
  const manifestacao = numero(em(regras, 'prazos', 'manifestacaoHoras'));
  const revisao = numero(em(regras, 'prazos', 'revisaoHoras'));
  const versao = em(regras, 'versao');

  const resumo: ResumoRegulamento = {
    versao: typeof versao === 'string' && versao.trim() ? versao : null,
    grupos: [
      {
        titulo: 'Pontuação por encontro',
        itens: [
          {
            rotulo: 'Presença',
            grupo: 'presenca',
            valor:
              presenca !== null && presencaMax !== null
                ? `${fmt(presenca)} por integrante, até ${fmt(presencaMax)} por equipe.`
                : null,
          },
          {
            rotulo: 'Participação',
            grupo: 'participacao',
            valor: rubrica(participacao),
          },
          {
            rotulo: 'Questões',
            grupo: 'questoes',
            valor: questoes !== null ? `Acertos ÷ total × ${fmt(questoes)}.` : null,
          },
          {
            rotulo: 'Entrega prática',
            grupo: 'entrega',
            valor: rubrica(entrega),
          },
          {
            rotulo: 'Apresentação',
            grupo: 'apresentacao',
            valor: rubrica(apresentacao),
          },
          { rotulo: 'Total', valor: total !== null ? `Até ${fmt(total)} por encontro.` : null },
        ],
      },
      {
        titulo: 'Prova oficial, atrasos e ocorrências',
        itens: [
          {
            rotulo: 'Prova oficial',
            valor:
              realizacao !== null && bonus !== null && notaMinima !== null
                ? `${fmt(realizacao)} pontos por estudante com realização confirmada e +${fmt(bonus)} com nota confirmada ≥ ${fmt(notaMinima)}. Nota pendente não gera bônus.`
                : null,
          },
          {
            rotulo: 'Atrasos',
            grupo: 'entrega',
            valor: faixasDeAtraso(em(regras, 'entrega'), entrega),
          },
          {
            rotulo: 'Descontos por ocorrências',
            grupo: 'penalidades',
            valor:
              teto !== null
                ? `Até ${fmt(teto)} pontos por encontro; nunca duas penalidades pelo mesmo fato.`
                : null,
          },
          {
            rotulo: 'Pontuação mínima',
            valor: 'A pontuação do encontro nunca fica negativa.',
            fixo: true,
          },
          {
            rotulo: 'Manifestação',
            grupo: 'prazos',
            valor:
              manifestacao !== null
                ? `Até ${fmt(manifestacao)} horas após o registro da ocorrência.`
                : null,
          },
          {
            rotulo: 'Pedido de revisão',
            grupo: 'prazos',
            valor: revisao !== null ? `Até ${fmt(revisao)} horas após a publicação.` : null,
          },
        ],
      },
    ],
  };
  const ajustados = opcoes.gruposAjustados ?? [];
  for (const g of resumo.grupos)
    for (const item of g.itens)
      if (item.grupo && ajustados.includes(item.grupo)) item.daTurma = true;
  if (opcoes.maximo !== undefined)
    resumo.grupos[0]!.itens.push({
      rotulo: 'Pontuação máxima da turma',
      valor: `${fmt(opcoes.maximo)} pontos nos encontros da turma.`,
    });
  return resumo;
}
