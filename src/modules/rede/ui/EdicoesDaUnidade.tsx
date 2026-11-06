import { useRef, useState, type FormEvent } from 'react';
import { novaChaveDeEnvio } from '@/shared/lib/chave';
import { formatarData } from '@/shared/lib/formatacao';
import {
  Alert,
  Button,
  Card,
  PageHeader,
  RetornoEnvio,
  SelectField,
  StatusBadge,
  TextField,
  useEnvio,
  type EstadoVisual,
} from '@/shared/ui';
import type {
  DadosParaCriarEdicao,
  EdicaoDaUnidade,
  EstadoDaEdicao,
  MembroDaUnidade,
} from '../domain/tipos';
import { validarEdicaoDaUnidade } from '../domain/validacao';
import { DialogoDeJustificativa } from './DialogoDeJustificativa';

/** Operações de escrita, já ligadas ao repositório pela página. */
export interface AcoesDeEdicoes {
  criar: (dados: DadosParaCriarEdicao) => Promise<unknown>;
  definirCoordenacao: (
    edicaoId: string,
    usuarioId: string,
    ativa: boolean,
    justificativa: string | null,
  ) => Promise<void>;
}

const ESTADO: Record<EstadoDaEdicao, { visual: EstadoVisual; rotulo: string }> = {
  rascunho: { visual: 'pendente', rotulo: 'Em preparação' },
  ativa: { visual: 'concluido', rotulo: 'Ativa' },
  encerrada: { visual: 'parcial', rotulo: 'Encerrada' },
};

function periodo(e: EdicaoDaUnidade) {
  if (!e.inicio && !e.fim) return 'Período a definir';
  return `${e.inicio ? formatarData(e.inicio, { year: 'numeric' }) : '—'} a ${e.fim ? formatarData(e.fim, { year: 'numeric' }) : '—'}`;
}

