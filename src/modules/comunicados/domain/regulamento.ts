/**
 * Resumo do regulamento a partir das regras gravadas na edição (US4, R8). Nenhum número é fixo
 * aqui: valor ausente ou inválido vira `null` e a tela mostra "a definir" (Constituição X).
 * `fixo` marca regras do PRD que não dependem de configuração.
 */
export interface ItemRegulamento {
  rotulo: string;
  valor: string | null;
  fixo?: boolean;
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

export function resumoDoRegulamento(regras: unknown): ResumoRegulamento {
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

  return {
    versao: typeof versao === 'string' && versao.trim() ? versao : null,
    grupos: [
      {
        titulo: 'Pontuação por encontro',
        itens: [
          {
            rotulo: 'Presença',
            valor:
              presenca !== null && presencaMax !== null
                ? `${fmt(presenca)} por integrante, até ${fmt(presencaMax)} por equipe.`
                : null,
          },
          {
            rotulo: 'Participação',
            valor: participacao
              ? `Até ${fmt(soma(participacao)!)} (${participacao
                  .map((c) => `${c.rotulo.toLowerCase()} ${fmt(c.maximo)}`)
                  .join(', ')}).`
              : null,
          },
          {
            rotulo: 'Questões',
            valor: questoes !== null ? `Acertos ÷ total × ${fmt(questoes)}.` : null,
          },
          {
            rotulo: 'Entrega prática',
            valor: entrega ? `Até ${fmt(soma(entrega)!)} (${entrega.length} critérios).` : null,
          },
          {
            rotulo: 'Apresentação',
            valor: apresentacao ? `Até ${fmt(soma(apresentacao)!)}.` : null,
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
          { rotulo: 'Atrasos', valor: faixasDeAtraso(em(regras, 'entrega'), entrega) },
          {
            rotulo: 'Descontos por ocorrências',
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
            valor:
              manifestacao !== null
                ? `Até ${fmt(manifestacao)} horas após o registro da ocorrência.`
                : null,
          },
          {
            rotulo: 'Pedido de revisão',
            valor: revisao !== null ? `Até ${fmt(revisao)} horas após a publicação.` : null,
          },
        ],
      },
    ],
  };
}
