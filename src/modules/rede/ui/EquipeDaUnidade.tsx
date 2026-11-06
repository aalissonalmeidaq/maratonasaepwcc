import { useId, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  PageHeader,
  RetornoEnvio,
  SelectField,
  StatusBadge,
  TextAreaField,
  TextField,
  useEnvio,
} from '@/shared/ui';
import {
  FUNCOES_DA_EQUIPE,
  ROTULO_FUNCAO,
  type FuncaoDaConta,
  type FuncaoDaEquipe,
  type MembroDaUnidade,
} from '../domain/tipos';
import { validarCadastroDePessoa, validarJustificativa } from '../domain/validacao';
import { DialogoDeJustificativa } from './DialogoDeJustificativa';

/** Operações de escrita, já ligadas ao repositório pela página. */
export interface AcoesDaEquipe {
  cadastrar: (dados: {
    nome: string;
    email: string;
    funcoes: FuncaoDaEquipe[];
  }) => Promise<{ conviteEnviado: boolean }>;
  definirFuncoes: (
    usuarioId: string,
    funcoes: FuncaoDaEquipe[],
    justificativa: string,
  ) => Promise<void>;
  desativar: (usuarioId: string, justificativa: string) => Promise<void>;
  reativar: (usuarioId: string) => Promise<void>;
  reenviarConvite: (usuarioId: string) => Promise<{ conviteEnviado: boolean }>;
}

const MENSAGEM_SEM_CONVITE = 'o convite não saiu. A conta existe: use "Reenviar convite" na lista.';
const ACESSO = { ativo: 'Acesso ativo', aguardando: 'Convite pendente' } as const;

/** Caixas de seleção das funções da equipe (a gestão só o master concede). */
function SeletorDeFuncoes({
  legenda,
  valor,
  erro,
  onAlterar,
}: {
  legenda: string;
  valor: readonly FuncaoDaEquipe[];
  erro?: string;
  onAlterar: (funcoes: FuncaoDaEquipe[]) => void;
}) {
  const idErro = useId();
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={erro ? idErro : undefined}>
      <legend className="mb-1 text-sm font-semibold">{legenda}</legend>
      <div className="flex flex-wrap gap-x-5">
        {FUNCOES_DA_EQUIPE.map((f) => (
          <label key={f} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="size-5"
              checked={valor.includes(f)}
              onChange={(e) =>
                onAlterar(e.target.checked ? [...valor, f] : valor.filter((x) => x !== f))
              }
            />
            {ROTULO_FUNCAO[f]}
          </label>
        ))}
      </div>
      {erro && (
        <p id={idErro} className="text-sm font-medium text-error">
          {erro}
        </p>
      )}
    </fieldset>
  );
}

