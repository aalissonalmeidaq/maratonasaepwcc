import { useState } from 'react';
import { Link } from 'react-router';
import { GrupoDeMarcacao, Marcacao } from '@/modules/atividades';
import { Alert, Button, RetornoEnvio, useEnvio } from '@/shared/ui';
import type { CursoDoCadastro } from '../domain/cadastro';
import type { Turma } from '../domain/tipos';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Vínculo das turmas do cadastro à edição (US2, FR-005): marcar e vincular em até 3 interações
 * (SC-002). As vinculadas aparecem com contagens, link para a gestão da turma e "Desvincular".
 */
export function VincularTurmas({
  cadastro,
  turmasDaEdicao,
  contagens,
  correcoesPendentes = [],
  onAtualizar,
  onVincular,
  onDesvincular,
  bloqueio,
}: {
  cadastro: CursoDoCadastro[];
  turmasDaEdicao: Turma[];
  contagens: Record<string, { alunos: number; docentes: number }>;
  /** Diferenças de nome ou categoria entre o cadastro e a edição ativa (R4). */
  correcoesPendentes?: string[];
  onAtualizar?: () => Promise<unknown>;
  onVincular: (cadastroTurmaIds: string[]) => Promise<unknown>;
  onDesvincular: (turmaId: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const vinculo = useEnvio();
  const desvinculo = useEnvio();
  const atualizacao = useEnvio();
  const jaVinculadas = new Set(turmasDaEdicao.map((t) => t.cadastroTurmaId));

  async function vincular() {
    if (!marcadas.length) return;
    const ok = await vinculo.enviar(() => onVincular(marcadas), 'Turmas vinculadas.');
    if (ok) setMarcadas([]);
  }

  return (
    <div className="flex flex-col gap-6">
      {correcoesPendentes.length > 0 && onAtualizar && (
        <Alert tom="info" titulo="O cadastro tem correções de nome ou categoria para esta edição">
          <ul className="list-disc pl-5">
            {correcoesPendentes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <RetornoEnvio estado={atualizacao.estado} />
            <div>
              <Button
                variante="secundario"
                icone="sincronizar"
                carregando={atualizacao.enviando}
                disabled={Boolean(bloqueio)}
                onClick={() =>
                  void atualizacao.enviar(onAtualizar, 'Correções aplicadas a esta edição.')
                }
              >
                Atualizar a partir do cadastro
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <section aria-labelledby="titulo-vinculadas" className="flex flex-col gap-3">
        <h3 id="titulo-vinculadas" className="font-semibold">
          Turmas vinculadas
        </h3>
        {turmasDaEdicao.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhuma turma vinculada a esta edição.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {turmasDaEdicao.map((t) => {
              const n = contagens[t.id] ?? { alunos: 0, docentes: 0 };
              return (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{t.nome}</span>
                    <span className="text-sm text-text-secondary">
                      {plural(n.alunos, 'aluno', 'alunos')} ·{' '}
                      {plural(n.docentes, 'docente', 'docentes')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/coordenacao/turmas/${t.id}`}
                      className="text-link underline-offset-4 hover:underline"
                      aria-label={`Gerir turma ${t.nome}`}
                    >
                      Gerir turma
                    </Link>
                    {n.alunos + n.docentes === 0 && (
                      <Button
                        variante="secundario"
                        icone="excluir"
                        disabled={Boolean(bloqueio) || desvinculo.enviando}
                        onClick={() =>
                          void desvinculo.enviar(() => onDesvincular(t.id), 'Turma desvinculada.')
                        }
                        aria-label={`Desvincular a turma ${t.nome}`}
                      >
                        Desvincular
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <RetornoEnvio estado={desvinculo.estado} />
      </section>

      <GrupoDeMarcacao legenda="Turmas do cadastro">
        {cadastro.flatMap((c) =>
          c.turmas.map((t) => (
            <div key={t.id} className={jaVinculadas.has(t.id) ? 'opacity-70' : undefined}>
              <MarcacaoDesabilitavel
                rotulo={`${t.nome} (${c.nome})`}
                marcado={jaVinculadas.has(t.id) || marcadas.includes(t.id)}
                desabilitado={jaVinculadas.has(t.id)}
                onAlterar={(v) =>
                  setMarcadas((m) => (v ? [...m, t.id] : m.filter((id) => id !== t.id)))
                }
              />
            </div>
          )),
        )}
      </GrupoDeMarcacao>
      <RetornoEnvio estado={vinculo.estado} />
      <div>
        <Button
          icone="adicionar"
          carregando={vinculo.enviando}
          disabled={Boolean(bloqueio) || marcadas.length === 0}
          onClick={() => void vincular()}
        >
          Vincular selecionadas
        </Button>
      </div>
    </div>
  );
}

function MarcacaoDesabilitavel({
  rotulo,
  marcado,
  desabilitado,
  onAlterar,
}: {
  rotulo: string;
  marcado: boolean;
  desabilitado: boolean;
  onAlterar: (v: boolean) => void;
}) {
  if (!desabilitado) return <Marcacao rotulo={rotulo} marcado={marcado} onAlterar={onAlterar} />;
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" checked readOnly disabled className="size-5" />
      {rotulo} <span className="text-sm text-text-secondary">— já vinculada</span>
    </label>
  );
}
