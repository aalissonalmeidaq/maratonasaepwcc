import { useState, type FormEvent } from 'react';
import { Alert, RodapeDoFormulario, SelectField, useEnvio } from '@/shared/ui';
import { gerarCsv, nomeDoArquivo } from '../domain/csv';
import type { FiltrosRelatorio, Relatorio, TipoRelatorio } from '../domain/tipos';
import { plural } from './texto';

const TIPOS: { valor: TipoRelatorio; rotulo: string; soCoordenacao?: boolean }[] = [
  { valor: 'pontos', rotulo: 'Pontos por equipe e encontro' },
  { valor: 'presenca', rotulo: 'Presença por estudante e encontro' },
  { valor: 'entregas', rotulo: 'Entregas por equipe e desafio' },
  { valor: 'ocorrencias', rotulo: 'Ocorrências' },
  // A equipe docente não vê os pedidos de revisão nas telas (spec 007); o servidor também recusa.
  { valor: 'revisoes', rotulo: 'Pedidos de revisão', soCoordenacao: true },
];

/** Oferece o arquivo gerado no navegador, sem passar por cache (FR-012). */
function baixarArquivo(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  // Libera o objeto depois que o navegador começou o download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Filtros = Omit<FiltrosRelatorio, 'edicaoId'>;

/**
 * Exportação de relatórios CSV (US4). Os dados vêm autorizados do servidor; o arquivo só é
 * gerado depois da resposta (Constituição VII). A categoria é filtro só da coordenação.
 */
export function FormRelatorio({
  perfil,
  categorias,
  turmas,
  encontros,
  bloqueio,
  onExportar,
  baixar = baixarArquivo,
}: {
  /** `analista` (spec 016): a edição inteira, sem os pedidos de revisão. */
  perfil: 'coordenacao' | 'docente' | 'analista';
  categorias: string[];
  turmas: { id: string; nome: string }[];
  encontros: { id: string; rotulo: string }[];
  bloqueio?: string;
  onExportar: (tipo: TipoRelatorio, filtros: Filtros) => Promise<Relatorio>;
  baixar?: (nome: string, conteudo: string) => void;
}) {
  const [tipo, setTipo] = useState<TipoRelatorio>('pontos');
  const [categoria, setCategoria] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [encontroId, setEncontroId] = useState('');
  const { estado, enviando, enviar } = useEnvio();
  const coordenacao = perfil === 'coordenacao';
  const edicaoInteira = perfil !== 'docente';

  async function aoExportar(ev: FormEvent) {
    ev.preventDefault();
    if (bloqueio) return;
    await enviar(
      async () => {
        const relatorio = await onExportar(tipo, {
          categoria: coordenacao && categoria ? categoria : null,
          turmaId: turmaId || null,
          encontroId: encontroId || null,
        });
        baixar(nomeDoArquivo(tipo, new Date()), gerarCsv(relatorio));
        return relatorio;
      },
      (r) =>
        r.linhas.length === 0
          ? { alerta: 'Nenhum registro para os filtros escolhidos' }
          : `${plural(r.linhas.length, 'linha exportada', 'linhas exportadas')}.`,
    );
  }

  return (
    <form onSubmit={aoExportar} noValidate className="flex flex-col gap-4">
      <SelectField
        rotulo="Relatório"
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoRelatorio)}
        opcoes={TIPOS.filter((t) => coordenacao || !t.soCoordenacao).map((t) => ({
          valor: t.valor,
          rotulo: t.rotulo,
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {coordenacao && (
          <SelectField
            rotulo="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Todas as categorias"
            opcoes={categorias.map((c) => ({ valor: c, rotulo: c }))}
          />
        )}
        <SelectField
          rotulo="Turma"
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          placeholder={edicaoInteira ? 'Todas as turmas' : 'Todas as minhas turmas'}
          opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
        />
        <SelectField
          rotulo="Encontro"
          value={encontroId}
          onChange={(e) => setEncontroId(e.target.value)}
          placeholder="Todos os encontros"
          opcoes={encontros.map((e) => ({ valor: e.id, rotulo: e.rotulo }))}
        />
      </div>
      <Alert tom="info" titulo="Dados mínimos">
        Os relatórios não trazem nota individual da prova oficial, e-mail nem identificador de
        estudantes; o estudante aparece só pelo nome. Textos livres (fatos, evidências,
        manifestações e justificativas) continuam só nas telas. Cada exportação fica registrada.
      </Alert>
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Exportar CSV"
        icone="download"
      />
    </form>
  );
}
