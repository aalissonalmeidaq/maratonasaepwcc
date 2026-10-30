import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { Button } from './Button';
import { estiloControle } from './campo';
import { cx } from './cx';
import { EmptyState } from './EmptyState';
import { Icon, type NomeIcone } from './Icon';
import { useListagem } from './useListagem';

interface ListagemProps<T> {
  /** Nome da listagem; compõe os nomes acessíveis da busca e da paginação. */
  rotulo: string;
  itens: T[];
  texto: (item: T) => string;
  porPagina?: number;
  vazio: string;
  vazioIcone?: NomeIcone;
  /** Recebe só os itens da página atual. */
  children: (pagina: T[]) => ReactNode;
}

/** Busca, contagem, estado sem resultados e paginação em volta de qualquer listagem. */
export function Listagem<T>({
  rotulo,
  itens,
  texto,
  porPagina,
  vazio,
  vazioIcone,
  children,
}: ListagemProps<T>) {
  const l = useListagem(itens, texto, porPagina);
  const campo = useRef<HTMLInputElement>(null);

  if (itens.length === 0) return <EmptyState titulo={vazio} icone={vazioIcone} />;

  const contagem =
    l.total === 0
      ? 'Nenhum resultado'
      : l.totalPaginas > 1
        ? `Mostrando ${l.inicio}–${l.fim} de ${l.total}`
        : `${l.total} ${l.total === 1 ? 'resultado' : 'resultados'}`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <CampoBusca rotulo={rotulo} termo={l.termo} onBuscar={l.buscar} campo={campo} />
        <p role="status" className="text-sm text-text-secondary tabular-nums">
          {contagem}
        </p>
      </div>
      {l.total === 0 ? (
        <EmptyState
          icone="busca"
          titulo={`Nenhum resultado para “${l.termo.trim()}”.`}
          descricao="Confira a grafia ou busque por outro termo."
          acao={
            <Button
              variante="secundario"
              onClick={() => {
                l.buscar('');
                campo.current?.focus();
              }}
            >
              Limpar busca
            </Button>
          }
        />
      ) : (
        children(l.itens)
      )}
      <Paginacao
        rotulo={rotulo}
        pagina={l.pagina}
        totalPaginas={l.totalPaginas}
        irPara={l.irPara}
      />
    </div>
  );
}

function CampoBusca({
  rotulo,
  termo,
  onBuscar,
  campo,
}: {
  rotulo: string;
  termo: string;
  onBuscar: (termo: string) => void;
  campo: RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  return (
    <div className="flex w-full flex-col gap-1 sm:max-w-xs">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        Buscar
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-secondary">
          <Icon nome="busca" tamanho="sm" />
        </span>
        <input
          ref={campo}
          id={id}
          type="search"
          aria-label={`Buscar em ${rotulo}`}
          value={termo}
          onChange={(e) => onBuscar(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          className={cx(estiloControle, 'border-gray-500 pl-10')}
        />
      </div>
    </div>
  );
}

function Paginacao({
  rotulo,
  pagina,
  totalPaginas,
  irPara,
}: {
  rotulo: string;
  pagina: number;
  totalPaginas: number;
  irPara: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <nav
      aria-label={`Paginação: ${rotulo}`}
      className="mt-4 flex items-center justify-between gap-2 sm:justify-end"
    >
      <BotaoPagina
        rotulo="Página anterior"
        indisponivel={pagina <= 1}
        onClick={() => irPara(pagina - 1)}
      >
        <Icon nome="voltar" tamanho="sm" />
        Anterior
      </BotaoPagina>
      <span className="px-2 text-sm text-text-secondary tabular-nums">
        Página {pagina} de {totalPaginas}
      </span>
      <BotaoPagina
        rotulo="Próxima página"
        indisponivel={pagina >= totalPaginas}
        onClick={() => irPara(pagina + 1)}
      >
        Próxima
        <Icon nome="avancar" tamanho="sm" />
      </BotaoPagina>
    </nav>
  );
}

/** Indisponível por `aria-disabled` (não `disabled`): o foco não se perde ao chegar ao fim. */
function BotaoPagina({
  rotulo,
  indisponivel,
  onClick,
  children,
}: {
  rotulo: string;
  indisponivel: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variante="secundario"
      aria-label={rotulo}
      aria-disabled={indisponivel || undefined}
      onClick={() => {
        if (!indisponivel) onClick();
      }}
      className="aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
    >
      {children}
    </Button>
  );
}

interface ListaPaginadaProps<T> extends Omit<ListagemProps<T>, 'children'> {
  chave: (item: T) => string;
  className?: string;
  children: (item: T) => ReactNode;
}

/** Lista de cartões com busca e paginação. */
export function ListaPaginada<T>({
  chave,
  className,
  children,
  ...listagem
}: ListaPaginadaProps<T>) {
  return (
    <Listagem {...listagem}>
      {(pagina) => (
        <ul aria-label={listagem.rotulo} className={className}>
          {pagina.map((item) => (
            <li key={chave(item)}>{children(item)}</li>
          ))}
        </ul>
      )}
    </Listagem>
  );
}
