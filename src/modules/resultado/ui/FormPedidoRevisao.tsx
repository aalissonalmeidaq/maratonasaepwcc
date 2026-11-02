import { useRef, useState, type FormEvent } from 'react';
import { novaChaveDeEnvio } from '@/modules/atividades';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { RodapeDoFormulario, SelectField, TextAreaField, useEnvio } from '@/shared/ui';
import { ROTULO_COMPONENTE } from '../domain/prazos';
import type { ComponenteRevisao, ObjetoRevisao } from '../domain/tipos';

/**
 * Pedido de revisão da equipe (US5, FR-020): sobre a decisão de uma ocorrência ou sobre um
 * componente dos pontos numa publicação provisória. O servidor confere o prazo pelo próprio
 * relógio; a chave de envio torna a repetição segura.
 */
export function FormPedidoRevisao({
  objeto,
  prazo,
  encontros = [],
  onPedir,
  bloqueio,
}: {
  objeto: ObjetoRevisao;
  prazo: string | null;
  encontros?: { id: string; rotulo: string }[];
  onPedir: (d: {
    chave: string;
    componente?: ComponenteRevisao;
    encontroId?: string | null;
    justificativa: string;
  }) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [componente, setComponente] = useState<ComponenteRevisao | ''>('');
  const [encontroId, setEncontroId] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState<{ componente?: string; justificativa?: string }>({});
  const chave = useRef(novaChaveDeEnvio());
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const e = {
      componente:
        objeto === 'publicacao' && !componente ? 'Escolha o componente dos pontos.' : undefined,
      justificativa:
        justificativa.trim().length < 10
          ? 'Explique o pedido com pelo menos 10 caracteres.'
          : undefined,
    };
    setErros(e);
    if (e.componente || e.justificativa) return;
    const ok = await enviar(
      () =>
        onPedir({
          chave: chave.current,
          ...(objeto === 'publicacao'
            ? { componente: componente as ComponenteRevisao, encontroId: encontroId || null }
            : {}),
          justificativa: justificativa.trim(),
        }),
      'Pedido enviado. A coordenação foi avisada e responderá com justificativa.',
    );
    if (ok) chave.current = novaChaveDeEnvio();
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-3">
      {prazo && (
        <p className="text-sm text-text-secondary">
          Pedidos aceitos até {formatarDataHora(prazo)} (horário do servidor).
        </p>
      )}
      {objeto === 'publicacao' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            rotulo="Componente"
            placeholder="Escolha o componente"
            opcoes={Object.entries(ROTULO_COMPONENTE).map(([valor, rotulo]) => ({ valor, rotulo }))}
            value={componente}
            erro={erros.componente}
            onChange={(e) => setComponente(e.target.value as ComponenteRevisao | '')}
          />
          <SelectField
            rotulo="Encontro (opcional)"
            placeholder="Todos os encontros"
            opcoes={encontros.map((e) => ({ valor: e.id, rotulo: e.rotulo }))}
            value={encontroId}
            onChange={(e) => setEncontroId(e.target.value)}
          />
        </div>
      )}
      <TextAreaField
        rotulo="Motivo do pedido"
        maxLength={2000}
        value={justificativa}
        erro={erros.justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Pedir revisão"
        icone="revisao"
      />
    </form>
  );
}
