// Registra um convite de primeiro acesso (revogando o anterior) e envia o e-mail. Usado por
// criar-conta, reenviar-convite e importar-alunos. Depende do Deno (variáveis de ambiente).
import { gerarToken, hashDoToken, linkDePrimeiroAcesso } from './convites.ts';
import { criarEnviadorDeEmail, emailDeConvite } from './email.ts';

/** Devolve `false` (sem lançar) quando o registro ou o envio falham: quem chama informa. */
export async function enviarConvite(
  admin: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }> },
  dados: { usuarioId: string; edicaoId: string; criadoPor: string; nome: string; email: string },
): Promise<boolean> {
  try {
    const token = gerarToken();
    const { error } = await admin.rpc('registrar_convite', {
      p_usuario: dados.usuarioId,
      p_edicao: dados.edicaoId,
      p_token_hash: await hashDoToken(token),
      p_criado_por: dados.criadoPor,
    });
    if (error) return false;
    const link = linkDePrimeiroAcesso(Deno.env.get('APP_URL') ?? '', token);
    const mensagem = emailDeConvite({ nome: dados.nome, link });
    await criarEnviadorDeEmail((n) => Deno.env.get(n)).enviar({
      para: dados.email,
      nomePara: dados.nome,
      ...mensagem,
    });
    return true;
  } catch (e) {
    console.error('Falha ao enviar o convite:', e instanceof Error ? e.message : e);
    return false;
  }
}
