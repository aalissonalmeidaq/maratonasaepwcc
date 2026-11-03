/**
 * Regras na DEMONSTRAÇÃO (spec 011): as regras fictícias da edição, um ajuste fictício na turma A
 * (apresentação própria) e o histórico. Nenhuma escrita é aceita.
 */
import {
  combinarRegras,
  pontuacaoMaximaDoEncontro,
  sugerirRotulo,
  GRUPOS_DA_COORDENACAO,
  type AjustesDaTurma,
  type RepositorioRegras,
} from '@/modules/pontuacao';
import { edicao, encontros } from './dados';

const recusar = async (): Promise<never> => {
  throw new Error('Indisponível no modo demonstração: nenhuma alteração é gravada.');
};

export const AJUSTE_DEMO_TURMA_A: AjustesDaTurma = {
  apresentacao: {
    criterios: [
      { id: 'clareza', rotulo: 'Clareza', maximo: 3 },
      { id: 'explicacao', rotulo: 'Explicação das decisões e etapas', maximo: 4 },
      { id: 'demonstracao', rotulo: 'Demonstração do funcionamento (fictício)', maximo: 3 },
    ],
  },
};

export function criarRegrasDemo(coordena: () => boolean): RepositorioRegras {
  return {
    async regrasDaEdicaoVigentes() {
      return {
        regras: edicao.regras,
        rotulo: edicao.regras.versao,
        sugestao: sugerirRotulo(edicao.regras.versao),
      };
    },
    async regrasDaTurma(turmaId) {
      const ajustes = turmaId === 't-a' ? AJUSTE_DEMO_TURMA_A : {};
      const regras = combinarRegras(edicao.regras, ajustes);
      return {
        regras,
        gruposAjustados: Object.keys(ajustes) as (keyof AjustesDaTurma)[],
        ajusteId: turmaId === 't-a' ? 'ajuste-demo' : null,
        versao: edicao.regras.versao,
        maximo: encontros.length * pontuacaoMaximaDoEncontro(regras, 'questoes'),
        encontrosExcluidos: [],
        podeAjustar: coordena() ? [...GRUPOS_DA_COORDENACAO] : [],
      };
    },
    async historico() {
      return [
        {
          tipo: 'turma',
          rotulo: null,
          valeDesde: '2026-03-10T12:00:00Z',
          autor: 'Coordenação (fictícia)',
          papel: 'coordenacao',
          justificativa: 'Critério de demonstração para a turma A (fictício).',
          grupos: ['apresentacao'],
        },
        {
          tipo: 'edicao',
          rotulo: edicao.regras.versao,
          valeDesde: null,
          autor: null,
          papel: null,
          justificativa: null,
          grupos: [],
        },
      ];
    },
    gravarRegras: recusar,
    gravarAjustesTurma: recusar,
    definirEncontrosDaTurma: recusar,
  };
}
