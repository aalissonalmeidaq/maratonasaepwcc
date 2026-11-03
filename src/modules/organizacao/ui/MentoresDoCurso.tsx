import { useState, type FormEvent } from 'react';
import { Button, Card, RetornoEnvio, TextField, useEnvio } from '@/shared/ui';
import type { PessoaParaVincular } from '../domain/cadastro';
import type { Curso, Turma, Vinculo } from '../domain/tipos';

function MentoresDeUmCurso({
  curso,
  mentores,
  onBuscar,
  onVincular,
  onDesvincular,
  bloqueio,
}: {
  curso: Curso;
  mentores: Vinculo[];
  onBuscar: (busca: string) => Promise<PessoaParaVincular[]>;
  onVincular: (cursoId: string, usuarioId: string) => Promise<unknown>;
  onDesvincular: (cursoId: string, usuarioId: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<PessoaParaVincular[]>([]);
  const envio = useEnvio();

  async function buscar(ev: FormEvent) {
    ev.preventDefault();
    try {
      setResultados(await onBuscar(busca));
    } catch {
      setResultados([]);
    }
  }

  return (
    <Card titulo={curso.nome} icone="educacao" nivel={3}>
      <p className="mb-3 text-sm text-text-secondary">
        O mentor atua em todas as turmas deste curso nesta edição.
      </p>
      {mentores.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum mentor vinculado.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-2">
          {mentores.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{m.nome}</span>
              <Button
                variante="secundario"
                icone="excluir"
                disabled={Boolean(bloqueio) || envio.enviando}
                onClick={() =>
                  void envio.enviar(
                    () => onDesvincular(curso.id, m.usuarioId),
                    `${m.nome} desvinculado do curso.`,
                  )
                }
                aria-label={`Desvincular ${m.nome} do curso`}
              >
                Desvincular
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={buscar} className="flex flex-wrap items-end gap-2">
        <TextField
          rotulo="Buscar mentor pelo nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Button type="submit" variante="secundario" icone="busca">
          Buscar
        </Button>
      </form>
      {resultados.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {resultados.map((p) => (
            <li key={p.usuarioId} className="flex flex-wrap items-center justify-between gap-2">
              <span>{p.nome}</span>
              <Button
                icone="adicionar"
                disabled={Boolean(bloqueio) || envio.enviando}
                onClick={() =>
                  void envio.enviar(
                    () => onVincular(curso.id, p.usuarioId),
                    `${p.nome} vinculado ao curso.`,
                  )
                }
                aria-label={`Vincular ${p.nome} ao curso`}
              >
                Vincular
              </Button>
            </li>
          ))}
        </ul>
      )}
      <RetornoEnvio estado={envio.estado} />
    </Card>
  );
}

/** Mentores por curso na edição (US4, FR-008); só cursos com turma vinculada aparecem. */
export function MentoresDoCurso({
  cursos,
  turmas,
  vinculos,
  ...acoes
}: {
  cursos: Curso[];
  turmas: Turma[];
  vinculos: Vinculo[];
  onBuscar: (busca: string) => Promise<PessoaParaVincular[]>;
  onVincular: (cursoId: string, usuarioId: string) => Promise<unknown>;
  onDesvincular: (cursoId: string, usuarioId: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const presentes = cursos.filter((c) => turmas.some((t) => t.cursoId === c.id));
  if (presentes.length === 0)
    return (
      <p className="text-sm text-text-secondary">
        Vincule turmas para depois vincular mentores aos cursos.
      </p>
    );
  return (
    <div className="grid gap-4">
      {presentes.map((c) => (
        <MentoresDeUmCurso
          key={c.id}
          curso={c}
          mentores={vinculos.filter((v) => v.papel === 'mentor' && v.ativo && v.cursoId === c.id)}
          {...acoes}
        />
      ))}
    </div>
  );
}
