import {
  acumularEncontros,
  calcularEncontro,
  classificar,
  type PontuacaoDoEncontro,
  type PosicaoNoRanking,
} from '@/modules/pontuacao';
import {
  cursos,
  duplas,
  edicao,
  encontros,
  lancamentos,
  pessoas,
  turmas,
  type Dupla,
  type Encontro,
} from './dados';

const hojeISO = () => new Date().toISOString().slice(0, 10);

const pessoa = (id: string) => pessoas.find((p) => p.id === id);
const cursoDaTurma = (turmaId: string) => {
  const turma = turmas.find((t) => t.id === turmaId);
  return cursos.find((c) => c.id === turma?.cursoId);
};

export interface PontuacaoPorEncontro {
  encontro: Encontro;
  pontuacao: PontuacaoDoEncontro | null;
}

function pontuacaoDaDupla(dupla: Dupla) {
  const porEncontro: PontuacaoPorEncontro[] = encontros.map((encontro) => {
    const l = lancamentos[dupla.id]?.[encontro.id];
    return { encontro, pontuacao: l ? calcularEncontro(l, edicao.regras) : null };
  });
  const calculadas = porEncontro.flatMap((p) => (p.pontuacao ? [p.pontuacao] : []));
  return { porEncontro, totais: acumularEncontros(calculadas) };
}

export function proximoEncontro(): Encontro | undefined {
  return encontros.find((e) => e.data >= hojeISO());
}

export interface RankingDaCategoria {
  categoria: string;
  estado: typeof edicao.estadoRanking;
  posicoes: PosicaoNoRanking[];
}

export function rankingPorCategoria(): RankingDaCategoria[] {
  const categorias = [...new Set(cursos.map((c) => c.categoria))];
  return categorias.map((categoria) => ({
    categoria,
    estado: edicao.estadoRanking,
    posicoes: classificar(
      duplas
        .filter((d) => cursoDaTurma(d.turmaId)?.categoria === categoria)
        .map((d) => ({ duplaId: d.id, nome: d.nome, totais: pontuacaoDaDupla(d).totais })),
    ),
  }));
}

export function painelCoordenacao() {
  const pendentesPorDupla = duplas.map((d) => pontuacaoDaDupla(d));
  const avaliacoesEmAberto = pendentesPorDupla.reduce(
    (t, p) => t + p.porEncontro.reduce((s, e) => s + (e.pontuacao?.pendencias.length ?? 0), 0),
    0,
  );
  return {
    edicao,
    indicadores: {
      cursos: cursos.length,
      turmas: turmas.length,
      duplas: duplas.length,
      estudantes: pessoas.filter((p) => p.papeis.includes('aluno')).length,
      encontrosRealizados: encontros.filter((e) => e.data < hojeISO()).length,
      encontrosTotal: encontros.length,
    },
    pendencias: {
      avaliacoesEmAberto,
      notasOficiaisPendentes: duplas.length * 2,
      ocorrenciasEmAnalise: 0,
    },
    encontros,
    cursos,
    turmas: turmas.map((t) => ({
      ...t,
      curso: cursoDaTurma(t.id),
      duplas: duplas.filter((d) => d.turmaId === t.id).length,
      docentes: pessoas
        .filter((p) => p.turmas.includes(t.id) && !p.papeis.includes('aluno'))
        .map((p) => p.nome),
    })),
    duplas: duplas.map((d) => ({
      ...d,
      turma: turmas.find((t) => t.id === d.turmaId)?.nome ?? '—',
      nomesIntegrantes: d.integrantes.map((i) => pessoa(i)?.nome ?? '—'),
    })),
    ranking: rankingPorCategoria(),
  };
}
