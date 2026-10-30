import { useState, type FormEvent } from 'react';
import { RodapeDoFormulario, TextField, useEnvio, useFocoNaEdicao } from '@/shared/ui';
import type { Ambiente } from '../domain/tipos';

export function FormAmbiente({
  inicial,
  onSalvar,
  onCancelar,
  bloqueio,
}: {
  /** Ambiente em edição; sem ele, o formulário cadastra um novo. */
  inicial?: Ambiente;
  onSalvar: (d: { id?: string; nome: string; observacoes: string | null }) => Promise<void>;
  onCancelar?: () => void;
  bloqueio?: string;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '');
  const [erro, setErro] = useState<string | undefined>();
  const { estado, enviando, enviar } = useEnvio();
  const primeiro = useFocoNaEdicao<HTMLInputElement>(Boolean(inicial));

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    if (nome.trim().length < 2) return setErro('Informe o nome do ambiente.');
    setErro(undefined);
    const dados = { nome: nome.trim(), observacoes: observacoes.trim() || null };
    if (inicial) {
      await enviar(() => onSalvar({ id: inicial.id, ...dados }), 'Ambiente atualizado.');
      return;
    }
    if (await enviar(() => onSalvar(dados), 'Ambiente salvo.')) {
      setNome('');
      setObservacoes('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <TextField
        ref={primeiro}
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
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo={inicial ? 'Salvar alterações' : 'Adicionar ambiente'}
        icone={inicial ? 'salvar' : 'notebook'}
        onCancelar={inicial && onCancelar}
      />
    </form>
  );
}
