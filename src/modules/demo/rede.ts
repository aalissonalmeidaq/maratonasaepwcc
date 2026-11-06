import type {
  EdicaoDaUnidade,
  MasterDaRede,
  MembroDaUnidade,
  RepositorioRede,
  Unidade,
} from '@/modules/rede';
import { unidadesDemo } from './dados';

const RECUSA = 'Indisponível no modo demonstração: a gravação exige o servidor.';
const recusar = () => Promise.reject(new Error(RECUSA));

/** Unidades fictícias da demonstração: a das contas de exemplo (com gestão) e outra, sem gestão. */
function unidadesFicticias(): Unidade[] {
  const [a, b] = unidadesDemo;
  return [
    {
      id: a.id,
      nome: a.nome,
      ativa: a.ativa,
      desativadaEm: null,
      justificativaDesativacao: null,
      gestao: [
        {
          usuarioId: 'u-gestao',
          nome: 'Gestão da unidade (fictícia)',
          email: 'gestao@exemplo.invalid',
          situacaoAcesso: 'ativo',
          ativa: true,
        },
      ],
    },
    {
      id: b.id,
      nome: b.nome,
      ativa: b.ativa,
      desativadaEm: null,
      justificativaDesativacao: null,
      gestao: [],
    },
  ];
}

function mastersFicticios(): MasterDaRede[] {
  return [
    {
      usuarioId: 'u-master',
      nome: 'Master (fictício)',
      email: 'master@exemplo.invalid',
      situacaoAcesso: 'ativo',
      ativo: true,
    },
  ];
}

/** Equipe fictícia da unidade das contas de exemplo (sem estudantes). */
function equipeFicticia(): MembroDaUnidade[] {
  const conta = (
    usuarioId: string,
    nome: string,
    funcoes: MembroDaUnidade['funcoes'],
    situacaoAcesso: MembroDaUnidade['situacaoAcesso'] = 'ativo',
  ): MembroDaUnidade => ({
    usuarioId,
    nome,
    email: `${usuarioId}@exemplo.invalid`,
    funcoes,
    situacaoAcesso,
    ativo: true,
  });
  return [
    conta('u-gestao', 'Gestão da unidade (fictícia)', ['gestao']),
    conta('u-coord', 'Coordenação (fictícia)', ['coordenacao']),
    conta('u-doc-a', 'Profa. Lúcia Exemplo', ['docente']),
    conta('u-doc-b', 'Prof. Rui Exemplo', ['docente'], 'aguardando'),
    conta('u-analista', 'Analista (fictício)', ['analista']),
  ];
}

/** Edições fictícias da unidade: uma ativa e uma encerrada. */
function edicoesFicticias(): EdicaoDaUnidade[] {
  return [
    {
      id: 'ed-demo',
      nome: 'Maratona SAEP — edição de demonstração',
      inicio: '2026-03-01',
      fim: '2026-12-01',
      estado: 'ativa',
      coordenacao: [{ usuarioId: 'u-coord', nome: 'Coordenação (fictícia)', ativa: true }],
    },
    {
      id: 'ed-demo-encerrada',
      nome: 'Maratona SAEP — edição encerrada (demonstração)',
      inicio: '2025-03-01',
      fim: '2025-12-01',
      estado: 'encerrada',
      coordenacao: [{ usuarioId: 'u-coord', nome: 'Coordenação (fictícia)', ativa: true }],
    },
  ];
}

/** Rede da demonstração (spec 016): lê os dados fictícios; toda escrita é recusada (ADR 0004). */
export function criarRedeDemo(): RepositorioRede {
  return {
    unidades: async () => unidadesFicticias(),
    masters: async () => mastersFicticios(),
    cadastrarUnidade: recusar,
    renomearUnidade: recusar,
    definirSituacaoUnidade: recusar,
    definirGestao: recusar,
    definirMaster: recusar,
    criarConta: recusar,
    reenviarConvite: recusar,
    equipe: async () => equipeFicticia(),
    definirFuncoes: recusar,
    desativarMembro: recusar,
    reativarMembro: recusar,
    edicoes: async () => edicoesFicticias(),
    criarEdicao: recusar,
    definirCoordenacao: recusar,
  };
}
