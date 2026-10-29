import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOnline } from '@/shared/pwa/useOnline';
import { Alert, Button, TextField } from '@/shared/ui';

export interface ComprovanteEntrega {
  protocolo: string;
  /** Horário registrado pelo servidor (ISO 8601). */
  recebidoEm: string;
}

export type EnviarEntrega = (dados: { link: string }) => Promise<ComprovanteEntrega>;

const esquema = z.object({
  link: z.url({ protocol: /^https?$/, message: 'Informe um link válido (http ou https).' }),
});

type Formulario = z.infer<typeof esquema>;

interface EnvioEntregaProps {
  /** `null` quando não há servidor disponível (modo demonstração). */
  enviar: EnviarEntrega | null;
}

const formatarHorario = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Envio da entrega da dupla (HU02). A confirmação aparece SOMENTE quando o servidor devolve o
 * protocolo; erro ou falta de rede nunca são mostrados como sucesso (constituição, princípio VII).
 * O envio de arquivos para o Storage privado entra no Incremento 3.
 */
export function EnvioEntrega({ enviar }: EnvioEntregaProps) {
  const online = useOnline();
  const [comprovante, setComprovante] = useState<ComprovanteEntrega | null>(null);
  const [falhou, setFalhou] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) });

  const indisponivel = !enviar || !online;

  const aoEnviar = handleSubmit(async (dados) => {
    if (!enviar) return;
    setFalhou(false);
    setComprovante(null);
    try {
      setComprovante(await enviar({ link: dados.link }));
    } catch {
      setFalhou(true);
    }
  });

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <TextField
        rotulo="Link da entrega"
        type="url"
        inputMode="url"
        autoComplete="off"
        dica="Link do repositório ou documento combinado com a docente."
        erro={errors.link?.message}
        {...register('link')}
      />

      {!enviar && (
        <Alert tom="info" titulo="Envio indisponível no modo demonstração">
          Não há servidor conectado; nenhum envio será simulado como recebido.
        </Alert>
      )}
      {enviar && !online && (
        <Alert tom="alerta" titulo="O envio requer conexão">
          Conecte-se à internet para enviar. Nada foi enviado.
        </Alert>
      )}

      <Button type="submit" icone="enviar" carregando={isSubmitting} disabled={indisponivel}>
        Enviar entrega
      </Button>

      {falhou && (
        <Alert tom="erro" titulo="A entrega não foi recebida" anunciar>
          Não houve confirmação do servidor. Verifique a conexão e tente novamente; se o prazo
          estiver terminando, avise a docente.
        </Alert>
      )}
      {comprovante && (
        <Alert tom="sucesso" titulo="Entrega recebida pelo servidor" anunciar>
          Protocolo <strong>{comprovante.protocolo}</strong> — recebida em{' '}
          {formatarHorario(comprovante.recebidoEm)}.
        </Alert>
      )}
    </form>
  );
}
