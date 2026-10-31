/**
 * Atividades da DEMONSTRAÇÃO (spec 006): leitura dos desafios e lançamentos fictícios; toda
 * escrita é recusada, pois não há servidor para confirmar (Constituição VII).
 */
import type {
  AvaliacaoRegistrada,
  Desafio,
  EncontroDaEquipe,
  EquipeResumo,
  RepositorioAtividades,
} from '@/modules/atividades';
import type { LancamentosDoEncontro } from '@/modules/pontuacao';
import { desafios, duplas, edicao, encontros, lancamentos, pessoas, turmas } from './dados';

const recusar = async (): Promise<never> => {
  throw new Error('Indisponível no modo demonstração: nenhuma alteração é gravada.');
};

const nomeDe = (id: string) => pessoas.find((p) => p.id === id)?.nome ?? '—';

const equipeResumo = (d: (typeof duplas)[number]): EquipeResumo => ({
  id: d.id,
  nome: d.nome,
  integrantes: d.integrantes.map((id) => ({ estudanteId: id, nome: nomeDe(id) })),
});

const paraDesafio = (d: (typeof desafios)[number]): Desafio => ({
  id: d.id,
  edicaoId: edicao.id,
  encontroId: d.encontroId,
  titulo: d.titulo,
  enunciado: d.resumo,
  recursosPermitidos: 'Definidos pela docente no desafio real.',
  politicaIa: d.politicaIA,
  prazo: new Date(d.prazo).toISOString(),
  aceitaArquivo: true,
  aceitaLink: true,
  estado: 'publicado',
  turmas: turmas.map((t) => t.id),
});

function avaliacaoDe(l: LancamentosDoEncontro | undefined): AvaliacaoRegistrada | null {
  if (!l || l.entrega.situacao === 'pendente') return null;
  return {
    notasEntrega: l.entrega.situacao === 'avaliada' ? l.entrega.notas : null,
    notasApresentacao: l.apresentacao.situacao === 'avaliada' ? l.apresentacao.notas : null,
    apresentacaoNaoAvaliavel: l.apresentacao.situacao === 'nao_avaliavel',
    feedback: 'Feedback fictício da demonstração.',
    registradoEm: new Date().toISOString(),
  };
}

export function criarAtividadesDemo(usuarioAtual: () => string | null): RepositorioAtividades {
  const minhaDupla = () => duplas.find((d) => d.integrantes.includes(usuarioAtual() ?? ''));

  return {
    async desafiosDaGestao() {
      return desafios.map(paraDesafio);
    },
    salvarDesafio: recusar,
    publicarDesafio: recusar,
    encerrarDesafio: recusar,
    registrarProrrogacao: recusar,

    async atividadesDaTurma() {
      const dupla = minhaDupla();
      return {
        regras: edicao.regras,
        desafios: desafios.map((d) => {
          const base = paraDesafio(d);
          return {
            ...base,
            duplaId: dupla?.id ?? null,
            prazoEfetivo: base.prazo,
            encerrado: new Date(base.prazo).getTime() < Date.now(),
            entregas: [],
            avaliacao: avaliacaoDe(dupla ? lancamentos[dupla.id]?.[d.encontroId] : undefined),
          };
        }),
        listas: [],
      };
    },
    enviarEntrega: recusar,
    urlArquivo: recusar,

    async presencasDaTurma(encontroId, turmaId) {
      const daTurma = duplas.filter((d) => d.turmaId === turmaId);
      const alunos = pessoas.filter(
        (p) => p.papeis.includes('aluno') && p.turmas.includes(turmaId),
      );
      return {
        regras: edicao.regras,
        equipes: daTurma.map(equipeResumo),
        alunos: alunos.map((a) => {
          const dupla = daTurma.find((d) => d.integrantes.includes(a.id));
          const registro = dupla
            ? lancamentos[dupla.id]?.[encontroId]?.presencas.find((p) => p.estudanteId === a.id)
            : undefined;
          return {
            estudanteId: a.id,
            nome: a.nome,
            duplaId: dupla?.id ?? null,
            presente: registro ? registro.presente : null,
            observacao: null,
          };
        }),
        participacoes: daTurma.flatMap((d) => {
          const notas = lancamentos[d.id]?.[encontroId]?.participacao;
          return notas ? [{ duplaId: d.id, notas }] : [];
        }),
      };
    },
    registrarPresencas: recusar,
    registrarParticipacao: recusar,

    async painelAvaliacao(desafioId) {
      const desafio = desafios.find((d) => d.id === desafioId);
      if (!desafio) throw new Error('Desafio não encontrado.');
      return {
        regras: edicao.regras,
        desafio: paraDesafio(desafio),
        equipes: duplas.map((d) => ({
          ...equipeResumo(d),
          ultimaEntrega: null,
          versoes: [],
          avaliacao: avaliacaoDe(lancamentos[d.id]?.[desafio.encontroId]),
          prorrogacao: null,
        })),
      };
    },
    registrarAvaliacao: recusar,

    async listasDaGestao() {
      return [];
    },
    salvarLista: recusar,
    publicarLista: recusar,
    encerrarLista: recusar,
    listaParaEquipe: recusar,
    enviarRespostas: recusar,

    async lancamentosDaMinhaEquipe() {
      const dupla = minhaDupla();
      if (!dupla) return { regras: edicao.regras, equipe: null, encontros: [] };
      const encontrosDaEquipe: EncontroDaEquipe[] = encontros.map((e) => {
        const l = lancamentos[dupla.id]?.[e.id];
        const desafio = desafios.find((d) => d.encontroId === e.id);
        const objetiva = l?.avaliacaoObjetiva;
        return {
          encontroId: e.id,
          numero: e.numero,
          titulo: e.titulo,
          avaliacaoObjetiva: e.avaliacaoObjetiva,
          presencas: l?.presencas ?? [],
          participacao: l?.participacao ?? null,
          desafios: desafio
            ? [
                {
                  desafioId: desafio.id,
                  avaliacao: avaliacaoDe(l),
                  temEntrega: l?.entrega.situacao === 'avaliada',
                  atrasoMinutos: l?.entrega.situacao === 'avaliada' ? l.entrega.atrasoMinutos : 0,
                  prorrogada: false,
                },
              ]
            : [],
          listas:
            objetiva?.tipo === 'questoes'
              ? [
                  {
                    listaId: `lista-${e.id}`,
                    encerrada: true,
                    acertos: objetiva.acertos,
                    total: objetiva.total,
                  },
                ]
              : [],
        };
      });
      return { regras: edicao.regras, equipe: equipeResumo(dupla), encontros: encontrosDaEquipe };
    },
  };
}
