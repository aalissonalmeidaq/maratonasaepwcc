import { describe, expect, it, vi } from 'vitest';
import {
  autorizarPedido,
  processarPedido,
  validarPedidoDaRede,
  type ContaDeQuemChama,
  type Dependencias,
  type PedidoDaRede,
} from './contasDaRede';

const UNIDADE = '10000000-0000-0000-0000-0000000000b1';
const base = { nome: 'Ana Exemplo', email: 'ANA@exemplo.invalid' };

const master: ContaDeQuemChama = { master: true, unidade: null, funcoes: [] };
const gestao: ContaDeQuemChama = {
  master: false,
  unidade: { id: UNIDADE, nome: 'Unidade B', ativa: true },
  funcoes: ['gestao'],
};
const coordenacao: ContaDeQuemChama = { ...gestao, funcoes: ['coordenacao'] };

describe('pedido à Edge Function contas-da-rede (spec 016)', () => {
  it('master: nome e e-mail (minúsculas); nenhum campo de senha', () => {
    expect(validarPedidoDaRede({ acao: 'master', ...base })).toEqual({
      acao: 'master',
      nome: 'Ana Exemplo',
      email: 'ana@exemplo.invalid',
    });
    expect(validarPedidoDaRede({ acao: 'master', ...base, senhaProvisoria: 'x' })).toBe(
      'Campo não aceito: senhaProvisoria.',
    );
  });

  it('nome de 2 a 160 caracteres e e-mail válido', () => {
    expect(validarPedidoDaRede({ acao: 'master', nome: 'A', email: 'a@b.co' })).toBe(
      'Informe o nome (2 a 160 caracteres).',
    );
    expect(validarPedidoDaRede({ acao: 'master', nome: 'Ana', email: 'sem-arroba' })).toBe(
      'Informe um e-mail válido.',
    );
  });

  it('gestão exige a unidade', () => {
    expect(validarPedidoDaRede({ acao: 'gestao', ...base })).toBe('Unidade inválida.');
    expect(validarPedidoDaRede({ acao: 'gestao', ...base, unidadeId: UNIDADE })).toMatchObject({
      acao: 'gestao',
      unidadeId: UNIDADE,
    });
  });

  it('equipe: funções da lista, sem repetir e sem gestão', () => {
    expect(validarPedidoDaRede({ acao: 'equipe', ...base, funcoes: [] })).toBe(
      'Escolha ao menos uma função.',
    );
    expect(validarPedidoDaRede({ acao: 'equipe', ...base, funcoes: ['gestao'] })).toBe(
      'A função de gestão só o master concede.',
    );
    expect(validarPedidoDaRede({ acao: 'equipe', ...base, funcoes: ['padeiro'] })).toBe(
      'Função inválida.',
    );
    expect(
      validarPedidoDaRede({ acao: 'equipe', ...base, funcoes: ['docente', 'docente', 'mentor'] }),
    ).toMatchObject({ funcoes: ['docente', 'mentor'] });
  });

  it('reenviar: conta e novo e-mail opcional', () => {
    expect(validarPedidoDaRede({ acao: 'reenviar' })).toBe('Conta inválida.');
    expect(validarPedidoDaRede({ acao: 'reenviar', usuarioId: UNIDADE })).toEqual({
      acao: 'reenviar',
      usuarioId: UNIDADE,
      novoEmail: null,
    });
    expect(validarPedidoDaRede({ acao: 'reenviar', usuarioId: UNIDADE, novoEmail: 'x' })).toBe(
      'Informe um e-mail válido.',
    );
  });

  it('ação desconhecida e corpo inválido', () => {
    expect(validarPedidoDaRede({ acao: 'apagar' })).toBe('Ação inválida.');
    expect(validarPedidoDaRede(null)).toBe('Corpo da requisição inválido.');
  });
});

