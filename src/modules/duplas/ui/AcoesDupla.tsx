import { useState, type FormEvent } from 'react';
import { Alert, Button, RetornoEnvio, SelectField, TextAreaField, useEnvio } from '@/shared/ui';
import {
  MINIMO_JUSTIFICATIVA,
  validarJustificativa,
  type EstudanteElegivel,
} from '../domain/composicao';
import type { Dupla } from '../domain/tipos';

interface AcoesDuplaProps {
  dupla: Dupla;
  /** Estudantes da turma sem dupla ativa (candidatos a entrar). */
  disponiveis: EstudanteElegivel[];
  onSubstituir: (dados: { sai: string; entra: string; justificativa: string }) => Promise<void>;
  onDesfazer: (justificativa: string) => Promise<void>;
  bloqueio?: string;
}

/** Substituir integrante ou desfazer a dupla — sempre com justificativa (FR-005). */
export function AcoesDupla({
  dupla,
  disponiveis,
  onSubstituir,
  onDesfazer,
  bloqueio,
}: AcoesDuplaProps) {
  const [acao, setAcao] = useState<'substituir' | 'desfazer'>('substituir');
  const [sai, setSai] = useState('');
  const [entra, setEntra] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const problema =
      validarJustificativa(justificativa) ??
      (acao === 'substituir' && (!sai || !entra) ? 'Selecione quem sai e quem entra.' : null);
    setErro(problema);
    if (problema) return;
    const ok =
      acao === 'substituir'
        ? await enviar(
            () => onSubstituir({ sai, entra, justificativa: justificativa.trim() }),
            'Integrante substituído.',
          )
        : await enviar(
            () => onDesfazer(justificativa.trim()),
            'Dupla desfeita. O histórico foi mantido.',
          );
    if (ok) {
      setSai('');
      setEntra('');
      setJustificativa('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-2 text-sm font-semibold">Alteração da {dupla.nome}</legend>
        {(['substituir', 'desfazer'] as const).map((a) => (
          <label key={a} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name={`acao-${dupla.id}`}
              checked={acao === a}
              onChange={() => setAcao(a)}
            />
            {a === 'substituir' ? 'Substituir integrante' : 'Desfazer dupla'}
          </label>
        ))}
      </fieldset>
      {acao === 'substituir' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            rotulo="Sai"
            placeholder="Selecione"
            opcoes={dupla.integrantes.map((i) => ({ valor: i.estudanteId, rotulo: i.nome }))}
            value={sai}
            onChange={(e) => setSai(e.target.value)}
          />
          <SelectField
            rotulo="Entra"
            placeholder={disponiveis.length ? 'Selecione' : 'Nenhum estudante disponível'}
            opcoes={disponiveis.map((e) => ({ valor: e.id, rotulo: e.nome }))}
            value={entra}
            onChange={(e) => setEntra(e.target.value)}
          />
        </div>
      )}
      <TextAreaField
        rotulo="Justificativa"
        dica={`Obrigatória (mínimo de ${MINIMO_JUSTIFICATIVA} caracteres). Fica registrada no histórico e na auditoria.`}
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        erro={erro ?? undefined}
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <Button
        type="submit"
        variante={acao === 'desfazer' ? 'destrutivo' : 'primario'}
        carregando={enviando}
        disabled={Boolean(bloqueio)}
        className="sm:self-start"
      >
        {acao === 'substituir' ? 'Registrar substituição' : 'Desfazer dupla'}
      </Button>
    </form>
  );
}
