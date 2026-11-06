import { useState } from 'react';
import { Alert, Button, ConfirmDialog, SelectField, StatusBadge, TextAreaField } from '@/shared/ui';
import { ROTULO_FUNCAO, type MembroDaUnidade, type Unidade } from '../domain/tipos';
import { validarTransferencia } from '../domain/validacao';

export interface AcoesDeTransferencia {
  /** O servidor decide; a recusa volta como erro com a mensagem em português. */
  transferir: (dados: {
    usuarioId: string;
    unidadeDestinoId: string;
    justificativa: string;
  }) => Promise<void>;
}

const ACESSO = { ativo: 'Acesso ativo', aguardando: 'Convite pendente' } as const;
export const AVISO_TRANSFERIDA =
  'Conta transferida. A gestão da unidade de destino define as funções.';

/** Diálogo aberto: o estado nasce zerado a cada abertura, pois remonta. */
function DialogoDeTransferencia({
  membro,
  origem,
  destinos,
  transferir,
  onCancelar,
  onConcluir,
}: {
  membro: MembroDaUnidade;
  origem: Unidade;
  destinos: Unidade[];
  transferir: AcoesDeTransferencia['transferir'];
  onCancelar: () => void;
  onConcluir: () => void;
}) {
  const [destinoId, setDestinoId] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState<{ destinoId?: string; justificativa?: string }>({});
  const [erroServidor, setErroServidor] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    const encontrados = validarTransferencia({ origemId: origem.id, destinoId, justificativa });
    setErros(encontrados);
    setErroServidor(undefined);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      await transferir({
        usuarioId: membro.usuarioId,
        unidadeDestinoId: destinoId,
        justificativa: justificativa.trim(),
      });
      onConcluir();
    } catch (e) {
      setErroServidor(e instanceof Error ? e.message : 'Não foi possível transferir a conta.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo={`Transferir ${membro.nome}`}
      descricao={`A conta sai de ${origem.nome} sem funções nem vínculos ativos (o histórico fica guardado) e chega à unidade de destino sem funções.`}
      rotuloConfirmar="Transferir"
      destrutivo
      carregando={enviando}
      erro={erroServidor}
      onConfirmar={() => void confirmar()}
      onCancelar={onCancelar}
    >
      <div className="flex flex-col gap-4">
        <SelectField
          rotulo="Unidade de destino"
          value={destinoId}
          erro={erros.destinoId}
          onChange={(e) => setDestinoId(e.target.value)}
          opcoes={[
            { valor: '', rotulo: 'Escolha a unidade' },
            ...destinos.map((u) => ({ valor: u.id, rotulo: u.nome })),
          ]}
        />
        <TextAreaField
          rotulo="Justificativa"
          value={justificativa}
          rows={3}
          erro={erros.justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}

/**
 * Equipe de uma unidade para o master transferir contas (spec 019). Mostra só contas de equipe;
 * o sucesso só aparece depois da resposta do servidor.
 */
export function TransferirConta({
  unidade,
  membros,
  destinos,
  transferir,
  bloqueio,
}: {
  unidade: Unidade;
  membros: MembroDaUnidade[];
  /** Todas as unidades; entram no destino só as ativas e diferentes da origem. */
  destinos: Unidade[];
  transferir: AcoesDeTransferencia['transferir'];
  bloqueio?: string;
}) {
  const [alvo, setAlvo] = useState<MembroDaUnidade | null>(null);
  const [aviso, setAviso] = useState(false);
  const possiveis = destinos.filter((u) => u.ativa && u.id !== unidade.id);

  return (
    <div className="flex flex-col gap-3">
      {aviso && <Alert tom="sucesso" titulo={AVISO_TRANSFERIDA} anunciar />}
      {membros.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma conta de equipe nesta unidade.</p>
      ) : (
        <ul aria-label={`Equipe de ${unidade.nome}`} className="flex flex-col gap-2">
          {membros.map((m) => (
            <li
              key={m.usuarioId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted p-2 text-sm"
            >
              <span className="min-w-0">
                <span className="font-semibold">{m.nome}</span> · {m.email}
                <span className="block text-xs text-text-secondary">
                  {m.funcoes.length > 0
                    ? m.funcoes.map((f) => ROTULO_FUNCAO[f]).join(', ')
                    : 'Sem funções'}
                  {' · '}
                  {ACESSO[m.situacaoAcesso]}
                  {!m.ativo && ' · Conta desativada'}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {!m.ativo && <StatusBadge estado="parcial" rotulo="Desativada" />}
                {m.ativo && (
                  <Button
                    variante="secundario"
                    icone="enviar"
                    disabled={Boolean(bloqueio) || possiveis.length === 0}
                    onClick={() => {
                      setAviso(false);
                      setAlvo(m);
                    }}
                  >
                    Transferir <span className="sr-only">{m.nome}</span>
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {alvo && (
        <DialogoDeTransferencia
          membro={alvo}
          origem={unidade}
          destinos={possiveis}
          transferir={transferir}
          onCancelar={() => setAlvo(null)}
          onConcluir={() => {
            setAlvo(null);
            setAviso(true);
          }}
        />
      )}
    </div>
  );
}
