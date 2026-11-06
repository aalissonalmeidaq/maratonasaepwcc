import { useRef, useState, type FormEvent } from 'react';
import { novaChaveDeEnvio } from '@/shared/lib/chave';
import { formatarDataHora } from '@/shared/lib/formatacao';
import {
  Alert,
  Button,
  Card,
  PageHeader,
  RetornoEnvio,
  StatusBadge,
  TextField,
  useEnvio,
} from '@/shared/ui';
import type { ContaDeGestao, Unidade } from '../domain/tipos';
import { validarCadastroDeUnidade, validarNomeDaUnidade } from '../domain/validacao';
import { DialogoDeJustificativa } from './DialogoDeJustificativa';
import { FormDeConta } from './FormDeConta';

/** Operações de escrita, já ligadas ao repositório pela página. */
export interface AcoesDeUnidades {
  /** `conviteEnviado`: `null` quando a unidade foi cadastrada sem conta de gestão. */
  cadastrar: (
    chave: string,
    dados: { nome: string; gestao: { nome: string; email: string } | null },
  ) => Promise<{ conviteEnviado: boolean | null }>;
  renomear: (id: string, nome: string) => Promise<void>;
  definirSituacao: (id: string, ativa: boolean, justificativa: string | null) => Promise<void>;
  acrescentarGestao: (
    unidadeId: string,
    conta: { nome: string; email: string },
  ) => Promise<{ conviteEnviado: boolean }>;
  definirGestao: (usuarioId: string, ativa: boolean, justificativa: string | null) => Promise<void>;
  reenviarConvite: (usuarioId: string) => Promise<{ conviteEnviado: boolean }>;
}

const MENSAGEM_SEM_CONVITE =
  'o convite não saiu. A conta existe: use "Reenviar convite" na lista da unidade.';

