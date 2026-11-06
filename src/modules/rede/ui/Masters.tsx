import { useState } from 'react';
import { Alert, Button, Card, PageHeader, RetornoEnvio, StatusBadge, useEnvio } from '@/shared/ui';
import type { MasterDaRede } from '../domain/tipos';
import { DialogoDeJustificativa } from './DialogoDeJustificativa';
import { FormDeConta } from './FormDeConta';

/** Operações de escrita, já ligadas ao repositório pela página. */
export interface AcoesDeMasters {
  convidar: (conta: { nome: string; email: string }) => Promise<{ conviteEnviado: boolean }>;
  definirMaster: (usuarioId: string, ativo: boolean, justificativa: string | null) => Promise<void>;
  reenviarConvite: (usuarioId: string) => Promise<{ conviteEnviado: boolean }>;
}

const MENSAGEM_SEM_CONVITE = 'o convite não saiu. A conta existe: use "Reenviar convite" na lista.';
const ACESSO = { ativo: 'Acesso ativo', aguardando: 'Convite pendente' } as const;

/** Masters da rede (spec 016, FR-002): convidar, desativar e reativar; ninguém desativa a si mesmo. */
export function Masters({
  masters,
  usuarioAtualId,
  acoes,
  bloqueio,
}: {
  masters: MasterDaRede[];
  usuarioAtualId: string;
  acoes: AcoesDeMasters;
  bloqueio?: string;
}) {
  const { estado, enviando, enviar } = useEnvio();
  const [desativando, setDesativando] = useState<MasterDaRede | null>(null);
  const desabilitado = Boolean(bloqueio) || enviando;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Masters"
        icone="seguranca"
        descricao="Contas da rede: cadastram unidades e a gestão de cada uma. A rede mantém ao menos um master ativo."
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <Card titulo="Convidar master" nivel={2}>
        <FormDeConta
          rotuloEnviar="Convidar master"
          desabilitado={desabilitado}
          enviando={enviando}
          onEnviar={(conta) =>
            void enviar(
              () => acoes.convidar(conta),
              (r) =>
                r.conviteEnviado
                  ? `Convite enviado para ${conta.email}.`
                  : { alerta: `Conta criada, mas ${MENSAGEM_SEM_CONVITE}` },
            )
          }
        />
      </Card>
      <RetornoEnvio estado={estado} />
      <ul aria-label="Masters da rede" className="flex flex-col gap-2">
        {masters.map((m) => (
          <li
            key={m.usuarioId}
            aria-label={m.nome}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
          >
            <span className="min-w-0 text-sm">
              <span className="font-semibold">{m.nome}</span>
              {m.usuarioId === usuarioAtualId && <span> (você)</span>} · {m.email}
              <span className="block text-xs text-text-secondary">{ACESSO[m.situacaoAcesso]}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge
                estado={m.ativo ? 'concluido' : 'parcial'}
                rotulo={m.ativo ? 'Ativo' : 'Desativado'}
              />
              {m.situacaoAcesso === 'aguardando' && m.ativo && (
                <Button
                  variante="secundario"
                  icone="enviar"
                  disabled={desabilitado}
                  onClick={() =>
                    void enviar(
                      () => acoes.reenviarConvite(m.usuarioId),
                      (r) =>
                        r.conviteEnviado
                          ? `Convite reenviado para ${m.email}.`
                          : { alerta: `Convite não enviado: ${MENSAGEM_SEM_CONVITE}` },
                    )
                  }
                >
                  Reenviar convite <span className="sr-only">para {m.nome}</span>
                </Button>
              )}
              {m.ativo && m.usuarioId !== usuarioAtualId && (
                <Button
                  variante="terciario"
                  disabled={desabilitado}
                  onClick={() => setDesativando(m)}
                >
                  Desativar <span className="sr-only">{m.nome}</span>
                </Button>
              )}
              {!m.ativo && (
                <Button
                  variante="secundario"
                  disabled={desabilitado}
                  onClick={() =>
                    void enviar(
                      () => acoes.definirMaster(m.usuarioId, true, null),
                      'Master reativado.',
                    )
                  }
                >
                  Reativar <span className="sr-only">{m.nome}</span>
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <DialogoDeJustificativa
        aberto={desativando !== null}
        titulo={`Desativar ${desativando?.nome ?? ''}?`}
        descricao="A pessoa deixa de ser master e perde o acesso à rede."
        rotuloConfirmar="Desativar master"
        onCancelar={() => setDesativando(null)}
        onConfirmar={async (justificativa) => {
          if (!desativando) return;
          await acoes.definirMaster(desativando.usuarioId, false, justificativa);
          setDesativando(null);
        }}
      />
    </div>
  );
}
