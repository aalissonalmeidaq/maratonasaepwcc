import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router';
import { z } from 'zod';
import { areaInicial } from '@/modules/acesso';
import { CAMINHO_DO_DESTINO, useAuth, type Sessao } from '@/modules/auth';
import { AVISO_FICTICIO, contasDemo } from '@/modules/demo';
import {
  Alert,
  Brand,
  Button,
  Icon,
  MarcaSenai,
  Spinner,
  TextField,
  cx,
  type NomeIcone,
} from '@/shared/ui';

const esquemaEntrada = z.object({
  email: z.email({ message: 'Informe um e-mail válido.' }),
  senha: z.string().min(1, { message: 'Informe a senha.' }),
});
type Entrada = z.infer<typeof esquemaEntrada>;

function FormularioEntrada() {
  const { entrar } = useAuth();
  const [erro, setErro] = useState<string | null>(null);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Entrada>({ resolver: zodResolver(esquemaEntrada) });

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
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
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        erro={errors.email?.message}
        {...register('email')}
      />
      <div className="relative">
        <TextField
          id="senha-entrada"
          rotulo="Senha"
          type={senhaVisivel ? 'text' : 'password'}
          autoComplete="current-password"
          className="pr-24"
          erro={errors.senha?.message}
          {...register('senha')}
        />
        <button
          type="button"
          aria-pressed={senhaVisivel}
          aria-controls="senha-entrada"
          onClick={() => setSenhaVisivel((v) => !v)}
          className="absolute top-8 right-1 flex min-h-10 items-center gap-1 rounded-md px-3 text-sm font-semibold text-link hover:bg-surface-muted focus-visible:shadow-(--focus-ring) focus-visible:outline-none"
        >
          <Icon nome="monitoramento" tamanho="sm" />
          {senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
        </button>
      </div>
      {erro && <Alert tom="erro" titulo={erro} anunciar />}
      <Button type="submit" icone="entrar" carregando={isSubmitting} larguraTotal>
        Entrar
      </Button>
    </form>
  );
}

const PERFIL_DEMO: Record<string, { papel: string; descricao: string; icone: NomeIcone }> = {
  coordenacao: {
    papel: 'Coordenação',
    descricao: 'Organização, duplas, encontros e ranking',
    icone: 'gestao',
  },
  docente: { papel: 'Docente', descricao: 'Turmas, presença e avaliações', icone: 'professor' },
  aluno: { papel: 'Aluno', descricao: 'Dupla, desafios, pontuação e ranking', icone: 'estudante' },
};

