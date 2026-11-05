import type { LeituraDoRegulamento, RepositorioPublico } from '../domain/tipos';
import { regulamentoPublicoSchema } from '../domain/validacao';
import { lerCopia, salvarCopia } from './copiaLocal';
export async function lerRegulamento(
  repo: RepositorioPublico,
  chave: string,
  online = navigator.onLine,
): Promise<LeituraDoRegulamento> {
  const copia = () => {
    const c = lerCopia(chave);
    return c ? { origem: 'copia' as const, ...c } : { origem: 'sem-copia' as const };
  };
  if (!online) return copia();
  try {
    const conteudo = regulamentoPublicoSchema.parse(await repo.regulamentoPublico());
    const salvoEm = salvarCopia(chave, conteudo);
    return salvoEm
      ? { origem: 'servidor', conteudo, persistencia: 'salva', salvoEm }
      : { origem: 'servidor', conteudo, persistencia: 'falhou' };
  } catch (e) {
    if (e instanceof TypeError || !navigator.onLine) return copia();
    throw e;
  }
}
