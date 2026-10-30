import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth';
import { convitesRecebidosPendentes } from '@/modules/duplas';
import { edicaoAtual } from '@/modules/organizacao';
import { useOnline } from '@/shared/pwa';
import { useRepositorios } from './useRepositorios';

/** Chaves de cache sempre prefixadas pela pessoa autenticada. */
function useChave() {
  const { sessao } = useAuth();
  return (...partes: (string | undefined)[]) => ['u', sessao?.usuarioId ?? 'anonimo', ...partes];
}

export function useEdicaoAtual() {
  const r = useRepositorios();
  const chave = useChave();
  return useQuery({
    queryKey: chave('edicoes'),
    queryFn: async () => edicaoAtual(await r.organizacao.edicoes()),
  });
}

function useDaEdicao<T>(
  nome: string,
  edicaoId: string | undefined,
  buscar: (id: string) => Promise<T>,
) {
  const chave = useChave();
  return useQuery({
    queryKey: chave(nome, edicaoId),
    queryFn: () => buscar(edicaoId as string),
    enabled: Boolean(edicaoId),
  });
}

export const useCursos = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('cursos', edicaoId, (id) => r.organizacao.cursos(id));
};
export const useTurmas = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('turmas', edicaoId, (id) => r.organizacao.turmas(id));
};
export const useVinculos = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('vinculos', edicaoId, (id) => r.organizacao.vinculos(id));
};
/** Só a coordenação consegue ler; para os demais perfis a consulta falha e a coluna fica vazia. */
export const useSituacaoDeAcesso = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('situacao-de-acesso', edicaoId, (id) => r.organizacao.situacaoDeAcesso(id));
};
export const useDuplas = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('duplas', edicaoId, (id) => r.duplas.duplas(id));
};
/** Colegas da turma do aluno, com a indicação de quem já tem equipe (FR-005). */
export function useColegas(turmaId?: string) {
  const r = useRepositorios();
  const chave = useChave();
  return useQuery({
    queryKey: chave('colegas', turmaId),
    queryFn: () => r.duplas.colegas(turmaId as string),
    enabled: Boolean(turmaId),
  });
}
/** Equipes ativas da turma com avisos para a gestão (FR-011/013). */
export function useEquipesGestao(turmaId?: string) {
  const r = useRepositorios();
  const chave = useChave();
  return useQuery({
    queryKey: chave('equipes-gestao', turmaId),
    queryFn: () => r.duplas.equipesGestao(turmaId as string),
    enabled: Boolean(turmaId),
  });
}
export function usePermiteTrio(turmaId?: string) {
  const r = useRepositorios();
  const chave = useChave();
  return useQuery({
    queryKey: chave('permite-trio', turmaId),
    queryFn: () => r.duplas.permiteTrio(turmaId as string),
    enabled: Boolean(turmaId),
  });
}
export const useConvites = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('convites', edicaoId, (id) => r.duplas.convites(id));
};
/** Quantidade de convites de equipe recebidos que esperam a resposta do aluno (FR-016). */
export function useConvitesPendentes(ativo: boolean): number {
  const { sessao } = useAuth();
  const edicao = useEdicaoAtual();
  const convites = useConvites(ativo ? edicao.data?.id : undefined);
  return convitesRecebidosPendentes(convites.data ?? [], sessao?.usuarioId ?? '').length;
}
export const useEncontros = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('encontros', edicaoId, (id) => r.encontros.encontros(id));
};
export const useAmbientes = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('ambientes', edicaoId, (id) => r.encontros.ambientes(id));
};
export function usePessoas() {
  const r = useRepositorios();
  const chave = useChave();
  return useQuery({ queryKey: chave('pessoas'), queryFn: () => r.organizacao.pessoas() });
}

/** Relê do servidor os dados da pessoa atual (ex.: depois de uma falha de gravação). */
export function useReler() {
  const cliente = useQueryClient();
  const chave = useChave();
  return () => void cliente.invalidateQueries({ queryKey: chave() });
}

/** Grava e, após a confirmação do servidor, recarrega os dados da pessoa atual. */
export function useGravar() {
  const cliente = useQueryClient();
  const chave = useChave();
  return <T>(gravar: () => Promise<T>) =>
    async () => {
      const resultado = await gravar();
      await cliente.invalidateQueries({ queryKey: chave() });
      return resultado;
    };
}

/** Motivo para bloquear escrita (demonstração ou sem conexão), ou `undefined`. */
export function useBloqueioDeEscrita(): string | undefined {
  const { somenteLeitura } = useRepositorios();
  const online = useOnline();
  if (somenteLeitura) return 'Indisponível no modo demonstração: nenhuma alteração é gravada.';
  if (!online) return 'Sem conexão: gravações exigem conexão com o servidor.';
  return undefined;
}
