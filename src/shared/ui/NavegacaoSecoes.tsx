import { Icon, type NomeIcone } from './Icon';

interface Secao {
  id: string;
  rotulo: string;
  icone: NomeIcone;
}

/** Atalhos para as seções de uma página longa; cada `id` aponta para um `Card` com âncora. */
export function NavegacaoSecoes({ secoes }: { secoes: Secao[] }) {
  return (
    <nav aria-label="Seções desta página" className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {secoes.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="inline-flex min-h-(--control-min-height) items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-navy-900 shadow-sm transition-colors duration-(--duration-fast) hover:border-blue-700 hover:bg-surface-muted focus-visible:shadow-(--focus-ring) focus-visible:outline-none"
            >
              <Icon nome={s.icone} tamanho="sm" cor="marca" />
              {s.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
