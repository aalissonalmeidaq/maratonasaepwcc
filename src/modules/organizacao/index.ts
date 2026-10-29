// Módulo 3 — edições, cursos e turmas (API pública).
export { criarRepositorioOrganizacaoSupabase } from './data/repositorioSupabase';
export {
  edicaoAtual,
  type Curso,
  type Edicao,
  type NovaConta,
  type Pessoa,
  type RepositorioOrganizacao,
  type Turma,
  type Vinculo,
} from './domain/tipos';
export { FormConta, FormCurso, FormTurma, FormVinculo } from './ui/Formularios';
