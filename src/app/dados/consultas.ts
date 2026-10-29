import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth';
import type { EstudanteElegivel } from '@/modules/duplas';
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
export const useDuplas = (edicaoId?: string) => {
  const r = useRepositorios();
  return useDaEdicao('duplas', edicaoId, (id) => r.duplas.duplas(id));
};
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

/** Alunos ativos com a dupla ativa de cada um (para formar e alterar duplas). */
export function estudantesElegiveis(
  vinculos: {
    usuarioId: string;
    nome: string;
    papel: string;
    turmaId: string | null;
    ativo: boolean;
  }[],
  duplas: { id: string; ativa: boolean; integrantes: { estudanteId: string }[] }[],
): EstudanteElegivel[] {
  return vinculos
    .filter((v) => v.papel === 'aluno' && v.ativo && v.turmaId)
    .map((v) => ({
      id: v.usuarioId,
      nome: v.nome,
      turmaId: v.turmaId as string,
      duplaAtivaId:
        duplas.find((d) => d.ativa && d.integrantes.some((i) => i.estudanteId === v.usuarioId))
          ?.id ?? null,
    }));
}
