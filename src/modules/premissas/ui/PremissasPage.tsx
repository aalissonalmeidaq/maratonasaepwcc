import { useId, useState, type ReactNode } from 'react';
import { gerarCsv, nomeDoArquivo } from '@/modules/relatorios';
import { Button, EmptyState, PageHeader, SelectField } from '@/shared/ui';
import { relatorioDasPremissas } from '../domain/linhasCsv';
import {
  agruparPorTema,
  contarPorSituacao,
  filtrarPremissas,
  pendentesEResolvidas,
  ROTULO_SITUACAO,
  type FiltroPremissas,
} from '../domain/situacao';
import { TEMAS, type CatalogoDePremissas, type Premissa } from '../domain/tipos';
import { CartaoPremissa } from './CartaoPremissa';

/** Oferece o CSV gerado no navegador, como os relatórios da spec 008. */
function baixarArquivo(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FILTRO_INICIAL: FiltroPremissas = { situacao: 'todas', tema: 'todos' };

/**
 * Premissas em validação (spec 015, contracts/telas.md): lista por tema com situação, filtros,
 * resumo, CSV e versão para impressão. `formulario` recebe cada premissa pendente e devolve o
 * formulário de resposta (só para o master).
 */
export function PremissasPage({
  catalogo,
  formulario,
  baixar = baixarArquivo,
  imprimir = () => window.print(),
}: {
  catalogo: CatalogoDePremissas;
  formulario?: (premissa: Premissa) => ReactNode;
  baixar?: (nome: string, conteudo: string) => void;
  imprimir?: () => void;
}) {
  const [filtro, setFiltro] = useState<FiltroPremissas>(FILTRO_INICIAL);
  const idResolvidas = useId();
  const total = contarPorSituacao(catalogo.premissas);
  const visiveis = filtrarPremissas(catalogo.premissas, filtro);
  const { resolvidas } = pendentesEResolvidas(catalogo.premissas);

  function imprimirTudo() {
    setFiltro(FILTRO_INICIAL);
    // Espera o React mostrar a lista completa antes de abrir a impressão.
    setTimeout(imprimir, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Premissas em validação"
        icone="checklist"
        descricao="Escolhas que o sistema adotou sem decisão da unidade. Responder não muda o sistema: cada mudança vira uma especificação."
        acoes={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              variante="secundario"
              icone="download"
              onClick={() =>
                baixar(
                  nomeDoArquivo('premissas', new Date()),
                  gerarCsv(relatorioDasPremissas(visiveis)),
                )
              }
            >
              Baixar lista (CSV)
            </Button>
            <Button variante="secundario" icone="documento" onClick={imprimirTudo}>
              Imprimir lista
            </Button>
          </div>
        }
      />

      <ul aria-label="Situação das premissas" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ['aguardando', 'Aguardando resposta'],
            ['confirmada', 'Confirmadas'],
            ['precisa_mudar', 'Precisam mudar'],
          ] as const
        ).map(([situacao, rotulo]) => (
          <li
            key={situacao}
            className="flex items-baseline justify-between rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="text-sm text-text-secondary">{rotulo}</span>
            <span className="font-display text-2xl font-bold text-text">{total[situacao]}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
        <SelectField
          rotulo="Situação"
          value={filtro.situacao}
          onChange={(e) =>
            setFiltro((f) => ({ ...f, situacao: e.target.value as FiltroPremissas['situacao'] }))
          }
          opcoes={[
            { valor: 'todas', rotulo: 'Todas' },
            ...(['aguardando', 'confirmada', 'precisa_mudar'] as const).map((s) => ({
              valor: s,
              rotulo: ROTULO_SITUACAO[s],
            })),
          ]}
        />
        <SelectField
          rotulo="Tema"
          value={filtro.tema}
          onChange={(e) =>
            setFiltro((f) => ({ ...f, tema: e.target.value as FiltroPremissas['tema'] }))
          }
          opcoes={[
            { valor: 'todos', rotulo: 'Todos' },
            ...TEMAS.map((t) => ({ valor: t, rotulo: t })),
          ]}
        />
      </div>

      {visiveis.length === 0 ? (
        catalogo.premissas.some((x) => !x.resolvidaPor) ? (
          <EmptyState titulo="Nenhuma premissa com esses filtros." icone="filtros" />
        ) : (
          <EmptyState titulo="Todas as premissas estão resolvidas." icone="checklist" />
        )
      ) : (
        agruparPorTema(visiveis).map((grupo) => (
          <section key={grupo.tema} className="flex flex-col gap-3" aria-label={grupo.tema}>
            <h2 className="font-display text-xl font-semibold text-text">{grupo.tema}</h2>
            {grupo.premissas.map((p) => (
              <CartaoPremissa key={p.codigo} premissa={p}>
                {catalogo.podeResponder && formulario?.(p)}
              </CartaoPremissa>
            ))}
          </section>
        ))
      )}

      {resolvidas.length > 0 && (
        <section aria-labelledby={idResolvidas} className="flex flex-col gap-3">
          <h2 id={idResolvidas} className="font-display text-xl font-semibold text-text">
            Resolvidas
          </h2>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-link">
              Mostrar {resolvidas.length} {resolvidas.length === 1 ? 'premissa' : 'premissas'}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {resolvidas.map((p) => (
                <CartaoPremissa key={p.codigo} premissa={p} />
              ))}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
