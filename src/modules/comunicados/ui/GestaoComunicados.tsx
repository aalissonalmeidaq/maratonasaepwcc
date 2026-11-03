import { useId, useRef, useState, type FormEvent } from 'react';
import { novaChaveDeEnvio } from '@/modules/atividades';
import { formatarDataHora } from '@/shared/lib/formatacao';
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  RetornoEnvio,
  SelectField,
  StatusBadge,
  TextAreaField,
  TextField,
  useEnvio,
  type EstadoVisual,
} from '@/shared/ui';
import type { ComunicadoGerido, EntradaComunicado, EstadoComunicado } from '../domain/tipos';
import { LIMITE_TEXTO, LIMITE_TITULO, validarComunicado } from '../domain/validacao';
import { FormComunicado } from './FormComunicado';
import { PAPEL_DO_AUTOR, descreverPublico } from './texto';

/** Operações de escrita, já ligadas ao repositório pela página. */
export interface AcoesComunicado {
  salvar: (chave: string, id: string | null, entrada: EntradaComunicado) => Promise<string>;
  publicar: (id: string) => Promise<unknown>;
  apagar: (id: string) => Promise<unknown>;
  corrigir: (id: string, titulo: string, texto: string, justificativa: string) => Promise<unknown>;
  retirar: (id: string, justificativa: string) => Promise<unknown>;
}

/** Mesma regra do servidor (`app.exigir_justificativa`). */
const MINIMO_JUSTIFICATIVA = 10;
const ERRO_JUSTIFICATIVA = 'Informe uma justificativa com pelo menos 10 caracteres.';

const ESTADO: Record<EstadoComunicado, { visual: EstadoVisual; rotulo: string }> = {
  rascunho: { visual: 'pendente', rotulo: 'Rascunho' },
  publicado: { visual: 'concluido', rotulo: 'Publicado' },
  retirado: { visual: 'nao_enviado', rotulo: 'Retirado' },
};

type Perfil = 'coordenacao' | 'docente';

/**
 * Comunicados que a pessoa gerencia (US1, US3): a coordenação vê todos da edição, docente e mentor
 * só os próprios. Escrever, publicar e apagar só valem depois da resposta do servidor.
 */