/** Criação de edição pela gestão (FR-006): nasce em preparação, com a coordenação escolhida. */
function FormCriarEdicao({
  candidatas,
  acoes,
  bloqueio,
}: {
  candidatas: MembroDaUnidade[];
  acoes: AcoesDeEdicoes;
  bloqueio?: string;
}) {
  const [nome, setNome] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [coordenacaoId, setCoordenacaoId] = useState('');
  const [erros, setErros] = useState<{
    nome?: string;
    fim?: string;
    coordenacaoId?: string;
  }>({});
  // A mesma chave vale para repetições do envio: o servidor devolve a mesma edição.
  const chave = useRef(novaChaveDeEnvio());
  const { estado, enviando, enviar, limpar } = useEnvio();

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    limpar();
    const encontrados = validarEdicaoDaUnidade({ nome, inicio, fim, coordenacaoId });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    const ok = await enviar(
      () =>
        acoes.criar({
          chave: chave.current,
          nome: nome.trim(),
          inicio: inicio || null,
          fim: fim || null,
          coordenacaoId,
        }),
      'Edição criada em preparação.',
    );
    if (ok) {
      chave.current = novaChaveDeEnvio();
      setNome('');
      setInicio('');
      setFim('');
      setCoordenacaoId('');
    }
  }

  return (
    <Card titulo="Criar edição" nivel={2} icone="calendario">
      <form noValidate onSubmit={aoEnviar} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            rotulo="Nome da edição"
            value={nome}
            erro={erros.nome}
            autoComplete="off"
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <TextField
          rotulo="Início"
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
        />
        <TextField
          rotulo="Fim"
          type="date"
          value={fim}
          erro={erros.fim}
          onChange={(e) => setFim(e.target.value)}
        />
        <div className="sm:col-span-2">
          <SelectField
            rotulo="Coordenação da edição"
            dica="Só quem tem a função de coordenação na unidade."
            placeholder="Escolha…"
            value={coordenacaoId}
            erro={erros.coordenacaoId}
            onChange={(e) => setCoordenacaoId(e.target.value)}
            opcoes={candidatas.map((c) => ({ valor: c.usuarioId, rotulo: c.nome }))}
          />
        </div>
        <div className="flex flex-col gap-3 sm:col-span-2">
          <RetornoEnvio estado={estado} />
          <div>
            <Button
              type="submit"
              icone="adicionar"
              carregando={enviando}
              disabled={Boolean(bloqueio)}
            >
              Criar edição
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

function CartaoDaEdicao({
  edicao: e,
  candidatas,
  acoes,
  bloqueio,
}: {
  edicao: EdicaoDaUnidade;
  candidatas: MembroDaUnidade[];
  acoes: AcoesDeEdicoes;
  bloqueio?: string;
}) {
  const [acrescentando, setAcrescentando] = useState(false);
  const [novaId, setNovaId] = useState('');
  const [retirando, setRetirando] = useState<{ usuarioId: string; nome: string } | null>(null);
  const { estado, enviando, enviar, limpar } = useEnvio();
  const desabilitado = Boolean(bloqueio) || enviando;
  const ativas = e.coordenacao.filter((c) => c.ativa);
  const disponiveis = candidatas.filter((c) => !ativas.some((a) => a.usuarioId === c.usuarioId));
  const encerrada = e.estado === 'encerrada';

  async function acrescentar(ev: FormEvent) {
    ev.preventDefault();
    if (!novaId) return;
    const ok = await enviar(
      () => acoes.definirCoordenacao(e.id, novaId, true, null),
      'Coordenação acrescentada.',
    );
    if (ok) {
      setAcrescentando(false);
      setNovaId('');
    }
  }

  return (
    <article
      aria-labelledby={`ed-${e.id}`}
      className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`ed-${e.id}`} className="font-display text-lg font-semibold text-text">
            {e.nome}
          </h3>
          <p className="text-sm text-text-secondary">{periodo(e)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!encerrada && ativas.length === 0 && (
            <StatusBadge estado="em_atraso" rotulo="Edição sem coordenação ativa" />
          )}
          <StatusBadge estado={ESTADO[e.estado].visual} rotulo={ESTADO[e.estado].rotulo} />
        </div>
      </header>

      <section aria-label={`Coordenação de ${e.nome}`}>
        <h4 className="mb-1 text-sm font-semibold text-text">Coordenação</h4>
        {ativas.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhuma coordenação ativa.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {ativas.map((c) => (
              <li
                key={c.usuarioId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>{c.nome}</span>
                {!encerrada && (
                  <Button
                    variante="terciario"
                    disabled={desabilitado}
                    onClick={() => setRetirando({ usuarioId: c.usuarioId, nome: c.nome })}
                  >
                    Retirar <span className="sr-only">{c.nome} da coordenação</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {acrescentando && !encerrada && (
        <form
          noValidate
          onSubmit={acrescentar}
          className="mt-3 flex flex-col gap-3 border-t border-border pt-3"
        >
          <SelectField
            rotulo="Nova coordenação"
            placeholder="Escolha…"
            value={novaId}
            onChange={(ev) => setNovaId(ev.target.value)}
            opcoes={disponiveis.map((c) => ({ valor: c.usuarioId, rotulo: c.nome }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" carregando={enviando} disabled={Boolean(bloqueio) || !novaId}>
              Acrescentar
            </Button>
            <Button variante="secundario" onClick={() => setAcrescentando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <RetornoEnvio estado={estado} />

      {encerrada ? (
        <p className="mt-3 text-sm text-text-secondary">
          Edição encerrada: não muda de coordenação.
        </p>
      ) : (
        <div className="mt-3">
          <Button
            variante="secundario"
            icone="adicionar"
            disabled={desabilitado}
            onClick={() => {
              limpar();
              setAcrescentando(true);
            }}
          >
            Acrescentar coordenação <span className="sr-only">em {e.nome}</span>
          </Button>
        </div>
      )}

      <DialogoDeJustificativa
        aberto={retirando !== null}
        titulo={`Retirar ${retirando?.nome ?? ''} da coordenação?`}
        descricao="A pessoa deixa de coordenar esta edição. A edição precisa manter ao menos uma coordenação ativa."
        rotuloConfirmar="Retirar coordenação"
        onCancelar={() => setRetirando(null)}
        onConfirmar={async (justificativa) => {
          if (!retirando) return;
          await acoes.definirCoordenacao(e.id, retirando.usuarioId, false, justificativa);
          setRetirando(null);
        }}
      />
    </article>
  );
}

/** Edições da unidade (spec 016, FR-006 e FR-006c): criar e indicar ou trocar a coordenação. */
export function EdicoesDaUnidade({
  edicoes,
  candidatas,
  acoes,
  bloqueio,
}: {
  edicoes: EdicaoDaUnidade[];
  /** Contas com função de coordenação ativa na unidade. */
  candidatas: MembroDaUnidade[];
  acoes: AcoesDeEdicoes;
  bloqueio?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Edições"
        icone="calendario"
        descricao="Crie edições da unidade e indique quem coordena cada uma. A coordenação cuida de cursos, turmas, estudantes e do resultado."
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <FormCriarEdicao candidatas={candidatas} acoes={acoes} bloqueio={bloqueio} />
      <section aria-label="Lista de edições" className="flex flex-col gap-4">
        {edicoes.map((e) => (
          <CartaoDaEdicao
            key={e.id}
            edicao={e}
            candidatas={candidatas}
            acoes={acoes}
            bloqueio={bloqueio}
          />
        ))}
      </section>
    </div>
  );
}
