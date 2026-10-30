import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ROTULO_PAPEL, type Papel } from '@/modules/acesso';
import {
  Alert,
  Button,
  RetornoEnvio,
  SelectField,
  TextField,
  useEnvio,
  type NomeIcone,
} from '@/shared/ui';
import type { Curso, Pessoa, Turma } from '../domain/tipos';

function Rodape({
  bloqueio,
  estado,
  enviando,
  rotulo,
  icone,
  onCancelar,
}: {
  bloqueio?: string;
  estado: ReturnType<typeof useEnvio>['estado'];
  enviando: boolean;
  rotulo: string;
  icone?: NomeIcone;
  /** Presente na edição: sai sem gravar ("Cancelar") ou depois de gravar ("Concluir"). */
  onCancelar?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:col-span-full">
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" icone={icone} carregando={enviando} disabled={Boolean(bloqueio)}>
          {rotulo}
        </Button>
        {onCancelar && (
          <Button variante="secundario" onClick={onCancelar} disabled={enviando}>
            {estado.tipo === 'sucesso' ? 'Concluir' : 'Cancelar'}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Na edição, leva o foco ao primeiro campo assim que o formulário aparece. */
function useFocoNaEdicao<T extends HTMLElement>(editando: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (editando) ref.current?.focus();
  }, [editando]);
  return ref;
}

export function FormCurso({
  inicial,
  onSalvar,
  onCancelar,
  bloqueio,
}: {
  /** Curso em edição; sem ele, o formulário cadastra um novo. */
  inicial?: Curso;
  onSalvar: (d: { id?: string; nome: string; categoria: string }) => Promise<void>;
  onCancelar?: () => void;
  bloqueio?: string;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [categoria, setCategoria] = useState(inicial?.categoria ?? '');
  const primeiro = useFocoNaEdicao<HTMLInputElement>(Boolean(inicial));
  const [erro, setErro] = useState<{ nome?: string; categoria?: string }>({});
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const e = {
      ...(nome.trim().length < 2 && { nome: 'Informe o nome do curso.' }),
      ...(!categoria.trim() && { categoria: 'Informe a categoria do ranking.' }),
    };
    setErro(e);
    if (Object.keys(e).length) return;
    const dados = { nome: nome.trim(), categoria: categoria.trim() };
    if (inicial) {
      if (await enviar(() => onSalvar({ id: inicial.id, ...dados }), 'Curso atualizado.'))
        setNome(dados.nome);
      return;
    }
    if (await enviar(() => onSalvar(dados), 'Curso salvo.')) {
      setNome('');
      setCategoria('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <TextField
        ref={primeiro}
        rotulo="Nome do curso"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={erro.nome}
      />
      <TextField
        rotulo="Categoria do ranking"
        dica="Duplas só são comparadas dentro da mesma categoria."
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        erro={erro.categoria}
      />
      <Rodape
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo={inicial ? 'Salvar alterações' : 'Adicionar curso'}
        icone={inicial ? 'correta' : 'educacao'}
        onCancelar={inicial && onCancelar}
      />
    </form>
  );
}

export function FormTurma({
  cursos,
  inicial,
  onSalvar,
  onCancelar,
  bloqueio,
}: {
  cursos: Curso[];
  /** Turma em edição; sem ela, o formulário cadastra uma nova. */
  inicial?: Turma;
  onSalvar: (d: {
    id?: string;
    cursoId: string;
    nome: string;
    anoLetivo: number | null;
  }) => Promise<void>;
  onCancelar?: () => void;
  bloqueio?: string;
}) {
  const [cursoId, setCursoId] = useState(inicial?.cursoId ?? '');
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [ano, setAno] = useState(inicial?.anoLetivo ? String(inicial.anoLetivo) : '');
  const primeiro = useFocoNaEdicao<HTMLSelectElement>(Boolean(inicial));
  const [erro, setErro] = useState<{ cursoId?: string; nome?: string }>({});
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const e = {
      ...(!cursoId && { cursoId: 'Selecione o curso.' }),
      ...(!nome.trim() && { nome: 'Informe o nome da turma.' }),
    };
    setErro(e);
    if (Object.keys(e).length) return;
    const dados = { cursoId, nome: nome.trim(), anoLetivo: ano ? Number(ano) : null };
    if (inicial) {
      if (await enviar(() => onSalvar({ id: inicial.id, ...dados }), 'Turma atualizada.'))
        setNome(dados.nome);
      return;
    }
    if (await enviar(() => onSalvar(dados), 'Turma salva.')) setNome('');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-3">
      <SelectField
        ref={primeiro}
        rotulo="Curso"
        placeholder="Selecione"
        opcoes={cursos.map((c) => ({ valor: c.id, rotulo: c.nome }))}
        value={cursoId}
        onChange={(e) => setCursoId(e.target.value)}
        erro={erro.cursoId}
      />
      <TextField
        rotulo="Nome da turma"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={erro.nome}
      />
      <TextField
        rotulo="Ano letivo"
        type="number"
        min={2000}
        max={2100}
        value={ano}
        onChange={(e) => setAno(e.target.value)}
      />
      <Rodape
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo={inicial ? 'Salvar alterações' : 'Adicionar turma'}
        icone={inicial ? 'correta' : 'turma'}
        onCancelar={inicial && onCancelar}
      />
    </form>
  );
}

const PAPEIS_VINCULAVEIS: Papel[] = [
  'aluno',
  'docente',
  'mentor',
  'apoio',
  'analista',
  'coordenacao',
];
const EXIGE_TURMA: Papel[] = ['aluno', 'docente', 'mentor'];

export function FormVinculo({
  pessoas,
  turmas,
  onVincular,
  bloqueio,
}: {
  pessoas: Pessoa[];
  turmas: Turma[];
  onVincular: (d: { usuarioId: string; papel: Papel; turmaId: string | null }) => Promise<void>;
  bloqueio?: string;
}) {
  const [usuarioId, setUsuarioId] = useState('');
  const [papel, setPapel] = useState<Papel>('aluno');
  const [turmaId, setTurmaId] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();
  const precisaTurma = EXIGE_TURMA.includes(papel);

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const problema = !usuarioId
      ? 'Selecione a pessoa.'
      : precisaTurma && !turmaId
        ? 'Selecione a turma.'
        : null;
    setErro(problema);
    if (problema) return;
    await enviar(
      () =>
        onVincular({ usuarioId, papel, turmaId: papel === 'coordenacao' ? null : turmaId || null }),
      'Vínculo registrado.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-3">
      <SelectField
        rotulo="Pessoa"
        placeholder="Selecione"
        dica="Somente contas já existentes nesta edição. A criação de contas usa a função do servidor."
        opcoes={pessoas.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        value={usuarioId}
        onChange={(e) => setUsuarioId(e.target.value)}
      />
      <SelectField
        rotulo="Papel"
        opcoes={PAPEIS_VINCULAVEIS.map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] }))}
        value={papel}
        onChange={(e) => setPapel(e.target.value as Papel)}
      />
      <SelectField
        rotulo="Turma"
        placeholder={precisaTurma ? 'Selecione' : 'Sem turma'}
        opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
        value={turmaId}
        disabled={papel === 'coordenacao'}
        onChange={(e) => setTurmaId(e.target.value)}
      />
      {erro && <p className="text-sm font-medium text-error sm:col-span-full">{erro}</p>}
      <Rodape
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Registrar vínculo"
        icone="usuarios"
      />
    </form>
  );
}

