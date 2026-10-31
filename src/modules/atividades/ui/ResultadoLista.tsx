import type { ListaParaEquipe } from '../domain/tipos';

const pontos = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Resultado depois do prazo (FR-017, FR-020): gabarito, justificativas e pontuação. */
export function ResultadoLista({ lista, maximo }: { lista: ListaParaEquipe; maximo: number }) {
  const sub = lista.submissao;
  const total = sub?.total ?? lista.questoes.length;
  const acertos = sub?.acertos ?? 0;
  const pontuacao = total > 0 ? Math.round((acertos * maximo * 100) / total) / 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-semibold">
        {sub
          ? `Pontuação: ${pontos(pontuacao)} de ${maximo} (${acertos} de ${total} acertos)`
          : `A equipe não enviou respostas: pontuação 0 de ${maximo}.`}
      </p>
      <ol className="flex flex-col gap-3">
        {lista.questoes.map((q, i) => {
          const marcada = sub?.respostas?.[q.id];
          const textoMarcada = q.alternativas.find((a) => a.id === marcada)?.texto;
          const gabarito = q.alternativas.find((a) => a.id === q.gabarito)?.texto ?? '—';
          return (
            <li key={q.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-semibold">
                {i + 1}. {q.enunciado}
              </p>
              <p>
                Resposta da equipe:{' '}
                {textoMarcada
                  ? `${textoMarcada} — ${marcada === q.gabarito ? 'correta' : 'incorreta'}`
                  : 'sem resposta (conta como erro)'}
              </p>
              <p>Gabarito: {gabarito}</p>
              {q.justificativa && <p className="text-text-secondary">{q.justificativa}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
