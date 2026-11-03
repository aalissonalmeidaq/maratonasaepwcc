/**
 * Comunicados da DEMONSTRAÇÃO (spec 009, R9): os comunicados fictícios de `dados.ts` nos mesmos
 * formatos do servidor, publicados pela coordenação fictícia para todos. As escritas são
 * recusadas, pois não há servidor para gravar nem para gerar avisos (FR-016).
 */
import type {
  ComunicadoGerido,
  ComunicadoRecebido,
  RepositorioComunicados,
} from '@/modules/comunicados';
import { comunicados, pessoas } from './dados';

const indisponivel = () =>
  Promise.reject(new Error('Indisponível no modo demonstração: a gravação exige o servidor.'));
const semPermissao = () => new Error('Você não tem permissão para esta operação.');

function recebidos(): ComunicadoRecebido[] {
  const autor = pessoas.find((p) => p.papeis.includes('coordenacao'))?.nome ?? 'Coordenação';
  return [...comunicados]
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((c) => ({
      id: c.id,
      titulo: c.titulo,
      texto: c.texto,
      publico: 'todos',
      turmas: [],
      autor: { nome: autor, papel: 'coordenacao' },
      publicadoEm: `${c.data}T12:00:00-03:00`,
      corrigidoEm: null,
      novo: false,
    }));
}

export function criarComunicadosDemo(usuarioAtual: () => string | null): RepositorioComunicados {
  const papeis = () => pessoas.find((p) => p.id === usuarioAtual())?.papeis ?? [];

  return {
    async comunicadosParaMim() {
      return recebidos();
    },
    async comunicadosQueGerencio() {
      const meus = papeis();
      if (meus.includes('coordenacao')) {
        return recebidos().map((c): ComunicadoGerido => ({
          id: c.id,
          titulo: c.titulo,
          texto: c.texto,
          publico: c.publico,
          turmas: c.turmas,
          autor: c.autor,
          publicadoEm: c.publicadoEm,
          corrigidoEm: c.corrigidoEm,
          estado: 'publicado',
          versao: 1,
          retiradoEm: null,
          justificativaRetirada: null,
          podeEditar: false,
        }));
      }
      if (meus.includes('docente') || meus.includes('mentor')) return [];
      throw semPermissao();
    },
    salvarComunicado: indisponivel,
    apagarRascunho: indisponivel,
    publicarComunicado: indisponivel,
    corrigirComunicado: indisponivel,
    retirarComunicado: indisponivel,
    marcarComunicadoLido: indisponivel,
  };
}
