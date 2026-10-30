import { Alert } from './Alert';
import type { EstadoEnvio } from './useEnvio';

export function RetornoEnvio({ estado }: { estado: EstadoEnvio }) {
  if (estado.tipo === 'sucesso') return <Alert tom="sucesso" titulo={estado.mensagem} anunciar />;
  if (estado.tipo === 'alerta') return <Alert tom="alerta" titulo={estado.mensagem} anunciar />;
  if (estado.tipo === 'erro') return <Alert tom="erro" titulo={estado.mensagem} anunciar />;
  return null;
}
