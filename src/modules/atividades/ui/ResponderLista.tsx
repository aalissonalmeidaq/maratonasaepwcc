import { useRef, useState, type FormEvent } from 'react';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { Alert, Button, ConfirmDialog } from '@/shared/ui';
import type { ListaParaEquipe } from '../domain/tipos';

export type EnviarRespostas = (
  respostas: Record<string, string>,
  chave: string,
) => Promise<{ enviadaEm: string; autorNome: string }>;

/**
 * Respostas da equipe às questões (FR-018): um único envio, confirmado antes e mostrado como
 * enviado só depois do servidor. Uma nova tentativa depois de falha usa a mesma chave.
 */
export function ResponderLista({
  lista,
  enviar,
  bloqueio,
  semEquipe = false,
}: {
  lista: ListaParaEquipe;
  /** `null` quando não há servidor (modo demonstração). */
  enviar: EnviarRespostas | null;
  bloqueio?: string;
  semEquipe?: boolean;
}) {
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(lista.submissao);
  const chave = useRef(crypto.randomUUID());

  if (enviada) {
    return (
      <Alert
        tom="sucesso"
        titulo={`Respostas enviadas por ${enviada.autorNome} em ${formatarDataHora(enviada.enviadaEm)}.`}
      />
    );
  }
  if (semEquipe) {
    return <Alert tom="info" titulo="Você precisa fazer parte de uma equipe para enviar." />;
  }

  const semResposta = lista.questoes.filter((q) => !respostas[q.id]).length;
  const avisoBranco =
    semResposta === 0
      ? ''
      : semResposta === 1
        ? ' 1 questão sem resposta conta como erro.'
        : ` ${semResposta} questões sem resposta contam como erro.`;

  async function confirmar() {
    if (!enviar) return;
    setEnviando(true);
    setFalha(null);
    try {
      setEnviada(await enviar(respostas, chave.current));
      setConfirmando(false);
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível concluir a operação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setConfirmando(true);
      }}
      className="flex flex-col gap-4"
    >
      {lista.questoes.map((q, i) => (
        <fieldset key={q.id} className="flex flex-col gap-1">
          <legend className="mb-1 font-semibold">
            {i + 1}. {q.enunciado}
          </legend>
          {q.alternativas.map((a) => (
            <label key={a.id} className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name={q.id}
                checked={respostas[q.id] === a.id}
                onChange={() => setRespostas((r) => ({ ...r, [q.id]: a.id }))}
                className="size-5"
              />
              {a.texto}
            </label>
          ))}
        </fieldset>
      ))}
      {!enviar && <Alert tom="info" titulo="Envio indisponível no modo demonstração." />}
      {enviar && bloqueio && <Alert tom="alerta" titulo={bloqueio} />}
      {falha && !confirmando && (
        <Alert tom="erro" titulo="As respostas não foram enviadas" anunciar>
          {falha}
        </Alert>
      )}
      <Button
        type="submit"
        icone="enviar"
        disabled={!enviar || Boolean(bloqueio)}
        className="self-start"
      >
        Enviar respostas da equipe
      </Button>
      <ConfirmDialog
        aberto={confirmando}
        titulo="Enviar as respostas da equipe?"
        descricao={`A equipe só pode enviar uma vez.${avisoBranco}`}
        rotuloConfirmar="Enviar agora"
        carregando={enviando}
        erro={falha ?? undefined}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() => void confirmar()}
      />
    </form>
  );
}
