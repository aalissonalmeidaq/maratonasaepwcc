import { useState, type FormEvent } from 'react';
import {
  Button,
  RetornoEnvio,
  StatusBadge,
  TextField,
  useEnvio,
  useFocoNaEdicao,
} from '@/shared/ui';
import type { SituacaoDeAcesso } from '../domain/tipos';
import { ROTULO, venceEm } from './situacaoDeAcesso';

/** Situação do primeiro acesso, por texto (não só por cor). */
export function SituacaoDeAcessoBadge({ situacao }: { situacao: SituacaoDeAcesso | undefined }) {
  if (!situacao) return <span className="text-text-secondary">—</span>;
  if (situacao.acessoAtivo) return <StatusBadge estado="concluido" rotulo={ROTULO.ativo} />;
  return (
    <span className="flex flex-col items-start gap-1">
      <StatusBadge estado="pendente" rotulo={ROTULO.pendente} />
      <span className="text-xs text-text-secondary">{venceEm(situacao)}</span>
    </span>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reenviar convite e corrigir e-mail — somente para contas que ainda não fizeram o primeiro acesso. */
export function AcoesDeAcesso({
  situacao,
  nome,
  bloqueio,
  onReenviar,
}: {
  situacao: SituacaoDeAcesso | undefined;
  nome: string;
  bloqueio?: string;
  onReenviar: (novoEmail?: string) => Promise<{ conviteEnviado: boolean }>;
}) {
  const [corrigindo, setCorrigindo] = useState(false);
  const [email, setEmail] = useState(situacao?.email ?? '');
  const [erro, setErro] = useState<string>();
  const { estado, enviando, enviar } = useEnvio();
  const campo = useFocoNaEdicao<HTMLInputElement>(corrigindo);

  if (!situacao || situacao.acessoAtivo) return null;

  async function reenviar(novoEmail?: string) {
    const destino = novoEmail ?? situacao!.email;
    const ok = await enviar(
      () => onReenviar(novoEmail),
      ({ conviteEnviado }) =>
        conviteEnviado
          ? `Convite reenviado para ${destino}.`
          : { alerta: 'O convite não foi enviado. Tente novamente em instantes.' },
    );
    if (ok) setCorrigindo(false);
  }

  async function aoCorrigir(ev: FormEvent) {
    ev.preventDefault();
    const novo = email.trim().toLowerCase();
    if (!EMAIL.test(novo)) return setErro('Informe um e-mail válido.');
    setErro(undefined);
    await reenviar(novo);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-1">
        <Button
          variante="terciario"
          icone="enviar"
          aria-label={`Reenviar convite para ${nome}`}
          disabled={Boolean(bloqueio)}
          carregando={enviando && !corrigindo}
          onClick={() => void reenviar()}
        >
          Reenviar convite
        </Button>
        <Button
          variante="terciario"
          icone="editar"
          aria-label={`Corrigir e-mail de ${nome}`}
          disabled={Boolean(bloqueio)}
          aria-expanded={corrigindo}
          onClick={() => setCorrigindo((c) => !c)}
        >
          Corrigir e-mail
        </Button>
      </div>
      {corrigindo && (
        <form onSubmit={aoCorrigir} noValidate className="flex w-full max-w-sm flex-col gap-2">
          <TextField
            ref={campo}
            rotulo="Novo e-mail"
            aria-label={`Novo e-mail de ${nome}`}
            type="email"
            autoComplete="off"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            erro={erro}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" icone="enviar" carregando={enviando}>
              Salvar e reenviar
            </Button>
            <Button variante="secundario" onClick={() => setCorrigindo(false)} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      <RetornoEnvio estado={estado} />
    </div>
  );
}
