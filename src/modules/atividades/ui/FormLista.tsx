import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  RodapeDoFormulario,
  SelectField,
  TextAreaField,
  TextField,
  useEnvio,
} from '@/shared/ui';
import { paraDataHoraLocal } from '../domain/datas';
import type { DadosLista, ListaQuestoes, QuestaoEditavel } from '../domain/tipos';
import { GrupoDeMarcacao, Marcacao } from './FormDesafio';

const LETRAS = 'ABCDEFGHIJ';
const questaoVazia = (): QuestaoEditavel => ({
  enunciado: '',
  justificativa: '',
  capacidade: '',
  alternativas: [
    { texto: '', correta: false },
    { texto: '', correta: false },
  ],
});

/** Lista de questões objetivas do encontro (FR-016): uma alternativa correta por questão. */
export function FormLista({
  encontros,
  turmas,
  inicial,
  onSalvar,
  bloqueio,
}: {
  encontros: { id: string; numero: number; titulo: string }[];
  turmas: { id: string; nome: string }[];
  inicial?: ListaQuestoes;
  onSalvar: (dados: DadosLista) => Promise<string>;
  bloqueio?: string;
}) {
  const [encontroId, setEncontroId] = useState(inicial?.encontroId ?? encontros[0]?.id ?? '');
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [prazo, setPrazo] = useState(inicial ? paraDataHoraLocal(inicial.prazo) : '');
  const [turmasMarcadas, setTurmas] = useState<string[]>(
    inicial?.turmas ?? (turmas.length === 1 ? [turmas[0]!.id] : []),
  );
  const [questoes, setQuestoes] = useState<QuestaoEditavel[]>(
    inicial?.questoes ?? [questaoVazia()],
  );
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  const alterarQuestao = (i: number, parcial: Partial<QuestaoEditavel>) =>
    setQuestoes((qs) => qs.map((q, x) => (x === i ? { ...q, ...parcial } : q)));
  const alterarAlternativa = (
    i: number,
    j: number,
    parcial: { texto?: string; correta?: boolean },
  ) =>
    setQuestoes((qs) =>
      qs.map((q, x) =>
        x !== i
          ? q
          : {
              ...q,
              alternativas: q.alternativas.map((a, y) =>
                parcial.correta !== undefined
                  ? { ...a, correta: y === j }
                  : y === j
                    ? { ...a, ...parcial }
                    : a,
              ),
            },
      ),
    );

  function validar(): string | null {
    const t = titulo.trim().length;
    if (t < 3 || t > 160) return 'Informe um título de 3 a 160 caracteres.';
    if (!prazo) return 'Informe o prazo.';
    if (turmasMarcadas.length === 0) return 'Escolha pelo menos uma turma.';
    for (const [i, q] of questoes.entries()) {
      if (!q.enunciado.trim()) return `Escreva o enunciado da questão ${i + 1}.`;
      if (q.alternativas.some((a) => !a.texto.trim()))
        return `Preencha todas as alternativas da questão ${i + 1}.`;
      if (q.alternativas.filter((a) => a.correta).length !== 1)
        return `Marque a alternativa correta da questão ${i + 1}.`;
    }
    return null;
  }

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const motivo = validar();
    setErro(motivo);
    if (motivo) return;
    await enviar(
      () =>
        onSalvar({
          ...(inicial ? { id: inicial.id } : {}),
          encontroId,
          titulo: titulo.trim(),
          prazo: new Date(prazo).toISOString(),
          turmas: turmasMarcadas,
          questoes: questoes.map((q) => ({
            enunciado: q.enunciado.trim(),
            justificativa: q.justificativa.trim(),
            capacidade: q.capacidade.trim(),
            alternativas: q.alternativas.map((a) => ({
              texto: a.texto.trim(),
              correta: a.correta,
            })),
          })),
        }),
      'Lista salva como rascunho.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          rotulo="Encontro"
          value={encontroId}
          onChange={(e) => setEncontroId(e.target.value)}
          opcoes={encontros.map((e) => ({ valor: e.id, rotulo: `${e.numero}. ${e.titulo}` }))}
          dica="Só encontros com questões preparatórias (sem prova oficial)."
        />
        <TextField
          rotulo="Prazo"
          type="datetime-local"
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
          dica="O gabarito aparece para as equipes depois do prazo."
        />
        <div className="sm:col-span-2">
          <TextField
            rotulo="Título"
            value={titulo}
            maxLength={160}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>
        <GrupoDeMarcacao legenda="Turmas">
          {turmas.map((t) => (
            <Marcacao
              key={t.id}
              rotulo={t.nome}
              marcado={turmasMarcadas.includes(t.id)}
              onAlterar={(v) =>
                setTurmas((atual) => (v ? [...atual, t.id] : atual.filter((x) => x !== t.id)))
              }
            />
          ))}
        </GrupoDeMarcacao>
      </div>

      {questoes.map((q, i) => (
        <fieldset key={i} className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <legend className="px-1 font-semibold">Questão {i + 1}</legend>
          <TextAreaField
            rotulo={`Enunciado da questão ${i + 1}`}
            value={q.enunciado}
            maxLength={4000}
            onChange={(e) => alterarQuestao(i, { enunciado: e.target.value })}
          />
          {q.alternativas.map((a, j) => (
            <div key={j} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <TextField
                rotulo={`Alternativa ${LETRAS[j]} da questão ${i + 1}`}
                value={a.texto}
                maxLength={1000}
                onChange={(e) => alterarAlternativa(i, j, { texto: e.target.value })}
              />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`correta-${i}`}
                  checked={a.correta}
                  onChange={() => alterarAlternativa(i, j, { correta: true })}
                  aria-label={`Alternativa ${LETRAS[j]} da questão ${i + 1} é a correta`}
                  className="size-5"
                />
                <span aria-hidden="true">Correta</span>
              </label>
              {q.alternativas.length > 2 && (
                <Button
                  variante="terciario"
                  icone="excluir"
                  onClick={() =>
                    alterarQuestao(i, { alternativas: q.alternativas.filter((_, y) => y !== j) })
                  }
                >
                  <span className="sr-only">
                    Remover alternativa {LETRAS[j]} da questão {i + 1}
                  </span>
                </Button>
              )}
            </div>
          ))}
          {q.alternativas.length < LETRAS.length && (
            <Button
              variante="secundario"
              icone="adicionar"
              className="self-start"
              onClick={() =>
                alterarQuestao(i, {
                  alternativas: [...q.alternativas, { texto: '', correta: false }],
                })
              }
            >
              Adicionar alternativa <span className="sr-only">à questão {i + 1}</span>
            </Button>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextAreaField
              rotulo={`Justificativa da questão ${i + 1}`}
              dica="Mostrada às equipes depois do prazo."
              value={q.justificativa}
              maxLength={4000}
              onChange={(e) => alterarQuestao(i, { justificativa: e.target.value })}
            />
            <TextField
              rotulo={`Capacidade da questão ${i + 1}`}
              value={q.capacidade}
              maxLength={300}
              onChange={(e) => alterarQuestao(i, { capacidade: e.target.value })}
            />
          </div>
          {questoes.length > 1 && (
            <Button
              variante="terciario"
              icone="excluir"
              className="self-start"
              onClick={() => setQuestoes((qs) => qs.filter((_, x) => x !== i))}
            >
              Remover questão {i + 1}
            </Button>
          )}
        </fieldset>
      ))}
      <Button
        variante="secundario"
        icone="adicionar"
        className="self-start"
        onClick={() => setQuestoes((qs) => [...qs, questaoVazia()])}
      >
        Adicionar questão
      </Button>
      {erro && <Alert tom="erro" titulo={erro} />}
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
