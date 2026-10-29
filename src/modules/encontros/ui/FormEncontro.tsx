import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  RetornoEnvio,
  SelectField,
  TextAreaField,
  TextField,
  useEnvio,
} from '@/shared/ui';
import {
  validarEncontro,
  type AvaliacaoObjetiva,
  type ErrosEncontro,
  type EstadoEncontro,
} from '../domain/encontro';
import type { Ambiente, DadosNovoEncontro, Encontro } from '../domain/tipos';

interface FormEncontroProps {
  quantidadeEncontros: number;
  numerosExistentes: number[];
  ambientes: Ambiente[];
  inicial?: Encontro;
  onSalvar: (dados: DadosNovoEncontro) => Promise<void>;
  bloqueio?: string;
}

const AVALIACOES = [
  { valor: 'questoes', rotulo: 'Questões preparatórias' },
  { valor: 'prova_oficial', rotulo: 'Prova oficial (registro)' },
];
const ESTADOS = [
  { valor: 'agendado', rotulo: 'Agendado' },
  { valor: 'realizado', rotulo: 'Realizado' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
];

/** Cadastro/edição de encontro (US4). Horário vazio = "a confirmar". */
export function FormEncontro({
  quantidadeEncontros,
  numerosExistentes,
  ambientes,
  inicial,
  onSalvar,
  bloqueio,
}: FormEncontroProps) {
  const proximo = Math.min(Math.max(0, ...numerosExistentes) + 1, quantidadeEncontros);
  const [dados, setDados] = useState({
    numero: String(inicial?.numero ?? proximo),
    titulo: inicial?.titulo ?? '',
    data: inicial?.data ?? '',
    inicio: inicial?.inicio ?? '',
    fim: inicial?.fim ?? '',
    ambienteId: inicial?.ambienteId ?? '',
    avaliacaoObjetiva: (inicial?.avaliacaoObjetiva ?? 'questoes') as AvaliacaoObjetiva,
    estado: (inicial?.estado ?? 'agendado') as EstadoEncontro,
    orientacoes: inicial?.orientacoes ?? '',
  });
  const [erros, setErros] = useState<ErrosEncontro>({});
  const { estado, enviando, enviar } = useEnvio();
  const alterar = (campo: keyof typeof dados) => (e: { target: { value: string } }) =>
    setDados((d) => ({ ...d, [campo]: e.target.value }));

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const numero = Number(dados.numero);
    const validacao = validarEncontro(
      { numero, titulo: dados.titulo, data: dados.data, inicio: dados.inicio, fim: dados.fim },
      { quantidadeEncontros, numerosExistentes, numeroAtual: inicial?.numero },
    );
    setErros(validacao);
    if (Object.keys(validacao).length) return;
    await enviar(
      () =>
        onSalvar({
          ...(inicial ? { id: inicial.id } : {}),
          numero,
          titulo: dados.titulo.trim(),
          data: dados.data,
          inicio: dados.inicio || null,
          fim: dados.fim || null,
          ambienteId: dados.ambienteId || null,
          avaliacaoObjetiva: dados.avaliacaoObjetiva,
          estado: dados.estado,
          orientacoes: dados.orientacoes.trim() || null,
        }),
      'Encontro salvo.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TextField
        rotulo="Número"
        type="number"
        min={1}
        max={quantidadeEncontros}
        value={dados.numero}
        onChange={alterar('numero')}
        erro={erros.numero}
        dica={`Edição configurada com ${quantidadeEncontros} encontros.`}
      />
      <div className="sm:col-span-1 lg:col-span-3">
        <TextField
          rotulo="Título"
          value={dados.titulo}
          onChange={alterar('titulo')}
          erro={erros.titulo}
          maxLength={160}
        />
      </div>
      <TextField
        rotulo="Data"
        type="date"
        value={dados.data}
        onChange={alterar('data')}
        erro={erros.data}
      />
      <TextField
        rotulo="Início"
        type="time"
        value={dados.inicio}
        onChange={alterar('inicio')}
        dica="Vazio = a confirmar"
      />
      <TextField
        rotulo="Término"
        type="time"
        value={dados.fim}
        onChange={alterar('fim')}
        erro={erros.fim}
      />
      <SelectField
        rotulo="Ambiente"
        placeholder="A confirmar"
        opcoes={ambientes.map((a) => ({ valor: a.id, rotulo: a.nome }))}
        value={dados.ambienteId}
        onChange={alterar('ambienteId')}
      />
      <SelectField
        rotulo="Avaliação objetiva"
        opcoes={AVALIACOES}
        value={dados.avaliacaoObjetiva}
        onChange={alterar('avaliacaoObjetiva')}
      />
      <SelectField
        rotulo="Situação"
        opcoes={ESTADOS}
        value={dados.estado}
        onChange={alterar('estado')}
      />
      <div className="sm:col-span-2">
        <TextAreaField
          rotulo="Orientações"
          value={dados.orientacoes}
          onChange={alterar('orientacoes')}
          maxLength={4000}
        />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-4">
        {bloqueio && <Alert tom="info" titulo={bloqueio} />}
        <RetornoEnvio estado={estado} />
        <Button
          type="submit"
          icone="encontros"
          carregando={enviando}
          disabled={Boolean(bloqueio)}
          className="sm:self-start"
        >
          Salvar encontro
        </Button>
      </div>
    </form>
  );
}
