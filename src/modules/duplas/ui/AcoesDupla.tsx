import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  RetornoEnvio,
  SelectField,
  TextAreaField,
  TextField,
  useEnvio,
} from '@/shared/ui';
import { MINIMO_JUSTIFICATIVA, validarJustificativa } from '../domain/composicao';
import { validarNomeEquipe } from '../domain/equipes';
import type { IntegranteAtual } from '../domain/tipos';

type Acao = 'substituir' | 'incluir' | 'remover' | 'renomear' | 'desfazer';

const ROTULOS: Record<Acao, { opcao: string; botao: string; sucesso: string }> = {
  substituir: {
    opcao: 'Substituir integrante',
    botao: 'Registrar substituição',
    sucesso: 'Integrante substituído.',
  },
  incluir: {
    opcao: 'Incluir integrante',
    botao: 'Registrar inclusão',
    sucesso: 'Integrante incluído.',
  },
  remover: {
    opcao: 'Remover integrante',
    botao: 'Registrar remoção',
    sucesso: 'Integrante removido.',
  },
  renomear: {
    opcao: 'Renomear equipe',
    botao: 'Registrar novo nome',
    sucesso: 'Equipe renomeada.',
  },
  desfazer: {
    opcao: 'Desfazer equipe',
    botao: 'Desfazer equipe',
    sucesso: 'Equipe desfeita. O histórico foi mantido.',
  },
};

interface AcoesDuplaProps {
  dupla: { id: string; nome: string | null; integrantes: IntegranteAtual[] };
  /** Alunos ativos da turma sem equipe (candidatos a entrar). */
  disponiveis: { id: string; nome: string }[];
  /** Turma ímpar e sem trio: uma dupla pode receber o terceiro integrante. */
  permiteTrio: boolean;
  onSubstituir: (dados: { sai: string; entra: string; justificativa: string }) => Promise<void>;
  onIncluir: (dados: { estudante: string; justificativa: string }) => Promise<void>;
  onRemover: (dados: { estudante: string; justificativa: string }) => Promise<void>;
  onDesfazer: (justificativa: string) => Promise<void>;
  /** Só docente/mentor da turma, depois que a equipe escolheu o nome (FR-008). */
  onRenomear?: (dados: { nome: string; justificativa: string }) => Promise<void>;
  bloqueio?: string;
}

/**
 * Alterações da equipe pela gestão (US4), sempre com justificativa (FR-006). Remover só em
 * trio (FR-012); incluir só quando a dupla pode virar o trio da turma.
 */
export function AcoesDupla({
  dupla,
  disponiveis,
  permiteTrio,
  onSubstituir,
  onIncluir,
  onRemover,
  onDesfazer,
  onRenomear,
  bloqueio,
}: AcoesDuplaProps) {
  const ehTrio = dupla.integrantes.length === 3;
  const acoes: Acao[] = [
    'substituir',
    ...(!ehTrio && permiteTrio ? (['incluir'] as const) : []),
    ...(ehTrio ? (['remover'] as const) : []),
    ...(onRenomear && dupla.nome ? (['renomear'] as const) : []),
    'desfazer',
  ];
  const [acao, setAcao] = useState<Acao>('substituir');
  const [sai, setSai] = useState('');
  const [entra, setEntra] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  const opcoesIntegrantes = dupla.integrantes.map((i) => ({
    valor: i.estudanteId,
    rotulo: i.integranteInativo ? `${i.nome} (integrante inativo)` : i.nome,
  }));
  const opcoesDisponiveis = disponiveis.map((e) => ({ valor: e.id, rotulo: e.nome }));
  const pedeSai = acao === 'substituir' || acao === 'remover';
  const pedeEntra = acao === 'substituir' || acao === 'incluir';

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const problema =
      (pedeSai && !sai) || (pedeEntra && !entra)
        ? 'Selecione os integrantes da alteração.'
        : acao === 'renomear'
          ? (validarNomeEquipe(novoNome) ?? validarJustificativa(justificativa))
          : validarJustificativa(justificativa);
    setErro(problema);
    if (problema) return;
    const texto = justificativa.trim();
    const gravar = {
      substituir: () => onSubstituir({ sai, entra, justificativa: texto }),
      incluir: () => onIncluir({ estudante: entra, justificativa: texto }),
      remover: () => onRemover({ estudante: sai, justificativa: texto }),
      renomear: () =>
        onRenomear?.({ nome: novoNome.trim(), justificativa: texto }) ?? Promise.resolve(),
      desfazer: () => onDesfazer(texto),
    }[acao];
    if (await enviar(gravar, ROTULOS[acao].sucesso)) {
      setSai('');
      setEntra('');
      setJustificativa('');
      setNovoNome('');
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
        <legend className="mb-2 text-sm font-semibold">Alteração da equipe</legend>
        {acoes.map((a) => (
          <label key={a} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name={`acao-${dupla.id}`}
              checked={acao === a}
              onChange={() => {
                setAcao(a);
                setErro(null);
              }}
            />
            {ROTULOS[a].opcao}
          </label>
        ))}
      </fieldset>
      {(pedeSai || pedeEntra) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {pedeSai && (
            <SelectField
              rotulo="Sai"
              placeholder="Selecione"
              opcoes={opcoesIntegrantes}
              value={sai}
              onChange={(e) => setSai(e.target.value)}
            />
          )}
          {pedeEntra && (
            <SelectField
              rotulo="Entra"
              placeholder={opcoesDisponiveis.length ? 'Selecione' : 'Nenhum aluno sem equipe'}
              opcoes={opcoesDisponiveis}
              value={entra}
              onChange={(e) => setEntra(e.target.value)}
            />
          )}
        </div>
      )}
      {acao === 'renomear' && (
        <TextField
          rotulo="Novo nome"
          value={novoNome}
          maxLength={80}
          onChange={(e) => setNovoNome(e.target.value)}
        />
      )}
      <TextAreaField
        rotulo="Justificativa"
        dica={`Obrigatória (mínimo de ${MINIMO_JUSTIFICATIVA} caracteres). Fica registrada no histórico e na auditoria.`}
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        erro={erro ?? undefined}
      />
      {bloqueio && <Alert tom="info" titulo={bloqueio} />}
      <RetornoEnvio estado={estado} />
      <Button
        type="submit"
        variante={acao === 'desfazer' ? 'destrutivo' : 'primario'}
        icone={acao === 'desfazer' ? 'excluir' : 'sincronizar'}
        carregando={enviando}
        disabled={Boolean(bloqueio)}
        className="sm:self-start"
      >
        {ROTULOS[acao].botao}
      </Button>
    </form>
  );
}
