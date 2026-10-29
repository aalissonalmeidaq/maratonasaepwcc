const pontos = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export const formatarPontos = (valor: number) => pontos.format(valor);

/** Datas `AAAA-MM-DD` são tratadas como data local (sem deslocamento de fuso). */
export function formatarData(iso: string, opcoes: Intl.DateTimeFormatOptions = {}) {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', ...opcoes });
}

export function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
