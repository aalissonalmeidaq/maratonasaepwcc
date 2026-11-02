import { useRef, useState, type FormEvent } from 'react';
import { EXTENSOES_ACEITAS, novaChaveDeEnvio, validarArquivo } from '@/modules/atividades';
import type { TipoOcorrencia } from '@/modules/pontuacao';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { RodapeDoFormulario, SelectField, TextAreaField, TextField, useEnvio } from '@/shared/ui';
import type { DadosOcorrencia } from '../domain/tipos';

type DadosDoFormulario = Omit<DadosOcorrencia, 'edicaoId'>;

const rotuloTipo = (t: TipoOcorrencia) =>
  'pontos' in t ? `${t.rotulo} (−${t.pontos})` : `${t.rotulo} (zera a entrega)`;

/**
 * Registro de ocorrência pela equipe docente da turma ou pela coordenação (US2, FR-005/006).
 * Os tipos vêm das regras da edição; a evidência em arquivo é opcional e vai para o bucket
 * privado antes do registro. A chave de envio torna a repetição segura.
 */
export function FormOcorrencia({
  equipes,
  encontros,
  desafios,
  tipos,
  onRegistrar,
  bloqueio,
}: {
  equipes: { id: string; nome: string }[];
  encontros: { id: string; rotulo: string }[];
  desafios: { id: string; titulo: string }[];
  tipos: TipoOcorrencia[];
  onRegistrar: (dados: DadosDoFormulario) => Promise<{ id: string; prazoManifestacao: string }>;
  bloqueio?: string;
}) {
  const vazio = {
    duplaId: equipes[0]?.id ?? '',
    encontroId: encontros[0]?.id ?? '',
    tipo: '',
    desafioId: '',
    fato: '',
    evidencia: '',
    fatoChave: '',
  };
  const [dados, setDados] = useState(vazio);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erros, setErros] = useState<Partial<Record<keyof typeof vazio | 'arquivo', string>>>({});
  const chave = useRef(novaChaveDeEnvio());
  const campoArquivo = useRef<HTMLInputElement>(null);
  const { estado, enviando, enviar } = useEnvio();

  const tipo = tipos.find((t) => t.id === dados.tipo);
  const exigeDesafio = Boolean(tipo && 'zeraEntrega' in tipo);
  const mudar = (parcial: Partial<typeof vazio>) => setDados((d) => ({ ...d, ...parcial }));

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const e: typeof erros = {};
    if (!dados.duplaId) e.duplaId = 'Escolha a equipe.';
    if (!dados.encontroId) e.encontroId = 'Escolha o encontro.';
    if (!tipo) e.tipo = 'Escolha o tipo previsto nas regras.';
    if (exigeDesafio && !dados.desafioId) e.desafioId = 'Escolha o desafio da entrega afetada.';
    if (dados.fato.trim().length < 10) e.fato = 'Descreva o fato com pelo menos 10 caracteres.';
    if (!dados.evidencia.trim()) e.evidencia = 'Descreva a evidência.';
    const problemaArquivo = arquivo ? validarArquivo(arquivo) : null;
    if (problemaArquivo) e.arquivo = problemaArquivo;
    setErros(e);
    if (Object.keys(e).length > 0) return;
    const ok = await enviar(
      () =>
        onRegistrar({
          chave: chave.current,
          duplaId: dados.duplaId,
          encontroId: dados.encontroId,
          tipo: dados.tipo,
          desafioId: exigeDesafio ? dados.desafioId : null,
          fato: dados.fato.trim(),
          evidencia: dados.evidencia.trim(),
          fatoChave: dados.fatoChave.trim() || null,
          arquivo,
        }),
      (r) =>
        `Ocorrência registrada. A equipe foi avisada e pode se manifestar até ${formatarDataHora(r.prazoManifestacao)}.`,
    );
    if (ok) {
      // Registro confirmado: o próximo é outra tentativa.
      chave.current = novaChaveDeEnvio();
      setDados((d) => ({ ...vazio, duplaId: d.duplaId, encontroId: d.encontroId }));
      setArquivo(null);
      if (campoArquivo.current) campoArquivo.current.value = '';
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <SelectField
        rotulo="Equipe"
        opcoes={equipes.map((e) => ({ valor: e.id, rotulo: e.nome }))}
        value={dados.duplaId}
        erro={erros.duplaId}
        onChange={(e) => mudar({ duplaId: e.target.value })}
      />
      <SelectField
        rotulo="Encontro"
        opcoes={encontros.map((e) => ({ valor: e.id, rotulo: e.rotulo }))}
        value={dados.encontroId}
        erro={erros.encontroId}
        onChange={(e) => mudar({ encontroId: e.target.value })}
      />
      <SelectField
        rotulo="Tipo"
        placeholder="Escolha o tipo"
        opcoes={tipos.map((t) => ({ valor: t.id, rotulo: rotuloTipo(t) }))}
        value={dados.tipo}
        erro={erros.tipo}
        onChange={(e) => mudar({ tipo: e.target.value })}
      />
      {exigeDesafio && (
        <SelectField
          rotulo="Desafio da entrega"
          placeholder="Escolha o desafio"
          opcoes={desafios.map((d) => ({ valor: d.id, rotulo: d.titulo }))}
          value={dados.desafioId}
          erro={erros.desafioId}
          onChange={(e) => mudar({ desafioId: e.target.value })}
        />
      )}
      <div className="sm:col-span-2">
        <TextAreaField
          rotulo="Fato"
          maxLength={4000}
          value={dados.fato}
          erro={erros.fato}
          onChange={(e) => mudar({ fato: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <TextAreaField
          rotulo="Evidência"
          dica="Descreva o que comprova o fato. O arquivo abaixo é opcional."
          maxLength={4000}
          value={dados.evidencia}
          erro={erros.evidencia}
          onChange={(e) => mudar({ evidencia: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="evidencia-arquivo" className="text-sm font-semibold">
          Arquivo de evidência (opcional)
        </label>
        <input
          ref={campoArquivo}
          id="evidencia-arquivo"
          type="file"
          accept={EXTENSOES_ACEITAS}
          aria-describedby="evidencia-arquivo-dica"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="min-h-11 text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:font-semibold"
        />
        <p id="evidencia-arquivo-dica" className="text-sm text-text-secondary">
          PDF, ZIP, PNG ou JPG, até 50 MB. Só a equipe, a equipe docente e a coordenação acessam.
        </p>
        {erros.arquivo && (
          <p role="alert" className="text-sm font-semibold text-error">
            {erros.arquivo}
          </p>
        )}
      </div>
      <TextField
        rotulo="Identificador do fato (opcional)"
        dica="Use o mesmo identificador em registros do mesmo fato: o desconto vale uma vez."
        maxLength={200}
        value={dados.fatoChave}
        onChange={(e) => mudar({ fatoChave: e.target.value })}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Registrar ocorrência"
        icone="ocorrencia"
      />
    </form>
  );
}
