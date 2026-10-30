import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ambiente, type ModoAmbiente } from '@/shared/lib/env';
import { Alert, RodapeDoFormulario, Spinner, TextField, useEnvio } from '@/shared/ui';
import {
  encerrarSessaoDeRecuperacao,
  haSessaoDeRecuperacao,
  pedirRecuperacaoDeSenha,
  redefinirSenha,
} from '../data/recuperacao';
import { FormNovaSenha } from './FormNovaSenha';
import {
  IndisponivelNaDemonstracao,
  PaginaDeAcesso,
  estiloBotaoLink,
  estiloLink,
} from './PrimeiroAcessoPage';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Esqueci minha senha": a resposta é a mesma exista ou não a conta (FR-014). */
export function EsqueciSenhaPage({
  modo = ambiente.modo,
  pedir = pedirRecuperacaoDeSenha,
}: {
  modo?: ModoAmbiente;
  pedir?: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string>();
  const { estado, enviando, enviar } = useEnvio();

  if (modo !== 'supabase') return <IndisponivelNaDemonstracao titulo="Esqueci minha senha" />;

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const destino = email.trim().toLowerCase();
    if (!EMAIL.test(destino)) return setErro('Informe um e-mail válido.');
    setErro(undefined);
    await enviar(
      () => pedir(destino),
      'Se o e-mail estiver cadastrado, enviamos um link válido por 1 hora.',
    );
  }

  return (
    <PaginaDeAcesso titulo="Esqueci minha senha">
      <p className="mb-6 text-text-secondary">
        Informe o e-mail da sua conta. Enviaremos um link para você criar uma senha nova.
      </p>
      <form onSubmit={aoEnviar} noValidate className="grid gap-4">
        <TextField
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          erro={erro}
        />
        <RodapeDoFormulario
          estado={estado}
          enviando={enviando}
          rotulo="Enviar link"
          icone="email"
        />
      </form>
      <p className="mt-4 text-sm">
        <Link to="/entrar" className={estiloLink}>
          Voltar para a entrada
        </Link>
      </p>
    </PaginaDeAcesso>
  );
}

/** O Auth informa link vencido/usado no fragmento da URL (ex.: #error_code=otp_expired). */
function linkComErro(): boolean {
  return new URLSearchParams(window.location.hash.slice(1)).has('error_code');
}

export function RedefinirSenhaPage({
  modo = ambiente.modo,
  obterSessao = haSessaoDeRecuperacao,
  redefinir = redefinirSenha,
  sair = encerrarSessaoDeRecuperacao,
}: {
  modo?: ModoAmbiente;
  obterSessao?: () => Promise<boolean>;
  redefinir?: (senha: string) => Promise<void>;
  sair?: () => Promise<void>;
}) {
  const [situacao, setSituacao] = useState<'verificando' | 'pronto' | 'invalido' | 'concluido'>(
    () => (linkComErro() ? 'invalido' : 'verificando'),
  );

  useEffect(() => {
    if (modo !== 'supabase' || situacao !== 'verificando') return;
    let ativo = true;
    obterSessao().then(
      (ha) => ativo && setSituacao(ha ? 'pronto' : 'invalido'),
      () => ativo && setSituacao('invalido'),
    );
    return () => {
      ativo = false;
    };
  }, [modo, situacao, obterSessao]);

  if (modo !== 'supabase') return <IndisponivelNaDemonstracao titulo="Criar senha nova" />;

  if (situacao === 'verificando') {
    return (
      <PaginaDeAcesso titulo="Criar senha nova">
        <p role="status" className="flex items-center gap-3 text-text-secondary">
          <Spinner /> Verificando o link…
        </p>
      </PaginaDeAcesso>
    );
  }

  if (situacao === 'invalido') {
    return (
      <PaginaDeAcesso titulo="Criar senha nova">
        <Alert tom="alerta" titulo="Este link venceu ou já foi usado.">
          Os links de recuperação valem por 1 hora e podem ser usados uma única vez.
        </Alert>
        <Link to="/esqueci-senha" className={estiloBotaoLink}>
          Pedir outro link
        </Link>
      </PaginaDeAcesso>
    );
  }

  if (situacao === 'concluido') {
    return (
      <PaginaDeAcesso titulo="Criar senha nova">
        <Alert tom="sucesso" titulo="Senha alterada." anunciar>
          Entre com o seu e-mail e a senha nova.
        </Alert>
        <Link to="/entrar" className={estiloBotaoLink}>
          Entrar
        </Link>
      </PaginaDeAcesso>
    );
  }

  return (
    <PaginaDeAcesso titulo="Criar senha nova">
      <p className="mb-6 text-text-secondary">
        Escolha a senha que você vai usar a partir de agora.
      </p>
      <FormNovaSenha
        rotuloBotao="Salvar nova senha"
        onSalvar={async (senha) => {
          await redefinir(senha);
          // A sessão do link serve só para trocar a senha; a pessoa entra de novo depois.
          await sair().catch(() => undefined);
          setSituacao('concluido');
        }}
      />
    </PaginaDeAcesso>
  );
}