function FormCadastroDePessoa({ acoes, bloqueio }: { acoes: AcoesDaEquipe; bloqueio?: string }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [funcoes, setFuncoes] = useState<FuncaoDaEquipe[]>([]);
  const [erros, setErros] = useState<{ nome?: string; email?: string; funcoes?: string }>({});
  const { estado, enviando, enviar, limpar } = useEnvio();

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    limpar();
    const encontrados = validarCadastroDePessoa({ nome, email, funcoes });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    const enderecoNormalizado = email.trim().toLowerCase();
    const ok = await enviar(
      () => acoes.cadastrar({ nome: nome.trim(), email: enderecoNormalizado, funcoes }),
      (r) =>
        r.conviteEnviado
          ? `Convite enviado para ${enderecoNormalizado}.`
          : { alerta: `Conta criada, mas ${MENSAGEM_SEM_CONVITE}` },
    );
    if (ok) {
      setNome('');
      setEmail('');
      setFuncoes([]);
    }
  }

  return (
    <Card titulo="Cadastrar pessoa" nivel={2} icone="usuarios">
      <form noValidate onSubmit={aoEnviar} className="grid gap-4 sm:grid-cols-2">
        <TextField
          rotulo="Nome"
          value={nome}
          autoComplete="off"
          erro={erros.nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <TextField
          rotulo="E-mail"
          type="email"
          value={email}
          autoComplete="off"
          erro={erros.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="sm:col-span-2">
          <SeletorDeFuncoes
            legenda="Funções na unidade"
            valor={funcoes}
            erro={erros.funcoes}
            onAlterar={setFuncoes}
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
              Cadastrar pessoa
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

function LinhaDaEquipe({
  membro: m,
  eu,
  acoes,
  bloqueio,
}: {
  membro: MembroDaUnidade;
  eu: boolean;
  acoes: AcoesDaEquipe;
  bloqueio?: string;
}) {
  const ehGestao = m.funcoes.includes('gestao');
  const [editando, setEditando] = useState(false);
  const [funcoes, setFuncoes] = useState<FuncaoDaEquipe[]>(
    m.funcoes.filter((f): f is FuncaoDaEquipe => f !== 'gestao'),
  );
  const [justificativa, setJustificativa] = useState('');
  const [erroJustificativa, setErroJustificativa] = useState<string>();
  const [erroFuncoes, setErroFuncoes] = useState<string>();
  const [desativando, setDesativando] = useState(false);
  const { estado, enviando, enviar, limpar } = useEnvio();
  const desabilitado = Boolean(bloqueio) || enviando;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const invalida = validarJustificativa(justificativa);
    setErroJustificativa(invalida);
    setErroFuncoes(funcoes.length === 0 ? 'Escolha ao menos uma função.' : undefined);
    if (invalida || funcoes.length === 0) return;
    const ok = await enviar(
      () => acoes.definirFuncoes(m.usuarioId, funcoes, justificativa.trim()),
      'Funções atualizadas.',
    );
    if (ok) {
      setEditando(false);
      setJustificativa('');
    }
  }

  return (
    <li
      aria-label={m.nome}
      className="rounded-lg border border-border bg-surface p-3 text-sm shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="font-semibold">{m.nome}</span>
          {eu && <span> (você)</span>} · {m.email}
          <span className="block text-xs text-text-secondary">{ACESSO[m.situacaoAcesso]}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {m.funcoes.map((f: FuncaoDaConta) => (
            <StatusBadge key={f} estado="agendado" rotulo={ROTULO_FUNCAO[f]} />
          ))}
          {!m.ativo && <StatusBadge estado="parcial" rotulo="Desativada" />}
        </span>
      </div>

      {ehGestao ? (
        <p className="mt-2 text-xs text-text-secondary">Conta de gestão: só o master altera.</p>
      ) : eu ? null : (
        <>
          {editando && (
            <form
              noValidate
              onSubmit={salvar}
              className="mt-3 flex flex-col gap-3 border-t border-border pt-3"
            >
              <SeletorDeFuncoes
                legenda={`Funções de ${m.nome}`}
                valor={funcoes}
                erro={erroFuncoes}
                onAlterar={setFuncoes}
              />
              <TextAreaField
                rotulo="Justificativa"
                rows={2}
                value={justificativa}
                erro={erroJustificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" carregando={enviando} disabled={Boolean(bloqueio)}>
                  Salvar funções
                </Button>
                <Button variante="secundario" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
          <RetornoEnvio estado={estado} />
          <div className="mt-3 flex flex-wrap gap-2">
            {m.ativo ? (
              <>
                <Button
                  variante="secundario"
                  icone="editar"
                  disabled={desabilitado}
                  onClick={() => {
                    limpar();
                    setEditando(true);
                  }}
                >
                  Alterar funções <span className="sr-only">de {m.nome}</span>
                </Button>
                {m.situacaoAcesso === 'aguardando' && (
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
                <Button
                  variante="terciario"
                  disabled={desabilitado}
                  onClick={() => setDesativando(true)}
                >
                  Desativar <span className="sr-only">{m.nome}</span>
                </Button>
              </>
            ) : (
              <Button
                variante="secundario"
                disabled={desabilitado}
                onClick={() => void enviar(() => acoes.reativar(m.usuarioId), 'Conta reativada.')}
              >
                Reativar <span className="sr-only">{m.nome}</span>
              </Button>
            )}
          </div>
          <DialogoDeJustificativa
            aberto={desativando}
            titulo={`Desativar a conta de ${m.nome}?`}
            descricao="A pessoa perde o acesso e os vínculos em edições em andamento. Os dados ficam guardados."
            rotuloConfirmar="Desativar conta"
            onCancelar={() => setDesativando(false)}
            onConfirmar={async (j) => {
              await acoes.desativar(m.usuarioId, j);
              setDesativando(false);
            }}
          />
        </>
      )}
    </li>
  );
}

/** Equipe da unidade (spec 016, US2): contas com função, sem estudantes. */
export function EquipeDaUnidade({
  equipe,
  usuarioAtualId,
  acoes,
  bloqueio,
}: {
  equipe: MembroDaUnidade[];
  usuarioAtualId: string;
  acoes: AcoesDaEquipe;
  bloqueio?: string;
}) {
  const [busca, setBusca] = useState('');
  const [funcao, setFuncao] = useState<'todas' | FuncaoDaConta>('todas');
  const termo = busca.trim().toLowerCase();
  const visiveis = equipe.filter(
    (m) =>
      (funcao === 'todas' || m.funcoes.includes(funcao)) &&
      (termo === '' || m.nome.toLowerCase().includes(termo)),
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Equipe da unidade"
        icone="usuarios"
        descricao="Coordenação, docentes, mentores e analistas da unidade. Estudantes são cadastrados pela coordenação, na turma."
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <FormCadastroDePessoa acoes={acoes} bloqueio={bloqueio} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          rotulo="Buscar por nome"
          value={busca}
          autoComplete="off"
          onChange={(e) => setBusca(e.target.value)}
        />
        <SelectField
          rotulo="Função"
          value={funcao}
          onChange={(e) => setFuncao(e.target.value as 'todas' | FuncaoDaConta)}
          opcoes={[
            { valor: 'todas', rotulo: 'Todas' },
            ...(['gestao', ...FUNCOES_DA_EQUIPE] as FuncaoDaConta[]).map((f) => ({
              valor: f,
              rotulo: ROTULO_FUNCAO[f],
            })),
          ]}
        />
      </div>
      <p className="text-sm text-text-secondary" role="status">
        {visiveis.length} {visiveis.length === 1 ? 'pessoa' : 'pessoas'}
      </p>
      <ul aria-label="Equipe da unidade" className="flex flex-col gap-2">
        {visiveis.map((m) => (
          <LinhaDaEquipe
            key={m.usuarioId}
            membro={m}
            eu={m.usuarioId === usuarioAtualId}
            acoes={acoes}
            bloqueio={bloqueio}
          />
        ))}
      </ul>
    </div>
  );
}
