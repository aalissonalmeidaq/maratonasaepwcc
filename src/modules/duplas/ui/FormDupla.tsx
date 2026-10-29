import { useState, type FormEvent } from 'react';
import { Alert, Button, RetornoEnvio, SelectField, TextField, useEnvio } from '@/shared/ui';
import { validarComposicao, type EstudanteElegivel, type NovaDupla } from '../domain/composicao';

interface FormDuplaProps {
  turmas: { id: string; nome: string }[];
  estudantes: EstudanteElegivel[];
  onFormar: (dupla: NovaDupla) => Promise<void>;
  /** Motivo para impedir gravações (ex.: modo demonstração). */
  bloqueio?: string;
}

/** Formar dupla (US3). Valida antes de enviar; o servidor confirma e é a autoridade final. */
export function FormDupla({ turmas, estudantes, onFormar, bloqueio }: FormDuplaProps) {
  const [turmaId, setTurmaId] = useState('');
  const [nome, setNome] = useState('');
  const [integrante1, setIntegrante1] = useState('');
  const [integrante2, setIntegrante2] = useState('');
  const [errosLocais, setErrosLocais] = useState<string[]>([]);
  const { estado, enviando, enviar, limpar } = useEnvio();

  const elegiveis = estudantes
    .filter((e) => e.turmaId === turmaId && !e.duplaAtivaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const opcoes = elegiveis.map((e) => ({ valor: e.id, rotulo: e.nome }));

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    limpar();
    const dupla = {
      turmaId,
      nome: nome.trim(),
      integrantes: [integrante1, integrante2].filter(Boolean),
    };
    const erros = turmaId ? validarComposicao(dupla, estudantes) : ['Selecione a turma.'];
    setErrosLocais(erros);
    if (erros.length) return;
    const ok = await enviar(() => onFormar(dupla), 'Dupla formada.');
    if (ok) {
      setNome('');
      setIntegrante1('');
      setIntegrante2('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <SelectField
        rotulo="Turma"
        placeholder="Selecione"
        opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
        value={turmaId}
        onChange={(e) => {
          setTurmaId(e.target.value);
          setIntegrante1('');
          setIntegrante2('');
        }}
      />
      <TextField
        rotulo="Nome da dupla"
        value={nome}
        maxLength={80}
        onChange={(e) => setNome(e.target.value)}
      />
      <SelectField
        rotulo="Integrante 1"
        placeholder="Selecione"
        opcoes={opcoes}
        value={integrante1}
        disabled={!turmaId}
        onChange={(e) => setIntegrante1(e.target.value)}
      />
      <SelectField
        rotulo="Integrante 2"
        placeholder="Selecione"
        opcoes={opcoes}
        value={integrante2}
        disabled={!turmaId}
        onChange={(e) => setIntegrante2(e.target.value)}
      />
      {turmaId && elegiveis.length < 2 && (
        <p className="text-sm text-text-secondary sm:col-span-2">
          Esta turma não tem dois estudantes disponíveis (sem dupla ativa).
        </p>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2">
        {bloqueio && <Alert tom="info" titulo={bloqueio} />}
        {errosLocais.length > 0 && (
          <Alert tom="erro" titulo="Revise a composição" anunciar>
            <ul className="list-disc pl-5">
              {errosLocais.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        )}
        <RetornoEnvio estado={estado} />
        <Button
          type="submit"
          icone="dupla"
          carregando={enviando}
          disabled={Boolean(bloqueio)}
          className="sm:self-start"
        >
          Formar dupla
        </Button>
      </div>
    </form>
  );
}
