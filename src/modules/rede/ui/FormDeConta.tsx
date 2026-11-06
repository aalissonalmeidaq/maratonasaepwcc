import { useState, type FormEvent } from 'react';
import { Button, TextField } from '@/shared/ui';
import { validarContaDaRede } from '../domain/validacao';

/**
 * Nome e e-mail de uma conta nova (gestão, master): valida antes de enviar; quem chama faz a
 * gravação e informa o resultado. O e-mail vai em minúsculas.
 */
export function FormDeConta({
  rotuloEnviar,
  desabilitado,
  enviando,
  onEnviar,
  onCancelar,
}: {
  rotuloEnviar: string;
  desabilitado?: boolean;
  enviando?: boolean;
  onEnviar: (conta: { nome: string; email: string }) => void | Promise<void>;
  onCancelar?: () => void;
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [erros, setErros] = useState<{ nome?: string; email?: string }>({});

  function enviar(e: FormEvent) {
    e.preventDefault();
    const encontrados = validarContaDaRede({ nome, email });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    void onEnviar({ nome: nome.trim(), email: email.trim().toLowerCase() });
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-3">
      <TextField
        rotulo="Nome"
        value={nome}
        autoComplete="off"
        erro={erros.nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <TextField
        rotulo="E-mail"
        type="email"
        value={email}
        autoComplete="off"
        erro={erros.email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" carregando={enviando} disabled={desabilitado}>
          {rotuloEnviar}
        </Button>
        {onCancelar && (
          <Button variante="secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
