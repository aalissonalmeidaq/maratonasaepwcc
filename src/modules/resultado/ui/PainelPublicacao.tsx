import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import { Alert, RodapeDoFormulario, TextAreaField, useEnvio } from '@/shared/ui';
import type { EstadoRanking, ResultadoLote } from '../domain/tipos';
import { ResultadoDoLote } from './ResultadoDoLote';

const ESTADOS: { valor: EstadoRanking; rotulo: string; dica: string }[] = [
  { valor: 'parcial', rotulo: 'Parcial', dica: 'Retrato do andamento; não abre prazo de revisão.' },
  {
    valor: 'provisorio',
    rotulo: 'Provisório',
    dica: 'Abre o prazo para as equipes pedirem revisão dos pontos.',
  },
  {
    valor: 'definitivo',
    rotulo: 'Definitivo',
    dica: 'Resultado final; turmas com pendências são recusadas e as demais publicadas.',
  },
];

export interface TurmaMarcada {
  turmaId: string;
  turma: string;
  /** Última versão que a tela carregou (`null` sem publicação): o servidor recusa se mudou. */
  versaoBase: number | null;
}

/**
 * Publicação do ranking das turmas marcadas (spec 012, FR-007a). Cada turma vira uma versão
 * própria; a justificativa é obrigatória se alguma já tiver publicação (FR-005). O resultado de
 * cada turma vem do servidor.
 */
export function PainelPublicacao({
  turmas,
  onPublicar,
  onRecarregar,
  bloqueio,
}: {
  turmas: TurmaMarcada[];
  onPublicar: (d: { estado: EstadoRanking; justificativa?: string }) => Promise<ResultadoLote>;
  onRecarregar?: () => void;
  bloqueio?: string;
}) {
  const [estado, setEstado] = useState<EstadoRanking>('parcial');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoLote | null>(null);
  const { estado: envio, enviando, enviar } = useEnvio();
  const exigeJustificativa = turmas.some((t) => t.versaoBase !== null);
  const semTurma = turmas.length === 0;

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    if (semTurma) return;
    const motivo = exigeJustificativa ? validarJustificativa(justificativa) : null;
    setErro(motivo);
    if (motivo) return;
    setResultado(null);
    await enviar(async () => {
      const r = await onPublicar({
        estado,
        justificativa: exigeJustificativa ? justificativa.trim() : undefined,
      });
      setResultado(r);
      return r;
      // O desfecho de cada turma aparece no resultado do lote, não numa mensagem única.
    }, '');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      {!semTurma && (
        <p className="text-sm">Turmas marcadas: {turmas.map((t) => t.turma).join(', ')}.</p>
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
          rotulo="Justificativa"
          dica="Obrigatória: alguma turma marcada já tem versão publicada, que continua no histórico."
          maxLength={2000}
          value={justificativa}
          erro={erro ?? undefined}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      )}
      {envio.tipo === 'erro' && <Alert tom="erro" titulo={envio.mensagem} anunciar />}
      <RodapeDoFormulario
        bloqueio={bloqueio ?? (semTurma ? 'Marque ao menos uma turma na lista.' : undefined)}
        estado={envio.tipo === 'enviando' ? envio : { tipo: 'ocioso' }}
        enviando={enviando}
        rotulo={`Publicar ${turmas.length} ${turmas.length === 1 ? 'turma' : 'turmas'}`}
        icone="ranking"
      />
      {resultado && (
        <ResultadoDoLote resultado={resultado} onRecarregar={onRecarregar ?? (() => {})} />
      )}
    </form>
  );
}
