import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ambiente, type ModoAmbiente } from '@/shared/lib/env';
import { Alert, Brand } from '@/shared/ui';
import { definirSenhaInicial } from '../data/primeiroAcesso';
import { FormNovaSenha } from './FormNovaSenha';

export const estiloLink = 'font-semibold text-link underline-offset-4 hover:underline';
export const estiloBotaoLink =
  'mt-6 inline-flex min-h-(--control-min-height) w-full items-center justify-center rounded-md bg-action px-4 text-sm font-semibold text-action-text hover:bg-action-hover focus-visible:shadow-(--focus-ring) focus-visible:outline-none';

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

export function IndisponivelNaDemonstracao({ titulo }: { titulo: string }) {
  return (
    <PaginaDeAcesso titulo={titulo}>
      <Alert tom="info" titulo="Indisponível no modo demonstração.">
        Na demonstração não há contas reais nem envio de e-mails.
      </Alert>
    </PaginaDeAcesso>
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
  const [email, setEmail] = useState<string | null>(null);

  if (modo !== 'supabase') return <IndisponivelNaDemonstracao titulo="Crie sua senha" />;

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
        <Link to={`/entrar?email=${encodeURIComponent(email)}`} className={estiloBotaoLink}>
          Entrar
        </Link>
      </PaginaDeAcesso>
    );
  }

  return (
    <PaginaDeAcesso titulo="Crie sua senha">
      <p className="mb-6 text-text-secondary">
        Defina a senha que você vai usar para entrar na Maratona SAEP.
      </p>
      <FormNovaSenha
        rotuloBotao="Criar senha"
        onSalvar={async (senha) => setEmail((await definirSenha(token, senha)).email)}
      />
      <p className="mt-4 text-sm text-text-secondary">
        O link venceu?{' '}
        <Link to="/esqueci-senha" className={estiloLink}>
          Esqueci minha senha
        </Link>
      </p>
    </PaginaDeAcesso>
  );
}
