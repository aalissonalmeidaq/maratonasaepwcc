import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { areaInicial, podeAcessarArea, type Area } from '@/modules/acesso';
import { Spinner } from '@/shared/ui';
import { useAuth } from './AuthContext';
import { CAMINHO_DO_DESTINO } from './caminhos';

function Carregando() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner rotulo="Verificando acesso…" />
    </div>
  );
}

/**
 * Proteção de NAVEGAÇÃO. A proteção dos dados é feita por RLS no Supabase; esta camada só
 * evita exibir telas que a pessoa não deveria abrir.
 */
export function RotaProtegida({ area }: { area: Area }) {
  const { sessao, carregando } = useAuth();
  const local = useLocation();

  if (carregando) return <Carregando />;
  if (!sessao) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  if (!podeAcessarArea(sessao.papeis, area)) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="font-display text-2xl font-bold text-text">Acesso não autorizado</h1>
        <p className="mt-2 text-text-secondary">
          Esta área não faz parte das permissões do seu perfil.
        </p>
        <Link
          to={CAMINHO_DO_DESTINO[areaInicial(sessao.papeis)]}
          className="mt-4 inline-block font-semibold text-link underline"
        >
          Ir para o meu painel
        </Link>
      </main>
    );
  }
  return <Outlet />;
}

export function RedirecionarParaPainel() {
  const { sessao, carregando } = useAuth();
  if (carregando) return <Carregando />;
  if (!sessao) return <Navigate to="/entrar" replace />;
  return <Navigate to={CAMINHO_DO_DESTINO[areaInicial(sessao.papeis)]} replace />;
}
