// Módulo 3 — edições, cursos e turmas (API pública).
export { criarRepositorioOrganizacaoSupabase } from './data/repositorioSupabase';
export {
  type Curso,
  type Edicao,
  type NovaConta,
  type Pessoa,
  type RepositorioOrganizacao,
  type ResultadoDaImportacao,
  type SituacaoDeAcesso,
  type Turma,
  type Vinculo,
} from './domain/tipos';
export {
  edicaoPadrao,
  validarEdicao,
  type EdicaoGerida,
  type EntradaEdicao,
  type ErrosDaEdicao,
  type EstadoEdicao,
  type PendenciasDaEdicao,
} from './domain/edicoes';
export {
  validarItemDoCadastro,
  type CursoDoCadastro,
  type PessoaParaVincular,
  type TurmaDoCadastro,
} from './domain/cadastro';
export { FormConta, FormCurso, FormTurma, FormVinculo } from './ui/Formularios';
export { AcoesDeAcesso, SituacaoDeAcessoBadge } from './ui/AcessoDaConta';
export { ImportarAlunos } from './ui/ImportarAlunos';
export { FormDadosDaEdicao, FormEdicao } from './ui/FormEdicao';
export { ListaEdicoes } from './ui/ListaEdicoes';
export { CadastroCursosTurmas } from './ui/CadastroCursosTurmas';
export { VincularTurmas } from './ui/VincularTurmas';
export { GestaoDaTurma } from './ui/GestaoDaTurma';
export { MentoresDoCurso } from './ui/MentoresDoCurso';
export { EstadoDaEdicao } from './ui/EstadoDaEdicao';
export { CoordenacaoDaEdicao } from './ui/CoordenacaoDaEdicao';
export { SeletorEdicao } from './ui/SeletorEdicao';
export { SeloDaEdicao } from './ui/SeloDaEdicao';
export { rotuloDoEstado, textoDoPeriodo } from './ui/textoDaEdicao';
export { textoDaSituacao } from './ui/situacaoDeAcesso';
export {
  LIMITE_DE_LINHAS,
  lerCsvDeAlunos,
  type LinhaDeImportacao,
  type RecusaDeImportacao,
} from './domain/importacao';
