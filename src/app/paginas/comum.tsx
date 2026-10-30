import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { areaInicial } from '@/modules/acesso';
import { CAMINHO_DO_DESTINO, useAuth, type Sessao } from '@/modules/auth';
import { contasDemo } from '@/modules/demo';
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
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email({ message: 'Informe um e-mail válido.' })),
  senha: z.string().min(1, { message: 'Informe a senha.' }),
});
type Entrada = z.infer<typeof esquemaEntrada>;

function FormularioEntrada() {
  const { entrar } = useAuth();
  const [erro, setErro] = useState<string | null>(null);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [parametros] = useSearchParams();
  const emailDaUrl = parametros.get('email') ?? '';
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Entrada>({
    resolver: zodResolver(esquemaEntrada),
    defaultValues: { email: emailDaUrl, senha: '' },
  });

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
        required
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        erro={errors.email?.message}
        {...register('email')}
      />
      <div className="flex flex-col gap-2">
        <TextField
          id="senha-entrada"
          rotulo="Senha"
          required
          type={senhaVisivel ? 'text' : 'password'}
          autoComplete="current-password"
          erro={errors.senha?.message}
          {...register('senha')}
        />
        <Button
          variante="terciario"
          icone="monitoramento"
          aria-pressed={senhaVisivel}
          aria-controls="senha-entrada"
          onClick={() => setSenhaVisivel((v) => !v)}
          className="self-end"
        >
          {senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
        </Button>
        <Link
          to="/esqueci-senha"
          className="inline-flex min-h-11 items-center self-start font-semibold text-link underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
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
  const [erro, setErro] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {escolhido ? 'Abrindo o perfil de demonstração…' : ''}
      </p>
      {erro && (
        <Alert
          tom="erro"
          titulo="Não foi possível abrir a demonstração. Escolha um perfil para tentar novamente."
          anunciar
        />
      )}
      <ul aria-label="Perfis de demonstração" className="flex flex-col gap-3">
        {contasDemo.map((c) => {
          const perfil = PERFIL_DEMO[c.papeis[0] ?? 'aluno'] ?? PERFIL_DEMO.aluno!;
          return (
            <li key={c.usuarioId} className="@container">
              <button
                type="button"
                aria-busy={escolhido === c.usuarioId || undefined}
                disabled={escolhido !== null}
                onClick={async () => {
                  setEscolhido(c.usuarioId);
                  setErro(false);
                  try {
                    if (!entrarDemo) throw new Error('Demonstração indisponível');
                    await entrarDemo(c.usuarioId);
                  } catch {
                    setErro(true);
                  } finally {
                    setEscolhido(null);
                  }
                }}
                className="group flex w-full min-w-0 flex-col items-start gap-3 rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:border-blue-600 hover:bg-surface-muted focus-visible:shadow-(--focus-ring) focus-visible:outline-none disabled:opacity-60 @min-[14rem]:flex-row @min-[14rem]:items-center"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-navy-900 group-hover:bg-surface">
                  <Icon nome={perfil.icone} tamanho="lg" cor="marca" />
                </span>
                <span className="w-full min-w-0 flex-1 wrap-anywhere">
                  <span className="block font-semibold text-text">{perfil.papel}</span>
                  <span className="block text-sm text-text-secondary">{perfil.descricao}</span>
                  <span className="mt-0.5 block text-xs text-text-secondary">
                    Conta fictícia: {c.nome}
                  </span>
                </span>
                <span
                  className="shrink-0 self-end text-blue-700 @min-[14rem]:self-center"
                  aria-hidden="true"
                >
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
  const { sessao, modo, carregando } = useAuth();
  if (carregando)
    return (
      <main className="grid min-h-dvh place-items-center" role="status">
        <span className="flex items-center gap-3">
          <Spinner /> Verificando seu acesso…
        </span>
      </main>
    );
  if (sessao) return <Navigate to={CAMINHO_DO_DESTINO[areaInicial(sessao.papeis)]} replace />;

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-bg lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Painel da marca (telas largas) */}
      <section
        aria-label="Sobre a Maratona de Competências SAEP"
        className="relative isolate hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col"
      >
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
        <header
          className={cx(
            'relative isolate overflow-hidden bg-navy-900 px-6 lg:hidden',
            modo === 'demo' ? 'py-4' : 'pt-8 pb-10',
          )}
        >
          <FaixasDaMarca className="-right-24 -bottom-40 scale-75 opacity-80" />
          <Brand
            variante="textoBranco"
            className={cx(
              'relative z-10 mx-auto w-full',
              modo === 'demo' ? 'max-w-56' : 'max-w-sm',
            )}
          />
        </header>

        <main
          aria-labelledby="titulo-entrada"
          className={cx(
            'flex flex-1 items-center justify-center px-4 sm:px-8',
            modo === 'demo' ? 'py-5' : 'py-10',
          )}
        >
          <div className="w-full min-w-0 max-w-md wrap-anywhere">
            <div
              className={cx(
                'rounded-lg border border-border bg-surface shadow-md sm:p-8',
                modo === 'demo' ? 'p-4' : 'p-6',
              )}
            >
              <h1
                id="titulo-entrada"
                className="font-display text-2xl font-bold text-text sm:text-3xl"
              >
                {modo === 'demo' ? 'Explore a Maratona' : 'Acesse sua conta'}
              </h1>
              <p className="mt-1 mb-6 text-text-secondary">
                {modo === 'demo'
                  ? 'Escolha um perfil fictício. Não é necessário informar e-mail ou senha.'
                  : 'Acesse sua área para acompanhar as atividades da Maratona.'}
              </p>
              {modo === 'demo' && <EntradaDemo />}
              {modo === 'supabase' && <FormularioEntrada />}
              {modo === 'nao-configurado' && (
                <Alert tom="erro" titulo="Acesso indisponível">
                  O acesso ainda não está disponível nesta instalação. Avise seu docente ou a
                  coordenação da Maratona e tente novamente após a liberação.
                </Alert>
              )}
            </div>
            {modo !== 'demo' && (
              <div className="mt-6 text-sm text-text-secondary">
                <details>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md font-semibold text-link underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                    <Icon nome="ajuda" tamanho="sm" className="shrink-0" />
                    <span>Primeiro acesso ou dificuldade para entrar?</span>
                  </summary>
                  <p className="mt-3">
                    As contas são criadas pela coordenação. Você recebe por e-mail um convite para
                    criar a sua senha; o link vale por 7 dias. Se ele venceu ou se você esqueceu a
                    senha, use “Esqueci minha senha”. Se o e-mail não chegar, procure a coordenação
                    para confirmar o endereço cadastrado.
                  </p>
                  <p className="mt-2">
                    Se você é estudante e não sabe como contatá-la, peça ao docente da sua turma que
                    encaminhe sua solicitação. Informe o problema e sua turma; nunca envie sua
                    senha.
                  </p>
                </details>
              </div>
            )}
            <div className="mt-8 flex justify-center lg:hidden">
              <MarcaSenai fundo="claro" className="w-28" />
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
        <Alert tom="info" titulo="Informações ainda indisponíveis nesta tela">
          Os dados desta área ainda não estão disponíveis. Para confirmar cronograma, atividades ou
          resultados, procure seu docente ou a coordenação da Maratona. Os dados de demonstração não
          são exibidos no seu acesso.
        </Alert>
      </>
    );
  }
  const dados = carregar(sessao);
  if (!dados) return <Alert tom="alerta" titulo="Nenhum dado encontrado para este perfil." />;
  return <>{children(dados)}</>;
}
