/**
 * Repositórios de DEMONSTRAÇÃO: leem os dados fictícios e emulam a visibilidade por perfil
 * (a segurança real está na RLS). Nenhuma escrita é aceita, pois não há servidor para confirmar.
 */
import type { Dupla, RepositorioDuplas } from '@/modules/duplas';
import type { Encontro, RepositorioEncontros } from '@/modules/encontros';
import type { RepositorioOrganizacao } from '@/modules/organizacao';
import type { RepositorioPainelTurma } from '@/modules/painel-turma';
import { criarAtividadesDemo } from './atividades';
import { rankingPorCategoria } from './consultas';
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

  const repositorioPainelTurma: RepositorioPainelTurma = {
    async painel(turmaId) {
      const turma = turmas.find((t) => t.id === turmaId);
      const curso = cursos.find((c) => c.id === turma?.cursoId);
      if (!turma || !curso) throw new Error('Turma não encontrada.');
      const pessoa = eu();
      const gestao =
        coordena() ||
        Boolean(
          pessoa?.turmas.includes(turmaId) &&
          pessoa.papeis.some((p) => p === 'docente' || p === 'mentor'),
        );
      const aluno = Boolean(pessoa?.papeis.includes('aluno') && pessoa.turmas.includes(turmaId));
      if (!gestao && !aluno) throw new Error('Você não tem acesso a esta turma.');

      const daTurma = duplas.filter((d) => d.turmaId === turmaId);
      // FR-005: ranking fictício da categoria, só com as equipes da turma. Na demonstração o
      // ranking conta como publicado em qualquer estado, inclusive parcial (PRD RF16/HU05).
      const publicada = true;
      const ranking = rankingPorCategoria().find((r) => r.categoria === curso.categoria);
      const daTurmaIds = new Set(daTurma.map((d) => d.id));
      const comEquipe = new Set(daTurma.flatMap((d) => d.integrantes));
      return {
        visao: gestao ? 'gestao' : 'aluno',
        turma: {
          id: turma.id,
          nome: turma.nome,
          anoLetivo: null,
          cursoNome: curso.nome,
          categoria: curso.categoria,
          edicaoId: edicao.id,
        },
        alunos: pessoas
          .filter((p) => p.papeis.includes('aluno') && p.turmas.includes(turmaId))
          .map((p) => ({ id: p.id, nome: p.nome, temEquipe: comEquipe.has(p.id) }))
          .sort((a, b) => a.nome.localeCompare(b.nome)),
        equipes: daTurma.map((d) => ({
          id: d.id,
          nome: d.nome,
          integrantes: d.integrantes.map((id) => ({
            estudanteId: id,
            nome: nomeDe(id),
            integranteInativo: false,
          })),
        })),
        convitesPendentes: gestao ? 0 : null,
        pontuacao: {
          ficticia: true,
          estado: edicao.estadoRanking,
          publicada,
          equipes:
            gestao || publicada
              ? (ranking?.posicoes ?? [])
                  .filter((p) => daTurmaIds.has(p.duplaId))
                  .sort((a, b) => a.posicao - b.posicao)
                  .map((p) => ({
                    equipeId: p.duplaId,
                    nome: p.nome,
                    total: p.totais.total,
                    posicao: p.posicao,
                    compartilhada: p.compartilhada,
                    pendente: p.totais.pendente,
                  }))
              : [],
        },
        encontros: (await repositorioEncontros.encontros(edicao.id)).map((e) => ({
          id: e.id,
          numero: e.numero,
          titulo: e.titulo,
          data: e.data,
          inicio: e.inicio,
          fim: e.fim,
          estado: e.estado,
          ambienteNome: e.ambienteNome,
        })),
      };
    },
  };

  return {
    somenteLeitura: true,
    organizacao,
    duplas: repositorioDuplas,
    encontros: repositorioEncontros,
    painelTurma: repositorioPainelTurma,
    atividades: criarAtividadesDemo(usuarioAtual),
  };
}
