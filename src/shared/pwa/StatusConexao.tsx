import { Icon } from '@/shared/ui';
import { useOnline } from './useOnline';

export function StatusConexao() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-amber-800 px-4 py-2 text-sm font-medium text-white"
    >
      <Icon nome="offline" tamanho="sm" />
      <span>
        <strong>Você está sem conexão.</strong> Conteúdo já carregado pode ser lido; envios e
        registros exigem conexão.
      </span>
    </div>
  );
}
