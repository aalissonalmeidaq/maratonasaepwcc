import { formatarData } from '@/shared/lib/formatacao';
import type { EstadoEdicao } from '../domain/edicoes';

export const SELOS = {
  rascunho: { estado: 'pendente', rotulo: 'Em preparação' },
  ativa: { estado: 'em_andamento', rotulo: 'Ativa' },
  encerrada: { estado: 'concluido', rotulo: 'Encerrada' },
} as const;

export const rotuloDoEstado = (estado: EstadoEdicao) => SELOS[estado].rotulo;

export function textoDoPeriodo(inicio: string | null, fim: string | null): string {
  if (!inicio && !fim) return 'Período a definir';
  const data = (d: string | null) => (d ? formatarData(`${d}T12:00:00`) : 'a definir');
  return `${data(inicio)} a ${data(fim)}`;
}
