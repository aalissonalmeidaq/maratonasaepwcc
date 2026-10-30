import { useState, type FormEvent } from 'react';
import { Alert, Button, RetornoEnvio, TextAreaField, useEnvio } from '@/shared/ui';
import { MINIMO_JUSTIFICATIVA, validarJustificativa } from '../domain/composicao';

interface FormEquipeDocenteProps {
  /** Alunos ativos da turma sem equipe. */
  disponiveis: { id: string; nome: string }[];
  /** Turma ímpar e sem trio: a equipe pode ter três alunos. */
  permiteTrio: boolean;
  onFormar: (dados: { estudantes: string[]; justificativa: string }) => Promise<void>;
  bloqueio?: string;
}

/** FR-010: docente ou mentor forma equipe com os alunos que sobraram. */
export function FormEquipeDocente({
  disponiveis,
  permiteTrio,
  onFormar,
  bloqueio,
}: FormEquipeDocenteProps) {
  const [marcados, setMarcados] = useState<string[]>([]);
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();
  const limite = permiteTrio ? 3 : 2;

  if (disponiveis.length === 0) {
    // A confirmação da última formação continua visível mesmo sem alunos restantes.
    return (
      <div className="flex flex-col gap-3">
        <RetornoEnvio estado={estado} />
        <p className="text-sm text-text-secondary">Todos os alunos da turma já estão em equipes.</p>
      </div>
    );
  }

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const problema = marcados.length < 2 ? 'Escolha dois alunos (dupla) ou três (trio).' : null;
    const problemaJustificativa = validarJustificativa(justificativa);
    setErro(problema ?? problemaJustificativa);
    if (problema || problemaJustificativa) return;
    const ok = await enviar(
      () => onFormar({ estudantes: marcados, justificativa: justificativa.trim() }),
      'Equipe formada.',
    );
    if (ok) {
      setMarcados([]);
      setJustificativa('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">Alunos sem equipe</legend>
        <p className="text-sm text-text-secondary">
          {permiteTrio
            ? 'Escolha dois alunos para uma dupla ou três para o trio da turma.'
            : 'Escolha dois alunos para formar a dupla.'}
        </p>
        {disponiveis.map((a) => {
          const marcado = marcados.includes(a.id);
          return (
            <label key={a.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name={a.id}
                checked={marcado}
                disabled={!marcado && marcados.length >= limite}
                onChange={() =>
                  setMarcados((atual) =>
                    marcado ? atual.filter((x) => x !== a.id) : [...atual, a.id],
                  )
                }
                className="size-5"
              />
              {a.nome}
            </label>
          );
        })}
      </fieldset>
      <TextAreaField
        rotulo="Justificativa"
        dica={`Obrigatória (mínimo de ${MINIMO_JUSTIFICATIVA} caracteres). Fica registrada no histórico e na auditoria.`}
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      {erro && <Alert tom="erro" titulo={erro} anunciar />}
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <Button
        type="submit"
        icone="equipe"
        carregando={enviando}
        disabled={Boolean(bloqueio)}
        className="sm:self-start"
      >
        Formar equipe
      </Button>
    </form>
  );
}
