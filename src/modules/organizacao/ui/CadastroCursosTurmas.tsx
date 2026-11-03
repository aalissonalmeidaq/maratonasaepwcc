import { useState } from 'react';
import { Button, Card, ConfirmDialog } from '@/shared/ui';
import type { CursoDoCadastro, TurmaDoCadastro } from '../domain/cadastro';
import type { Curso, Turma } from '../domain/tipos';
import { FormCurso, FormTurma } from './Formularios';
import { rotuloDoEstado } from './textoDaEdicao';

/** O formulário de curso e turma trabalha com o formato da edição; o cadastro não tem edição. */
const comoCurso = (c: CursoDoCadastro): Curso => ({
  id: c.id,
  edicaoId: '',
  nome: c.nome,
  categoria: c.categoria,
});
const comoTurma = (t: TurmaDoCadastro, cursoId: string): Turma => ({
  id: t.id,
  cursoId,
  nome: t.nome,
  anoLetivo: t.anoLetivo,
});

/** Ao sair da edição, o foco volta ao "Editar" do item (o formulário de edição deixa de existir). */
function devolverFoco(id: string) {
  requestAnimationFrame(() => {
    const botoes = document.querySelectorAll<HTMLButtonElement>('[data-editar]');
    [...botoes]
      .find((botao) => botao.dataset.editar === id && botao.getClientRects().length > 0)
      ?.focus();
  });
}

function Apagar({
  rotulo,
  onApagar,
  bloqueio,
}: {
  rotulo: string;
  onApagar: () => Promise<unknown>;
  bloqueio?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  return (
    <>
      <Button
        variante="secundario"
        icone="excluir"
        disabled={Boolean(bloqueio)}
        onClick={() => setAberto(true)}
        aria-label={`Apagar ${rotulo}`}
      >
        Apagar
      </Button>
      <ConfirmDialog
        aberto={aberto}
        titulo={`Apagar ${rotulo}?`}
        descricao="O item sai do cadastro permanente. A operação fica registrada na auditoria."
        rotuloConfirmar="Apagar"
        destrutivo
        carregando={carregando}
        erro={erro}
        onConfirmar={async () => {
          setCarregando(true);
          setErro(undefined);
          try {
            await onApagar();
            setAberto(false);
          } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível apagar.');
          } finally {
            setCarregando(false);
          }
        }}
        onCancelar={() => setAberto(false)}
      />
    </>
  );
}

/**
 * Cadastro permanente de cursos e turmas (US2, FR-004). Itens que participam ou participaram de
 * alguma edição não têm o botão de apagar; o servidor recusa de qualquer forma.
 */
export function CadastroCursosTurmas({
  cadastro,
  onSalvarCurso,
  onSalvarTurma,
  onApagar,
  bloqueio,
}: {
  cadastro: CursoDoCadastro[];
  onSalvarCurso: (id: string | null, nome: string, categoria: string) => Promise<unknown>;
  onSalvarTurma: (
    id: string | null,
    cursoId: string,
    nome: string,
    anoLetivo: number | null,
  ) => Promise<unknown>;
  onApagar: (tipo: 'curso' | 'turma', id: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [cursoEmEdicao, setCursoEmEdicao] = useState<CursoDoCadastro | null>(null);
  const [turmaEmEdicao, setTurmaEmEdicao] = useState<{
    turma: TurmaDoCadastro;
    cursoId: string;
  } | null>(null);

  return (
    <div className="grid gap-6">
      {cadastro.map((c) => (
        <Card key={c.id} titulo={c.nome} icone="educacao" nivel={3}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-text-secondary">
                Categoria do ranking: <span className="font-semibold text-text">{c.categoria}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variante="secundario"
                  icone="editar"
                  data-editar={c.id}
                  onClick={() => setCursoEmEdicao(c)}
                  aria-label={`Editar o curso ${c.nome}`}
                >
                  Editar
                </Button>
                {c.turmas.length === 0 && (
                  <Apagar
                    rotulo={`o curso ${c.nome}`}
                    bloqueio={bloqueio}
                    onApagar={() => onApagar('curso', c.id)}
                  />
                )}
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {c.turmas.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">
                      {t.nome}
                      {t.anoLetivo ? ` · ${t.anoLetivo}` : ''}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {t.edicoes.length
                        ? t.edicoes.map((e) => `${e.nome} — ${rotuloDoEstado(e.estado)}`).join('; ')
                        : 'Nenhuma edição'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variante="secundario"
                      icone="editar"
                      data-editar={t.id}
                      onClick={() => setTurmaEmEdicao({ turma: t, cursoId: c.id })}
                      aria-label={`Editar a turma ${t.nome}`}
                    >
                      Editar
                    </Button>
                    {t.edicoes.length === 0 && (
                      <Apagar
                        rotulo={`a turma ${t.nome}`}
                        bloqueio={bloqueio}
                        onApagar={() => onApagar('turma', t.id)}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ))}

      <Card
        titulo={cursoEmEdicao ? `Editar curso “${cursoEmEdicao.nome}”` : 'Novo curso'}
        icone="educacao"
        nivel={3}
      >
        <FormCurso
          key={cursoEmEdicao?.id ?? 'novo'}
          inicial={cursoEmEdicao ? comoCurso(cursoEmEdicao) : undefined}
          bloqueio={bloqueio}
          onSalvar={async (d) => {
            await onSalvarCurso(d.id ?? null, d.nome, d.categoria);
          }}
          onCancelar={() => {
            if (cursoEmEdicao) devolverFoco(cursoEmEdicao.id);
            setCursoEmEdicao(null);
          }}
        />
      </Card>

      <Card
        titulo={turmaEmEdicao ? `Editar turma “${turmaEmEdicao.turma.nome}”` : 'Nova turma'}
        icone="turma"
        nivel={3}
      >
        <FormTurma
          key={turmaEmEdicao?.turma.id ?? 'nova'}
          cursos={cadastro.map(comoCurso)}
          inicial={
            turmaEmEdicao ? comoTurma(turmaEmEdicao.turma, turmaEmEdicao.cursoId) : undefined
          }
          cursoBloqueado={Boolean(turmaEmEdicao)}
          motivoCursoBloqueado="O curso de uma turma do cadastro não muda; cadastre a turma no outro curso."
          bloqueio={bloqueio}
          onSalvar={async (d) => {
            await onSalvarTurma(d.id ?? null, d.cursoId, d.nome, d.anoLetivo);
          }}
          onCancelar={() => {
            if (turmaEmEdicao) devolverFoco(turmaEmEdicao.turma.id);
            setTurmaEmEdicao(null);
          }}
        />
      </Card>
    </div>
  );
}
