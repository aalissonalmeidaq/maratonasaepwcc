import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { RodapeDoFormulario, SelectField, TextAreaField, TextField, useEnvio } from '@/shared/ui';
import { paraDataHoraLocal } from '../domain/datas';
import type { DadosDesafio, Desafio } from '../domain/tipos';

type Erros = Partial<Record<'titulo' | 'enunciado' | 'prazo' | 'turmas' | 'formas', string>>;

/** Grupo de caixas de marcação com legenda e erro associado. */
export function GrupoDeMarcacao({
  legenda,
  erro,
  children,
}: {
  legenda: string;
  erro?: string;
  children: ReactNode;
}) {
  const idErro = useId();
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={erro ? idErro : undefined}>
      <legend className="mb-1 text-sm font-semibold">{legenda}</legend>
      {children}
      {erro && (
        <p id={idErro} className="text-sm font-medium text-error">
          {erro}
        </p>
      )}
    </fieldset>
  );
}

export function Marcacao({
  rotulo,
  marcado,
  onAlterar,
}: {
  rotulo: string;
  marcado: boolean;
  onAlterar: (marcado: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onAlterar(e.target.checked)}
        className="size-5"
      />
      {rotulo}
    </label>
  );
}

/** Cadastro e edição do desafio do encontro pelo docente ou mentor da turma (FR-001). */
export function FormDesafio({
  encontros,
  turmas,
  inicial,
  onSalvar,
  bloqueio,
}: {
  encontros: { id: string; numero: number; titulo: string }[];
  turmas: { id: string; nome: string }[];
  inicial?: Desafio;
  onSalvar: (dados: DadosDesafio) => Promise<string>;
  bloqueio?: string;
}) {
  const [dados, setDados] = useState({
    encontroId: inicial?.encontroId ?? encontros[0]?.id ?? '',
    titulo: inicial?.titulo ?? '',
    enunciado: inicial?.enunciado ?? '',
    recursosPermitidos: inicial?.recursosPermitidos ?? '',
    politicaIa: inicial?.politicaIa ?? '',
    prazo: inicial ? paraDataHoraLocal(inicial.prazo) : '',
    aceitaArquivo: inicial?.aceitaArquivo ?? true,
    aceitaLink: inicial?.aceitaLink ?? true,
    turmas: inicial?.turmas ?? (turmas.length === 1 ? [turmas[0]!.id] : []),
  });
  const [erros, setErros] = useState<Erros>({});
  const { estado, enviando, enviar } = useEnvio();
  const texto =
    (campo: 'titulo' | 'enunciado' | 'recursosPermitidos' | 'politicaIa' | 'prazo') =>
    (e: { target: { value: string } }) =>
      setDados((d) => ({ ...d, [campo]: e.target.value }));

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const validacao: Erros = {};
    const titulo = dados.titulo.trim().length;
    if (titulo < 3 || titulo > 160) validacao.titulo = 'Informe um título de 3 a 160 caracteres.';
    if (!dados.enunciado.trim()) validacao.enunciado = 'Informe o enunciado.';
    if (!dados.prazo) validacao.prazo = 'Informe o prazo.';
    if (dados.turmas.length === 0) validacao.turmas = 'Escolha pelo menos uma turma.';
    if (!dados.aceitaArquivo && !dados.aceitaLink)
      validacao.formas = 'Aceite arquivo, link ou ambos.';
    setErros(validacao);
    if (Object.keys(validacao).length) return;
    await enviar(
      () =>
        onSalvar({
          ...(inicial ? { id: inicial.id } : {}),
          encontroId: dados.encontroId,
          titulo: dados.titulo.trim(),
          enunciado: dados.enunciado.trim(),
          recursosPermitidos: dados.recursosPermitidos.trim(),
          politicaIa: dados.politicaIa.trim(),
          prazo: new Date(dados.prazo).toISOString(),
          aceitaArquivo: dados.aceitaArquivo,
          aceitaLink: dados.aceitaLink,
          turmas: dados.turmas,
        }),
      'Desafio salvo como rascunho.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <SelectField
        rotulo="Encontro"
        value={dados.encontroId}
        onChange={(e) => setDados((d) => ({ ...d, encontroId: e.target.value }))}
        opcoes={encontros.map((e) => ({ valor: e.id, rotulo: `${e.numero}. ${e.titulo}` }))}
      />
      <TextField
        rotulo="Prazo"
        type="datetime-local"
        value={dados.prazo}
        onChange={texto('prazo')}
        erro={erros.prazo}
        dica="No horário deste aparelho; o servidor confere o prazo pelo próprio relógio."
      />
      <div className="sm:col-span-2">
        <TextField
          rotulo="Título"
          value={dados.titulo}
          onChange={texto('titulo')}
          erro={erros.titulo}
          maxLength={160}
        />
      </div>
      <div className="sm:col-span-2">
        <TextAreaField
          rotulo="Enunciado"
          value={dados.enunciado}
          onChange={texto('enunciado')}
          erro={erros.enunciado}
          maxLength={8000}
          rows={5}
        />
      </div>
      <TextAreaField
        rotulo="Recursos permitidos"
        value={dados.recursosPermitidos}
        onChange={texto('recursosPermitidos')}
        maxLength={2000}
      />
      <TextAreaField
        rotulo="Política de uso de IA"
        value={dados.politicaIa}
        onChange={texto('politicaIa')}
        maxLength={2000}
      />
      <GrupoDeMarcacao legenda="Formas de entrega" erro={erros.formas}>
        <Marcacao
          rotulo="Aceita arquivo"
          marcado={dados.aceitaArquivo}
          onAlterar={(v) => setDados((d) => ({ ...d, aceitaArquivo: v }))}
        />
        <Marcacao
          rotulo="Aceita link"
          marcado={dados.aceitaLink}
          onAlterar={(v) => setDados((d) => ({ ...d, aceitaLink: v }))}
        />
      </GrupoDeMarcacao>
      <GrupoDeMarcacao legenda="Turmas" erro={erros.turmas}>
        {turmas.map((t) => (
          <Marcacao
            key={t.id}
            rotulo={t.nome}
            marcado={dados.turmas.includes(t.id)}
            onAlterar={(v) =>
              setDados((d) => ({
                ...d,
                turmas: v ? [...d.turmas, t.id] : d.turmas.filter((x) => x !== t.id),
              }))
            }
          />
        ))}
      </GrupoDeMarcacao>
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Salvar rascunho"
        icone="salvar"
      />
    </form>
  );
}
