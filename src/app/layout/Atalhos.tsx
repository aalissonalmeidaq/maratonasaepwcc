import type { Area } from '@/modules/acesso';
import { CardDestaque } from '@/shared/ui';
import { MENUS } from '../navegacao';

const ACENTOS = ['azul', 'amarelo', 'coral', 'ciano', 'roxo'] as const;

/**
 * Acesso rápido do painel inicial: os itens do menu do perfil como cartões de destaque
 * (prancha 09, "Cards e componentes digitais").
 */
export function Atalhos({ area }: { area: Area }) {
  const itens = MENUS[area].filter((i) => i.caminho !== `/${area}`);
  return (
    <nav aria-label="Acesso rápido" className="mb-6">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {itens.map((item, i) => (
          <li key={item.caminho}>
            <CardDestaque
              titulo={item.rotulo}
              descricao={item.descricao}
              icone={item.icone}
              para={item.caminho}
              acento={ACENTOS[i % ACENTOS.length]}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
