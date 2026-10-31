/**
 * Regras puras de envio e prazo (spec 006). Orientam a tela; o servidor repete todas e é a
 * autoridade sobre horário, atraso e aceite (FR-003, FR-006, FR-027).
 */
import type { RegrasDaEdicao } from '@/modules/pontuacao';

/** Decidido em 2026-10-30: PDF, ZIP, PNG e JPG até 50 MB (mesma configuração do bucket). */
export const LIMITE_ARQUIVO_BYTES = 50 * 1024 * 1024;
export const TIPOS_ACEITOS = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
] as const;
export const EXTENSOES_ACEITAS = '.pdf,.zip,.png,.jpg,.jpeg';

export function validarArquivo(arquivo: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (!(TIPOS_ACEITOS as readonly string[]).includes(arquivo.type)) {
    return 'Tipo de arquivo não aceito: envie PDF, ZIP, PNG ou JPG.';
  }
  if (arquivo.size <= 0) return 'O arquivo está vazio.';
  if (arquivo.size > LIMITE_ARQUIVO_BYTES) return 'O arquivo passa do limite de 50 MB.';
  return null;
}

export function validarLink(texto: string): string | null {
  return /^https?:\/\/\S+$/.test(texto.trim()) ? null : 'Informe um link válido (http ou https).';
}

/** Minutos de atraso (fração conta como minuto) e desconto pelas faixas das regras. */
export function atrasoPrevisto(
  prazo: string,
  agora: Date,
  regras: RegrasDaEdicao,
): { minutos: number; desconto: number; aceita: boolean } {
  const minutos = Math.max(0, Math.ceil((agora.getTime() - new Date(prazo).getTime()) / 60_000));
  if (minutos === 0) return { minutos, desconto: 0, aceita: true };
  if (minutos > regras.entrega.limiteAtrasoMinutos) return { minutos, desconto: 0, aceita: false };
  const faixa = regras.entrega.faixasDeAtraso.find((f) => minutos <= f.ateMinutos);
  return { minutos, desconto: faixa?.desconto ?? 0, aceita: true };
}

export type SituacaoDesafio = 'aberto' | 'prazo_encerrado' | 'encerrado';

export function situacaoDesafio(
  d: { prazoEfetivo: string; encerrado: boolean },
  agora: Date,
  regras: RegrasDaEdicao,
): SituacaoDesafio {
  // O servidor já considera encerramento manual e prorrogação da equipe (FR-027).
  if (d.encerrado) return 'encerrado';
  const atraso = atrasoPrevisto(d.prazoEfetivo, agora, regras);
  if (!atraso.aceita) return 'encerrado';
  return atraso.minutos > 0 ? 'prazo_encerrado' : 'aberto';
}
