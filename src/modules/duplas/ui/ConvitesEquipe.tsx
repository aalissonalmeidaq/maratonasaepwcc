import { useState, type FormEvent } from 'react';
import { Alert, Button, RetornoEnvio, StatusBadge, useEnvio } from '@/shared/ui';
import { validarConvite } from '../domain/equipes';
import type { Colega, ConviteEquipe, RespostaConvite } from '../domain/tipos';

interface ConvitesEquipeProps {
  /** Pessoa atual. */
  eu: string;
  colegas: Colega[];
  convites: ConviteEquipe[];
  /** Turma ímpar e sem trio: o convite pode ter dois colegas. */
  permiteTrio: boolean;
  onEnviar: (convidados: string[]) => Promise<void>;
  onResponder: (conviteId: string, aceitar: boolean) => Promise<void>;
  onCancelar: (conviteId: string) => Promise<void>;
  /** Retira o próprio aceite de um trio ainda pendente (FR-014). */
  onRetirar: (conviteId: string) => Promise<void>;
  /** Após uma falha, os dados são relidos do servidor antes de nova tentativa. */
  onErro?: () => void;
  /** Motivo para impedir gravações (offline, demonstração, edição encerrada). */
  bloqueio?: string;
}

const RESPOSTA: Record<RespostaConvite, string> = {
  pendente: 'Aguardando resposta',
  aceito: 'Aceitou',
  recusado: 'Recusou',
};

/** Convites de equipe do aluno (US1): convidar colegas, responder e cancelar convites. */
export function ConvitesEquipe({
  eu,
  colegas,
  convites,
  permiteTrio,
  onEnviar,
  onResponder,
  onCancelar,
  onRetirar,
  onErro,
  bloqueio,
}: ConvitesEquipeProps) {
  const [marcados, setMarcados] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();
  const limite = permiteTrio ? 2 : 1;
  const livres = colegas.filter((c) => !c.temEquipe);
  const pendentes = convites.filter((c) => c.situacao === 'pendente');
  const recebidos = pendentes.filter((c) => !c.souRemetente);
  const enviados = pendentes.filter((c) => c.souRemetente);
  const travado = Boolean(bloqueio) || enviando;

  async function executar(gravar: () => Promise<void>, sucesso: string) {
    const ok = await enviar(gravar, sucesso);
    if (!ok) onErro?.();
    return ok;
  }

  async function aoConvidar(ev: FormEvent) {
    ev.preventDefault();
    const problema = validarConvite({
      remetenteId: eu,
      convidados: marcados,
      colegas,
      permiteTrio,
    });
    setErro(problema);
    if (problema) return;
    if (await executar(() => onEnviar(marcados), 'Convite enviado.')) setMarcados([]);
  }

  function alternar(id: string) {
    setMarcados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  return (
    <div className="flex flex-col gap-6">
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />

      <section aria-labelledby="convites-recebidos" className="flex flex-col gap-3">
        <h3 id="convites-recebidos" className="font-semibold">
          Convites recebidos
        </h3>
        {recebidos.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhum convite recebido.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recebidos.map((c) => {
              const outros = c.convidados.filter((x) => x.id !== eu);
              const minha = c.convidados.find((x) => x.id === eu)?.resposta ?? 'pendente';
              return (
                <li key={c.id} className="rounded-lg border border-border p-4">
                  <p>
                    <strong>{c.remetenteNome}</strong> convidou você
                    {outros.length > 0 && <> e {outros.map((o) => o.nome).join(', ')}</>} para
                    formar {c.tipo === 'trio' ? 'um trio' : 'uma dupla'}.
                  </p>
                  {minha === 'pendente' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        icone="correta"
                        aria-label={`Aceitar convite de ${c.remetenteNome}`}
                        disabled={travado}
                        onClick={() => executar(() => onResponder(c.id, true), 'Convite aceito.')}
                      >
                        Aceitar
                      </Button>
                      <Button
                        variante="secundario"
                        icone="fechar"
                        aria-label={`Recusar convite de ${c.remetenteNome}`}
                        disabled={travado}
                        onClick={() =>
                          executar(() => onResponder(c.id, false), 'Convite recusado.')
                        }
                      >
                        Recusar
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2">
                      <p className="text-sm text-text-secondary">
                        Aguardando outro aceite. Retirar o aceite cancela o convite inteiro.
                      </p>
                      <Button
                        variante="secundario"
                        icone="voltar"
                        className="sm:self-start"
                        disabled={travado}
                        onClick={() => executar(() => onRetirar(c.id), 'Aceite retirado.')}
                      >
                        Retirar aceite
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={aoConvidar} noValidate className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">Convidar colegas</legend>
          <p className="text-sm text-text-secondary">
            {permiteTrio
              ? 'Escolha um colega para uma dupla ou dois para o trio da turma.'
              : 'Escolha um colega para formar a dupla.'}
          </p>
          {livres.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Todos os colegas da turma já estão em equipes.
            </p>
          ) : (
            livres.map((c) => {
              const marcado = marcados.includes(c.id);
              return (
                <label key={c.id} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    name={c.id}
                    checked={marcado}
                    disabled={!marcado && marcados.length >= limite}
                    onChange={() => alternar(c.id)}
                    className="size-5"
                  />
                  {c.nome}
                </label>
              );
            })
          )}
        </fieldset>
        {erro && <Alert tom="erro" titulo={erro} anunciar />}
        <Button
          type="submit"
          icone="enviar"
          carregando={enviando}
          disabled={Boolean(bloqueio)}
          className="sm:self-start"
        >
          Enviar convite
        </Button>
      </form>

      {enviados.length > 0 && (
        <section aria-labelledby="convites-enviados" className="flex flex-col gap-3">
          <h3 id="convites-enviados" className="font-semibold">
            Convites enviados
          </h3>
          <ul className="flex flex-col gap-3">
            {enviados.map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-4">
                <ul className="flex flex-col gap-1">
                  {c.convidados.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-2">
                      {x.nome}
                      <StatusBadge
                        estado={x.resposta === 'aceito' ? 'concluido' : 'pendente'}
                        rotulo={RESPOSTA[x.resposta]}
                      />
                    </li>
                  ))}
                </ul>
                <Button
                  variante="terciario"
                  icone="excluir"
                  className="mt-3"
                  disabled={travado}
                  onClick={() => executar(() => onCancelar(c.id), 'Convite cancelado.')}
                >
                  Cancelar convite
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Quantidade de convites recebidos pendentes (FR-016); some quando não há nenhum. */
export function ContadorConvites({ quantidade }: { quantidade: number }) {
  if (quantidade <= 0) return null;
  const texto = `${quantidade} ${quantidade === 1 ? 'convite pendente' : 'convites pendentes'}`;
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-700 px-2 text-xs font-bold text-white">
      <span aria-hidden="true">{quantidade}</span>
      <span className="sr-only">{texto}</span>
    </span>
  );
}