/** Cadastro de unidade (US1): nome e, opcionalmente, a primeira conta de gestão. */
function FormCadastroDeUnidade({ acoes, bloqueio }: { acoes: AcoesDeUnidades; bloqueio?: string }) {
  const [nome, setNome] = useState('');
  const [gestaoNome, setGestaoNome] = useState('');
  const [gestaoEmail, setGestaoEmail] = useState('');
  const [erros, setErros] = useState<{ nome?: string; gestaoNome?: string; gestaoEmail?: string }>(
    {},
  );
  // A mesma chave vale para repetições do envio: o servidor devolve a mesma unidade.
  const chave = useRef(novaChaveDeEnvio());
  const { estado, enviando, enviar, limpar } = useEnvio();

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    limpar();
    const encontrados = validarCadastroDeUnidade({ nome, gestaoNome, gestaoEmail });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    const email = gestaoEmail.trim().toLowerCase();
    const gestao = gestaoNome.trim() ? { nome: gestaoNome.trim(), email } : null;
    const ok = await enviar(
      () => acoes.cadastrar(chave.current, { nome: nome.trim(), gestao }),
      (r) => {
        if (r.conviteEnviado === null)
          return 'Unidade cadastrada. Ela está sem gestão: acrescente a conta de gestão na lista.';
        return r.conviteEnviado
          ? `Unidade cadastrada. Convite enviado para ${email}.`
          : { alerta: `Unidade cadastrada, mas ${MENSAGEM_SEM_CONVITE}` };
      },
    );
    if (ok) {
      chave.current = novaChaveDeEnvio();
      setNome('');
      setGestaoNome('');
      setGestaoEmail('');
    }
  }

  return (
    <Card titulo="Cadastrar unidade" nivel={2} icone="administracao">
      <form noValidate onSubmit={aoEnviar} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            rotulo="Nome da unidade"
            value={nome}
            erro={erros.nome}
            autoComplete="off"
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <TextField
          rotulo="Nome da pessoa da gestão"
          dica="Opcional: a unidade pode nascer sem gestão."
          value={gestaoNome}
          erro={erros.gestaoNome}
          autoComplete="off"
          onChange={(e) => setGestaoNome(e.target.value)}
        />
        <TextField
          rotulo="E-mail da gestão"
          type="email"
          value={gestaoEmail}
          erro={erros.gestaoEmail}
          autoComplete="off"
          onChange={(e) => setGestaoEmail(e.target.value)}
        />
        <div className="flex flex-col gap-3 sm:col-span-2">
          <RetornoEnvio estado={estado} />
          <div>
            <Button
              type="submit"
              icone="adicionar"
              carregando={enviando}
              disabled={Boolean(bloqueio)}
            >
              Cadastrar unidade
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

const ACESSO = { ativo: 'Acesso ativo', aguardando: 'Convite pendente' } as const;

function CartaoDaUnidade({
  unidade: u,
  acoes,
  bloqueio,
}: {
  unidade: Unidade;
  acoes: AcoesDeUnidades;
  bloqueio?: string;
}) {
  const [modo, setModo] = useState<'renomear' | 'gestao' | null>(null);
  const [novoNome, setNovoNome] = useState(u.nome);
  const [erroNome, setErroNome] = useState<string>();
  const [desativando, setDesativando] = useState(false);
  const [gestaoDesativando, setGestaoDesativando] = useState<ContaDeGestao | null>(null);
  const { estado, enviando, enviar, limpar } = useEnvio();
  const desabilitado = Boolean(bloqueio) || enviando;
  const semGestao = u.gestao.every((g) => !g.ativa);

  async function renomear(e: FormEvent) {
    e.preventDefault();
    const invalido = validarNomeDaUnidade(novoNome);
    setErroNome(invalido);
    if (invalido) return;
    if (await enviar(() => acoes.renomear(u.id, novoNome.trim()), 'Nome atualizado.'))
      setModo(null);
  }

  return (
    <article
      aria-labelledby={`un-${u.id}`}
      className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 id={`un-${u.id}`} className="min-w-0 font-display text-lg font-semibold text-text">
          {u.nome}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {semGestao && u.ativa && <StatusBadge estado="pendente" rotulo="Unidade sem gestão" />}
          <StatusBadge
            estado={u.ativa ? 'concluido' : 'parcial'}
            rotulo={u.ativa ? 'Ativa' : 'Desativada'}
          />
        </div>
      </header>
      {!u.ativa && (
        <p className="mb-3 text-sm text-text-secondary">
          Desativada{u.desativadaEm ? ` em ${formatarDataHora(u.desativadaEm)}` : ''}:{' '}
          {u.justificativaDesativacao}
        </p>
      )}

      <section aria-label={`Gestão de ${u.nome}`} className="mb-3">
        <h4 className="mb-1 text-sm font-semibold text-text">Contas de gestão</h4>
        {u.gestao.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhuma conta de gestão.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {u.gestao.map((g) => (
              <li
                key={g.usuarioId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted p-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-semibold">{g.nome}</span> · {g.email}
                  <span className="block text-xs text-text-secondary">
                    {ACESSO[g.situacaoAcesso]}
                    {!g.ativa && ' · Gestão desativada'}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {g.situacaoAcesso === 'aguardando' && g.ativa && (
                    <Button
                      variante="secundario"
                      icone="enviar"
                      disabled={desabilitado}
                      onClick={() =>
                        void enviar(
                          () => acoes.reenviarConvite(g.usuarioId),
                          (r) =>
                            r.conviteEnviado
                              ? `Convite reenviado para ${g.email}.`
                              : { alerta: `Convite não enviado: ${MENSAGEM_SEM_CONVITE}` },
                        )
                      }
                    >
                      Reenviar convite <span className="sr-only">para {g.nome}</span>
                    </Button>
                  )}
                  {g.ativa ? (
                    <Button
                      variante="terciario"
                      disabled={desabilitado}
                      onClick={() => setGestaoDesativando(g)}
                    >
                      Desativar gestão <span className="sr-only">de {g.nome}</span>
                    </Button>
                  ) : (
                    <Button
                      variante="secundario"
                      disabled={desabilitado}
                      onClick={() =>
                        void enviar(
                          () => acoes.definirGestao(g.usuarioId, true, null),
                          'Gestão reativada.',
                        )
                      }
                    >
                      Reativar gestão <span className="sr-only">de {g.nome}</span>
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modo === 'renomear' && (
        <form
          noValidate
          onSubmit={renomear}
          className="mb-3 flex flex-col gap-3 border-t border-border pt-3"
        >
          <TextField
            rotulo="Novo nome"
            value={novoNome}
            erro={erroNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" carregando={enviando} disabled={Boolean(bloqueio)}>
              Salvar nome
            </Button>
            <Button variante="secundario" onClick={() => setModo(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {modo === 'gestao' && (
        <div className="mb-3 border-t border-border pt-3">
          <FormDeConta
            rotuloEnviar="Criar conta de gestão"
            desabilitado={Boolean(bloqueio)}
            enviando={enviando}
            onCancelar={() => setModo(null)}
            onEnviar={async (conta) => {
              const ok = await enviar(
                () => acoes.acrescentarGestao(u.id, conta),
                (r) =>
                  r.conviteEnviado
                    ? `Conta criada. Convite enviado para ${conta.email}.`
                    : { alerta: `Conta criada, mas ${MENSAGEM_SEM_CONVITE}` },
              );
              if (ok) setModo(null);
            }}
          />
        </div>
      )}

      <RetornoEnvio estado={estado} />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variante="secundario"
          icone="editar"
          disabled={desabilitado}
          onClick={() => {
            limpar();
            setNovoNome(u.nome);
            setModo('renomear');
          }}
        >
          Renomear <span className="sr-only">{u.nome}</span>
        </Button>
        <Button
          variante="secundario"
          icone="adicionar"
          disabled={desabilitado}
          onClick={() => {
            limpar();
            setModo('gestao');
          }}
        >
          Acrescentar gestão <span className="sr-only">em {u.nome}</span>
        </Button>
        {u.ativa ? (
          <Button variante="terciario" disabled={desabilitado} onClick={() => setDesativando(true)}>
            Desativar unidade <span className="sr-only">{u.nome}</span>
          </Button>
        ) : (
          <Button
            variante="secundario"
            disabled={desabilitado}
            onClick={() =>
              void enviar(() => acoes.definirSituacao(u.id, true, null), 'Unidade reativada.')
            }
          >
            Reativar unidade <span className="sr-only">{u.nome}</span>
          </Button>
        )}
      </div>

      <DialogoDeJustificativa
        aberto={desativando}
        titulo={`Desativar ${u.nome}?`}
        descricao="Ninguém da unidade consegue usar o sistema até ela ser reativada. Os dados ficam guardados."
        rotuloConfirmar="Desativar unidade"
        onCancelar={() => setDesativando(false)}
        onConfirmar={async (justificativa) => {
          await acoes.definirSituacao(u.id, false, justificativa);
          setDesativando(false);
        }}
      />
      <DialogoDeJustificativa
        aberto={gestaoDesativando !== null}
        titulo={`Desativar a gestão de ${gestaoDesativando?.nome ?? ''}?`}
        descricao="A pessoa deixa de gerir a unidade e perde o acesso à gestão."
        rotuloConfirmar="Desativar gestão"
        onCancelar={() => setGestaoDesativando(null)}
        onConfirmar={async (justificativa) => {
          if (!gestaoDesativando) return;
          await acoes.definirGestao(gestaoDesativando.usuarioId, false, justificativa);
          setGestaoDesativando(null);
        }}
      />
    </article>
  );
}

/** Unidades da rede (spec 016, US1): cadastro, situação e contas de gestão. */
export function Unidades({
  unidades,
  acoes,
  bloqueio,
}: {
  unidades: Unidade[];
  acoes: AcoesDeUnidades;
  bloqueio?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Unidades"
        icone="administracao"
        descricao="Cada unidade tem a própria gestão, que cadastra a equipe e as edições. O master não vê dados de estudantes."
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <FormCadastroDeUnidade acoes={acoes} bloqueio={bloqueio} />
      <section aria-label="Lista de unidades" className="flex flex-col gap-4">
        {unidades.map((u) => (
          <CartaoDaUnidade key={u.id} unidade={u} acoes={acoes} bloqueio={bloqueio} />
        ))}
      </section>
    </div>
  );
}
