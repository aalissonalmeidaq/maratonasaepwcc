import { describe, expect, it } from 'vitest';
import {
  podeManifestar,
  podePedirRevisao,
  prazoAberto,
  rotuloEstadoOcorrencia,
  rotuloEstadoRanking,
} from './prazos';

const agora = new Date('2026-11-01T12:00:00Z');

describe('prazoAberto', () => {
  it('aberto até o instante do prazo, inclusive', () => {
    expect(prazoAberto('2026-11-01T12:00:00Z', agora)).toBe(true);
    expect(prazoAberto('2026-11-01T11:59:59Z', agora)).toBe(false);
  });
  it('sem prazo não está aberto', () => {
    expect(prazoAberto(null, agora)).toBe(false);
  });
});

describe('podeManifestar (FR-008)', () => {
  it('só na ocorrência registrada e dentro do prazo', () => {
    expect(
      podeManifestar({ estado: 'registrada', prazoManifestacao: '2026-11-02T00:00:00Z' }, agora),
    ).toBe(true);
    expect(
      podeManifestar({ estado: 'registrada', prazoManifestacao: '2026-11-01T00:00:00Z' }, agora),
    ).toBe(false);
    expect(
      podeManifestar({ estado: 'manifestada', prazoManifestacao: '2026-11-02T00:00:00Z' }, agora),
    ).toBe(false);
    expect(
      podeManifestar({ estado: 'confirmada', prazoManifestacao: '2026-11-02T00:00:00Z' }, agora),
    ).toBe(false);
  });
});

describe('podePedirRevisao (FR-020)', () => {
  it('decisão de ocorrência dentro do prazo', () => {
    expect(
      podePedirRevisao(
        { objeto: 'ocorrencia', estadoOcorrencia: 'confirmada', prazo: '2026-11-01T13:00:00Z' },
        agora,
      ),
    ).toBe(true);
    expect(
      podePedirRevisao(
        { objeto: 'ocorrencia', estadoOcorrencia: 'arquivada', prazo: '2026-11-01T13:00:00Z' },
        agora,
      ),
    ).toBe(true);
  });
  it('ocorrência ainda não decidida ou prazo vencido não permite', () => {
    expect(
      podePedirRevisao(
        { objeto: 'ocorrencia', estadoOcorrencia: 'registrada', prazo: '2026-11-01T13:00:00Z' },
        agora,
      ),
    ).toBe(false);
    expect(
      podePedirRevisao(
        { objeto: 'ocorrencia', estadoOcorrencia: 'confirmada', prazo: '2026-11-01T11:00:00Z' },
        agora,
      ),
    ).toBe(false);
  });
  it('só a publicação provisória abre prazo; parcial e definitiva não', () => {
    expect(
      podePedirRevisao(
        { objeto: 'publicacao', estadoPublicacao: 'provisorio', prazo: '2026-11-02T00:00:00Z' },
        agora,
      ),
    ).toBe(true);
    expect(
      podePedirRevisao(
        { objeto: 'publicacao', estadoPublicacao: 'parcial', prazo: '2026-11-02T00:00:00Z' },
        agora,
      ),
    ).toBe(false);
    expect(
      podePedirRevisao(
        { objeto: 'publicacao', estadoPublicacao: 'definitivo', prazo: '2026-11-02T00:00:00Z' },
        agora,
      ),
    ).toBe(false);
    expect(
      podePedirRevisao(
        { objeto: 'publicacao', estadoPublicacao: 'provisorio', prazo: '2026-11-01T00:00:00Z' },
        agora,
      ),
    ).toBe(false);
  });
});

describe('rótulos em português', () => {
  it('estados da ocorrência', () => {
    expect(rotuloEstadoOcorrencia('registrada')).toBe('Registrada');
    expect(rotuloEstadoOcorrencia('manifestada')).toBe('Manifestação enviada');
    expect(rotuloEstadoOcorrencia('confirmada')).toBe('Confirmada');
    expect(rotuloEstadoOcorrencia('arquivada')).toBe('Arquivada');
  });
  it('estados do ranking', () => {
    expect(rotuloEstadoRanking('parcial')).toBe('Parcial');
    expect(rotuloEstadoRanking('provisorio')).toBe('Provisório');
    expect(rotuloEstadoRanking('definitivo')).toBe('Definitivo');
  });
});
