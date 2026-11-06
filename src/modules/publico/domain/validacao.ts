import { z } from 'zod';
const numero = z.number().finite().nullish();
const texto = z.string().nullish();
const criterio = z.object({ id: texto, rotulo: texto, maximo: numero });
const criterios = z.array(criterio).nullish();
/** Projeção recursiva: os extras são descartados também dentro dos critérios/faixas. */
export const regrasPublicasSchema = z.object({
  versao: texto,
  presenca: z.object({ pontosPorIntegrante: numero, maximoPorDupla: numero }).nullish(),
  participacao: z.object({ criterios }).nullish(),
  questoes: z.object({ maximo: numero }).nullish(),
  entrega: z
    .object({
      criterios,
      criterioDeAtraso: texto,
      limiteAtrasoMinutos: numero,
      faixasDeAtraso: z.array(z.object({ ateMinutos: numero, desconto: numero })).nullish(),
    })
    .nullish(),
  apresentacao: z.object({ criterios }).nullish(),
  provaOficial: z
    .object({ pontosRealizacao: numero, pontosBonus: numero, notaMinimaBonus: numero })
    .nullish(),
  penalidades: z.object({ tetoDescontosPorEncontro: numero }).nullish(),
  prazos: z.object({ manifestacaoHoras: numero, revisaoHoras: numero }).nullish(),
});
const data = z.iso.date();
const horario = z
  .string()
  .regex(/^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/)
  .nullable();
export const regulamentoPublicoSchema = z.object({
  geradoEm: z.iso.datetime({ offset: true }),
  edicoes: z.array(
    z.object({
      id: z.string().min(1),
      nome: z.string().min(1),
      // Ausente nas cópias salvas antes da spec 016: a página continua legível offline.
      unidade: z.string().min(1).optional(),
      inicio: data.nullable(),
      fim: data.nullable(),
      regras: regrasPublicasSchema,
      regrasVersao: z.string(),
      encontros: z.array(
        z.object({
          numero: z.number().int().min(1),
          titulo: z.string(),
          data,
          inicio: horario,
          fim: horario,
          estado: z.enum(['agendado', 'realizado', 'cancelado']),
        }),
      ),
    }),
  ),
});
export const copiaPublicaSchema = z.object({
  salvoEm: z.iso.datetime({ offset: true }),
  conteudo: regulamentoPublicoSchema,
});
