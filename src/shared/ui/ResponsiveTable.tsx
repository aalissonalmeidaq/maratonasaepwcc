import type { ReactNode } from 'react';
import { cx } from './cx';
import { Listagem } from './Listagem';
import { textoDoNo } from './textoDoNo';

export interface Coluna<L> {
  id: string;
  titulo: string;
  valor: (linha: L) => ReactNode;
  /** Alinhamento numérico à direita. */
  numerica?: boolean;
  /** Texto usado na busca; por padrão, o texto exibido na célula. */
  texto?: (linha: L) => string;
  /** `false` tira a coluna da busca (ex.: ações). */
  buscavel?: boolean;
  /** Conteúdo curto que não deve quebrar linha (números, datas, horários, ações). */
  compacta?: boolean;
}

interface ResponsiveTableProps<L> {
  legenda: string;
  colunas: Coluna<L>[];
  linhas: L[];
  chave: (linha: L) => string;
  vazio?: string;
  /** Exibe a legenda visualmente (padrão: só para leitores de tela). */
  legendaVisivel?: boolean;
  porPagina?: number;
}

/**
 * Tabela semântica em telas largas; no celular cada linha vira um cartão com rótulos visíveis
 * (Design System §6), sem rolagem horizontal escondida. Busca dinâmica e paginação (spec 005).
 */
export function ResponsiveTable<L>({
  legenda,
  colunas,
  linhas,
  chave,
  vazio = 'Nenhum registro encontrado.',
  legendaVisivel = false,
  porPagina,
}: ResponsiveTableProps<L>) {
  const texto = (l: L) =>
    colunas
      .filter((c) => c.buscavel !== false)
      .map((c) => (c.texto ? c.texto(l) : textoDoNo(c.valor(l))))
      .join(' ');

  return (
    <Listagem rotulo={legenda} itens={linhas} texto={texto} porPagina={porPagina} vazio={vazio}>
      {(pagina) => (
        <>
          <table className="hidden w-full border-collapse text-left text-sm sm:table">
            <caption className={legendaVisivel ? 'mb-2 text-left font-semibold' : 'sr-only'}>
              {legenda}
            </caption>
            <thead>
              <tr className="border-b border-border text-text-secondary">
                {colunas.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    className={`px-3 py-2 font-semibold whitespace-nowrap ${c.numerica ? 'text-right' : ''}`}
                  >
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagina.map((l) => (
                <tr key={chave(l)} className="border-b border-border last:border-0">
                  {colunas.map((c) => (
                    <td
                      key={c.id}
                      className={cx(
                        'px-3 py-3',
                        c.numerica && 'text-right tabular-nums',
                        c.compacta && 'whitespace-nowrap',
                      )}
                    >
                      {c.valor(l)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="flex flex-col gap-3 sm:hidden" aria-label={legenda}>
            {pagina.map((l) => (
              <li key={chave(l)} className="rounded-md border border-border bg-surface p-3">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {colunas.map((c) => (
                    <div key={c.id} className="contents">
                      <dt className="font-semibold text-text-secondary">{c.titulo}</dt>
                      <dd className="text-text">{c.valor(l)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Listagem>
  );
}