describe('autorização por ação (FR-002, FR-003, FR-005)', () => {
  const pedidoMaster: PedidoDaRede = { acao: 'master', nome: 'A', email: 'a@b.co' };
  const pedidoGestao: PedidoDaRede = {
    acao: 'gestao',
    nome: 'A',
    email: 'a@b.co',
    unidadeId: UNIDADE,
  };
  const pedidoEquipe: PedidoDaRede = {
    acao: 'equipe',
    nome: 'A',
    email: 'a@b.co',
    funcoes: ['docente'],
  };
  const pedidoReenvio: PedidoDaRede = { acao: 'reenviar', usuarioId: UNIDADE, novoEmail: null };

  it('master e gestão da unidade só pelo master', () => {
    expect(autorizarPedido(pedidoMaster, master)).toBe('ok');
    expect(autorizarPedido(pedidoGestao, master)).toBe('ok');
    expect(autorizarPedido(pedidoMaster, gestao)).toBe('Somente o master cadastra masters.');
    expect(autorizarPedido(pedidoGestao, gestao)).toBe(
      'Somente o master cadastra contas de gestão.',
    );
  });

  it('equipe só pela gestão da unidade ativa', () => {
    expect(autorizarPedido(pedidoEquipe, gestao)).toBe('ok');
    expect(autorizarPedido(pedidoEquipe, coordenacao)).toBe(
      'Somente a gestão da unidade cadastra a equipe.',
    );
    expect(autorizarPedido(pedidoEquipe, master)).toBe(
      'Somente a gestão da unidade cadastra a equipe.',
    );
    expect(
      autorizarPedido(pedidoEquipe, {
        ...gestao,
        unidade: { id: UNIDADE, nome: 'B', ativa: false },
      }),
    ).toBe('Somente a gestão da unidade cadastra a equipe.');
  });

  it('reenvio pelo master ou pela gestão', () => {
    expect(autorizarPedido(pedidoReenvio, master)).toBe('ok');
    expect(autorizarPedido(pedidoReenvio, gestao)).toBe('ok');
    expect(autorizarPedido(pedidoReenvio, coordenacao)).toBe(
      'Somente o master ou a gestão reenviam convites.',
    );
  });
});

function dependencias(extra: Partial<Dependencias> = {}): Dependencias & {
  chamadas: string[];
} {
  const chamadas: string[] = [];
  const registrar = <T>(nome: string, valor: T) =>
    vi.fn(async (...args: unknown[]) => {
      chamadas.push(`${nome}:${JSON.stringify(args)}`);
      return valor;
    });
  return {
    chamadas,
    criarConta: registrar('criarConta', { usuarioId: 'novo' }),
    removerConta: registrar('removerConta', undefined),
    conceder: registrar('conceder', null),
    enviarConvite: registrar('enviarConvite', true),
    localizarParaReenvio: registrar('localizar', { nome: 'Ana', email: 'a@b.co', ativo: false }),
    corrigirEmail: registrar('corrigirEmail', null),
    ...extra,
  } as never;
}

