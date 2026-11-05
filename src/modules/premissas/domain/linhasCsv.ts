import type { Relatorio } from '@/modules/relatorios';
import { ROTULO_SITUACAO } from './situacao';
import type { Premissa } from './tipos';

/**
 * Colunas e linhas do CSV das premissas (FR-004a). A serialização (BOM, `;`, proteção contra
 * fórmula e data DD/MM/AAAA HH:MM) é a de `gerarCsv`, chamada na tela (spec 008).
 */
export function relatorioDasPremissas(premissas: readonly Premissa[]): Relatorio {
  return {
    colunas: [
      { id: 'codigo', rotulo: 'Código', tipo: 'texto' },
      { id: 'tema', rotulo: 'Tema', tipo: 'texto' },
      { id: 'pergunta', rotulo: 'Pergunta', tipo: 'texto' },
      { id: 'emUso', rotulo: 'Em uso hoje', tipo: 'texto' },
      { id: 'situacao', rotulo: 'Situação', tipo: 'texto' },
      { id: 'decisao', rotulo: 'Última decisão', tipo: 'texto' },
      { id: 'justificativa', rotulo: 'Justificativa', tipo: 'texto' },
      { id: 'autor', rotulo: 'Registrada por', tipo: 'texto' },
      { id: 'registradoEm', rotulo: 'Registrada em', tipo: 'data_hora' },
    ],
    linhas: premissas.map((p) => ({
      codigo: p.codigo,
      tema: p.tema,
      pergunta: p.pergunta,
      emUso: p.premissaEmUso,
      situacao: ROTULO_SITUACAO[p.situacao],
      decisao: p.atual ? ROTULO_SITUACAO[p.atual.decisao] : null,
      justificativa: p.atual?.justificativa ?? null,
      autor: p.atual?.autorNome ?? null,
      registradoEm: p.atual?.registradoEm ?? null,
    })),
  };
}
