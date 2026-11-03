import { SelectField } from '@/shared/ui';
import type { Edicao } from '../domain/tipos';
import { SeloDaEdicao } from './SeloDaEdicao';
import { rotuloDoEstado } from './textoDaEdicao';

/**
 * Edição em uso no topo da tela (US7). Só aparece com duas ou mais edições visíveis na área; com
 * uma só, mostra o nome apenas quando ela está em preparação (FR-015).
 */
export function SeletorEdicao({
  edicoes,
  escolhidaId,
  onEscolher,
}: {
  edicoes: Edicao[];
  escolhidaId: string | null;
  onEscolher: (id: string) => void;
}) {
  if (edicoes.length < 2) {
    const unica = edicoes[0];
    if (!unica || unica.estado !== 'rascunho') return null;
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{unica.nome}</span>
        <SeloDaEdicao estado={unica.estado} />
      </p>
    );
  }
  const atual = edicoes.find((e) => e.id === escolhidaId);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full max-w-sm">
        <SelectField
          rotulo="Edição em uso"
          value={atual?.id ?? ''}
          opcoes={edicoes.map((e) => ({
            valor: e.id,
            rotulo: `${e.nome} — ${rotuloDoEstado(e.estado)}`,
          }))}
          onChange={(e) => onEscolher(e.target.value)}
        />
      </div>
      {atual?.estado === 'rascunho' && <SeloDaEdicao estado="rascunho" />}
    </div>
  );
}
