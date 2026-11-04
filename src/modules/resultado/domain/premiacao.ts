// Premiação por turma (spec 012, FR-018, FR-018a, FR-018b). Função pura: o servidor calcula a
// versão oficial (`premiacao_da_edicao`); esta é usada na demonstração e documenta a regra.
import type {
  DecisaoPremiacao,
  ItemPremiacaoDaTurma,
  PremiacaoDaTurma,
  PublicacaoRanking,
  SituacaoPremiacao,
} from './tipos';

export interface ItemPremiacaoConfigurado {
  posicao: number;
  descricao: string;
  detalhes: string | null;
}

/** `coordenacao` vê tudo; `gestao` (docente, mentor) vê também a provisória; `aluno`, só a final. */
export type PerfilDaPremiacao = 'coordenacao' | 'gestao' | 'aluno';

export function premiacaoDaTurma({
  turmaId,
  turma,
  publicacao,
  itens,
  decisoes,
  perfil,
}: {
  turmaId: string;
  turma: string;
  /** Última publicação da turma. */
  publicacao: PublicacaoRanking | null;
  itens: ItemPremiacaoConfigurado[];
  decisoes: (DecisaoPremiacao & { posicao: number })[];
  perfil: PerfilDaPremiacao;
}): PremiacaoDaTurma {
  const ordenados = [...itens].sort((a, b) => a.posicao - b.posicao);
  const estado = publicacao?.estado;
  const mostra =
    estado === 'definitivo' || (estado === 'provisorio' && perfil !== 'aluno') ? publicacao : null;

  const posicoes = mostra?.posicoes ?? [];
  const daPosicao = (p: number) => posicoes.filter((x) => x.posicao === p);
  // O ranking compartilha posições e pula as seguintes (1, 1, 3): a 2ª fica sem equipe.
  const puladaPorEmpate = (p: number) =>
    posicoes.some((x) => x.posicao < p && x.posicao + daPosicao(x.posicao).length - 1 >= p);

  const resultado: ItemPremiacaoDaTurma[] = ordenados.map((item) => {
    const naPosicao = daPosicao(item.posicao);
    const empate = naPosicao.length > 1;
    const registrada =
      estado === 'definitivo' && empate
        ? (decisoes.find((d) => d.posicao === item.posicao) ?? null)
        : null;
    const decisao: DecisaoPremiacao | null = registrada
      ? {
          decisao: registrada.decisao,
          premiadas: registrada.premiadas,
          justificativa: registrada.justificativa,
          decididoEm: registrada.decididoEm,
        }
      : null;
    const equipes = (
      decisao ? naPosicao.filter((x) => decisao.premiadas.includes(x.duplaId)) : naPosicao
    ).map((x) => ({ id: x.duplaId, nome: x.nome }));
    return {
      posicao: item.posicao,
      descricao: item.descricao,
      detalhes: item.detalhes,
      equipes,
      empate,
      semEquipePorEmpate:
        mostra !== null && naPosicao.length === 0 && puladaPorEmpate(item.posicao),
      decisao,
    };
  });

  let situacao: SituacaoPremiacao = 'a_definir';
  if (mostra?.estado === 'provisorio') situacao = 'provisorio';
  if (mostra?.estado === 'definitivo') {
    situacao = resultado.some((i) => i.empate && !i.decisao) ? 'empate_a_decidir' : 'final';
  }
  return { turmaId, turma, situacao, publicacaoId: mostra?.id ?? null, itens: resultado };
}
