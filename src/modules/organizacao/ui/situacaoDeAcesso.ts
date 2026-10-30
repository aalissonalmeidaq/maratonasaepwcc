import { formatarData } from '@/shared/lib/formatacao';
import type { SituacaoDeAcesso } from '../domain/tipos';

export const ROTULO = { ativo: 'Acesso ativo', pendente: 'Aguardando primeiro acesso' } as const;

export const venceEm = (s: SituacaoDeAcesso) =>
  s.conviteExpiraEm
    ? `Convite vence em ${formatarData(s.conviteExpiraEm, { month: '2-digit' })}`
    : 'Convite vencido ou não enviado';

/** Texto usado na busca da tabela de vínculos. */
export function textoDaSituacao(s: SituacaoDeAcesso | undefined): string {
  if (!s) return '';
  return s.acessoAtivo ? ROTULO.ativo : `${ROTULO.pendente} ${venceEm(s)}`;
}
