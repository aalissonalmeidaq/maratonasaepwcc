import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import { Alert, RodapeDoFormulario, TextAreaField, useEnvio } from '@/shared/ui';
import type { EstadoRanking, PendenciasDaCategoria } from '../domain/tipos';

const COMPONENTE: Record<string, string> = {
  participacao: 'participação',
  avaliacaoObjetiva: 'questões/prova oficial',
  entrega: 'entrega',
  apresentacao: 'apresentação',
};

const ESTADOS: { valor: EstadoRanking; rotulo: string; dica: string }[] = [
  { valor: 'parcial', rotulo: 'Parcial', dica: 'Retrato do andamento; não abre prazo de revisão.' },
  {
    valor: 'provisorio',
    rotulo: 'Provisório',
    dica: 'Abre 24 horas para as equipes pedirem revisão dos pontos.',
  },
  { valor: 'definitivo', rotulo: 'Definitivo', dica: 'Resultado final; exige zero pendências.' },
];

/**
 * Publicação do ranking de uma categoria pela coordenação (US4). Cada publicação cria uma versão
 * imutável; a partir da segunda, a justificativa é obrigatória (FR-018). O servidor recusa o
 * definitivo enquanto houver pendências (FR-017) e devolve a lista.
 */
export function PainelPublicacao({
  pendencias,
  versaoAtual,
  onPublicar,
  bloqueio,
}: {
  pendencias: PendenciasDaCategoria;
  versaoAtual: number | null;
  onPublicar: (d: { estado: EstadoRanking; justificativa?: string }) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [estado, setEstado] = useState<EstadoRanking>('parcial');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado: envio, enviando, enviar } = useEnvio();
  const exigeJustificativa = versaoAtual !== null;
  const itens = [
    ...pendencias.componentes.map(
      (c) =>
        `${c.duplaNome} — encontro ${c.encontroNumero}: ${COMPONENTE[c.componente] ?? c.componente}`,
    ),
    ...pendencias.ocorrencias.map((o) => `${o.duplaNome} — ocorrência sem decisão`),
    ...pendencias.revisoes.map((r) => `${r.duplaNome} — revisão aberta`),
  ];

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const motivo = exigeJustificativa ? validarJustificativa(justificativa) : null;
    setErro(motivo);
    if (motivo) return;
    await enviar(
      () =>
        onPublicar({
          estado,
          justificativa: exigeJustificativa ? justificativa.trim() : undefined,
        }),
      'Ranking publicado. As equipes da categoria foram avisadas.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      {itens.length > 0 ? (
        <Alert tom="alerta" titulo={`${itens.length} pendência(s) impedem o definitivo`}>
          <ul className="list-disc pl-5">
            {itens.slice(0, 20).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Alert>
      ) : (
        <Alert tom="sucesso" titulo="Nenhuma pendência na categoria." />
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Estado da publicação</legend>
        {ESTADOS.map((e) => (
          <div key={e.valor} className="flex flex-col">
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input
                type="radio"
                name="estado-ranking"
                className="size-5"
                value={e.valor}
                checked={estado === e.valor}
                disabled={e.valor === 'definitivo' && itens.length > 0}
                onChange={() => setEstado(e.valor)}
                aria-describedby={`estado-${e.valor}-dica`}
              />
              {e.rotulo}
            </label>
            <p id={`estado-${e.valor}-dica`} className="ml-8 text-sm text-text-secondary">
              {e.dica}
            </p>
          </div>
        ))}
      </fieldset>
      {exigeJustificativa && (
        <TextAreaField
          rotulo="Justificativa da nova versão"
          dica={`A versão ${versaoAtual} continua no histórico.`}
          maxLength={2000}
          value={justificativa}
          erro={erro ?? undefined}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      )}
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={envio}
        enviando={enviando}
        rotulo="Publicar ranking"
        icone="ranking"
      />
    </form>
  );
}