export function GestaoComunicados({
  comunicados,
  perfil,
  turmas,
  acoes,
  bloqueio,
}: {
  comunicados: ComunicadoGerido[];
  perfil: Perfil;
  turmas: { id: string; nome: string }[];
  acoes: AcoesComunicado;
  bloqueio?: string;
}) {
  const [filtro, setFiltro] = useState<EstadoComunicado | ''>('');
  const [editando, setEditando] = useState<ComunicadoGerido | 'novo' | null>(null);
  const visiveis = comunicados.filter((c) => !filtro || c.estado === filtro);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SelectField
          rotulo="Estado"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as EstadoComunicado | '')}
          placeholder="Todos os estados"
          opcoes={(Object.keys(ESTADO) as EstadoComunicado[]).map((e) => ({
            valor: e,
            rotulo: ESTADO[e].rotulo,
          }))}
        />
        <Button icone="adicionar" disabled={Boolean(bloqueio)} onClick={() => setEditando('novo')}>
          Novo comunicado
        </Button>
      </div>

      {editando && (
        <Editor
          key={editando === 'novo' ? 'novo' : editando.id}
          comunicado={editando === 'novo' ? null : editando}
          perfil={perfil}
          turmas={turmas}
          acoes={acoes}
          bloqueio={bloqueio}
          onFechar={() => setEditando(null)}
        />
      )}

      {visiveis.length === 0 ? (
        <EmptyState
          titulo={
            comunicados.length
              ? 'Nenhum comunicado neste estado.'
              : 'Nenhum comunicado escrito ainda.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((c) => (
            <li key={c.id}>
              <ItemGerido
                comunicado={c}
                acoes={acoes}
                bloqueio={bloqueio}
                onEditar={() => setEditando(c)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Formulário de um comunicado novo ou de um rascunho: a mesma chave e o id devolvido nos reenvios. */
function Editor({
  comunicado,
  perfil,
  turmas,
  acoes,
  bloqueio,
  onFechar,
}: {
  comunicado: ComunicadoGerido | null;
  perfil: Perfil;
  turmas: { id: string; nome: string }[];
  acoes: AcoesComunicado;
  bloqueio?: string;
  onFechar: () => void;
}) {
  const [chave] = useState(novaChaveDeEnvio);
  const id = useRef<string | null>(comunicado?.id ?? null);
  const tituloId = useId();

  async function salvar(entrada: EntradaComunicado, publicar: boolean) {
    id.current = await acoes.salvar(chave, id.current, entrada);
    if (publicar) await acoes.publicar(id.current);
  }

  return (
    <section
      aria-labelledby={tituloId}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <h3 id={tituloId} className="text-lg font-semibold">
        {comunicado ? 'Editar rascunho' : 'Novo comunicado'}
      </h3>
      <FormComunicado
        perfil={perfil}
        turmas={turmas}
        inicial={
          comunicado
            ? {
                titulo: comunicado.titulo,
                texto: comunicado.texto,
                publico: comunicado.publico,
                turmaIds: comunicado.turmas.map((t) => t.id),
              }
            : undefined
        }
        onSalvar={salvar}
        bloqueio={bloqueio}
      />
      <div>
        <Button variante="secundario" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </section>
  );
}

function ItemGerido({
  comunicado: c,
  acoes,
  bloqueio,
  onEditar,
}: {
  comunicado: ComunicadoGerido;
  acoes: AcoesComunicado;
  bloqueio?: string;
  onEditar: () => void;
}) {
  const tituloId = useId();
  const { estado, enviando, enviar } = useEnvio();
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [modo, setModo] = useState<'corrigir' | 'retirar' | null>(null);
  const [erroApagar, setErroApagar] = useState<string>();
  const desabilitado = Boolean(bloqueio) || enviando;

  async function apagar() {
    try {
      await acoes.apagar(c.id);
      setConfirmarApagar(false);
    } catch (e) {
      setErroApagar(e instanceof Error ? e.message : 'Não foi possível apagar.');
    }
  }

  return (
    <article
      aria-labelledby={tituloId}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={tituloId} className="font-semibold">
          {c.titulo}
        </h3>
        <StatusBadge estado={ESTADO[c.estado].visual} rotulo={ESTADO[c.estado].rotulo} />
      </div>
      <p className="text-sm text-text-secondary">
        {c.autor.nome} ({PAPEL_DO_AUTOR[c.autor.papel]})
        {c.publicadoEm && ` · publicado em ${formatarDataHora(c.publicadoEm)}`}
        {c.corrigidoEm && ` · atualizado em ${formatarDataHora(c.corrigidoEm)}`}
      </p>
      <p className="text-sm">{descreverPublico(c)}</p>
      <p className="text-sm whitespace-pre-line">{c.texto}</p>
      {c.estado === 'retirado' && c.justificativaRetirada && (
        <p className="text-sm">
          <span className="font-semibold">Motivo da retirada:</span> {c.justificativaRetirada}
        </p>
      )}
      <RetornoEnvio estado={estado} />
      {c.podeEditar && c.estado === 'rascunho' && (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={desabilitado}
            carregando={enviando}
            aria-label={`Publicar: ${c.titulo}`}
            onClick={() => void enviar(() => acoes.publicar(c.id), 'Comunicado publicado.')}
          >
            Publicar
          </Button>
          <Button
            variante="secundario"
            disabled={desabilitado}
            aria-label={`Editar: ${c.titulo}`}
            onClick={onEditar}
          >
            Editar
          </Button>
          <Button
            variante="secundario"
            disabled={desabilitado}
            aria-label={`Apagar: ${c.titulo}`}
            onClick={() => setConfirmarApagar(true)}
          >
            Apagar
          </Button>
        </div>
      )}
      {c.podeEditar && c.estado === 'publicado' && (
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secundario"
            disabled={Boolean(bloqueio)}
            aria-label={`Corrigir: ${c.titulo}`}
            aria-expanded={modo === 'corrigir'}
            onClick={() => setModo(modo === 'corrigir' ? null : 'corrigir')}
          >
            Corrigir
          </Button>
          <Button
            variante="secundario"
            disabled={Boolean(bloqueio)}
            aria-label={`Retirar: ${c.titulo}`}
            aria-expanded={modo === 'retirar'}
            onClick={() => setModo(modo === 'retirar' ? null : 'retirar')}
          >
            Retirar
          </Button>
        </div>
      )}
      {modo === 'corrigir' && <FormCorrecao comunicado={c} acoes={acoes} bloqueio={bloqueio} />}
      {modo === 'retirar' && (
        <FormRetirada
          bloqueio={bloqueio}
          enviando={enviando}
          onRetirar={async (justificativa) => {
            if (await enviar(() => acoes.retirar(c.id, justificativa), 'Comunicado retirado.')) {
              setModo(null);
            }
          }}
        />
      )}
      <ConfirmDialog
        aberto={confirmarApagar}
        titulo="Apagar este rascunho?"
        descricao="O rascunho some e não pode ser recuperado. Comunicados publicados não podem ser apagados."
        rotuloConfirmar="Apagar rascunho"
        destrutivo
        erro={erroApagar}
        onConfirmar={() => void apagar()}
        onCancelar={() => setConfirmarApagar(false)}
      />
    </article>
  );
}

/** Correção de um publicado (US3): título e texto, com justificativa; o público não muda. */
function FormCorrecao({
  comunicado: c,
  acoes,
  bloqueio,
}: {
  comunicado: ComunicadoGerido;
  acoes: AcoesComunicado;
  bloqueio?: string;
}) {
  const [titulo, setTitulo] = useState(c.titulo);
  const [texto, setTexto] = useState(c.texto);
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState<{ titulo?: string; texto?: string; justificativa?: string }>(
    {},
  );
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const campos = validarComunicado(
      { titulo, texto, publico: c.publico, turmaIds: c.turmas.map((t) => t.id) },
      'coordenacao',
    );
    const validacao = {
      titulo: campos.titulo,
      texto: campos.texto,
      justificativa:
        justificativa.trim().length < MINIMO_JUSTIFICATIVA ? ERRO_JUSTIFICATIVA : undefined,
    };
    setErros(validacao);
    if (Object.values(validacao).some(Boolean)) return;
    await enviar(
      () => acoes.corrigir(c.id, titulo.trim(), texto.trim(), justificativa.trim()),
      'Comunicado corrigido; o público foi avisado de novo.',
    );
  }

  return (
    <form
      onSubmit={aoEnviar}
      noValidate
      className="flex flex-col gap-3 border-t border-border pt-3"
    >
      <TextField
        rotulo="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        erro={erros.titulo}
        maxLength={LIMITE_TITULO}
      />
      <TextAreaField
        rotulo="Texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        erro={erros.texto}
        maxLength={LIMITE_TEXTO}
        rows={5}
      />
      <TextAreaField
        rotulo="Justificativa"
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        erro={erros.justificativa}
        dica="Fica na auditoria. O público recebe o aviso “Comunicado atualizado”."
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <div>
        <Button type="submit" carregando={enviando} disabled={Boolean(bloqueio)}>
          Salvar correção
        </Button>
      </div>
    </form>
  );
}

/**
 * Retirada de um publicado (US3): some para o público e fica na gestão com a justificativa. O
 * retorno do servidor aparece no item, que continua na lista como "Retirado".
 */
function FormRetirada({
  bloqueio,
  enviando,
  onRetirar,
}: {
  bloqueio?: string;
  enviando: boolean;
  onRetirar: (justificativa: string) => Promise<void>;
}) {
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string>();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const invalida = justificativa.trim().length < MINIMO_JUSTIFICATIVA;
    setErro(invalida ? ERRO_JUSTIFICATIVA : undefined);
    if (!invalida) await onRetirar(justificativa.trim());
  }

  return (
    <form
      onSubmit={aoEnviar}
      noValidate
      className="flex flex-col gap-3 border-t border-border pt-3"
    >
      <TextAreaField
        rotulo="Justificativa da retirada"
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        erro={erro}
        dica="O comunicado deixa de aparecer para o público; nenhum aviso é enviado."
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <div>
        <Button
          type="submit"
          variante="destrutivo"
          carregando={enviando}
          disabled={Boolean(bloqueio)}
        >
          Confirmar retirada
        </Button>
      </div>
    </form>
  );
}
