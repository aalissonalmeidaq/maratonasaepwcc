import { Button, Icon } from '@/shared/ui';

interface AvisoAtualizacaoViewProps {
  precisaAtualizar: boolean;
  onAtualizar: () => void;
  onDispensar: () => void;
}

/** Atualização segura: a nova versão só é ativada quando a pessoa usuária decide. */
export function AvisoAtualizacaoView({
  precisaAtualizar,
  onAtualizar,
  onDispensar,
}: AvisoAtualizacaoViewProps) {
  if (!precisaAtualizar) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-(--z-overlay) mx-auto flex max-w-lg flex-col gap-3 rounded-lg bg-navy-900 p-4 text-white shadow-md sm:flex-row sm:items-center"
    >
      <span className="flex items-center gap-2 text-sm">
        <Icon nome="atualizar" />
        Nova versão disponível. Salve o que estiver fazendo antes de atualizar.
      </span>
      <div className="flex gap-2 sm:ml-auto">
        <Button variante="secundario" onClick={onDispensar}>
          Depois
        </Button>
        <Button onClick={onAtualizar}>Atualizar agora</Button>
      </div>
    </div>
  );
}
