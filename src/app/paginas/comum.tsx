import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router';
import { z } from 'zod';
import { areaInicial } from '@/modules/acesso';
import { CAMINHO_DO_DESTINO, useAuth, type Sessao } from '@/modules/auth';
import { AVISO_FICTICIO, contasDemo } from '@/modules/demo';
import { Alert, Brand, Button, MarcaSenaiProvisoria, TextField } from '@/shared/ui';

const esquemaEntrada = z.object({
  email: z.email({ message: 'Informe um e-mail válido.' }),
  senha: z.string().min(1, { message: 'Informe a senha.' }),
});
type Entrada = z.infer<typeof esquemaEntrada>;

function FormularioEntrada() {
  const { entrar } = useAuth();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Entrada>({ resolver: zodResolver(esquemaEntrada) });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async (dados) => {
        setErro(null);
        try {
          await entrar(dados);
        } catch (e) {
          setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
        }
      })}
    >
      <TextField
        rotulo="E-mail"
        type="email"
        autoComplete="username"
        erro={errors.email?.message}
        {...register('email')}
      />
      <TextField
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        erro={errors.senha?.message}
        {...register('senha')}
      />
      {erro && <Alert tom="erro" titulo={erro} anunciar />}
      <Button type="submit" carregando={isSubmitting} larguraTotal>
        Entrar
      </Button>
      <p className="text-sm text-text-secondary">
        As contas são criadas pela coordenação. Esqueceu a senha? Procure a coordenação.
      </p>
    </form>
  );
}

function EntradaDemo() {
  const { entrarDemo } = useAuth();
  return (
    <div className="flex flex-col gap-4">
      <Alert tom="alerta" titulo="Modo demonstração">
        {AVISO_FICTICIO}. Não há autenticação real: escolha um perfil para navegar.
      </Alert>
      <ul className="flex flex-col gap-2">
        {contasDemo.map((c) => (
          <li key={c.usuarioId}>
            <Button
              variante="secundario"
              larguraTotal
              icone="usuario"
              onClick={() => void entrarDemo?.(c.usuarioId)}
            >
              Entrar como {c.nome}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EntradaPage() {
  const { sessao, modo } = useAuth();
  if (sessao) return <Navigate to={CAMINHO_DO_DESTINO[areaInicial(sessao.papeis)]} replace />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand variante="branca" className="w-80" />
        <p className="max-w-md font-display text-3xl font-bold leading-tight">
          Cada desafio é uma oportunidade de evoluir.
        </p>
        <div className="max-w-56">
          <MarcaSenaiProvisoria fundo="escuro" />
        </div>
        <div aria-hidden="true" className="absolute -right-10 top-1/3 flex gap-3">
          {['bg-cyan-500', 'bg-blue-500', 'bg-yellow-500', 'bg-coral-500', 'bg-purple-500'].map(
            (c) => (
              <span key={c} className={`h-72 w-8 rotate-35 rounded-sm ${c}`} />
            ),
          )}
        </div>
      </section>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Brand variante="vertical" className="mx-auto mb-6 w-44 lg:hidden" />
          <h1 className="font-display text-2xl font-bold text-text">Entrar</h1>
          <p className="mb-6 text-text-secondary">Maratona de Competências SAEP</p>
          {modo === 'demo' && <EntradaDemo />}
          {modo === 'supabase' && <FormularioEntrada />}
          {modo === 'nao-configurado' && (
            <Alert tom="erro" titulo="Aplicação não configurada">
              Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja o README) ou habilite
              explicitamente o modo demonstração com VITE_DEMO_MODE=true.
            </Alert>
          )}
        </div>
      </main>
    </div>
  );
}

export function AguardandoPermissaoPage() {
  const { sair } = useAuth();
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="font-display text-2xl font-bold text-text">Aguardando permissões</h1>
      <p className="mt-2 text-text-secondary">
        Sua conta ainda não tem funções atribuídas pela coordenação nesta edição.
      </p>
      <Button className="mt-4" variante="secundario" onClick={() => void sair()}>
        Sair
      </Button>
    </main>
  );
}

export function NaoEncontradaPage() {
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="font-display text-2xl font-bold text-text">Página não encontrada</h1>
      <Link to="/" className="mt-4 inline-block font-semibold text-link underline">
        Voltar ao início
      </Link>
    </main>
  );
}

/**
 * Enquanto os repositórios Supabase dos módulos não existem (Incremento 2+), as telas só
 * exibem conteúdo no modo demonstração. Fora dele, informam a pendência sem simular dados.
 */
export function ComDadosDemo<T>({
  carregar,
  children,
}: {
  carregar: (sessao: Sessao) => T | null;
  children: (dados: T) => ReactNode;
}) {
  const { sessao } = useAuth();
  if (!sessao?.demo) {
    return (
      <Alert tom="info" titulo="Integração com o banco em desenvolvimento">
        Esta tela passará a usar dados do Supabase no Incremento 2. Nenhum dado fictício é exibido
        fora do modo demonstração.
      </Alert>
    );
  }
  const dados = carregar(sessao);
  if (!dados) return <Alert tom="alerta" titulo="Nenhum dado encontrado para este perfil." />;
  return <>{children(dados)}</>;
}