describe('execução do pedido, com compensação (FR-005, constituição V)', () => {
  const pedidoGestao: PedidoDaRede = {
    acao: 'gestao',
    nome: 'Ana',
    email: 'a@b.co',
    unidadeId: UNIDADE,
  };

  it('cria a conta com a unidade, concede a função como quem chama e envia o convite', async () => {
    const deps = dependencias();
    const r = await processarPedido(pedidoGestao, master, 'u0', deps);
    expect(r).toEqual({ status: 201, corpo: { usuarioId: 'novo', conviteEnviado: true } });
    expect(deps.criarConta).toHaveBeenCalledWith({
      email: 'a@b.co',
      metadados: { nome: 'Ana', unidade_id: UNIDADE },
    });
    expect(deps.conceder).toHaveBeenCalledWith({
      rpc: 'definir_gestao',
      args: { p_usuario: 'novo', p_ativa: true, p_justificativa: 'Cadastro da conta de gestão.' },
    });
    expect(deps.enviarConvite).toHaveBeenCalledOnce();
  });

  it('master nasce sem unidade e com a marca de master no cadastro', async () => {
    const deps = dependencias();
    await processarPedido({ acao: 'master', nome: 'Ana', email: 'a@b.co' }, master, 'u0', deps);
    expect(deps.criarConta).toHaveBeenCalledWith({
      email: 'a@b.co',
      metadados: { nome: 'Ana', master: true },
    });
    expect(deps.conceder).toHaveBeenCalledWith({
      rpc: 'definir_master',
      args: { p_usuario: 'novo', p_ativo: true, p_justificativa: 'Convite de master.' },
    });
  });

  it('equipe nasce na unidade de quem chama, com as funções pedidas', async () => {
    const deps = dependencias();
    await processarPedido(
      { acao: 'equipe', nome: 'Ana', email: 'a@b.co', funcoes: ['coordenacao', 'docente'] },
      gestao,
      'u0',
      deps,
    );
    expect(deps.criarConta).toHaveBeenCalledWith({
      email: 'a@b.co',
      metadados: { nome: 'Ana', unidade_id: UNIDADE },
    });
    expect(deps.conceder).toHaveBeenCalledWith({
      rpc: 'definir_funcoes',
      args: {
        p_usuario: 'novo',
        p_funcoes: ['coordenacao', 'docente'],
        p_justificativa: 'Cadastro da conta.',
      },
    });
  });

  it('sem permissão: 403 e nenhuma conta é criada', async () => {
    const deps = dependencias();
    const r = await processarPedido(pedidoGestao, gestao, 'u0', deps);
    expect(r.status).toBe(403);
    expect(deps.criarConta).not.toHaveBeenCalled();
  });

  it('e-mail já cadastrado: 409', async () => {
    const deps = dependencias({
      criarConta: vi.fn(async () => ({ erro: 'ja_existe' as const })),
    });
    const r = await processarPedido(pedidoGestao, master, 'u0', deps);
    expect(r).toEqual({ status: 409, corpo: { erro: 'Já existe uma conta com esse e-mail.' } });
    expect(deps.conceder).not.toHaveBeenCalled();
  });

  it('falha ao conceder a função: a conta criada é removida e o convite não sai', async () => {
    const deps = dependencias({ conceder: vi.fn(async () => 'A unidade não aceita.') });
    const r = await processarPedido(pedidoGestao, master, 'u0', deps);
    expect(r.status).toBe(400);
    expect(deps.removerConta).toHaveBeenCalledWith('novo');
    expect(deps.enviarConvite).not.toHaveBeenCalled();
  });

  it('falha no envio do convite não desfaz a conta: informa e permite reenviar', async () => {
    const deps = dependencias({ enviarConvite: vi.fn(async () => false) });
    const r = await processarPedido(pedidoGestao, master, 'u0', deps);
    expect(r).toEqual({ status: 201, corpo: { usuarioId: 'novo', conviteEnviado: false } });
    expect(deps.removerConta).not.toHaveBeenCalled();
  });

  it('reenviar: conta que já fez o primeiro acesso → 409; fora do alcance → 403', async () => {
    const reenviar: PedidoDaRede = { acao: 'reenviar', usuarioId: 'u9', novoEmail: null };
    let deps = dependencias({
      localizarParaReenvio: vi.fn(async () => ({ nome: 'Ana', email: 'a@b.co', ativo: true })),
    });
    expect((await processarPedido(reenviar, master, 'u0', deps)).status).toBe(409);
    deps = dependencias({ localizarParaReenvio: vi.fn(async () => null) });
    expect((await processarPedido(reenviar, gestao, 'u0', deps)).status).toBe(403);
    expect(deps.enviarConvite).not.toHaveBeenCalled();
  });

  it('falha ao desfazer a conta: não diz que nada foi criado', async () => {
    const deps = dependencias({
      conceder: vi.fn(async () => 'Recusado.'),
      removerConta: vi.fn(async () => {
        throw new Error('rede');
      }),
    });
    const r = await processarPedido(
      { acao: 'gestao', nome: 'G', email: 'g@b.co', unidadeId: 'un' },
      master,
      'u0',
      deps,
    );
    expect(r.status).toBe(500);
    expect(String(r.corpo.erro)).not.toContain('Nada foi criado');
  });

  it('reenviar: a gestão não mexe em conta de gestão; o master pode', async () => {
    const reenviar: PedidoDaRede = { acao: 'reenviar', usuarioId: 'u9', novoEmail: 'x@b.co' };
    const alvo = async () => ({ nome: 'Gê', email: 'g@b.co', ativo: false, gestao: true });
    let deps = dependencias({ localizarParaReenvio: vi.fn(alvo) });
    const recusa = await processarPedido(reenviar, gestao, 'u0', deps);
    expect(recusa.status).toBe(403);
    expect(deps.corrigirEmail).not.toHaveBeenCalled();
    deps = dependencias({ localizarParaReenvio: vi.fn(alvo) });
    expect((await processarPedido(reenviar, master, 'u0', deps)).status).toBe(200);
  });

  it('reenviar com correção de e-mail: corrige e envia ao novo endereço', async () => {
    const deps = dependencias();
    const r = await processarPedido(
      { acao: 'reenviar', usuarioId: 'u9', novoEmail: 'novo@b.co' },
      master,
      'u0',
      deps,
    );
    expect(r).toEqual({ status: 200, corpo: { conviteEnviado: true } });
    expect(deps.corrigirEmail).toHaveBeenCalledWith('u9', 'novo@b.co');
    expect(deps.enviarConvite).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 'u9', email: 'novo@b.co' }),
    );
  });
});
