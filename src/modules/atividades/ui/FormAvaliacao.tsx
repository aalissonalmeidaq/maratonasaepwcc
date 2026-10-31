import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import type { Notas, RegrasDaEdicao } from '@/modules/pontuacao';
import { Alert, RodapeDoFormulario, TextAreaField, useEnvio } from '@/shared/ui';
import type { DadosAvaliacao, EquipeParaAvaliar } from '../domain/tipos';
import { CamposDeNotas } from './FormParticipacao';
import { Marcacao } from './FormDesafio';
import { useNotas } from './useNotas';

type Avaliacao = Omit<DadosAvaliacao, 'desafioId' | 'duplaId'>;

const iguais = (a: Notas | null, b: Notas | null) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Rubrica de entrega e de apresentação com feedback (HU03, FR-012–015). Os critérios e máximos vêm
 * das regras do servidor; o desconto de atraso aparece separado da nota atribuída (FR-013).
 */
export function FormAvaliacao({
  equipe,
  regras,
  onSalvar,
  bloqueio,
  somenteCorrecao = false,
}: {
  equipe: EquipeParaAvaliar;
  regras: RegrasDaEdicao;
  onSalvar: (dados: Avaliacao) => Promise<void>;
  bloqueio?: string;
  /** Coordenação: corrige avaliações existentes, não faz o primeiro registro (FR-011). */
  somenteCorrecao?: boolean;
}) {
  const atual = equipe.avaliacao;
  const temEntrega = equipe.ultimaEntrega !== null;
  const entrega = useNotas(regras.entrega.criterios, atual?.notasEntrega);
  const apresentacao = useNotas(regras.apresentacao.criterios, atual?.notasApresentacao);
  const [naoAvaliavel, setNaoAvaliavel] = useState(atual?.apresentacaoNaoAvaliavel ?? false);
  const [feedback, setFeedback] = useState(atual?.feedback ?? '');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  if (somenteCorrecao && !atual) {
    return <Alert tom="info" titulo="A coordenação corrige avaliações já registradas." />;
  }

  const criterioAtraso =
    regras.entrega.criterios.find((c) => c.id === regras.entrega.criterioDeAtraso)?.rotulo ??
    regras.entrega.criterioDeAtraso;

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const notasEntrega = temEntrega ? entrega.ler() : { notas: null, erro: null };
    const notasApresentacao = naoAvaliavel ? { notas: null, erro: null } : apresentacao.ler();
    let motivo = notasEntrega.erro ?? notasApresentacao.erro;
    if (!motivo && temEntrega && !feedback.trim()) motivo = 'Escreva o feedback da entrega.';
    const dados: Avaliacao = {
      notasEntrega: notasEntrega.notas,
      notasApresentacao: notasApresentacao.notas,
      apresentacaoNaoAvaliavel: naoAvaliavel,
      feedback: feedback.trim(),
      justificativa: undefined,
    };
    const correcao =
      atual !== null &&
      (!iguais(atual.notasEntrega, dados.notasEntrega) ||
        !iguais(atual.notasApresentacao, dados.notasApresentacao) ||
        atual.apresentacaoNaoAvaliavel !== dados.apresentacaoNaoAvaliavel ||
        (atual.feedback ?? '') !== dados.feedback);
    if (!motivo && correcao) motivo = validarJustificativa(justificativa);
    setErro(motivo);
    if (motivo) return;
    await enviar(
      () => onSalvar({ ...dados, justificativa: correcao ? justificativa.trim() : undefined }),
      atual ? 'Correção registrada.' : 'Avaliação registrada.',
    );
  }

  return (
    <form
      aria-label={`Avaliação da ${equipe.nome ?? 'equipe'}`}
      onSubmit={aoEnviar}
      noValidate
      className="flex flex-col gap-4"
    >
      {temEntrega ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Entrega prática</legend>
          <CamposDeNotas
            prefixo="Entrega"
            criterios={regras.entrega.criterios}
            valores={entrega.valores}
            onAlterar={(id, v) => entrega.setValores((x) => ({ ...x, [id]: v }))}
          />
          {equipe.ultimaEntrega!.descontoPrevisto > 0 && (
            <p className="text-sm text-amber-800">
              Atraso de {equipe.ultimaEntrega!.atrasoMinutos} min: desconto de{' '}
              {equipe.ultimaEntrega!.descontoPrevisto} pontos em {criterioAtraso}, aplicado
              separadamente da nota atribuída.
            </p>
          )}
        </fieldset>
      ) : (
        <Alert tom="info" titulo="Sem entrega: a prática fica zerada." />
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Apresentação</legend>
        <Marcacao
          rotulo="Apresentação não avaliável"
          marcado={naoAvaliavel}
          onAlterar={setNaoAvaliavel}
        />
        {!naoAvaliavel && (
          <CamposDeNotas
            prefixo="Apresentação"
            criterios={regras.apresentacao.criterios}
            valores={apresentacao.valores}
            onAlterar={(id, v) => apresentacao.setValores((x) => ({ ...x, [id]: v }))}
          />
        )}
      </fieldset>
      <TextAreaField
        rotulo="Feedback para a equipe"
        dica={
          temEntrega
            ? 'Obrigatório quando há entrega. A equipe vê assim que registrado.'
            : undefined
        }
        value={feedback}
        maxLength={4000}
        onChange={(e) => setFeedback(e.target.value)}
      />
      {atual && (
        <TextAreaField
          rotulo="Justificativa da correção"
          dica="Obrigatória se algo mudar. O valor anterior fica no histórico."
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      )}
      {erro && <Alert tom="erro" titulo={erro} />}
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo={atual ? 'Salvar correção' : 'Registrar avaliação'}
        icone="avaliacao"
      />
    </form>
  );
}
