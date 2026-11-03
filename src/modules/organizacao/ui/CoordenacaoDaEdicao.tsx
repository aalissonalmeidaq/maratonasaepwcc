import { useState, type FormEvent } from 'react';
import { Button, RetornoEnvio, TextField, useEnvio } from '@/shared/ui';
import type { PessoaParaVincular } from '../domain/cadastro';
import type { Vinculo } from '../domain/tipos';

/**
 * Coordenação da edição (US6, FR-014): ninguém altera a própria atribuição e a última coordenação
 * ativa não pode ser desativada; o servidor confere as duas regras de novo.
 */
export function CoordenacaoDaEdicao({
  vinculos,
  usuarioAtualId,
  onBuscar,
  onAtribuir,
  onDesativar,
  bloqueio,
}: {
  vinculos: Vinculo[];
  usuarioAtualId: string | null;
  onBuscar: (busca: string) => Promise<PessoaParaVincular[]>;
  onAtribuir: (usuarioId: string) => Promise<unknown>;
  onDesativar: (usuarioId: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const ativos = vinculos.filter((v) => v.papel === 'coordenacao' && v.ativo);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<PessoaParaVincular[]>([]);
  const envio = useEnvio();

  async function buscar(ev: FormEvent) {
    ev.preventDefault();
    try {
      setResultados(await onBuscar(busca));
    } catch {
      setResultados([]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {ativos.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">
              {v.nome}
              {v.usuarioId === usuarioAtualId && (
                <span className="font-normal text-text-secondary"> (você)</span>
              )}
            </span>
            {v.usuarioId !== usuarioAtualId && ativos.length > 1 && (
              <Button
                variante="secundario"
                icone="excluir"
                disabled={Boolean(bloqueio) || envio.enviando}
                onClick={() =>
                  void envio.enviar(
                    () => onDesativar(v.usuarioId),
                    `${v.nome} saiu da coordenação.`,
                  )
                }
                aria-label={`Desativar ${v.nome}`}
              >
                Desativar
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={buscar} className="flex flex-wrap items-end gap-2">
        <TextField
          rotulo="Buscar pessoa pelo nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Button type="submit" variante="secundario" icone="busca">
          Buscar
        </Button>
      </form>
      {resultados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {resultados.map((p) => (
            <li key={p.usuarioId} className="flex flex-wrap items-center justify-between gap-2">
              <span>{p.nome}</span>
              <Button
                icone="adicionar"
                disabled={Boolean(bloqueio) || envio.enviando}
                onClick={() =>
                  void envio.enviar(
                    () => onAtribuir(p.usuarioId),
                    `${p.nome} agora coordena a edição.`,
                  )
                }
                aria-label={`Adicionar ${p.nome} à coordenação`}
              >
                Adicionar
              </Button>
            </li>
          ))}
        </ul>
      )}
      <RetornoEnvio estado={envio.estado} />
    </div>
  );
}
