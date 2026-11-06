// Lógica da Edge Function `contas-da-rede` (spec 016): contas de master, de gestão da unidade e
// da equipe da unidade, por convite. Sem dependências do runtime: testável no Vitest.
//
// Segurança (constituição V): a autorização vem da conta de quem chama (`minha_conta()`, lida com
// o cliente SUJEITO À RLS); a conta é criada com o cliente privilegiado, só no servidor; a função
// é concedida como quem chama (as RPCs reconferem a permissão e auditam); em falha, a conta
// criada é removida (compensação). Nenhuma senha passa por aqui: a pessoa cria a própria.

export const FUNCOES_DA_EQUIPE = ['coordenacao', 'docente', 'mentor', 'analista'] as const;
export type FuncaoDaEquipe = (typeof FUNCOES_DA_EQUIPE)[number];

export type PedidoDaRede =
  | { acao: 'master'; nome: string; email: string }
  | { acao: 'gestao'; nome: string; email: string; unidadeId: string }
  | { acao: 'equipe'; nome: string; email: string; funcoes: FuncaoDaEquipe[] }
  | { acao: 'reenviar'; usuarioId: string; novoEmail: string | null };

/** O que `minha_conta()` devolve sobre quem chama. */
export interface ContaDeQuemChama {
  master: boolean;
  unidade: { id: string; nome: string; ativa: boolean } | null;
  funcoes: string[];
}

const UUID = /^[0-9a-f-]{36}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarPedidoDaRede(corpo: unknown): PedidoDaRede | string {
  if (typeof corpo !== 'object' || corpo === null) return 'Corpo da requisição inválido.';
  const c = corpo as Record<string, unknown>;
  for (const proibido of ['senhaProvisoria', 'senha', 'password'])
    if (proibido in c) return `Campo não aceito: ${proibido}.`;
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  if (c.acao === 'reenviar') {
    const usuarioId = texto(c.usuarioId);
    if (!UUID.test(usuarioId)) return 'Conta inválida.';
    const novoEmail = texto(c.novoEmail).toLowerCase() || null;
    if (novoEmail && !EMAIL.test(novoEmail)) return 'Informe um e-mail válido.';
    return { acao: 'reenviar', usuarioId, novoEmail };
  }
  if (c.acao !== 'master' && c.acao !== 'gestao' && c.acao !== 'equipe') return 'Ação inválida.';

  const nome = texto(c.nome);
  const email = texto(c.email).toLowerCase();
  if (nome.length < 2 || nome.length > 160) return 'Informe o nome (2 a 160 caracteres).';
  if (!EMAIL.test(email)) return 'Informe um e-mail válido.';

  if (c.acao === 'master') return { acao: 'master', nome, email };
  if (c.acao === 'gestao') {
    const unidadeId = texto(c.unidadeId);
    if (!UUID.test(unidadeId)) return 'Unidade inválida.';
    return { acao: 'gestao', nome, email, unidadeId };
  }
  const pedidas = Array.isArray(c.funcoes) ? c.funcoes.map(texto) : [];
  if (pedidas.length === 0) return 'Escolha ao menos uma função.';
  if (pedidas.includes('gestao')) return 'A função de gestão só o master concede.';
  if (!pedidas.every((f) => (FUNCOES_DA_EQUIPE as readonly string[]).includes(f)))
    return 'Função inválida.';
  return { acao: 'equipe', nome, email, funcoes: [...new Set(pedidas)] as FuncaoDaEquipe[] };
}

/** `'ok'` ou a mensagem de recusa (403). */
export function autorizarPedido(pedido: PedidoDaRede, conta: ContaDeQuemChama): 'ok' | string {
  const gestaoAtiva = conta.funcoes.includes('gestao') && conta.unidade?.ativa === true;
  switch (pedido.acao) {
    case 'master':
      return conta.master ? 'ok' : 'Somente o master cadastra masters.';
    case 'gestao':
      return conta.master ? 'ok' : 'Somente o master cadastra contas de gestão.';
    case 'equipe':
      return gestaoAtiva && !conta.master ? 'ok' : 'Somente a gestão da unidade cadastra a equipe.';
    case 'reenviar':
      return conta.master || gestaoAtiva ? 'ok' : 'Somente o master ou a gestão reenviam convites.';
  }
}

export interface Resultado {
  status: number;
  corpo: Record<string, unknown>;
}

