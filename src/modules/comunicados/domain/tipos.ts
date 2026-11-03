// Contratos dos comunicados (spec 009, data-model.md e contracts/rpc.md). O público é checado no
// servidor; as respostas trazem o autor só como nome e papel, sem e-mail nem id de pessoa.

export type PublicoComunicado = 'todos' | 'estudantes' | 'equipe_docente';
export type EstadoComunicado = 'rascunho' | 'publicado' | 'retirado';
export type PapelAutor = 'coordenacao' | 'docente' | 'mentor';

export interface TurmaDoComunicado {
  id: string;
  nome: string;
}

export interface ComunicadoRecebido {
  id: string;
  titulo: string;
  texto: string;
  publico: PublicoComunicado;
  /** Vazio quando o público é a edição inteira. */
  turmas: TurmaDoComunicado[];
  autor: { nome: string; papel: PapelAutor };
  publicadoEm: string;
  /** Última correção depois de publicado ("Atualizado em"). */
  corrigidoEm: string | null;
  /** Há aviso não lido deste comunicado para a pessoa (R4). */
  novo: boolean;
}

export interface ComunicadoGerido extends Omit<ComunicadoRecebido, 'novo' | 'publicadoEm'> {
  estado: EstadoComunicado;
  versao: number;
  /** Nulo em rascunho. */
  publicadoEm: string | null;
  retiradoEm: string | null;
  justificativaRetirada: string | null;
  /** Quem chama pode editar, publicar, corrigir ou retirar (autor ainda vinculado ou coordenação). */
  podeEditar: boolean;
}

export interface EntradaComunicado {
  titulo: string;
  texto: string;
  publico: PublicoComunicado | null;
  turmaIds: string[];
}

export interface ResultadoPublicacao {
  publicadoEm: string;
  avisos: number;
}

export interface ResultadoCorrecao {
  versao: number;
  corrigidoEm: string | null;
  avisos: number;
}

/** Uma operação por RPC de contracts/rpc.md. */
export interface RepositorioComunicados {
  comunicadosParaMim(edicaoId: string): Promise<ComunicadoRecebido[]>;
  comunicadosQueGerencio(edicaoId: string): Promise<ComunicadoGerido[]>;
  /** Cria (com `id` nulo) ou edita um rascunho; devolve o id. */
  salvarComunicado(
    chave: string,
    id: string | null,
    edicaoId: string,
    entrada: EntradaComunicado,
  ): Promise<string>;
  apagarRascunho(id: string): Promise<void>;
  publicarComunicado(id: string): Promise<ResultadoPublicacao>;
  corrigirComunicado(
    id: string,
    titulo: string,
    texto: string,
    justificativa: string,
  ): Promise<ResultadoCorrecao>;
  retirarComunicado(id: string, justificativa: string): Promise<void>;
  marcarComunicadoLido(id: string): Promise<number>;
}
