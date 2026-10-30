import { Alert } from './Alert';
import { Button } from './Button';
import { RetornoEnvio } from './envio';
import type { NomeIcone } from './Icon';
import type { EstadoEnvio } from './useEnvio';

/** Aviso de bloqueio, retorno do servidor e ações de um formulário de cadastro ou edição. */
export function RodapeDoFormulario({
  bloqueio,
  estado,
  enviando,
  rotulo,
  icone,
  onCancelar,
}: {
  bloqueio?: string;
  estado: EstadoEnvio;
  enviando: boolean;
  rotulo: string;
  icone?: NomeIcone;
  /** Presente na edição: sai sem gravar ("Cancelar") ou depois de gravar ("Concluir"). */
  onCancelar?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:col-span-full">
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" icone={icone} carregando={enviando} disabled={Boolean(bloqueio)}>
          {rotulo}
        </Button>
        {onCancelar && (
          <Button variante="secundario" onClick={onCancelar} disabled={enviando}>
            {estado.tipo === 'sucesso' ? 'Concluir' : 'Cancelar'}
          </Button>
        )}
      </div>
    </div>
  );
}
