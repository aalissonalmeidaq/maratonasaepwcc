import { useRef, useState, type FormEvent } from 'react';
import type { RegrasDaEdicao } from '@/modules/pontuacao';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { Alert, Button, TextField } from '@/shared/ui';
import {
  EXTENSOES_ACEITAS,
  atrasoPrevisto,
  situacaoDesafio,
  validarArquivo,
  validarLink,
} from '../domain/regras';
import { novaChaveDeEnvio } from '../domain/chave';
import type { Comprovante, DesafioDaEquipe } from '../domain/tipos';

export type EnviarEntrega = (dados: {
  chave: string;
  arquivo?: File;
  link?: string;
}) => Promise<Comprovante>;

const novaChave = novaChaveDeEnvio;

function TextoDoComprovante({ c, criterio }: { c: Comprovante; criterio: string }) {
  return (
    <>
      Protocolo <strong>{c.protocolo}</strong> — recebida em {formatarDataHora(c.recebidaEm)}
      {c.versao > 1 && ` (versão ${c.versao})`}.
      {c.atrasoMinutos > 0 &&
        ` Atraso de ${c.atrasoMinutos} min: desconto previsto de ${c.descontoPrevisto} pontos em ${criterio}.`}
    </>
  );
}

/**
 * Envio da entrega da equipe (HU02, FR-003–006). O comprovante aparece SOMENTE com a resposta do
 * servidor; uma nova tentativa depois de falha reaproveita a mesma chave, para que o servidor
 * não registre a mesma entrega duas vezes (Constituição V e VII).
 */
export function EnvioEntrega({
  desafio,
  regras,
  enviar,
  bloqueio,
  agora = () => new Date(),
  onBaixar,
}: {
  desafio: DesafioDaEquipe;
  regras: RegrasDaEdicao;
  /** `null` quando não há servidor (modo demonstração). */
  enviar: EnviarEntrega | null;
  bloqueio?: string;
  agora?: () => Date;
  onBaixar?: (caminho: string) => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<Comprovante | null>(null);
  const [enviando, setEnviando] = useState(false);
  const chave = useRef(novaChave());
  const campoArquivo = useRef<HTMLInputElement>(null);

  const criterio =
    regras.entrega.criterios.find((c) => c.id === regras.entrega.criterioDeAtraso)?.rotulo ??
    regras.entrega.criterioDeAtraso;
  const situacao = situacaoDesafio(desafio, agora(), regras);
  const atraso = atrasoPrevisto(desafio.prazoEfetivo, agora(), regras);

  // Mudar o conteúdo começa uma nova tentativa (nova chave).
  const recomecar = () => {
    chave.current = novaChave();
    setComprovante(null);
    setFalha(null);
  };

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    if (!enviar) return;
    const temLink = link.trim() !== '';
    const motivo =
      !arquivo && !temLink
        ? 'Envie um arquivo ou um link.'
        : arquivo && temLink
          ? 'Envie um arquivo ou um link, não os dois.'
          : arquivo
            ? validarArquivo(arquivo)
            : validarLink(link);
    setErro(motivo);
    if (motivo) return;
    setEnviando(true);
    setFalha(null);
    setComprovante(null);
    try {
      setComprovante(
        await enviar({
          chave: chave.current,
          arquivo: arquivo ?? undefined,
          link: temLink ? link.trim() : undefined,
        }),
      );
      // Envio confirmado: o próximo é outra tentativa.
      chave.current = novaChave();
      setArquivo(null);
      setLink('');
      if (campoArquivo.current) campoArquivo.current.value = '';
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível concluir a operação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!desafio.duplaId ? (
        <Alert tom="info" titulo="Você precisa fazer parte de uma equipe para enviar." />
      ) : situacao === 'encerrado' ? (
        <Alert tom="info" titulo="Prazo encerrado: a entrega não é mais aceita." />
      ) : (
        <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
          {desafio.aceitaArquivo && (
            <div className="flex flex-col gap-1">
              <label htmlFor={`arquivo-${desafio.id}`} className="text-sm font-semibold">
                Arquivo da entrega
              </label>
              <input
                ref={campoArquivo}
                id={`arquivo-${desafio.id}`}
                type="file"
                accept={EXTENSOES_ACEITAS}
                onChange={(e) => {
                  recomecar();
                  setArquivo(e.target.files?.[0] ?? null);
                }}
                aria-describedby={`arquivo-dica-${desafio.id}`}
                className="min-h-11 text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:font-semibold"
              />
              <p id={`arquivo-dica-${desafio.id}`} className="text-sm text-text-secondary">
                PDF, ZIP, PNG ou JPG, até 50 MB.
              </p>
            </div>
          )}
          {desafio.aceitaLink && (
            <TextField
              rotulo="Link da entrega"
              type="url"
              inputMode="url"
              autoComplete="off"
              value={link}
              onChange={(e) => {
                recomecar();
                setLink(e.target.value);
              }}
              dica={desafio.aceitaArquivo ? 'Use o link ou o arquivo, não os dois.' : undefined}
            />
          )}
          {erro && <Alert tom="erro" titulo={erro} />}
          {situacao === 'prazo_encerrado' && (
            <Alert
              tom="alerta"
              titulo={`Prazo encerrado há ${atraso.minutos} min: a entrega será registrada com atraso e desconto previsto de ${atraso.desconto} pontos em ${criterio}.`}
            />
          )}
          {!enviar && (
            <Alert tom="info" titulo="Envio indisponível no modo demonstração">
              Não há servidor conectado; nenhum envio será simulado como recebido.
            </Alert>
          )}
          {enviar && bloqueio && <Alert tom="alerta" titulo={bloqueio} />}
          <Button
            type="submit"
            icone="enviar"
            carregando={enviando}
            disabled={!enviar || Boolean(bloqueio)}
            className="self-start"
          >
            Enviar entrega
          </Button>
        </form>
      )}

      {falha && (
        <Alert tom="erro" titulo="A entrega não foi recebida" anunciar>
          {falha} Nada foi registrado como enviado; tente novamente.
        </Alert>
      )}
      {comprovante && (
        <Alert tom="sucesso" titulo="Entrega recebida pelo servidor" anunciar>
          <TextoDoComprovante c={comprovante} criterio={criterio} />
        </Alert>
      )}

      {desafio.entregas.length > 0 && (
        <section aria-labelledby={`versoes-${desafio.id}`}>
          <h4 id={`versoes-${desafio.id}`} className="mb-2 text-sm font-semibold">
            Versões enviadas (vale a última)
          </h4>
          <ul aria-label="Versões enviadas" className="flex flex-col gap-2 text-sm">
            {desafio.entregas.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">Versão {v.versao}</span>
                <span>
                  {v.protocolo} · {formatarDataHora(v.recebidaEm)} · por {v.autorNome}
                  {v.atrasoMinutos > 0 && ` · atraso de ${v.atrasoMinutos} min`}
                </span>
                {v.arquivoPath && onBaixar ? (
                  <Button
                    variante="terciario"
                    icone="download"
                    onClick={() => onBaixar(v.arquivoPath!)}
                  >
                    Baixar {v.arquivoNome ?? 'arquivo'}
                  </Button>
                ) : v.link ? (
                  <a
                    href={v.link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-link underline"
                  >
                    Abrir link <span className="sr-only">da versão {v.versao}</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
