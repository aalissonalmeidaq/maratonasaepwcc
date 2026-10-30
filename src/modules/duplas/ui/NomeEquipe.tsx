import { useState, type FormEvent } from 'react';
import { Alert, Button, RetornoEnvio, TextField, useEnvio } from '@/shared/ui';
import { validarNomeEquipe } from '../domain/equipes';

interface NomeEquipeProps {
  onDefinir: (nome: string) => Promise<void>;
  bloqueio?: string;
}

/** Escolha única do nome pela própria equipe (US3, FR-008). */
export function NomeEquipe({ onDefinir, bloqueio }: NomeEquipeProps) {
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const problema = validarNomeEquipe(nome);
    setErro(problema);
    if (problema) return;
    await enviar(() => onDefinir(nome.trim()), 'Nome da equipe salvo.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-3">
      <TextField
        rotulo="Nome da equipe"
        dica="O nome só pode ser escolhido uma vez. Depois, só docente ou mentor da turma podem alterá-lo."
        value={nome}
        maxLength={80}
        onChange={(e) => setNome(e.target.value)}
        erro={erro ?? undefined}
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <Button
        type="submit"
        icone="salvar"
        carregando={enviando}
        disabled={Boolean(bloqueio)}
        className="sm:self-start"
      >
        Salvar nome
      </Button>
    </form>
  );
}
