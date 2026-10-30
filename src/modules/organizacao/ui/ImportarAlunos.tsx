import { useId, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Button,
  RetornoEnvio,
  ResponsiveTable,
  SelectField,
  cx,
  useEnvio,
} from '@/shared/ui';
import { estiloControle } from '@/shared/ui/campo';
import {
  LIMITE_DE_LINHAS,
  lerCsvDeAlunos,
  type LinhaDeImportacao,
  type ResultadoDaLeitura,
} from '../domain/importacao';
import type { ResultadoDaImportacao, Turma } from '../domain/tipos';

const contar = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/** Importação de alunos por CSV: prévia no navegador, gravação e relatório do servidor. */
export function ImportarAlunos({
  turmas,
  bloqueio,
  onImportar,
}: {
  turmas: Turma[];
  bloqueio?: string;
  onImportar: (turmaId: string, linhas: LinhaDeImportacao[]) => Promise<ResultadoDaImportacao>;
}) {
  const idArquivo = useId();
  const [turmaId, setTurmaId] = useState('');
  const [erroTurma, setErroTurma] = useState<string>();
  const [leitura, setLeitura] = useState<ResultadoDaLeitura | null>(null);
  const [relatorio, setRelatorio] = useState<ResultadoDaImportacao | null>(null);
  const [versao, setVersao] = useState(0);
  const { estado, enviando, enviar, limpar } = useEnvio();

  async function aoEscolherArquivo(ev: ChangeEvent<HTMLInputElement>) {
    const arquivo = ev.target.files?.[0];
    setRelatorio(null);
    limpar();
    setLeitura(arquivo ? lerCsvDeAlunos(await arquivo.text()) : null);
  }

  async function importar(validas: LinhaDeImportacao[]) {
    if (!turmaId) return setErroTurma('Selecione a turma.');
    setErroTurma(undefined);
    let resultado: ResultadoDaImportacao | undefined;
    await enviar(
      async () => {
        resultado = await onImportar(turmaId, validas);
        return resultado;
      },
      (r) => {
        const resumo = `Importação concluída: ${contar(r.criadas.length, 'conta criada', 'contas criadas')}, ${contar(r.vinculadas.length, 'vinculada', 'vinculadas')}, ${contar(r.recusadas.length, 'recusada', 'recusadas')}.`;
        const semConvite = r.criadas.filter((c) => !c.conviteEnviado).length;
        return semConvite
          ? {
              alerta: `${resumo} ${contar(semConvite, 'convite não foi enviado', 'convites não foram enviados')}. Use “Reenviar convite” em Pessoas e vínculos.`,
            }
          : resumo;
      },
    );
    if (resultado) setRelatorio(resultado);
  }

  function novaImportacao() {
    setLeitura(null);
    setRelatorio(null);
    limpar();
    setVersao((v) => v + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          rotulo="Turma"
          placeholder="Selecione"
          opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
          value={turmaId}
          onChange={(ev) => setTurmaId(ev.target.value)}
          erro={erroTurma}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor={idArquivo} className="text-sm font-semibold text-text">
            Arquivo CSV
          </label>
          <input
            key={versao}
            id={idArquivo}
            type="file"
            accept=".csv,text/csv"
            aria-describedby={`${idArquivo}-dica`}
            onChange={(ev) => void aoEscolherArquivo(ev)}
            className={cx(
              estiloControle,
              'border-gray-500 py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:font-semibold',
            )}
          />
          <p id={`${idArquivo}-dica`} className="text-sm text-text-secondary">
            Colunas: nome e e-mail (separadas por vírgula ou ponto e vírgula). Até{' '}
            {LIMITE_DE_LINHAS} alunos. Nada é gravado antes de você confirmar.
          </p>
        </div>
      </div>

      {leitura && !leitura.ok && <Alert tom="erro" titulo={leitura.erro} anunciar />}

      {leitura?.ok && !relatorio && (
        <>
          <p className="font-semibold text-text">
            {contar(leitura.validas.length, 'aluno pronto', 'alunos prontos')} para importar ·{' '}
            {contar(leitura.recusadas.length, 'linha recusada', 'linhas recusadas')}
          </p>
          {leitura.recusadas.length > 0 && (
            <ResponsiveTable
              legenda="Linhas recusadas na prévia"
              legendaVisivel
              chave={(r) => String(r.linha)}
              linhas={leitura.recusadas}
              colunas={[
                { id: 'l', titulo: 'Linha', valor: (r) => r.linha, compacta: true },
                { id: 'c', titulo: 'Conteúdo', valor: (r) => r.conteudo },
                { id: 'm', titulo: 'Motivo', valor: (r) => r.motivo },
              ]}
            />
          )}
          {leitura.validas.length > 0 && (
            <>
              <ResponsiveTable
                legenda="Alunos a importar"
                legendaVisivel
                chave={(l) => String(l.linha)}
                linhas={leitura.validas}
                colunas={[
                  { id: 'l', titulo: 'Linha', valor: (l) => l.linha, compacta: true },
                  { id: 'n', titulo: 'Nome', valor: (l) => l.nome },
                  { id: 'e', titulo: 'E-mail', valor: (l) => l.email },
                ]}
              />
              {bloqueio && <Alert tom="info" titulo={bloqueio} />}
              <RetornoEnvio estado={estado} />
              <Button
                icone="importar"
                className="self-start"
                carregando={enviando}
                disabled={Boolean(bloqueio)}
                onClick={() => void importar(leitura.validas)}
              >
                {`Importar ${contar(leitura.validas.length, 'aluno', 'alunos')}`}
              </Button>
            </>
          )}
        </>
      )}

      {relatorio && (
        <>
          <RetornoEnvio estado={estado} />
          {relatorio.recusadas.length > 0 && (
            <ResponsiveTable
              legenda="Linhas recusadas pelo servidor"
              legendaVisivel
              chave={(r) => String(r.linha)}
              linhas={relatorio.recusadas}
              colunas={[
                { id: 'l', titulo: 'Linha', valor: (r) => r.linha, compacta: true },
                { id: 'e', titulo: 'E-mail', valor: (r) => r.email },
                { id: 'm', titulo: 'Motivo', valor: (r) => r.motivo },
              ]}
            />
          )}
          <Button variante="secundario" className="self-start" onClick={novaImportacao}>
            Nova importação
          </Button>
        </>
      )}
    </div>
  );
}
