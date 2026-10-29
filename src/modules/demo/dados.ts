/**
 * DADOS FICTÍCIOS — somente para o modo demonstração.
 * Nomes, turmas, cursos, notas e datas são inventados para exercitar as telas e NÃO
 * representam estudantes, turmas ou o cronograma reais. As datas são relativas ao dia atual
 * para que a demonstração sempre tenha encontros passados e futuros.
 */
import type { Papel } from '@/modules/acesso';
import type { LancamentosDoEncontro, RegrasDaEdicao } from '@/modules/pontuacao';
import { REGRAS_PILOTO } from '@/modules/pontuacao';

export const AVISO_FICTICIO = 'Dados fictícios — somente demonstração';

function diasAPartirDeHoje(dias: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export interface ItemPremiacao {
  posicao: number;
  descricao: string;
  /** Valores, quantidade por dupla, validade e entrega ainda não confirmados. */
  detalhes: string | null;
}

export const edicao: {
  id: string;
  nome: string;
  regras: RegrasDaEdicao;
  estadoRanking: 'parcial' | 'provisorio' | 'definitivo';
  premiacao: ItemPremiacao[];
} = {
  id: 'ed-demo',
  nome: 'Maratona SAEP — edição de demonstração',
  regras: REGRAS_PILOTO,
  estadoRanking: 'parcial',
  // Itens informados para o piloto; detalhes pendentes de confirmação da coordenação.
  premiacao: [
    { posicao: 1, descricao: 'Vale gastronômico', detalhes: null },
    { posicao: 2, descricao: 'Voucher para o Arajara Park (aluno e acompanhante)', detalhes: null },
    { posicao: 3, descricao: 'Copo térmico tipo Stanley', detalhes: null },
  ],
};

export interface Curso {
  id: string;
  nome: string;
  categoria: string;
}
export const cursos: Curso[] = [
  { id: 'c-a', nome: 'Curso Técnico Exemplo A', categoria: 'Categoria A (exemplo)' },
  { id: 'c-b', nome: 'Curso Técnico Exemplo B', categoria: 'Categoria B (exemplo)' },
];

export interface Turma {
  id: string;
  cursoId: string;
  nome: string;
}
export const turmas: Turma[] = [
  { id: 't-a', cursoId: 'c-a', nome: '3º ano A (fictícia)' },
  { id: 't-b', cursoId: 'c-b', nome: '3º ano B (fictícia)' },
];

export interface Pessoa {
  id: string;
  nome: string;
  papeis: Papel[];
  turmas: string[];
}
export const pessoas: Pessoa[] = [
  { id: 'u-coord', nome: 'Coordenação (fictícia)', papeis: ['coordenacao'], turmas: [] },
  { id: 'u-doc-a', nome: 'Profa. Lúcia Exemplo', papeis: ['docente'], turmas: ['t-a'] },
  { id: 'u-doc-b', nome: 'Prof. Rui Exemplo', papeis: ['docente'], turmas: ['t-b'] },
  { id: 'u-mentor', nome: 'Mentoria SAEP (fictícia)', papeis: ['mentor'], turmas: ['t-a', 't-b'] },
  ...(
    [
      ['e01', 'Ana Exemplo', 't-a'],
      ['e02', 'Bruno Exemplo', 't-a'],
      ['e03', 'Carla Exemplo', 't-a'],
      ['e04', 'Davi Exemplo', 't-a'],
      ['e05', 'Elisa Exemplo', 't-a'],
      ['e06', 'Fábio Exemplo', 't-a'],
      ['e07', 'Gabi Exemplo', 't-a'],
      ['e08', 'Hugo Exemplo', 't-a'],
      ['e09', 'Íris Exemplo', 't-b'],
      ['e10', 'João Exemplo', 't-b'],
      ['e11', 'Kelly Exemplo', 't-b'],
      ['e12', 'Léo Exemplo', 't-b'],
    ] as const
  ).map(([id, nome, turma]) => ({ id, nome, papeis: ['aluno'] as Papel[], turmas: [turma] })),
];

export interface Dupla {
  id: string;
  nome: string;
  turmaId: string;
  integrantes: [string, string];
}
export const duplas: Dupla[] = [
  { id: 'd1', nome: 'Dupla Órbita', turmaId: 't-a', integrantes: ['e01', 'e02'] },
  { id: 'd2', nome: 'Dupla Vetor', turmaId: 't-a', integrantes: ['e03', 'e04'] },
  { id: 'd3', nome: 'Dupla Pixel', turmaId: 't-a', integrantes: ['e05', 'e06'] },
  { id: 'd4', nome: 'Dupla Circuito', turmaId: 't-a', integrantes: ['e07', 'e08'] },
  { id: 'd5', nome: 'Dupla Faísca', turmaId: 't-b', integrantes: ['e09', 'e10'] },
  { id: 'd6', nome: 'Dupla Corrente', turmaId: 't-b', integrantes: ['e11', 'e12'] },
];

export interface Encontro {
  id: string;
  numero: number;
  titulo: string;
  data: string;
  horario: string;
  ambiente: string;
  avaliacaoObjetiva: 'questoes' | 'prova_oficial';
}
export const encontros: Encontro[] = [
  {
    id: 'en1',
    numero: 1,
    titulo: 'Encontro 1 — Abertura e desafio inicial',
    data: diasAPartirDeHoje(-14),
    horario: '13h30–17h00',
    ambiente: 'Laboratório 1 (exemplo)',
    avaliacaoObjetiva: 'questoes',
  },
  {
    id: 'en2',
    numero: 2,
    titulo: 'Encontro 2 — Desafio prático',
    data: diasAPartirDeHoje(-7),
    horario: '13h30–17h00',
    ambiente: 'Laboratório 2 (exemplo)',
    avaliacaoObjetiva: 'questoes',
  },
  {
    id: 'en3',
    numero: 3,
    titulo: 'Encontro 3 — Prova oficial (registro)',
    data: diasAPartirDeHoje(7),
    horario: 'A confirmar',
    ambiente: 'A confirmar',
    avaliacaoObjetiva: 'prova_oficial',
  },
  {
    id: 'en4',
    numero: 4,
    titulo: 'Encontro 4 — Projeto final e premiação',
    data: diasAPartirDeHoje(14),
    horario: '13h30–17h00',
    ambiente: 'Auditório (exemplo)',
    avaliacaoObjetiva: 'questoes',
  },
];

export interface Desafio {
  id: string;
  encontroId: string;
  titulo: string;
  resumo: string;
  prazo: string;
  politicaIA: string;
}
export const desafios: Desafio[] = [
  {
    id: 'ds1',
    encontroId: 'en1',
    titulo: 'Desafio 1 (exemplo)',
    resumo: 'Enunciado fictício para demonstração.',
    prazo: `${diasAPartirDeHoje(-14)}T16:30:00`,
    politicaIA: 'Definida pela docente no desafio real.',
  },
  {
    id: 'ds2',
    encontroId: 'en2',
    titulo: 'Desafio 2 (exemplo)',
    resumo: 'Enunciado fictício para demonstração.',
    prazo: `${diasAPartirDeHoje(-7)}T16:30:00`,
    politicaIA: 'Definida pela docente no desafio real.',
  },
  {
    id: 'ds4',
    encontroId: 'en4',
    titulo: 'Projeto final (exemplo)',
    resumo: 'Enunciado fictício para demonstração.',
    prazo: `${diasAPartirDeHoje(14)}T16:30:00`,
    politicaIA: 'Definida pela docente no desafio real.',
  },
];

export const comunicados = [
  {
    id: 'cm1',
    titulo: 'Boas-vindas à demonstração',
    data: diasAPartirDeHoje(-15),
    texto: 'Este comunicado é fictício e serve apenas para visualizar a tela.',
  },
  {
    id: 'cm2',
    titulo: 'Regulamento em validação',
    data: diasAPartirDeHoje(-2),
    texto: 'As regras exibidas são as do piloto e ainda dependem da aprovação do regulamento.',
  },
];

// ---- Lançamentos fictícios (encontros 1 e 2) -------------------------------------------

const presentes = (a: string, b: string, faltou?: string) => [
  { estudanteId: a, presente: a !== faltou },
  { estudanteId: b, presente: b !== faltou },
];

const n = (compreensao: number, aplicacao: number, qualidade: number, organizacao: number) => ({
  compreensao,
  aplicacao,
  qualidade,
  organizacao,
});
const ap = (clareza: number, explicacao: number, respostas: number) => ({
  situacao: 'avaliada' as const,
  notas: { clareza, explicacao, respostas },
});
const part = (envolvimento: number, colaboracao: number, organizacao: number) => ({
  envolvimento,
  colaboracao,
  organizacao,
});
const q = (acertos: number) => ({ tipo: 'questoes' as const, acertos, total: 12 });

export const lancamentos: Record<string, Record<string, LancamentosDoEncontro>> = {
  d1: {
    en1: {
      presencas: presentes('e01', 'e02'),
      participacao: part(4, 3, 3),
      avaliacaoObjetiva: q(10),
      entrega: { situacao: 'avaliada', notas: n(9, 8, 8, 9), atrasoMinutos: 0 },
      apresentacao: ap(3, 3, 3),
      penalidades: [],
    },
    en2: {
      presencas: presentes('e01', 'e02'),
      participacao: part(4, 3, 2),
      avaliacaoObjetiva: q(9),
      entrega: { situacao: 'avaliada', notas: n(9, 9, 8, 8), atrasoMinutos: 10 },
      apresentacao: ap(3, 4, 2),
      penalidades: [],
    },
  },
  d2: {
    en1: {
      presencas: presentes('e03', 'e04', 'e04'),
      participacao: part(3, 3, 3),
      avaliacaoObjetiva: q(8),
      entrega: { situacao: 'avaliada', notas: n(8, 8, 7, 9), atrasoMinutos: 0 },
      apresentacao: ap(2, 3, 3),
      penalidades: [],
    },
    en2: {
      presencas: presentes('e03', 'e04'),
      participacao: part(4, 3, 3),
      avaliacaoObjetiva: q(11),
      entrega: { situacao: 'avaliada', notas: n(10, 9, 9, 9), atrasoMinutos: 0 },
      apresentacao: { situacao: 'pendente' },
      penalidades: [],
    },
  },
  d3: {
    en1: {
      presencas: presentes('e05', 'e06'),
      participacao: part(3, 2, 3),
      avaliacaoObjetiva: q(7),
      entrega: { situacao: 'avaliada', notas: n(7, 7, 6, 8), atrasoMinutos: 20 },
      apresentacao: ap(2, 3, 2),
      penalidades: [{ id: 'pn1', fatoId: 'fato-1', pontos: 2 }],
    },
    en2: {
      presencas: presentes('e05', 'e06'),
      participacao: part(3, 3, 3),
      avaliacaoObjetiva: q(9),
      entrega: { situacao: 'avaliada', notas: n(8, 8, 8, 8), atrasoMinutos: 0 },
      apresentacao: ap(3, 3, 3),
      penalidades: [],
    },
  },
  d4: {
    en1: {
      presencas: presentes('e07', 'e08'),
      participacao: part(4, 3, 3),
      avaliacaoObjetiva: q(10),
      entrega: { situacao: 'avaliada', notas: n(9, 8, 8, 9), atrasoMinutos: 0 },
      apresentacao: ap(3, 3, 3),
      penalidades: [],
    },
    en2: {
      presencas: presentes('e07', 'e08'),
      participacao: part(4, 3, 2),
      avaliacaoObjetiva: q(9),
      entrega: { situacao: 'avaliada', notas: n(9, 9, 8, 8), atrasoMinutos: 10 },
      apresentacao: ap(3, 4, 2),
      penalidades: [],
    },
  },
  d5: {
    en1: {
      presencas: presentes('e09', 'e10'),
      participacao: part(4, 3, 3),
      avaliacaoObjetiva: q(11),
      entrega: { situacao: 'avaliada', notas: n(9, 9, 9, 9), atrasoMinutos: 0 },
      apresentacao: ap(3, 4, 3),
      penalidades: [],
    },
    en2: {
      presencas: presentes('e09', 'e10'),
      avaliacaoObjetiva: q(10),
      entrega: { situacao: 'pendente' },
      apresentacao: { situacao: 'pendente' },
      penalidades: [],
    },
  },
  d6: {
    en1: {
      presencas: presentes('e11', 'e12'),
      participacao: part(3, 3, 3),
      avaliacaoObjetiva: q(9),
      entrega: { situacao: 'nao_entregue' },
      apresentacao: {
        situacao: 'nao_avaliavel',
        justificativa: 'Sem entrega para apresentar (exemplo).',
      },
      penalidades: [],
    },
    en2: {
      presencas: presentes('e11', 'e12', 'e11'),
      participacao: part(3, 2, 3),
      avaliacaoObjetiva: q(8),
      entrega: { situacao: 'avaliada', notas: n(7, 8, 7, 8), atrasoMinutos: 0 },
      apresentacao: ap(2, 3, 2),
      penalidades: [],
    },
  },
};

/** Contas exibidas na tela de entrada do modo demonstração. */
export const contasDemo = [
  { usuarioId: 'u-coord', nome: 'Coordenação (fictícia)', papeis: ['coordenacao'] as Papel[] },
  { usuarioId: 'u-doc-a', nome: 'Profa. Lúcia Exemplo — docente', papeis: ['docente'] as Papel[] },
  { usuarioId: 'e01', nome: 'Ana Exemplo — aluna', papeis: ['aluno'] as Papel[] },
];
