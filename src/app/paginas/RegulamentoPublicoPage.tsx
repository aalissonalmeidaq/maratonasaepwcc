import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { repositorioPublicoDemo } from '@/modules/demo';
import {
  criarRepositorioPublicoSupabase,
  ConteudoRegulamentoPublico,
  lerRegulamento,
  chaveDaCopia,
} from '@/modules/publico';
import { ambiente } from '@/shared/lib/env';
import { obterSupabasePublico } from '@/shared/lib/supabasePublico';
import { Alert, Brand, Button, Spinner } from '@/shared/ui';
export default function RegulamentoPublicoPage() {
  const [cliente] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={cliente}>
      <Pagina />
    </QueryClientProvider>
  );
}
function Pagina() {
  const consulta = useQuery({
    queryKey: ['regulamento-publico', ambiente.modo, ambiente.supabaseUrl],
    networkMode: 'always',
    retry: false,
    refetchOnReconnect: 'always',
    queryFn: () => {
      const repo =
        ambiente.modo === 'demo'
          ? repositorioPublicoDemo
          : criarRepositorioPublicoSupabase(obterSupabasePublico());
      return lerRegulamento(repo, chaveDaCopia(ambiente.modo, ambiente.supabaseUrl ?? 'local'));
    },
  });
  const leitura = consulta.data;
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8 wrap-anywhere text-text sm:px-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6">
        <Brand className="w-60 max-w-full" />
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4"
          to="/entrar"
        >
          Entrar
        </Link>
      </header>
      <h1 className="mb-8 font-display text-3xl font-bold">Regulamento da Maratona</h1>
      {!('serviceWorker' in navigator) && (
        <Alert tom="info" titulo="A leitura offline não está disponível neste navegador." />
      )}
      {consulta.isError ? (
        <Alert
          tom="erro"
          titulo="Não foi possível carregar o regulamento. Tente novamente."
          anunciar
        >
          <Button onClick={() => void consulta.refetch()}>Tentar novamente</Button>
        </Alert>
      ) : !leitura ? (
        <Spinner rotulo="Carregando regulamento…" />
      ) : leitura.origem === 'sem-copia' ? (
        <Alert
          tom="alerta"
          titulo="Sem conexão: abra esta página com internet uma vez para lê-la depois offline."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {leitura.origem === 'copia' && (
            <Alert
              tom="info"
              titulo={`Conteúdo salvo em ${new Date(leitura.salvoEm).toLocaleString('pt-BR')}. Pode estar desatualizado.`}
              anunciar
            />
          )}
          {leitura.origem === 'servidor' && leitura.persistencia === 'falhou' && (
            <Alert
              tom="alerta"
              titulo="Não foi possível salvar o regulamento para leitura offline."
              anunciar
            />
          )}
          <ConteudoRegulamentoPublico conteudo={leitura.conteudo} />
        </div>
      )}
    </main>
  );
}
