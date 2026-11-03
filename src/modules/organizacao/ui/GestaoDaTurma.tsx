import { useId, useState, type FormEvent } from 'react';
import type { LinhaDeImportacao } from '../domain/importacao';
import type { PessoaParaVincular } from '../domain/cadastro';
import type { ResultadoDaImportacao, SituacaoDeAcesso, Turma, Vinculo } from '../domain/tipos';
import { Button, Card, RetornoEnvio, SelectField, TextField, useEnvio } from '@/shared/ui';
import { SituacaoDeAcessoBadge } from './AcessoDaConta';
import { FormConta } from './Formularios';
import { ImportarAlunos } from './ImportarAlunos';

type PapelNaTurma = 'aluno' | 'docente';

function Lista({
  titulo,
  vinculos,
  acessos,
  podeGerir,
  onDesvincular,
  bloqueio,
}: {
  titulo: string;
  vinculos: Vinculo[];
  acessos: SituacaoDeAcesso[];
  podeGerir: boolean;
  onDesvincular: (vinculoId: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const id = useId();
  const { estado, enviando, enviar } = useEnvio();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="font-semibold">
        {titulo}
      </h3>
      {vinculos.length === 0 ? (
        <p className="text-sm text-text-secondary">Ninguém vinculado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vinculos.map((v) => (
            <li
              key={v.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{v.nome}</span>
                {v.derivado && <span className="text-sm text-text-secondary">pelo curso</span>}
                <SituacaoDeAcessoBadge
                  situacao={acessos.find((a) => a.usuarioId === v.usuarioId)}
                />
              </div>
              {podeGerir && !v.derivado && (
                <Button
                  variante="secundario"
                  icone="excluir"
                  disabled={Boolean(bloqueio) || enviando}
                  onClick={() =>
                    void enviar(() => onDesvincular(v.id), `${v.nome} desvinculado da turma.`)
                  }
                  aria-label={`Desvincular ${v.nome}`}
                >
                  Desvincular
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <RetornoEnvio estado={estado} />
    </section>
  );
}

function ResultadoDaBusca({
  pessoa,
  onVincular,
  bloqueio,
}: {
  pessoa: PessoaParaVincular;
  onVincular: (usuarioId: string, papel: PapelNaTurma) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [papel, setPapel] = useState<PapelNaTurma>('aluno');
  const { estado, enviando, enviar } = useEnvio();
  return (
    <li
      aria-label={pessoa.nome}
      className="flex flex-col gap-2 rounded-md border border-border p-3"
    >
      <span className="font-semibold">{pessoa.nome}</span>
      <div className="flex flex-wrap items-end gap-2">
        <SelectField
          rotulo={`Papel de ${pessoa.nome}`}
          opcoes={[
            { valor: 'aluno', rotulo: 'Aluno' },
            { valor: 'docente', rotulo: 'Docente' },
          ]}
          value={papel}
          onChange={(e) => setPapel(e.target.value as PapelNaTurma)}
        />
        <Button
          icone="adicionar"
          carregando={enviando}
          disabled={Boolean(bloqueio)}
          onClick={() =>
            void enviar(
              () => onVincular(pessoa.usuarioId, papel),
              `${pessoa.nome} vinculado à turma.`,
            )
          }
          aria-label={`Vincular ${pessoa.nome}`}
        >
          Vincular
        </Button>
      </div>
      <RetornoEnvio estado={estado} />
    </li>
  );
}

/**
 * Gestão de uma turma na edição (US3, FR-007): alunos, docentes e mentores (estes vindos do curso),
 * com a situação de acesso; só a coordenação vê as ações de gestão (o servidor confere de novo).
 */
export function GestaoDaTurma({
  turma,
  vinculos,
  acessos,
  podeGerir,
  onBuscar,
  onVincular,
  onDesvincular,
  onCriarConta,
  onImportar,
  bloqueio,
}: {
  turma: Turma;
  vinculos: Vinculo[];
  acessos: SituacaoDeAcesso[];
  podeGerir: boolean;
  onBuscar: (busca: string) => Promise<PessoaParaVincular[]>;
  onVincular: (usuarioId: string, papel: PapelNaTurma) => Promise<unknown>;
  onDesvincular: (vinculoId: string) => Promise<unknown>;
  onCriarConta: Parameters<typeof FormConta>[0]['onCriar'];
  onImportar: (turmaId: string, linhas: LinhaDeImportacao[]) => Promise<ResultadoDaImportacao>;
  bloqueio?: string;
}) {
  const daTurma = vinculos.filter((v) => v.ativo && v.turmaId === turma.id);
  const por = (papel: Vinculo['papel']) => daTurma.filter((v) => v.papel === papel);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<PessoaParaVincular[] | null>(null);
  const buscaEnvio = useEnvio();

  async function buscar(ev: FormEvent) {
    ev.preventDefault();
    await buscaEnvio.enviar(
      async () => {
        const r = await onBuscar(busca);
        setResultados(r);
        return r;
      },
      (r) =>
        r.length ? `${r.length} pessoa(s) encontrada(s).` : 'Ninguém encontrado com esse nome.',
    );
  }

  const listas = { acessos, podeGerir, onDesvincular, bloqueio };
  return (
    <div className="flex flex-col gap-6">
      <Lista titulo="Alunos" vinculos={por('aluno')} {...listas} />
      <Lista titulo="Docentes" vinculos={por('docente')} {...listas} />
      <Lista titulo="Mentores" vinculos={por('mentor')} {...listas} />
      {podeGerir && (
        <>
          <Card titulo="Vincular pessoa com conta" icone="usuarios" nivel={3}>
            <form onSubmit={buscar} className="flex flex-wrap items-end gap-2">
              <TextField
                rotulo="Buscar pessoa pelo nome"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Button
                type="submit"
                variante="secundario"
                icone="busca"
                carregando={buscaEnvio.enviando}
              >
                Buscar
              </Button>
            </form>
            <RetornoEnvio estado={buscaEnvio.estado} />
            {resultados && resultados.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {resultados.map((p) => (
                  <ResultadoDaBusca
                    key={p.usuarioId}
                    pessoa={p}
                    onVincular={onVincular}
                    bloqueio={bloqueio}
                  />
                ))}
              </ul>
            )}
          </Card>
          <Card titulo="Cadastrar aluno" icone="editarUsuario" nivel={3}>
            <FormConta
              turmas={[turma]}
              turmaInicial={turma.id}
              onCriar={onCriarConta}
              bloqueio={bloqueio}
            />
          </Card>
          <Card titulo="Importar alunos (CSV)" icone="importar" nivel={3}>
            <ImportarAlunos
              turmas={[turma]}
              turmaInicial={turma.id}
              onImportar={onImportar}
              bloqueio={bloqueio}
            />
          </Card>
        </>
      )}
    </div>
  );
}