function EntradaDemo() {
  const { entrarDemo } = useAuth();
  const [escolhido, setEscolhido] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 rounded-lg bg-yellow-500/15 p-3 text-sm text-amber-800">
        <Icon nome="aviso" tamanho="sm" className="mt-0.5 shrink-0" />
        <span>
          <strong>Modo demonstração.</strong> {AVISO_FICTICIO}; não há autenticação real. Escolha um
          perfil para explorar.
        </span>
      </p>
      <ul aria-label="Perfis de demonstração" className="flex flex-col gap-3">
        {contasDemo.map((c) => {
          const perfil = PERFIL_DEMO[c.papeis[0] ?? 'aluno'] ?? PERFIL_DEMO.aluno!;
          return (
            <li key={c.usuarioId}>
              <button
                type="button"
                aria-label={`Entrar como ${perfil.papel}: ${c.nome}`}
                aria-busy={escolhido === c.usuarioId || undefined}
                disabled={escolhido !== null}
                onClick={() => {
                  setEscolhido(c.usuarioId);
                  void entrarDemo?.(c.usuarioId);
                }}
                className="group flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:border-blue-600 hover:bg-surface-muted focus-visible:shadow-(--focus-ring) focus-visible:outline-none disabled:opacity-60"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-muted text-navy-900 group-hover:bg-surface">
                  <Icon nome={perfil.icone} tamanho="lg" cor="marca" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-text">{perfil.papel}</span>
                  <span className="block text-sm text-text-secondary">{perfil.descricao}</span>
                  <span className="mt-0.5 block truncate text-xs text-text-secondary">
                    Conta fictícia: {c.nome}
                  </span>
                </span>
                <span className="text-blue-700" aria-hidden="true">
                  {escolhido === c.usuarioId ? <Spinner tamanho="sm" /> : <Icon nome="entrar" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Faixas diagonais da marca como acabamento do painel (Design System §2: uso moderado). */
function FaixasDaMarca({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx('pointer-events-none absolute flex gap-3', className)}>
      {['bg-cyan-500', 'bg-blue-500', 'bg-yellow-500', 'bg-coral-500', 'bg-purple-500'].map((c) => (
        <span key={c} className={`h-80 w-9 rotate-35 rounded-md ${c}`} />
      ))}
    </div>
  );
}

const PILARES: { rotulo: string; icone: NomeIcone }[] = [
  { rotulo: 'Colaboração', icone: 'dupla' },
  { rotulo: 'Conhecimento', icone: 'conhecimento' },
  { rotulo: 'Evolução', icone: 'estatisticas' },
];

export function EntradaPage() {
  const { sessao, modo } = useAuth();
  if (sessao) return <Navigate to={CAMINHO_DO_DESTINO[areaInicial(sessao.papeis)]} replace />;

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-bg lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Painel da marca (telas largas) */}
      <section className="relative isolate hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col">
        <FaixasDaMarca className="-right-16 -bottom-24" />
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-16 xl:px-20">
          <Brand variante="textoBranco" className="w-full max-w-xl" />
          <p className="mt-12 max-w-lg font-display text-4xl leading-tight font-bold xl:text-5xl">
            Cada desafio é uma oportunidade de evoluir.
          </p>
          <ul aria-label="Pilares da Maratona" className="mt-8 flex flex-wrap gap-3">
            {PILARES.map((p) => (
              <li
                key={p.rotulo}
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
              >
                <Icon nome={p.icone} tamanho="sm" cor="marca" />
                {p.rotulo}
              </li>
            ))}
          </ul>
        </div>
        <footer className="relative z-10 flex items-center gap-4 px-12 pb-10 xl:px-20">
          <MarcaSenai fundo="escuro" className="w-36" />
          <span className="border-l border-white/30 pl-4 text-sm text-white/80">
            Unidade Juazeiro do Norte
          </span>
        </footer>
      </section>

      <div className="flex flex-col">
        {/* Faixa da marca (celular e tablet) */}
        <header className="relative isolate overflow-hidden bg-navy-900 px-6 pt-8 pb-10 lg:hidden">
          <FaixasDaMarca className="-right-24 -bottom-40 scale-75 opacity-80" />
          <Brand variante="textoBranco" className="relative z-10 mx-auto w-full max-w-sm" />
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-md sm:p-8">
              <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">
                Acesse sua conta
              </h1>
              <p className="mt-1 mb-6 text-text-secondary">
                Acompanhe sua dupla, os encontros, os desafios e a pontuação.
              </p>
              {modo === 'demo' && <EntradaDemo />}
              {modo === 'supabase' && <FormularioEntrada />}
              {modo === 'nao-configurado' && (
                <Alert tom="erro" titulo="Aplicação não configurada">
                  Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja o README) ou habilite
                  explicitamente o modo demonstração com VITE_DEMO_MODE=true.
                </Alert>
              )}
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm text-text-secondary">
              <Icon nome="ajuda" tamanho="sm" className="mt-0.5 shrink-0" />
              <span>
                As contas são criadas pela coordenação. Esqueceu a senha ou não consegue entrar?
                Procure a coordenação da Maratona.
              </span>
            </p>
            <div className="mt-8 flex justify-center lg:hidden">
              <span className="rounded-lg bg-navy-900 px-4 py-3">
                <MarcaSenai fundo="escuro" className="w-28" />
              </span>
            </div>
          </div>
        </main>
      </div>
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
  foraDaDemo,
}: {
  carregar: (sessao: Sessao) => T | null;
  children: (dados: T) => ReactNode;
  /** Conteúdo que não depende de dados fictícios (ex.: atalhos), exibido fora da demonstração. */
  foraDaDemo?: ReactNode;
}) {
  const { sessao } = useAuth();
  if (!sessao?.demo) {
    return (
      <>
        {foraDaDemo}
        <Alert tom="info" titulo="Integração com o banco em desenvolvimento">
          Esta tela passará a usar dados do Supabase no Incremento 2. Nenhum dado fictício é exibido
          fora do modo demonstração.
        </Alert>
      </>
    );
  }
  const dados = carregar(sessao);
  if (!dados) return <Alert tom="alerta" titulo="Nenhum dado encontrado para este perfil." />;
  return <>{children(dados)}</>;
}
