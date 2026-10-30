import { useState, type FormEvent } from 'react';
import { RodapeDoFormulario, TextField, useEnvio } from '@/shared/ui';

export const MINIMO_DA_SENHA = 10;

/** "Nova senha" + "Confirmar senha"; o sucesso só vem da resposta do servidor. */
export function FormNovaSenha({
  rotuloBotao,
  onSalvar,
}: {
  rotuloBotao: string;
  onSalvar: (senha: string) => Promise<void>;
}) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string }>({});
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const e = {
      ...(senha.length < MINIMO_DA_SENHA && {
        senha: `A senha deve ter pelo menos ${MINIMO_DA_SENHA} caracteres.`,
      }),
      ...(senha.length >= MINIMO_DA_SENHA &&
        confirmacao !== senha && { confirmacao: 'As senhas não são iguais.' }),
    };
    setErros(e);
    if (Object.keys(e).length) return;
    await enviar(() => onSalvar(senha), 'Senha salva.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4">
      <TextField
        rotulo="Nova senha"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(ev) => setSenha(ev.target.value)}
        erro={erros.senha}
        dica={`Mínimo de ${MINIMO_DA_SENHA} caracteres.`}
      />
      <TextField
        rotulo="Confirmar senha"
        type="password"
        autoComplete="new-password"
        value={confirmacao}
        onChange={(ev) => setConfirmacao(ev.target.value)}
        erro={erros.confirmacao}
      />
      <RodapeDoFormulario
        estado={estado.tipo === 'sucesso' ? { tipo: 'ocioso' } : estado}
        enviando={enviando}
        rotulo={rotuloBotao}
        icone="seguranca"
      />
    </form>
  );
}
