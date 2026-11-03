import { useState, type FormEvent } from 'react';
import { GrupoDeMarcacao, novaChaveDeEnvio } from '@/modules/atividades';
import { Button, RetornoEnvio, SelectField, TextField, useEnvio } from '@/shared/ui';
import {
  validarEdicao,
  type EdicaoGerida,
  type EntradaEdicao,
  type ErrosDaEdicao,
} from '../domain/edicoes';

/**
 * Criação da edição (US1). A chave de envio fica a mesma nos reenvios, para o servidor gravar uma
 * só vez (FR-013); a mensagem de sucesso só aparece depois da resposta (Constituição VII).
 */
export function FormEdicao({
  basesPossiveis,
  onCriar,
  bloqueio,
}: {
  /** Edições que a pessoa coordena, de onde as regras podem ser copiadas. */
  basesPossiveis: EdicaoGerida[];
  onCriar: (chave: string, e: EntradaEdicao, baseEdicaoId: string | null) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [dados, setDados] = useState<EntradaEdicao>({ nome: '', inicio: null, fim: null });
  const [copiar, setCopiar] = useState(false);
  const [base, setBase] = useState('');
  const [erros, setErros] = useState<ErrosDaEdicao & { base?: string }>({});
  const [chave, setChave] = useState(novaChaveDeEnvio);
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const validacao: ErrosDaEdicao & { base?: string } = validarEdicao(dados);
    if (copiar && !base) validacao.base = 'Escolha a edição de origem das regras.';
    setErros(validacao);
    if (Object.keys(validacao).length) return;
    const entrada = { ...dados, nome: dados.nome.trim() };
    await enviar(async () => {
      const r = await onCriar(chave, entrada, copiar ? base : null);
      setChave(novaChaveDeEnvio());
      return r;
    }, 'Edição criada.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <TextField
        rotulo="Nome"
        value={dados.nome}
        onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
        erro={erros.nome}
        maxLength={160}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          rotulo="Início"
          type="date"
          value={dados.inicio ?? ''}
          onChange={(e) => setDados((d) => ({ ...d, inicio: e.target.value || null }))}
          erro={erros.inicio}
        />
        <TextField
          rotulo="Fim"
          type="date"
          value={dados.fim ?? ''}
          onChange={(e) => setDados((d) => ({ ...d, fim: e.target.value || null }))}
          erro={erros.fim}
        />
      </div>
      <GrupoDeMarcacao legenda="Regras da edição">
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="radio"
            name="base-regras"
            checked={!copiar}
            onChange={() => setCopiar(false)}
            className="size-5"
          />
          Regras do piloto (a confirmar)
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="radio"
            name="base-regras"
            checked={copiar}
            onChange={() => setCopiar(true)}
            disabled={basesPossiveis.length === 0}
            className="size-5"
          />
          Copiar de uma edição que coordeno
        </label>
      </GrupoDeMarcacao>
      {copiar && (
        <SelectField
          rotulo="Edição de origem"
          placeholder="Escolha"
          opcoes={basesPossiveis.map((b) => ({ valor: b.id, rotulo: b.nome }))}
          value={base}
          onChange={(e) => setBase(e.target.value)}
          erro={erros.base}
        />
      )}
      <RetornoEnvio estado={estado} />
      <div>
        <Button type="submit" icone="salvar" carregando={enviando} disabled={Boolean(bloqueio)}>
          Criar edição
        </Button>
      </div>
      {bloqueio && <p className="text-sm text-text-secondary">{bloqueio}</p>}
    </form>
  );
}

/** Nome e período da edição escolhida (FR-003); edição encerrada só pode ser lida (FR-012). */
export function FormDadosDaEdicao({
  edicao,
  onSalvar,
  bloqueio,
}: {
  edicao: EdicaoGerida;
  onSalvar: (e: EntradaEdicao) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [dados, setDados] = useState<EntradaEdicao>({
    nome: edicao.nome,
    inicio: edicao.inicio,
    fim: edicao.fim,
  });
  const [erros, setErros] = useState<ErrosDaEdicao>({});
  const { estado, enviando, enviar } = useEnvio();
  const encerrada = edicao.estado === 'encerrada';

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const validacao = validarEdicao(dados);
    setErros(validacao);
    if (Object.keys(validacao).length) return;
    await enviar(() => onSalvar({ ...dados, nome: dados.nome.trim() }), 'Dados da edição salvos.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <TextField
        rotulo="Nome"
        value={dados.nome}
        onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
        erro={erros.nome}
        maxLength={160}
        disabled={encerrada}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          rotulo="Início"
          type="date"
          value={dados.inicio ?? ''}
          onChange={(e) => setDados((d) => ({ ...d, inicio: e.target.value || null }))}
          erro={erros.inicio}
          disabled={encerrada}
        />
        <TextField
          rotulo="Fim"
          type="date"
          value={dados.fim ?? ''}
          onChange={(e) => setDados((d) => ({ ...d, fim: e.target.value || null }))}
          erro={erros.fim}
          disabled={encerrada}
        />
      </div>
      <RetornoEnvio estado={estado} />
      {!encerrada && (
        <div>
          <Button type="submit" icone="salvar" carregando={enviando} disabled={Boolean(bloqueio)}>
            Salvar dados
          </Button>
        </div>
      )}
    </form>
  );
}
