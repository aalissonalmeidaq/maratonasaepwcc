import { useState } from 'react';
import { formatarData } from '@/shared/lib/formatacao';
import { Alert, Button, ConfirmDialog, RetornoEnvio, TextAreaField, useEnvio } from '@/shared/ui';
import type { EdicaoGerida, PendenciasDaEdicao } from '../domain/edicoes';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function ListaDePendencias({ pendencias }: { pendencias: PendenciasDaEdicao }) {
  const itens = [
    plural(pendencias.ocorrenciasSemDecisao, 'ocorrência sem decisão', 'ocorrências sem decisão'),
    plural(pendencias.revisoesAbertas, 'pedido de revisão aberto', 'pedidos de revisão abertos'),
    pendencias.categoriasSemRanking.length
      ? `Categorias sem ranking publicado: ${pendencias.categoriasSemRanking.join(', ')}`
      : 'Todas as categorias têm ranking publicado',
  ];
  return (
    <ul className="list-disc pl-5 text-sm">
      {itens.map((i) => (
        <li key={i}>{i}</li>
      ))}
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
      <Alert
        tom="info"
        titulo={`Edição encerrada em ${quando}: ${edicao.justificativaEncerramento ?? 'sem justificativa registrada'}`}
      >
        Os dados desta edição só podem ser lidos.
      </Alert>
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
