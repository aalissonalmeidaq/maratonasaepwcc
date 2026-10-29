import { Icon } from '@/shared/ui';

/** Aviso permanente do modo demonstração (FR-003, US1 cenário 4). */
export function AvisoDemo() {
  return (
    <div
      role="note"
      aria-label="Aviso de modo demonstração"
      className="flex items-center justify-center gap-2 bg-yellow-500 px-4 py-1.5 text-center text-xs font-semibold text-navy-950 sm:text-sm"
    >
      <Icon nome="alerta" tamanho="sm" />
      Modo demonstração — dados fictícios, acesso não seguro. Não insira dados reais.
    </div>
  );
}
