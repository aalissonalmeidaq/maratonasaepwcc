import { TEMAS, type Premissa, type Situacao, type Tema } from './tipos';

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  aguardando: 'Aguardando resposta',
  confirmada: 'Confirmada',
  precisa_mudar: 'Precisa mudar',
};

export interface FiltroPremissas {
  situacao: Situacao | 'todas';
  tema: Tema | 'todos';
}

/** Pendentes (em validação) e resolvidas por uma especificação posterior. */
export function pendentesEResolvidas(premissas: readonly Premissa[]) {
  return {
    pendentes: premissas.filter((p) => !p.resolvidaPor),
    resolvidas: premissas.filter((p) => p.resolvidaPor),
  };
}

/** Total por situação das premissas pendentes (não muda com os filtros). */
export function contarPorSituacao(premissas: readonly Premissa[]): Record<Situacao, number> {
  const total: Record<Situacao, number> = { aguardando: 0, confirmada: 0, precisa_mudar: 0 };
  for (const p of pendentesEResolvidas(premissas).pendentes) total[p.situacao] += 1;
  return total;
}

export function filtrarPremissas(premissas: readonly Premissa[], filtro: FiltroPremissas) {
  return pendentesEResolvidas(premissas).pendentes.filter(
    (p) =>
      (filtro.situacao === 'todas' || p.situacao === filtro.situacao) &&
      (filtro.tema === 'todos' || p.tema === filtro.tema),
  );
}

/** Grupos por tema na ordem de `TEMAS`, sem temas vazios; a ordem dentro do tema é a recebida. */
export function agruparPorTema(premissas: readonly Premissa[]) {
  return TEMAS.map((tema) => ({
    tema,
    premissas: premissas.filter((p) => p.tema === tema),
  })).filter((g) => g.premissas.length > 0);
}
