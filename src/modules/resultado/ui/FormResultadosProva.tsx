import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import {
  Alert,
  RodapeDoFormulario,
  SelectField,
  TextAreaField,
  TextField,
  useEnvio,
} from '@/shared/ui';
import type { RealizacaoProva, RegistroDeProva, ResultadoProva } from '../domain/tipos';

interface Linha {
  realizacao: RealizacaoProva | '';
  nota: string;
  fonte: string;
  escala: boolean;
  autoriza: boolean;
  indisponivel: boolean;
}

const REALIZACOES = [
  { valor: 'confirmada', rotulo: 'Realizou (confirmada)' },
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'nao_realizou', rotulo: 'Não realizou' },
];

const inicial = (r: ResultadoProva): Linha => ({
  realizacao: r.realizacao ?? '',
  nota: r.nota === null ? '' : String(r.nota),
  fonte: r.fonte ?? '',
  escala: r.escalaConfirmada,
  autoriza: r.autorizacaoConfirmada,
  indisponivel: r.notaEstado === 'indisponivel',
});

const paraRegistro = (id: string, l: Linha): RegistroDeProva => {
  const realizou = l.realizacao === 'confirmada';
  const nota = realizou && !l.indisponivel && l.nota.trim() !== '' ? Number(l.nota) : null;
  return {
    estudanteId: id,
    realizacao: l.realizacao as RealizacaoProva,
    nota,
    fonte: nota === null ? null : l.fonte.trim() || null,
    escalaConfirmada: realizou && l.escala,
    autorizacaoConfirmada: realizou && l.autoriza,
    notaIndisponivel: realizou && l.indisponivel,
  };
};

const mesma = (a: Linha, b: Linha) =>
  JSON.stringify(paraRegistro('', a)) === JSON.stringify(paraRegistro('', b));

/**
 * Registro da prova oficial pela coordenação (US1): realização, nota oficial com fonte e as
 * confirmações de escala e autorização. A nota só conta como confirmada quando as duas
 * confirmações estão marcadas; o servidor não converte escalas (FR-001 a FR-004).
 */
export function FormResultadosProva({
  resultados,
  onSalvar,
  bloqueio,
  pedidoId,
}: {
  resultados: ResultadoProva[];
  onSalvar: (registros: RegistroDeProva[], justificativa?: string) => Promise<unknown>;
  bloqueio?: string;
  pedidoId?: string | null;
}) {
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(resultados.map((r) => [r.estudanteId, inicial(r)])),
  );
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  const atualizar = (id: string, parcial: Partial<Linha>) =>
    setLinhas((atual) => ({ ...atual, [id]: { ...atual[id]!, ...parcial } }));

  const alterou = resultados.some(
    (r) => r.registradoEm !== null && !mesma(linhas[r.estudanteId]!, inicial(r)),
  );

  const grupos = [...new Map(resultados.map((r) => [r.duplaId, r])).values()].map((r) => ({
    chave: r.duplaId,
    titulo: r.duplaNome,
    linhas: resultados.filter((x) => x.duplaId === r.duplaId),
  }));

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const motivo = alterou ? validarJustificativa(justificativa) : null;
    setErro(motivo);
    if (motivo) return;
    const registros = resultados
      .filter((r) => linhas[r.estudanteId]!.realizacao !== '')
      .map((r) => paraRegistro(r.estudanteId, linhas[r.estudanteId]!));
    await enviar(
      () => onSalvar(registros, alterou ? justificativa.trim() : undefined),
      'Resultados salvos.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      {pedidoId && (
        <Alert tom="info" titulo="Correção ligada ao pedido de revisão">
          As alterações salvas aqui ficam registradas na auditoria junto do pedido.
        </Alert>
      )}
      {grupos.map((g) => (
        <fieldset key={g.chave} className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold">{g.titulo}</legend>
          <ul className="flex flex-col gap-4">
            {g.linhas.map((r) => {
              const l = linhas[r.estudanteId]!;
              const nome = r.estudanteNome;
              const realizou = l.realizacao === 'confirmada';
              return (
                <li key={r.estudanteId} className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    rotulo={`Realização de ${nome}`}
                    opcoes={REALIZACOES}
                    placeholder="Não registrado"
                    value={l.realizacao}
                    onChange={(e) =>
                      atualizar(r.estudanteId, {
                        realizacao: e.target.value as Linha['realizacao'],
                      })
                    }
                  />
                  {realizou && (
                    <>
                      <label className="flex min-h-11 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="size-5"
                          checked={l.indisponivel}
                          onChange={(e) =>
                            atualizar(r.estudanteId, { indisponivel: e.target.checked })
                          }
                        />
                        {nome}: nota indisponível
                      </label>
                      {!l.indisponivel && (
                        <>
                          <TextField
                            rotulo={`Nota oficial de ${nome}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step="0.01"
                            value={l.nota}
                            onChange={(e) => atualizar(r.estudanteId, { nota: e.target.value })}
                          />
                          <TextField
                            rotulo={`Fonte da nota de ${nome}`}
                            maxLength={300}
                            value={l.fonte}
                            onChange={(e) => atualizar(r.estudanteId, { fonte: e.target.value })}
                          />
                          <label className="flex min-h-11 items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              className="size-5"
                              checked={l.escala}
                              onChange={(e) =>
                                atualizar(r.estudanteId, { escala: e.target.checked })
                              }
                            />
                            {nome}: escala 0–100 confirmada
                          </label>
                          <label className="flex min-h-11 items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              className="size-5"
                              checked={l.autoriza}
                              onChange={(e) =>
                                atualizar(r.estudanteId, { autoriza: e.target.checked })
                              }
                            />
                            {nome}: uso da nota autorizado
                          </label>
                        </>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      <p className="text-sm text-text-secondary">
        Sem as duas confirmações, a nota fica pendente e nenhuma conversão de escala é feita.
      </p>
      {alterou && (
        <TextAreaField
          rotulo="Justificativa da correção"
          dica="Obrigatória ao alterar um resultado já registrado. Fica na auditoria."
          value={justificativa}
          erro={erro ?? undefined}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      )}
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Salvar resultados"
        icone="salvar"
      />
    </form>
  );
}
