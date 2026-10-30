import { useState, type FormEvent } from 'react';
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
}: {
  bloqueio?: string;
  estado: ReturnType<typeof useEnvio>['estado'];
  enviando: boolean;
  rotulo: string;
  icone?: NomeIcone;
}) {
  return (
    <div className="flex flex-col gap-3 sm:col-span-full">
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <Button
        type="submit"
        icone={icone}
        carregando={enviando}
        disabled={Boolean(bloqueio)}
        className="sm:self-start"
      >
        {rotulo}
      </Button>
    </div>
  );
}

export function FormCurso({
  onSalvar,
  bloqueio,
}: {
  onSalvar: (d: { nome: string; categoria: string }) => Promise<void>;
  bloqueio?: string;
}) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
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
    if (
      await enviar(
        () => onSalvar({ nome: nome.trim(), categoria: categoria.trim() }),
        'Curso salvo.',
      )
    ) {
      setNome('');
      setCategoria('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <TextField
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
        rotulo="Adicionar curso"
        icone="educacao"
      />
    </form>
  );
}

export function FormTurma({
  cursos,
  onSalvar,
  bloqueio,
}: {
  cursos: Curso[];
  onSalvar: (d: { cursoId: string; nome: string; anoLetivo: number | null }) => Promise<void>;
  bloqueio?: string;
}) {
  const [cursoId, setCursoId] = useState('');
  const [nome, setNome] = useState('');
  const [ano, setAno] = useState('');
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
    const anoLetivo = ano ? Number(ano) : null;
    if (await enviar(() => onSalvar({ cursoId, nome: nome.trim(), anoLetivo }), 'Turma salva.'))
      setNome('');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-3">
      <SelectField
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
        rotulo="Adicionar turma"
        icone="turma"
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
