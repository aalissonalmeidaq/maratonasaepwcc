/**
 * Repositórios de DEMONSTRAÇÃO: leem os dados fictícios e emulam a visibilidade por perfil
 * (a segurança real está na RLS). Nenhuma escrita é aceita, pois não há servidor para confirmar.
 */
import type { Dupla, RepositorioDuplas } from '@/modules/duplas';
import type { Encontro, RepositorioEncontros } from '@/modules/encontros';
import type { RepositorioOrganizacao } from '@/modules/organizacao';
import { cursos, duplas, edicao, encontros, pessoas, turmas } from './dados';

const recusar = async (): Promise<never> => {
  throw new Error('Indisponível no modo demonstração: nenhuma alteração é gravada.');
};

function horario(texto: string): { inicio: string | null; fim: string | null } {
  const m = /(\d{2})h(\d{2})–(\d{2})h(\d{2})/.exec(texto);
  return m ? { inicio: `${m[1]}:${m[2]}`, fim: `${m[3]}:${m[4]}` } : { inicio: null, fim: null };
}

const nomeDe = (id: string) => pessoas.find((p) => p.id === id)?.nome ?? '—';

export function criarRepositoriosDemo(usuarioAtual: () => string | null) {
  const eu = () => pessoas.find((p) => p.id === usuarioAtual());
  const coordena = () => eu()?.papeis.includes('coordenacao') ?? false;
  const turmasVisiveis = () => (coordena() ? turmas.map((t) => t.id) : (eu()?.turmas ?? []));

  const ambientes = [...new Set(encontros.map((e) => e.ambiente))]
    .filter((nome) => nome !== 'A confirmar')
    .map((nome, i) => ({ id: `amb-${i + 1}`, nome, observacoes: null }));

  const organizacao: RepositorioOrganizacao = {
    async edicoes() {
      return [
        {
          id: edicao.id,
          nome: edicao.nome,
          estado: 'ativa',
          quantidadeEncontros: edicao.regras.quantidadeEncontros,
          regrasVersao: edicao.regras.versao,
        },
      ];
    },
    async cursos() {
      return cursos.map((c) => ({ ...c, edicaoId: edicao.id }));
    },
    async turmas() {
      return turmas
        .filter((t) => turmasVisiveis().includes(t.id))
        .map((t) => ({ id: t.id, cursoId: t.cursoId, nome: t.nome, anoLetivo: null }));
    },
    async vinculos() {
      if (!coordena()) return [];
      return pessoas.flatMap((p) =>
        p.papeis.flatMap((papel) =>
          (p.turmas.length ? p.turmas : [null]).map((turmaId) => ({
            id: `${p.id}-${papel}-${turmaId ?? 'geral'}`,
            usuarioId: p.id,
            nome: p.nome,
            papel,
            turmaId,
            ativo: true,
          })),
        ),
      );
    },
    async pessoas() {
      return coordena() ? pessoas.map((p) => ({ id: p.id, nome: p.nome })) : [];
    },
    salvarCurso: recusar,
    removerCurso: recusar,
    salvarTurma: recusar,
    removerTurma: recusar,
    vincular: recusar,
    definirVinculoAtivo: recusar,
    criarConta: recusar,
    // Situações fictícias: a 3ª pessoa de cada lista aparece como pendente, para demonstrar a tela.
    async situacaoDeAcesso() {
      if (!coordena()) return [];
      return pessoas.map((p, i) => ({
        usuarioId: p.id,
        email: `${p.id}@exemplo.invalid`,
        acessoAtivo: i % 3 !== 2,
        conviteExpiraEm: i % 3 === 2 ? new Date(Date.now() + 5 * 86_400_000).toISOString() : null,
      }));
    },
    reenviarConvite: recusar,
    importarAlunos: recusar,
  };

  const repositorioDuplas: RepositorioDuplas = {
    async duplas() {
      const id = usuarioAtual();
      return duplas
        .filter((d) => coordena() || turmasVisiveis().includes(d.turmaId))
        .filter(
          (d) => coordena() || !eu()?.papeis.includes('aluno') || d.integrantes.includes(id ?? ''),
        )
        .map((d): Dupla => ({
          id: d.id,
          nome: d.nome,
          turmaId: d.turmaId,
          ativa: true,
          integrantes: d.integrantes.map((i) => ({ estudanteId: i, nome: nomeDe(i) })),
        }));
    },
    async historico(duplaId) {
      const d = duplas.find((x) => x.id === duplaId);
      return (d?.integrantes ?? []).map((i) => ({
        estudanteId: i,
        nome: nomeDe(i),
        entradaEm: encontros[0]?.data ?? '',
        saidaEm: null,
        motivo: null,
      }));
    },
    // Colegas fictícios da turma: no modo demonstração todos já estão em duplas.
    async colegas(turmaId) {
      const id = usuarioAtual();
      const comEquipe = new Set(duplas.flatMap((d) => d.integrantes));
      return pessoas
        .filter((p) => p.papeis.includes('aluno') && p.turmas.includes(turmaId) && p.id !== id)
        .map((p) => ({ id: p.id, nome: p.nome, temEquipe: comEquipe.has(p.id) }));
    },
    async convites() {
      return [];
    },
    enviarConvite: recusar,
    responderConvite: recusar,
    cancelarConvite: recusar,
    retirarAceite: recusar,
    // Turmas fictícias com número par de alunos: só duplas.
    async permiteTrio() {
      return false;
    },
    substituir: recusar,
    incluir: recusar,
    remover: recusar,
    formarPorDocente: recusar,
    definirNome: recusar,
    renomear: recusar,
    async equipesGestao(turmaId) {
      const lista = await repositorioDuplas.duplas('ed-demo');
      return lista
        .filter((d) => d.turmaId === turmaId)
        .map((d) => ({ ...d, trioEmTurmaPar: false }));
    },
    desfazer: recusar,
  };

  const repositorioEncontros: RepositorioEncontros = {
    async ambientes() {
      return ambientes;
    },
    async encontros() {
      return encontros.map((e): Encontro => ({
        id: e.id,
        numero: e.numero,
        titulo: e.titulo,
        data: e.data,
        ...horario(e.horario),
        ambienteId: ambientes.find((a) => a.nome === e.ambiente)?.id ?? null,
        ambienteNome: ambientes.find((a) => a.nome === e.ambiente)?.nome ?? null,
        avaliacaoObjetiva: e.avaliacaoObjetiva,
        orientacoes: null,
        estado: 'agendado',
      }));
    },
    salvarAmbiente: recusar,
    removerAmbiente: recusar,
    salvarEncontro: recusar,
    removerEncontro: recusar,
  };

  return {
    somenteLeitura: true,
    organizacao,
    duplas: repositorioDuplas,
    encontros: repositorioEncontros,
  };
}