export interface Dependencias {
  /** Cria a conta no Auth (cliente privilegiado). `erro` quando o e-mail já existe ou falha. */
  criarConta(dados: {
    email: string;
    metadados: Record<string, unknown>;
  }): Promise<{ usuarioId: string } | { erro: 'ja_existe' | 'falha' }>;
  removerConta(usuarioId: string): Promise<void>;
  /** RPC como quem chama (RLS e auditoria valem). Devolve a mensagem de recusa, ou `null`. */
  conceder(chamada: { rpc: string; args: Record<string, unknown> }): Promise<string | null>;
  enviarConvite(dados: { usuarioId: string; nome: string; email: string }): Promise<boolean>;
  /** Conta ao alcance de quem chama (master: gestão e masters; gestão: a equipe), ou `null`. */
  localizarParaReenvio(
    usuarioId: string,
  ): Promise<{ nome: string; email: string; ativo: boolean; gestao?: boolean } | null>;
  corrigirEmail(usuarioId: string, email: string): Promise<'ok' | 'ja_existe' | 'falha'>;
}

function concessao(pedido: Exclude<PedidoDaRede, { acao: 'reenviar' }>, usuarioId: string) {
  switch (pedido.acao) {
    case 'master':
      return {
        rpc: 'definir_master',
        args: { p_usuario: usuarioId, p_ativo: true, p_justificativa: 'Convite de master.' },
      };
    case 'gestao':
      return {
        rpc: 'definir_gestao',
        args: {
          p_usuario: usuarioId,
          p_ativa: true,
          p_justificativa: 'Cadastro da conta de gestão.',
        },
      };
    case 'equipe':
      return {
        rpc: 'definir_funcoes',
        args: {
          p_usuario: usuarioId,
          p_funcoes: pedido.funcoes,
          p_justificativa: 'Cadastro da conta.',
        },
      };
  }
}

/** Metadados da conta: a unidade (ou a marca de master) vem no cadastro, lida pelo gatilho. */
function metadados(pedido: Exclude<PedidoDaRede, { acao: 'reenviar' }>, conta: ContaDeQuemChama) {
  if (pedido.acao === 'master') return { nome: pedido.nome, master: true };
  if (pedido.acao === 'gestao') return { nome: pedido.nome, unidade_id: pedido.unidadeId };
  return { nome: pedido.nome, unidade_id: conta.unidade?.id };
}

export async function processarPedido(
  pedido: PedidoDaRede,
  conta: ContaDeQuemChama,
  _quemChama: string,
  deps: Dependencias,
): Promise<Resultado> {
  const recusa = autorizarPedido(pedido, conta);
  if (recusa !== 'ok') return { status: 403, corpo: { erro: recusa } };

  if (pedido.acao === 'reenviar') {
    const alvo = await deps.localizarParaReenvio(pedido.usuarioId);
    if (!alvo) return { status: 403, corpo: { erro: 'Esta conta não está ao seu alcance.' } };
    // Contas de gestão só o master altera (como nas RPCs de desativar/reativar membro).
    if (alvo.gestao && !conta.master)
      return { status: 403, corpo: { erro: 'Contas de gestão só o master altera.' } };
    if (alvo.ativo)
      return { status: 409, corpo: { erro: 'Esta pessoa já fez o primeiro acesso.' } };
    let email = alvo.email;
    if (pedido.novoEmail) {
      const corrigido = await deps.corrigirEmail(pedido.usuarioId, pedido.novoEmail);
      if (corrigido === 'ja_existe')
        return { status: 409, corpo: { erro: 'Já existe uma conta com esse e-mail.' } };
      if (corrigido === 'falha')
        return { status: 400, corpo: { erro: 'Não foi possível corrigir o e-mail.' } };
      email = pedido.novoEmail;
    }
    const conviteEnviado = await deps.enviarConvite({
      usuarioId: pedido.usuarioId,
      nome: alvo.nome,
      email,
    });
    return { status: 200, corpo: { conviteEnviado } };
  }

  const criada = await deps.criarConta({
    email: pedido.email,
    metadados: metadados(pedido, conta),
  });
  if ('erro' in criada) {
    return criada.erro === 'ja_existe'
      ? { status: 409, corpo: { erro: 'Já existe uma conta com esse e-mail.' } }
      : { status: 400, corpo: { erro: 'Não foi possível criar a conta.' } };
  }

  const falha = await deps.conceder(concessao(pedido, criada.usuarioId));
  if (falha) {
    try {
      await deps.removerConta(criada.usuarioId);
    } catch {
      return {
        status: 500,
        corpo: { erro: `${falha} A conta ficou pendente: avise a administração do sistema.` },
      };
    }
    return { status: 400, corpo: { erro: `${falha} Nada foi criado.` } };
  }

  // Falha no envio não desfaz a conta: a resposta informa e o convite pode ser reenviado.
  const conviteEnviado = await deps.enviarConvite({
    usuarioId: criada.usuarioId,
    nome: pedido.nome,
    email: pedido.email,
  });
  return { status: 201, corpo: { usuarioId: criada.usuarioId, conviteEnviado } };
}
