import { useId, useState, type FormEvent } from 'react';
import { Alert, Button, RodapeDoFormulario, TextAreaField, useEnvio } from '@/shared/ui';
import { ROTULO_SITUACAO } from '../domain/situacao';
import type { Decisao, EntradaResposta, Premissa, Resposta } from '../domain/tipos';
import {
  LIMITE_JUSTIFICATIVA,
  validarResposta,
  type ErrosResposta,
  type RascunhoResposta,
} from '../domain/validacao';

const DECISOES: Decisao[] = ['confirmada', 'precisa_mudar'];
const milhar = new Intl.NumberFormat('pt-BR');

/**
 * Resposta da coordenação a uma premissa (spec 015, US2): "Confirmada" ou "Precisa mudar" com
 * justificativa. Envia a resposta atual como base (concorrência, R4); a situação só muda depois
 * da resposta do servidor.
 */
export function FormResposta({
  premissa,
  onResponder,
  bloqueio,
}: {
  premissa: Premissa;
  onResponder: (entrada: EntradaResposta) => Promise<Resposta>;
  bloqueio?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoResposta>({ decisao: null, justificativa: '' });
  const [erros, setErros] = useState<ErrosResposta>({});
  const { estado, enviando, enviar, limpar } = useEnvio();
  const idErroDecisao = useId();

  function fechar() {
    setAberto(false);
    setRascunho({ decisao: null, justificativa: '' });
    setErros({});
    limpar();
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    const encontrados = validarResposta(rascunho);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0 || !rascunho.decisao) return;
    const entrada: EntradaResposta = {
      codigo: premissa.codigo,
      decisao: rascunho.decisao,
      justificativa: rascunho.justificativa.trim(),
      respostaBase: premissa.atual?.id ?? null,
    };
    await enviar(() => onResponder(entrada), 'Resposta registrada.');
  }

  if (!aberto) {
    return (
      <div className="mt-3 print:hidden">
        <Button variante="secundario" icone="editar" onClick={() => setAberto(true)}>
          Responder <span className="sr-only">{premissa.codigo}</span>
        </Button>
      </div>
    );
  }

  const tamanho = rascunho.justificativa.length;
  return (
    <form
      noValidate
      onSubmit={registrar}
      className="mt-3 flex flex-col gap-3 border-t border-border pt-3 print:hidden"
    >
      <fieldset
        className="flex flex-col gap-1"
        aria-describedby={erros.decisao ? idErroDecisao : undefined}
      >
        <legend className="mb-1 text-sm font-semibold">Decisão da unidade</legend>
        <div className="flex flex-wrap gap-x-6">
          {DECISOES.map((d) => (
            <label key={d} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name={`decisao-${premissa.codigo}`}
                value={d}
                checked={rascunho.decisao === d}
                onChange={() => setRascunho((r) => ({ ...r, decisao: d }))}
                className="size-5"
              />
              {ROTULO_SITUACAO[d]}
            </label>
          ))}
        </div>
        {erros.decisao && (
          <p id={idErroDecisao} className="text-sm font-medium text-error">
            {erros.decisao}
          </p>
        )}
      </fieldset>
      {rascunho.decisao === 'precisa_mudar' && (
        <Alert tom="info" titulo="O sistema segue a premissa em uso até a mudança ser feita." />
      )}
      <TextAreaField
        rotulo={
          rascunho.decisao === 'precisa_mudar' ? 'O que precisa mudar e por quê' : 'Justificativa'
        }
        value={rascunho.justificativa}
        maxLength={LIMITE_JUSTIFICATIVA}
        rows={4}
        dica={`${milhar.format(tamanho)}/${milhar.format(LIMITE_JUSTIFICATIVA)} caracteres`}
        erro={erros.justificativa}
        onChange={(e) => setRascunho((r) => ({ ...r, justificativa: e.target.value }))}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Registrar resposta"
        icone="salvar"
        onCancelar={fechar}
      />
    </form>
  );
}