type PapelDeConta = Exclude<Papel, 'coordenacao'>;
const PAPEIS_DE_CONTA: PapelDeConta[] = ['aluno', 'docente', 'mentor', 'apoio', 'analista'];

/** Criação de conta (US6). A senha provisória sai da tela assim que o servidor confirma. */
export function FormConta({
  turmas,
  onCriar,
  bloqueio,
}: {
  turmas: Turma[];
  onCriar: (d: {
    nome: string;
    email: string;
    senhaProvisoria: string;
    papel: PapelDeConta;
    turmaId: string | null;
  }) => Promise<void>;
  bloqueio?: string;
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<PapelDeConta>('aluno');
  const [turmaId, setTurmaId] = useState('');
  const [erros, setErros] = useState<Partial<Record<'nome' | 'email' | 'senha' | 'turma', string>>>(
    {},
  );
  const { estado, enviando, enviar } = useEnvio();
  const precisaTurma = EXIGE_TURMA.includes(papel);

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const e = {
      ...(nome.trim().length < 2 && { nome: 'Informe o nome.' }),
      ...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && {
        email: 'Informe um e-mail válido.',
      }),
      ...(senha.length < 10 && { senha: 'A senha provisória deve ter pelo menos 10 caracteres.' }),
      ...(precisaTurma && !turmaId && { turma: 'Selecione a turma.' }),
    };
    setErros(e);
    if (Object.keys(e).length) return;
    const ok = await enviar(
      () =>
        onCriar({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senhaProvisoria: senha,
          papel,
          turmaId: precisaTurma ? turmaId : null,
        }),
      'Conta criada. Entregue a senha provisória à pessoa por um canal definido pela unidade.',
    );
    setSenha('');
    if (ok) {
      setNome('');
      setEmail('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TextField
        rotulo="Nome completo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={erros.nome}
      />
      <TextField
        rotulo="E-mail"
        type="email"
        autoComplete="off"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={erros.email}
      />
      <TextField
        rotulo="Senha provisória"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={erros.senha}
        dica="Mínimo de 10 caracteres. A política de troca no primeiro acesso será definida pela unidade."
      />
      <SelectField
        rotulo="Papel"
        opcoes={PAPEIS_DE_CONTA.map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] }))}
        value={papel}
        onChange={(e) => setPapel(e.target.value as PapelDeConta)}
      />
      <SelectField
        rotulo="Turma"
        placeholder={precisaTurma ? 'Selecione' : 'Sem turma'}
        opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
        value={turmaId}
        disabled={!precisaTurma}
        onChange={(e) => setTurmaId(e.target.value)}
        erro={erros.turma}
      />
      <Rodape
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Criar conta"
        icone="editarUsuario"
      />
    </form>
  );
}
