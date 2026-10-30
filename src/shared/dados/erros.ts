/** Mensagens para restrições conhecidas do banco (nome da constraint → texto). */
const RESTRICOES: Record<string, string> = {
  cursos_edicao_id_nome_key: 'Já existe um curso com esse nome nesta edição.',
  turmas_curso_id_nome_key: 'Já existe uma turma com esse nome neste curso.',
  atribuicoes_aluno_uma_turma: 'O estudante já está ativo em outra turma desta edição.',
  atribuicoes_unica: 'Esta pessoa já tem esse papel nesta turma.',
  ambientes_edicao_id_nome_key: 'Já existe um ambiente com esse nome nesta edição.',
  encontros_numero_unico: 'Já existe um encontro com esse número.',
  encontros_horario_valido: 'O término deve ser depois do início.',
  duplas_nome_ativo_por_turma: 'Já existe uma equipe com esse nome nesta turma.',
  integrantes_um_por_edicao: 'Um dos estudantes já participa de outra equipe ativa nesta edição.',
  atribuicoes_aluno_tem_turma: 'Alunos precisam estar vinculados a uma turma.',
  atribuicoes_coordenacao_sem_turma: 'A coordenação não é vinculada a uma turma específica.',
};

interface ErroPostgrest {
  code: string;
  message: string;
}

function eErroPostgrest(e: unknown): e is ErroPostgrest {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
}

function restricao(mensagem: string): string | undefined {
  return /constraint "([^"]+)"/.exec(mensagem)?.[1];
}

/** Converte qualquer erro de gravação/consulta em mensagem compreensível em português. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof TypeError)
    return 'Sem conexão com o servidor. Nada foi gravado; tente novamente.';
  if (!eErroPostgrest(erro)) return 'Não foi possível concluir a operação. Tente novamente.';

  const nome = restricao(erro.message);
  if (nome && RESTRICOES[nome]) return RESTRICOES[nome];

  switch (erro.code) {
    case '23505':
      return 'Já existe um registro com esses dados.';
    case '42501':
      return 'Você não tem permissão para esta operação.';
    case '23503':
      return 'Este registro está em uso e não pode ser removido.';
    case '23514':
    case 'P0001':
      // Mensagens de regra escritas pelo servidor já estão em português.
      return nome ? 'Os dados informados não atendem às regras.' : erro.message;
    default:
      return 'Não foi possível concluir a operação. Tente novamente.';
  }
}

/** Erro lançado pelos repositórios com mensagem pronta para exibição. */
export class ErroDeDados extends Error {
  constructor(public readonly original: unknown) {
    super(mensagemDeErro(original));
    this.name = 'ErroDeDados';
  }
}

/** Desembrulha a resposta de uma consulta, lançando `ErroDeDados` se houver erro. */
export function verificar<T>(resposta: { data: T | null; error: unknown }): T {
  if (resposta.error) throw new ErroDeDados(resposta.error);
  if (resposta.data === null) throw new ErroDeDados({ code: 'sem_dados', message: '' });
  return resposta.data;
}

/** Confere uma gravação (insert/update/delete/RPC sem retorno). */
export function verificarGravacao(resposta: { error: unknown }): void {
  if (resposta.error) throw new ErroDeDados(resposta.error);
}
