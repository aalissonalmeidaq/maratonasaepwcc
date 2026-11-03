import { useState, type FormEvent } from 'react';
import { GrupoDeMarcacao, Marcacao } from '@/modules/atividades';
import { Alert, Button, RetornoEnvio, TextAreaField, TextField, useEnvio } from '@/shared/ui';
import type { EntradaComunicado, PublicoComunicado } from '../domain/tipos';
import {
  LIMITE_TEXTO,
  LIMITE_TITULO,
  validarComunicado,
  type ErrosComunicado,
} from '../domain/validacao';

const PUBLICOS: { valor: PublicoComunicado; rotulo: string }[] = [
  { valor: 'estudantes', rotulo: 'Estudantes' },
  { valor: 'equipe_docente', rotulo: 'Equipe docente' },
  { valor: 'todos', rotulo: 'Todos' },
];

const numero = (n: number) => n.toLocaleString('pt-BR');

/**
 * Escrita de um comunicado (US1). Docente e mentor recebem só as turmas em que atuam e escolhem ao
 * menos uma; a coordenação pode deixar sem turma (edição inteira). O servidor confere tudo de novo
 * e o sucesso só aparece depois da resposta (Constituição VII).
 */
export function FormComunicado({
  perfil,
  turmas,
  inicial,
  onSalvar,
  bloqueio,
}: {
  perfil: 'coordenacao' | 'docente';
  turmas: { id: string; nome: string }[];
  inicial?: EntradaComunicado;
  /** `publicar` falso guarda só o rascunho. */
  onSalvar: (entrada: EntradaComunicado, publicar: boolean) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [dados, setDados] = useState<EntradaComunicado>(
    inicial ?? {
      titulo: '',
      texto: '',
      publico: null,
      turmaIds: perfil === 'docente' && turmas.length === 1 ? [turmas[0]!.id] : [],
    },
  );
  const [erros, setErros] = useState<ErrosComunicado>({});
  const { estado, enviando, enviar } = useEnvio();

  async function salvar(publicar: boolean) {
    const validacao = validarComunicado(dados, perfil);
    setErros(validacao);
    if (Object.keys(validacao).length) return;
    await enviar(
      () =>
        onSalvar({ ...dados, titulo: dados.titulo.trim(), texto: dados.texto.trim() }, publicar),
      publicar ? 'Comunicado publicado.' : 'Rascunho guardado.',
    );
  }

  function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    void salvar(true);
  }

  const marcarTurma = (id: string, marcado: boolean) =>
    setDados((d) => ({
      ...d,
      turmaIds: marcado ? [...d.turmaIds, id] : d.turmaIds.filter((t) => t !== id),
    }));

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <TextField
        rotulo="Título"
        value={dados.titulo}
        onChange={(e) => setDados((d) => ({ ...d, titulo: e.target.value }))}
        erro={erros.titulo}
        maxLength={LIMITE_TITULO}
      />
      <TextAreaField
        rotulo="Texto"
        value={dados.texto}
        onChange={(e) => setDados((d) => ({ ...d, texto: e.target.value }))}
        erro={erros.texto}
        maxLength={LIMITE_TEXTO}
        rows={6}
        dica={`${numero(dados.texto.length)} de ${numero(LIMITE_TEXTO)} caracteres`}
      />
      <Alert tom="info" titulo="Não inclua dados pessoais de estudantes no texto.">
        Notas, ocorrências e contatos ficam nas telas próprias, com acesso restrito.
      </Alert>
      <GrupoDeMarcacao legenda="Público" erro={erros.publico}>
        {PUBLICOS.map((p) => (
          <label key={p.valor} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="publico"
              value={p.valor}
              checked={dados.publico === p.valor}
              onChange={() => setDados((d) => ({ ...d, publico: p.valor }))}
              className="size-5"
            />
            {p.rotulo}
          </label>
        ))}
      </GrupoDeMarcacao>
      <GrupoDeMarcacao legenda="Turmas" erro={erros.turmaIds}>
        {perfil === 'coordenacao' && (
          <p className="text-sm text-text-secondary">
            Sem turma marcada, vale para a edição inteira.
          </p>
        )}
        {turmas.map((t) => (
          <Marcacao
            key={t.id}
            rotulo={t.nome}
            marcado={dados.turmaIds.includes(t.id)}
            onAlterar={(v) => marcarTurma(t.id, v)}
          />
        ))}
      </GrupoDeMarcacao>
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" icone="enviar" carregando={enviando} disabled={Boolean(bloqueio)}>
          Publicar
        </Button>
        <Button
          variante="secundario"
          disabled={Boolean(bloqueio) || enviando}
          onClick={() => void salvar(false)}
        >
          Guardar rascunho
        </Button>
      </div>
    </form>
  );
}
