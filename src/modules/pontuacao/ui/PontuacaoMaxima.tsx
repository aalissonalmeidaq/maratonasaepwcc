const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Pontuação máxima da turma (US3, FR-009): soma dos máximos dos encontros de que ela participa. */
export function PontuacaoMaxima({ maximo, encontros }: { maximo: number; encontros: number }) {
  return (
    <p className="text-sm font-semibold">
      {`Pontuação máxima da turma: ${numero(maximo)} pontos (${encontros} ${encontros === 1 ? 'encontro' : 'encontros'})`}
    </p>
  );
}
