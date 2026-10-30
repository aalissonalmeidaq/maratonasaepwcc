import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ambiente, type ModoAmbiente } from '@/shared/lib/env';
import { Alert, Brand, RodapeDoFormulario, TextField, useEnvio } from '@/shared/ui';
import { definirSenhaInicial } from '../data/primeiroAcesso';

const MINIMO = 10;
const estiloLink = 'font-semibold text-link underline-offset-4 hover:underline';

/** Lê `#t=` uma única vez e tira o token da barra de endereço (não fica no histórico). */
function lerTokenDoLink(): string {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('t') ?? '';
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return token;
}

export function PaginaDeAcesso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <Brand className="mb-6 h-12 w-auto" />
        <h1 className="mb-2 font-display text-2xl font-bold text-text">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}

export function PrimeiroAcessoPage({
  modo = ambiente.modo,
  definirSenha = definirSenhaInicial,
}: {
  modo?: ModoAmbiente;
  definirSenha?: (token: string, senha: string) => Promise<{ email: string }>;
}) {
  const [token] = useState(lerTokenDoLink);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string }>({});
  const [email, setEmail] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  if (modo !== 'supabase') {
    return (
      <PaginaDeAcesso titulo="Crie sua senha">
        <Alert tom="info" titulo="Indisponível no modo demonstração.">
          Na demonstração não há contas reais nem envio de convites.
        </Alert>
      </PaginaDeAcesso>
    );
  }

  if (!token) {
    return (
      <PaginaDeAcesso titulo="Crie sua senha">
        <Alert tom="alerta" titulo="O link está incompleto.">
          Abra novamente o link do e-mail de convite ou peça um novo à coordenação.
        </Alert>
        <p className="mt-4 text-sm">
          <Link to="/esqueci-senha" className={estiloLink}>
            Esqueci minha senha
          </Link>
        </p>
      </PaginaDeAcesso>
    );
  }

  if (email) {
    return (
      <PaginaDeAcesso titulo="Crie sua senha">
        <Alert tom="sucesso" titulo="Senha criada." anunciar>
          Agora você já pode entrar com o e-mail {email}.
        </Alert>
        <Link
          to={`/entrar?email=${encodeURIComponent(email)}`}
          className="mt-6 inline-flex min-h-(--control-min-height) w-full items-center justify-center rounded-md bg-action px-4 text-sm font-semibold text-action-text hover:bg-action-hover focus-visible:shadow-(--focus-ring) focus-visible:outline-none"
        >
          Entrar
        </Link>
      </PaginaDeAcesso>
    );
  }

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const e = {
      ...(senha.length < MINIMO && { senha: `A senha deve ter pelo menos ${MINIMO} caracteres.` }),
      ...(senha.length >= MINIMO &&
        confirmacao !== senha && {
          confirmacao: 'As senhas não são iguais.',
        }),
    };
    setErros(e);
    if (Object.keys(e).length) return;
    let resposta: { email: string } | undefined;
    const ok = await enviar(async () => {
      resposta = await definirSenha(token, senha);
    }, 'Senha criada.');
    if (ok && resposta) setEmail(resposta.email);
  }

  return (
    <PaginaDeAcesso titulo="Crie sua senha">
      <p className="mb-6 text-text-secondary">
        Defina a senha que você vai usar para entrar na Maratona SAEP.
      </p>
      <form onSubmit={aoEnviar} noValidate className="grid gap-4">
        <TextField
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(ev) => setSenha(ev.target.value)}
          erro={erros.senha}
          dica={`Mínimo de ${MINIMO} caracteres.`}
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
          estado={estado}
          enviando={enviando}
          rotulo="Criar senha"
          icone="seguranca"
        />
      </form>
      {estado.tipo === 'erro' && (
        <p className="mt-4 text-sm">
          <Link to="/esqueci-senha" className={estiloLink}>
            Esqueci minha senha
          </Link>
        </p>
      )}
    </PaginaDeAcesso>
  );
}
