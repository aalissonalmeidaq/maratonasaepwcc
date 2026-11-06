import type { ColunaRelatorio, Relatorio, TipoRelatorio, ValorCelula } from './tipos';

// R5: padrão das planilhas em português do Brasil, com BOM para preservar os acentos.
const BOM = '﻿';
const SEPARADOR = ';';
const FIM_DE_LINHA = '\r\n';
// Fuso oficial de Juazeiro do Norte (CE), spec 015.
const FUSO = 'America/Fortaleza';

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dataIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatarDataHora(iso: string): string {
  const partes = Object.fromEntries(
    dataHora.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

/** Injeção de fórmula (OWASP): texto que a planilha interpretaria como fórmula. */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

function valorDaCelula(valor: ValorCelula | undefined, coluna: ColunaRelatorio): string {
  if (valor === null || valor === undefined || valor === '') return '';
  switch (coluna.tipo) {
    case 'numero':
      return String(valor).replace('.', ',');
    case 'data_hora':
      return formatarDataHora(String(valor));
    case 'sim_nao':
      return valor === true ? 'Sim' : 'Não';
    case 'texto': {
      const texto = String(valor);
      return INICIO_DE_FORMULA.test(texto) ? `'${texto}` : texto;
    }
  }
}

function escapar(campo: string): string {
  return /[;"\r\n]/.test(campo) ? `"${campo.replaceAll('"', '""')}"` : campo;
}

/** Serializa o relatório recebido do servidor em CSV (sem linhas: só o cabeçalho). */
export function gerarCsv(relatorio: Relatorio): string {
  const cabecalho = relatorio.colunas.map((c) => escapar(c.rotulo)).join(SEPARADOR);
  const linhas = relatorio.linhas.map((linha) =>
    relatorio.colunas.map((c) => escapar(valorDaCelula(linha[c.id], c))).join(SEPARADOR),
  );
  return BOM + [cabecalho, ...linhas].join(FIM_DE_LINHA);
}

/** `maratona-<tipo>-<AAAA-MM-DD>.csv`, com a data de Juazeiro do Norte. */
export function nomeDoArquivo(tipo: TipoRelatorio, data: Date): string {
  return `maratona-${tipo}-${dataIso.format(data)}.csv`;
}
