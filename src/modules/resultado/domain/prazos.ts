/**
 * Prazos e rótulos do resultado oficial (spec 007). Só orientam a interface: o servidor confere
 * os prazos pelo próprio relógio e recusa o que estiver fora deles (FR-008, FR-009, FR-020).
 */
import type { ComponenteRevisao, EstadoOcorrencia, EstadoRanking, PedidoRevisao } from './tipos';

export function prazoAberto(prazo: string | null, agora: Date): boolean {
  return prazo !== null && new Date(prazo).getTime() >= agora.getTime();
}

export function podeManifestar(
  o: { estado: EstadoOcorrencia; prazoManifestacao: string },
  agora: Date,
): boolean {
  return o.estado === 'registrada' && prazoAberto(o.prazoManifestacao, agora);
}

export type AlvoDeRevisao =
  | { objeto: 'ocorrencia'; estadoOcorrencia: EstadoOcorrencia; prazo: string | null }
  | { objeto: 'publicacao'; estadoPublicacao: EstadoRanking; prazo: string | null };

/** Decisão de ocorrência ou publicação provisória, dentro do prazo efetivo. */
export function podePedirRevisao(alvo: AlvoDeRevisao, agora: Date): boolean {
  const decidida =
    alvo.objeto === 'ocorrencia'
      ? alvo.estadoOcorrencia === 'confirmada' || alvo.estadoOcorrencia === 'arquivada'
      : alvo.estadoPublicacao === 'provisorio';
  return decidida && prazoAberto(alvo.prazo, agora);
}

const ROTULOS_OCORRENCIA: Record<EstadoOcorrencia, string> = {
  registrada: 'Registrada',
  manifestada: 'Manifestação enviada',
  confirmada: 'Confirmada',
  arquivada: 'Arquivada',
};
export const rotuloEstadoOcorrencia = (e: EstadoOcorrencia) => ROTULOS_OCORRENCIA[e];

const ROTULOS_RANKING: Record<EstadoRanking, string> = {
  parcial: 'Parcial',
  provisorio: 'Provisório',
  definitivo: 'Definitivo',
};
export const rotuloEstadoRanking = (e: EstadoRanking) => ROTULOS_RANKING[e];

export const ROTULO_COMPONENTE: Record<ComponenteRevisao, string> = {
  presenca: 'Presença',
  participacao: 'Participação',
  avaliacaoObjetiva: 'Questões / prova oficial',
  entrega: 'Entrega prática',
  apresentacao: 'Apresentação',
};

/** Descrição do que o pedido de revisão contesta. */
export const objetoDoPedido = (p: PedidoRevisao) =>
  p.objeto === 'ocorrencia'
    ? 'Decisão de ocorrência'
    : `${p.componente ? ROTULO_COMPONENTE[p.componente] : 'Pontos'}${
        p.encontroNumero ? ` — encontro ${p.encontroNumero}` : ''
      }${p.publicacaoVersao ? ` (versão ${p.publicacaoVersao})` : ''}`;
