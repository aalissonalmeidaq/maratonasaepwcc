import {
  acumularEncontros,
  calcularEncontro,
  classificar,
  maximoDaEdicao,
  type PontuacaoDoEncontro,
  type PosicaoNoRanking,
} from '@/modules/pontuacao';
import {
  comunicados,
  cursos,
  desafios,
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

export function painelAluno(usuarioId: string) {
  const estudante = pessoa(usuarioId);
  const dupla = duplas.find((d) => d.integrantes.includes(usuarioId));
  if (!estudante || !dupla) return null;
  const colegaId = dupla.integrantes.find((i) => i !== usuarioId);
  const turma = turmas.find((t) => t.id === dupla.turmaId);
  const curso = cursoDaTurma(dupla.turmaId);
  const { porEncontro, totais } = pontuacaoDaDupla(dupla);
  const proximo = proximoEncontro();
  const ranking = rankingPorCategoria().find((r) => r.categoria === curso?.categoria);
  return {
    estudante: { id: estudante.id, nome: estudante.nome },
    colega: colegaId ? { id: colegaId, nome: pessoa(colegaId)?.nome ?? '—' } : null,
    dupla,
    turma,
    curso,
    proximoEncontro: proximo,
    proximoDesafio: desafios.find((d) => d.encontroId === proximo?.id) ?? null,
    desafios,
    porEncontro,
    totais,
    maximo: maximoDaEdicao(edicao.regras),
    ranking,
    minhaPosicao: ranking?.posicoes.find((p) => p.duplaId === dupla.id) ?? null,
    comunicados,
  };
}

export function painelDocente(usuarioId: string) {
  const docente = pessoa(usuarioId);
  const turmasVinculadas = turmas.filter((t) => docente?.turmas.includes(t.id));
  const duplasVinculadas = duplas.filter((d) => docente?.turmas.includes(d.turmaId));
  const ultimoEncontro = [...encontros].reverse().find((e) => e.data < hojeISO());
  const entregasAAvaliar = duplasVinculadas.flatMap((d) =>
    encontros.flatMap((e) => {
      const l = lancamentos[d.id]?.[e.id];
      if (!l) return [];
      const pendentes = [
        l.entrega.situacao === 'pendente' && 'Entrega',
        l.apresentacao.situacao === 'pendente' && 'Apresentação',
        !l.participacao && 'Participação',
      ].filter((x): x is string => Boolean(x));
      return pendentes.length ? [{ dupla: d, encontro: e, pendentes }] : [];
    }),
  );
  return {
    docente,
    turmas: turmasVinculadas.map((t) => ({ ...t, curso: cursoDaTurma(t.id) })),
    duplas: duplasVinculadas.map((d) => ({
      ...d,
      nomesIntegrantes: d.integrantes.map((i) => pessoa(i)?.nome ?? '—'),
    })),
    proximoEncontro: proximoEncontro(),
    ultimoEncontro,
    presencaUltimoEncontro: ultimoEncontro
      ? duplasVinculadas.flatMap((d) =>
          (lancamentos[d.id]?.[ultimoEncontro.id]?.presencas ?? []).map((p) => ({
            estudante: pessoa(p.estudanteId)?.nome ?? '—',
            dupla: d.nome,
            presente: p.presente,
          })),
        )
      : [],
    entregasAAvaliar,
  };
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
