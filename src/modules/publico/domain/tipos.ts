import type { z } from 'zod';
import type { regulamentoPublicoSchema } from './validacao';
export type RegulamentoPublico = z.infer<typeof regulamentoPublicoSchema>;
export type EdicaoPublica = RegulamentoPublico['edicoes'][number];
export type EncontroPublico = EdicaoPublica['encontros'][number];
export interface RepositorioPublico {
  regulamentoPublico(): Promise<RegulamentoPublico>;
}
export type LeituraDoRegulamento =
  | { origem: 'servidor'; conteudo: RegulamentoPublico; persistencia: 'salva'; salvoEm: string }
  | { origem: 'servidor'; conteudo: RegulamentoPublico; persistencia: 'falhou' }
  | { origem: 'copia'; conteudo: RegulamentoPublico; salvoEm: string }
  | { origem: 'sem-copia' };
