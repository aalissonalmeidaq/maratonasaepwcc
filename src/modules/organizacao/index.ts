// Módulo 3 — edições, cursos e turmas (API pública).
export { criarRepositorioOrganizacaoSupabase } from './data/repositorioSupabase';
export {
  edicaoAtual,
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
export { FormConta, FormCurso, FormTurma, FormVinculo } from './ui/Formularios';
export { AcoesDeAcesso, SituacaoDeAcessoBadge } from './ui/AcessoDaConta';
export { ImportarAlunos } from './ui/ImportarAlunos';
export { textoDaSituacao } from './ui/situacaoDeAcesso';
export {
  LIMITE_DE_LINHAS,
  lerCsvDeAlunos,
  type LinhaDeImportacao,
  type RecusaDeImportacao,
} from './domain/importacao';
