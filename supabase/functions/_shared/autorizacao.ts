// Autorização das Edge Functions de contas: a coordenação é verificada com o cliente SUJEITO À
// RLS de quem chama (só a coordenação ativa da edição enxerga a própria atribuição).

/** Parte do cliente Supabase usada aqui (evita depender dos tipos do Deno nos testes). */
export interface ClienteComRls {
  from(tabela: string): {
    select(colunas: string): {
      eq(coluna: string, valor: unknown): unknown;
    };
  };
}

interface ConsultaEncadeada {
  eq(coluna: string, valor: unknown): ConsultaEncadeada;
  maybeSingle(): Promise<{ data: unknown; error: unknown }>;
}

export async function coordenaAEdicao(
  cliente: ClienteComRls,
  usuarioId: string,
  edicaoId: string,
): Promise<'sim' | 'nao' | 'erro'> {
  const consulta = cliente.from('atribuicoes').select('id') as unknown as ConsultaEncadeada;
  const { data, error } = await consulta
    .eq('usuario_id', usuarioId)
    .eq('edicao_id', edicaoId)
    .eq('papel', 'coordenacao')
    .eq('ativo', true)
    .maybeSingle();
  if (error) return 'erro';
  return data ? 'sim' : 'nao';
}
