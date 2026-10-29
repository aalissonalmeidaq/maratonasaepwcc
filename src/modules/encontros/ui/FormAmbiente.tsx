import { useState, type FormEvent } from 'react';
import { Alert, Button, RetornoEnvio, TextField, useEnvio } from '@/shared/ui';

export function FormAmbiente({
  onSalvar,
  bloqueio,
}: {
  onSalvar: (d: { nome: string; observacoes: string | null }) => Promise<void>;
  bloqueio?: string;
}) {
  const [nome, setNome] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    if (nome.trim().length < 2) return setErro('Informe o nome do ambiente.');
    setErro(undefined);
    const ok = await enviar(
      () => onSalvar({ nome: nome.trim(), observacoes: observacoes.trim() || null }),
      'Ambiente salvo.',
    );
    if (ok) {
      setNome('');
      setObservacoes('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <TextField
        rotulo="Nome do ambiente"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={erro}
      />
      <TextField
        rotulo="Observações"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
      />
      <div className="flex flex-col gap-3 sm:col-span-2">
        {bloqueio && <Alert tom="info" titulo={bloqueio} />}
        <RetornoEnvio estado={estado} />
        <Button
          type="submit"
          icone="notebook"
          carregando={enviando}
          disabled={Boolean(bloqueio)}
          className="sm:self-start"
        >
          Adicionar ambiente
        </Button>
      </div>
    </form>
  );
}
