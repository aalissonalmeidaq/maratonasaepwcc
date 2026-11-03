import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, RetornoEnvio, SelectField, TextAreaField, TextField, useEnvio } from '@/shared/ui';
import { ROTULO_DO_GRUPO, type GrupoDeRegras } from '../domain/regrasTipos';
import type { RegrasDaEdicao, TipoOcorrencia } from '../domain/tipos';
import { completarIds, validarRegras, type ErrosDeRegras } from '../domain/validacaoRegras';
import { EditorDeCriterios } from './EditorDeCriterios';

const numero = (v: string) => (v === '' ? NaN : Number(v));
const texto = (n: number) => (Number.isNaN(n) ? '' : String(n));

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <legend className="px-1 font-semibold">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Numero({
  rotulo,
  valor,
  onAlterar,
  erro,
  somenteLeitura,
}: {
  rotulo: string;
  valor: number;
  onAlterar: (n: number) => void;
  erro?: string;
  somenteLeitura?: boolean;
}) {
  return (
    <TextField
      rotulo={rotulo}
      type="number"
      min={0}
      step="any"
      value={texto(valor)}
      disabled={somenteLeitura}
      erro={erro}
      onChange={(e) => onAlterar(numero(e.target.value))}
    />
  );
}

/** Campos de um grupo de regras (usado pela edição e pelos ajustes da turma). */
export function CamposDoGrupo({
  grupo,
  regras,
  onAlterar,
  erros,
  somenteLeitura = false,
}: {
  grupo: GrupoDeRegras;
  regras: RegrasDaEdicao;
  onAlterar: (r: RegrasDaEdicao) => void;
  erros: ErrosDeRegras;
  somenteLeitura?: boolean;
}) {
  const comum = { somenteLeitura };
  switch (grupo) {
    case 'presenca':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Numero
            rotulo="Pontos por integrante presente"
            valor={regras.presenca.pontosPorIntegrante}
            erro={erros['presenca.pontosPorIntegrante']}
            onAlterar={(n) =>
              onAlterar({ ...regras, presenca: { ...regras.presenca, pontosPorIntegrante: n } })
            }
            {...comum}
          />
          <Numero
            rotulo="Máximo por equipe"
            valor={regras.presenca.maximoPorDupla}
            erro={erros['presenca.maximoPorDupla']}
            onAlterar={(n) =>
              onAlterar({ ...regras, presenca: { ...regras.presenca, maximoPorDupla: n } })
            }
            {...comum}
          />
        </div>
      );
    case 'participacao':
    case 'apresentacao':
      return (
        <EditorDeCriterios
          caminho={grupo}
          criterios={regras[grupo].criterios}
          erros={erros}
          somenteLeitura={somenteLeitura}
          onAlterar={(criterios) => onAlterar({ ...regras, [grupo]: { criterios } })}
        />
      );
    case 'questoes':
      return (
        <Numero
          rotulo="Pontuação máxima das questões"
          valor={regras.questoes.maximo}
          erro={erros['questoes.maximo']}
          onAlterar={(n) => onAlterar({ ...regras, questoes: { maximo: n } })}
          {...comum}
        />
      );
    case 'entrega': {
      const e = regras.entrega;
      const alterar = (parcial: Partial<RegrasDaEdicao['entrega']>) =>
        onAlterar({ ...regras, entrega: { ...e, ...parcial } });
      return (
        <div className="flex flex-col gap-4">
          <EditorDeCriterios
            caminho="entrega"
            criterios={e.criterios}
            erros={erros}
            somenteLeitura={somenteLeitura}
            protegido={e.criterioDeAtraso}
            motivoProtegido="O critério de atraso não pode ser removido; escolha outro critério de atraso antes."
            onAlterar={(criterios) => alterar({ criterios })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              rotulo="Critério que recebe o desconto de atraso"
              value={e.criterioDeAtraso}
              disabled={somenteLeitura}
              erro={erros['entrega.criterioDeAtraso']}
              opcoes={e.criterios
                .filter((c) => c.id)
                .map((c) => ({ valor: c.id, rotulo: c.rotulo }))}
              onChange={(ev) => alterar({ criterioDeAtraso: ev.target.value })}
            />
            <Numero
              rotulo="Limite de atraso (minutos)"
              valor={e.limiteAtrasoMinutos}
              erro={erros['entrega.limiteAtrasoMinutos']}
              onAlterar={(n) => alterar({ limiteAtrasoMinutos: n })}
              {...comum}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Faixas de atraso</p>
            {erros['entrega.faixasDeAtraso'] && (
              <p className="text-sm font-medium text-error">{erros['entrega.faixasDeAtraso']}</p>
            )}
            {e.faixasDeAtraso.map((f, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Numero
                  rotulo={`Faixa ${i + 1}: até (minutos)`}
                  valor={f.ateMinutos}
                  onAlterar={(n) =>
                    alterar({
                      faixasDeAtraso: e.faixasDeAtraso.map((x, j) =>
                        j === i ? { ...x, ateMinutos: n } : x,
                      ),
                    })
                  }
                  {...comum}
                />
                <Numero
                  rotulo={`Faixa ${i + 1}: desconto`}
                  valor={f.desconto}
                  onAlterar={(n) =>
                    alterar({
                      faixasDeAtraso: e.faixasDeAtraso.map((x, j) =>
                        j === i ? { ...x, desconto: n } : x,
                      ),
                    })
                  }
                  {...comum}
                />
                {!somenteLeitura && (
                  <Button
                    variante="secundario"
                    icone="excluir"
                    aria-label={`Remover faixa ${i + 1}`}
                    onClick={() =>
                      alterar({ faixasDeAtraso: e.faixasDeAtraso.filter((_, j) => j !== i) })
                    }
                  >
                    Remover
                  </Button>
                )}
              </div>
            ))}
            {!somenteLeitura && (
              <div>
                <Button
                  variante="secundario"
                  icone="adicionar"
                  onClick={() =>
                    alterar({
                      faixasDeAtraso: [...e.faixasDeAtraso, { ateMinutos: NaN, desconto: 0 }],
                    })
                  }
                >
                  Adicionar faixa
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
    case 'penalidades': {
      const p = regras.penalidades;
      const alterarTipo = (i: number, t: TipoOcorrencia) =>
        onAlterar({
          ...regras,
          penalidades: { ...p, tipos: p.tipos.map((x, j) => (j === i ? t : x)) },
        });
      return (
        <div className="flex flex-col gap-3">
          <Numero
            rotulo="Teto de descontos por encontro"
            valor={p.tetoDescontosPorEncontro}
            erro={erros['penalidades.tetoDescontosPorEncontro']}
            onAlterar={(n) =>
              onAlterar({ ...regras, penalidades: { ...p, tetoDescontosPorEncontro: n } })
            }
            {...comum}
          />
          {p.tipos.map((t, i) => (
            <div key={t.id || i} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
              <TextField
                rotulo="Tipo de penalidade"
                value={t.rotulo}
                maxLength={80}
                disabled={somenteLeitura}
                erro={erros[`penalidades.tipos.${i}.rotulo`]}
                onChange={(ev) => alterarTipo(i, { ...t, rotulo: ev.target.value })}
              />
              {'pontos' in t ? (
                <Numero
                  rotulo="Pontos descontados"
                  valor={t.pontos}
                  erro={erros[`penalidades.tipos.${i}.pontos`]}
                  onAlterar={(n) => alterarTipo(i, { ...t, pontos: n })}
                  {...comum}
                />
              ) : (
                <p className="text-sm text-text-secondary">Zera a entrega</p>
              )}
              {!somenteLeitura && (
                <Button
                  variante="secundario"
                  icone="excluir"
                  aria-label={`Remover ${t.rotulo || 'tipo sem nome'}`}
                  onClick={() =>
                    onAlterar({
                      ...regras,
                      penalidades: { ...p, tipos: p.tipos.filter((_, j) => j !== i) },
                    })
                  }
                >
                  Remover
                </Button>
              )}
            </div>
          ))}
          {!somenteLeitura && (
            <div>
              <Button
                variante="secundario"
                icone="adicionar"
                onClick={() =>
                  onAlterar({
                    ...regras,
                    penalidades: { ...p, tipos: [...p.tipos, { id: '', rotulo: '', pontos: 0 }] },
                  })
                }
              >
                Adicionar tipo de penalidade
              </Button>
            </div>
          )}
        </div>
      );
    }
    case 'prazos':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Numero
            rotulo="Prazo de manifestação (horas)"
            valor={regras.prazos.manifestacaoHoras}
            erro={erros['prazos.manifestacaoHoras']}
            onAlterar={(n) =>
              onAlterar({ ...regras, prazos: { ...regras.prazos, manifestacaoHoras: n } })
            }
            {...comum}
          />
          <Numero
            rotulo="Prazo de revisão (horas)"
            valor={regras.prazos.revisaoHoras}
            erro={erros['prazos.revisaoHoras']}
            onAlterar={(n) =>
              onAlterar({ ...regras, prazos: { ...regras.prazos, revisaoHoras: n } })
            }
            {...comum}
          />
        </div>
      );
  }
}

const GRUPOS: GrupoDeRegras[] = [
  'presenca',
  'participacao',
  'questoes',
  'entrega',
  'apresentacao',
  'penalidades',
  'prazos',
];

/**
 * Regras da edição (US1): valores e critérios, prova oficial só leitura (PRD HU04), nome da versão
 * sugerido e justificativa; grava só depois da resposta (Constituição VII).
 */
export function FormRegras({
  regras: inicial,
  rotuloSugerido,
  onGravar,
  somenteLeitura = false,
  bloqueio,
}: {
  regras: RegrasDaEdicao;
  rotuloSugerido: string;
  onGravar: (regras: RegrasDaEdicao, rotulo: string, justificativa: string) => Promise<unknown>;
  somenteLeitura?: boolean;
  bloqueio?: string;
}) {
  const [regras, setRegras] = useState(inicial);
  const [rotulo, setRotulo] = useState(rotuloSugerido);
  const [justificativa, setJustificativa] = useState('');
  const [sugestaoAtual, setSugestaoAtual] = useState(rotuloSugerido);
  if (rotuloSugerido !== sugestaoAtual) {
    // Depois de gravar, a sugestão passa ao próximo rótulo sem remontar o formulário.
    setSugestaoAtual(rotuloSugerido);
    setRotulo(rotuloSugerido);
    setJustificativa('');
  }
  const [erros, setErros] = useState<ErrosDeRegras>({});
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const completas = completarIds(regras);
    const validacao = validarRegras(completas, 'edicao');
    if (rotulo.trim().length < 1 || rotulo.trim().length > 60)
      validacao.rotulo = 'Informe um nome de versão de 1 a 60 caracteres.';
    if (justificativa.trim().length < 10)
      validacao.justificativa = 'Informe a justificativa (mínimo de 10 caracteres).';
    setErros(validacao);
    if (Object.keys(validacao).length) return;
    setRegras(completas);
    await enviar(
      () => onGravar({ ...completas, versao: rotulo.trim() }, rotulo.trim(), justificativa.trim()),
      'Versão das regras gravada.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <Grupo titulo="Encontros">
        <div className="grid gap-3 sm:grid-cols-2">
          <Numero
            rotulo="Quantidade de encontros"
            valor={regras.quantidadeEncontros}
            erro={erros.quantidadeEncontros}
            somenteLeitura={somenteLeitura}
            onAlterar={(n) => setRegras({ ...regras, quantidadeEncontros: n })}
          />
          <Numero
            rotulo="Casas decimais"
            valor={regras.casasDecimais}
            erro={erros.casasDecimais}
            somenteLeitura={somenteLeitura}
            onAlterar={(n) => setRegras({ ...regras, casasDecimais: n })}
          />
        </div>
      </Grupo>
      {GRUPOS.map((g) => (
        <Grupo key={g} titulo={ROTULO_DO_GRUPO[g]}>
          <CamposDoGrupo
            grupo={g}
            regras={regras}
            onAlterar={setRegras}
            erros={erros}
            somenteLeitura={somenteLeitura}
          />
        </Grupo>
      ))}
      <Grupo titulo="Prova oficial">
        <p className="text-sm text-text-secondary">
          Segue os valores do PRD (HU04): realização confirmada vale{' '}
          {regras.provaOficial.pontosRealizacao} por aluno; nota confirmada a partir de{' '}
          {regras.provaOficial.notaMinimaBonus} agrega {regras.provaOficial.pontosBonus}. Não podem
          ser alterados.
        </p>
      </Grupo>
      {!somenteLeitura && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              rotulo="Nome da versão"
              value={rotulo}
              maxLength={60}
              erro={erros.rotulo}
              onChange={(e) => setRotulo(e.target.value)}
            />
          </div>
          <TextAreaField
            rotulo="Justificativa"
            value={justificativa}
            rows={3}
            erro={erros.justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
          {erros.provaOficial && (
            <p className="text-sm font-medium text-error">{erros.provaOficial}</p>
          )}
          <RetornoEnvio estado={estado} />
          <div>
            <Button type="submit" icone="salvar" carregando={enviando} disabled={Boolean(bloqueio)}>
              Gravar versão
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
