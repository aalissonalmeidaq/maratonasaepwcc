import { useState } from 'react';
import { formatarData } from '@/shared/lib/formatacao';
import { Alert, Button, ConfirmDialog, RetornoEnvio, TextAreaField, useEnvio } from '@/shared/ui';
import type {
  EdicaoGerida,
  PendenciasDaEdicao,
  RegistroDoEncerramento,
  TurmaSemDefinitiva,
} from '../domain/edicoes';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const ESTADO_DA_TURMA: Record<TurmaSemDefinitiva['estado'], string> = {
  sem_publicacao: 'Sem publicação',
  parcial: 'Parcial',
  provisorio: 'Provisório',
};

/**
 * Pendências antes de encerrar (FR-011) ou registradas no encerramento. O ranking é por turma
 * (spec 013); registros anteriores trazem as categorias sem ranking, como foram gravados.
 */
function ListaDePendencias({
  pendencias,
}: {
  pendencias: PendenciasDaEdicao | RegistroDoEncerramento;
}) {
  const turmas = pendencias.turmasSemDefinitiva;
  const categorias =
    'categoriasSemRanking' in pendencias ? pendencias.categoriasSemRanking : undefined;
  return (
    <ul className="list-disc pl-5 text-sm">
      <li>
        {plural(
          pendencias.ocorrenciasSemDecisao,
          'ocorrência sem decisão',
          'ocorrências sem decisão',
        )}
      </li>
      <li>
        {plural(
          pendencias.revisoesAbertas,
          'pedido de revisão aberto',
          'pedidos de revisão abertos',
        )}
      </li>
      {turmas ? (
        turmas.length ? (
          <li>
            Turmas sem ranking definitivo:
            <ul aria-label="Turmas sem ranking definitivo" className="list-[circle] pl-5">
              {turmas.map((t) => (
                <li key={t.turmaId}>
                  {t.turma} ({t.categoria}): {ESTADO_DA_TURMA[t.estado]}
                </li>
              ))}
            </ul>
          </li>
        ) : (
          <li>Todas as turmas têm o ranking definitivo</li>
        )
      ) : categorias?.length ? (
        <li>Categorias sem ranking publicado: {categorias.join(', ')}</li>
      ) : (
        <li>Todas as categorias tinham ranking publicado</li>
      )}
    </ul>
  );
}

/**
 * Ativar e encerrar a edição (US5). Encerrar mostra as pendências, que não impedem o
 * encerramento (FR-011), e exige justificativa; edição encerrada só pode ser lida (FR-012).
 */
export function EstadoDaEdicao({
  edicao,
  onAtivar,
  onCarregarPendencias,
  onEncerrar,
  bloqueio,
}: {
  edicao: EdicaoGerida;
  onAtivar: () => Promise<unknown>;
  onCarregarPendencias: () => Promise<PendenciasDaEdicao>;
  onEncerrar: (justificativa: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const ativacao = useEnvio();
  const [aberto, setAberto] = useState(false);
  const [pendencias, setPendencias] = useState<PendenciasDaEdicao | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [erroCampo, setErroCampo] = useState<string>();
  const [erroServidor, setErroServidor] = useState<string>();
  const [encerrando, setEncerrando] = useState(false);

  if (edicao.estado === 'encerrada') {
    const quando = edicao.encerradaEm ? formatarData(edicao.encerradaEm) : 'data não registrada';
    return (
      <div className="flex flex-col gap-3">
        <Alert
          tom="info"
          titulo={`Edição encerrada em ${quando}: ${edicao.justificativaEncerramento ?? 'sem justificativa registrada'}`}
        >
          Os dados desta edição só podem ser lidos.
        </Alert>
        <section aria-labelledby={`registro-${edicao.id}`}>
          <h3 id={`registro-${edicao.id}`} className="mb-1 text-sm font-semibold">
            Pendências registradas no encerramento
          </h3>
          {edicao.pendenciasNoEncerramento ? (
            <ListaDePendencias pendencias={edicao.pendenciasNoEncerramento} />
          ) : (
            <p className="text-sm text-text-secondary">
              Pendências do encerramento não registradas
            </p>
          )}
        </section>
      </div>
    );
  }

  async function abrirEncerramento() {
    setAberto(true);
    setErroServidor(undefined);
    try {
      setPendencias(await onCarregarPendencias());
    } catch (e) {
      setErroServidor(e instanceof Error ? e.message : 'Não foi possível carregar as pendências.');
    }
  }

  async function encerrar() {
    if (justificativa.trim().length < 10) {
      setErroCampo('Informe a justificativa (mínimo de 10 caracteres).');
      return;
    }
    setErroCampo(undefined);
    setEncerrando(true);
    try {
      await onEncerrar(justificativa.trim());
      setAberto(false);
    } catch (e) {
      setErroServidor(e instanceof Error ? e.message : 'Não foi possível encerrar a edição.');
    } finally {
      setEncerrando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {edicao.estado === 'rascunho' ? (
        <>
          <p className="text-sm text-text-secondary">
            Para ativar: início e fim preenchidos e ao menos uma turma vinculada.
          </p>
          <div>
            <Button
              icone="avancar"
              carregando={ativacao.enviando}
              disabled={Boolean(bloqueio)}
              onClick={() => void ativacao.enviar(onAtivar, 'Edição ativada.')}
            >
              Ativar edição
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button
            variante="destrutivo"
            icone="fecharCirculo"
            disabled={Boolean(bloqueio)}
            onClick={() => void abrirEncerramento()}
          >
            Encerrar edição
          </Button>
        </div>
      )}
      {/* Fica visível depois da troca para "ativa": a confirmação não some com o botão. */}
      <RetornoEnvio estado={ativacao.estado} />
      <ConfirmDialog
        aberto={aberto}
        titulo={`Encerrar ${edicao.nome}?`}
        descricao="Depois de encerrada, a edição só pode ser lida."
        rotuloConfirmar="Encerrar"
        destrutivo
        carregando={encerrando}
        erro={erroServidor}
        onConfirmar={() => void encerrar()}
        onCancelar={() => setAberto(false)}
      >
        <div className="flex flex-col gap-3">
          {pendencias ? (
            <>
              <p className="text-sm font-semibold">
                Pendências desta edição (não impedem o encerramento):
              </p>
              <ListaDePendencias pendencias={pendencias} />
            </>
          ) : (
            <p className="text-sm text-text-secondary">Carregando as pendências…</p>
          )}
          <TextAreaField
            rotulo="Justificativa"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            erro={erroCampo}
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
