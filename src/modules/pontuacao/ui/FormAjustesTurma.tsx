import { useState, type FormEvent } from 'react';
import { Button, RetornoEnvio, TextAreaField, useEnvio } from '@/shared/ui';
import {
  ROTULO_DO_GRUPO,
  type AjustesDaTurma,
  type GrupoDeRegras,
  type RegrasDaTurma,
} from '../domain/regrasTipos';
import { completarIds, validarRegras, type ErrosDeRegras } from '../domain/validacaoRegras';
import { CamposDoGrupo } from './FormRegras';

/**
 * Regras próprias da turma (US2): cada grupo que quem consulta pode ajustar herda da edição ou é
 * definido para a turma, partindo dos valores atuais. Grupos ajustados por outra pessoa e fora do
 * alcance de quem grava seguem como estão (FR-005). Conclui só após a resposta.
 */
export function FormAjustesTurma({
  dados,
  onGravar,
  bloqueio,
}: {
  dados: RegrasDaTurma;
  onGravar: (grupos: AjustesDaTurma, justificativa: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [regras, setRegras] = useState(dados.regras);
  const [definidos, setDefinidos] = useState<GrupoDeRegras[]>(dados.gruposAjustados);
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState<ErrosDeRegras>({});
  const { estado, enviando, enviar } = useEnvio();

  if (dados.podeAjustar.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        As regras da turma são ajustadas pela coordenação ou pelo mentor do curso.
      </p>
    );
  }

  const marcar = (g: GrupoDeRegras, definir: boolean) =>
    setDefinidos((d) => (definir ? [...d.filter((x) => x !== g), g] : d.filter((x) => x !== g)));

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const completas = completarIds(regras);
    const grupos = Object.fromEntries(definidos.map((g) => [g, completas[g]])) as AjustesDaTurma;
    const validacao = validarRegras(grupos, 'turma');
    if (justificativa.trim().length < 10)
      validacao.justificativa = 'Informe a justificativa (mínimo de 10 caracteres).';
    setErros(validacao);
    if (Object.keys(validacao).length) return;
    setRegras(completas);
    await enviar(() => onGravar(grupos, justificativa.trim()), 'Regras da turma gravadas.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      {dados.podeAjustar.map((g) => {
        const definido = definidos.includes(g);
        return (
          <fieldset key={g} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <legend className="px-1 font-semibold">{ROTULO_DO_GRUPO[g]}</legend>
            <div className="flex flex-wrap gap-x-6">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name={`grupo-${g}`}
                  checked={!definido}
                  onChange={() => marcar(g, false)}
                  className="size-5"
                />
                Herdar da edição
              </label>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name={`grupo-${g}`}
                  checked={definido}
                  onChange={() => marcar(g, true)}
                  className="size-5"
                />
                Definir para a turma
              </label>
            </div>
            {definido && (
              <CamposDoGrupo grupo={g} regras={regras} onAlterar={setRegras} erros={erros} />
            )}
          </fieldset>
        );
      })}
      <TextAreaField
        rotulo="Justificativa"
        value={justificativa}
        rows={3}
        erro={erros.justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      <RetornoEnvio estado={estado} />
      <div>
        <Button type="submit" icone="salvar" carregando={enviando} disabled={Boolean(bloqueio)}>
          Gravar regras da turma
        </Button>
      </div>
    </form>
  );
}
