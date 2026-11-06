import { describe, expect, it } from 'vitest';
import { criarRedeDemo } from './rede';

describe('rede da demonstração (spec 016)', () => {
  it('duas unidades fictícias: a das contas de exemplo, com gestão, e outra sem gestão', async () => {
    const unidades = await criarRedeDemo().unidades();
    expect(unidades.map((u) => u.nome)).toEqual(['Unidade Fictícia A', 'Unidade Fictícia B']);
    expect(unidades[0]!.gestao.map((g) => g.nome)).toEqual(['Gestão da unidade (fictícia)']);
    expect(unidades[1]!.gestao).toEqual([]);
    expect(unidades.every((u) => u.ativa)).toBe(true);
  });

  it('um master fictício, com acesso ativo', async () => {
    const masters = await criarRedeDemo().masters();
    expect(masters).toHaveLength(1);
    expect(masters[0]).toMatchObject({
      nome: 'Master (fictício)',
      ativo: true,
      situacaoAcesso: 'ativo',
    });
  });

  it('nenhum e-mail real: só endereços .invalid', async () => {
    const r = criarRedeDemo();
    const emails = [
      ...(await r.unidades()).flatMap((u) => u.gestao.map((g) => g.email)),
      ...(await r.masters()).map((m) => m.email),
    ];
    expect(emails.length).toBeGreaterThan(0);
    expect(emails.every((e) => e.endsWith('.invalid'))).toBe(true);
  });

  it('toda escrita é recusada com a mensagem da demonstração', async () => {
    const r = criarRedeDemo();
    const recusas = [
      r.cadastrarUnidade('k', 'Unidade C'),
      r.renomearUnidade('u', 'Novo nome'),
      r.definirSituacaoUnidade('u', false, 'Encerramento do convênio.'),
      r.definirGestao('p', false, 'Troca de gestão da unidade.'),
      r.definirMaster('p', false, 'Saída da rede master.'),
      r.criarConta({ acao: 'master', nome: 'Ana', email: 'ana@exemplo.invalid' }),
      r.reenviarConvite('p'),
      r.definirFuncoes('p', ['docente'], 'Mudança de função.'),
      r.desativarMembro('p', 'Saída da equipe da unidade.'),
      r.reativarMembro('p'),
      r.criarEdicao({
        chave: 'k',
        nome: 'Maratona 2027',
        inicio: null,
        fim: null,
        coordenacaoId: 'p',
      }),
      r.definirCoordenacao('e', 'p', false, 'Troca da coordenação.'),
    ];
    for (const recusa of recusas) await expect(recusa).rejects.toThrow(/demonstração/);
  });

  it('equipe e edições fictícias da unidade, sem estudantes', async () => {
    const r = criarRedeDemo();
    const equipe = await r.equipe();
    expect(equipe.map((m) => m.nome)).toContain('Coordenação (fictícia)');
    expect(equipe.some((m) => m.funcoes.length === 0)).toBe(false);
    expect(equipe.every((m) => m.email.endsWith('.invalid'))).toBe(true);
    const edicoes = await r.edicoes();
    expect(edicoes.map((e) => e.estado)).toEqual(['ativa', 'encerrada']);
  });

  it('equipe fictícia só na unidade das contas de exemplo; a transferência é recusada (spec 019)', async () => {
    const r = criarRedeDemo();
    const [a, b] = await r.unidades();
    const equipe = await r.equipeDaUnidadeDaRede(a!.id);
    expect(equipe.length).toBeGreaterThan(0);
    expect(equipe.every((m) => m.email.endsWith('.invalid'))).toBe(true);
    expect(await r.equipeDaUnidadeDaRede(b!.id)).toEqual([]);
    await expect(
      r.transferirConta({
        chave: 'k',
        usuarioId: 'u-doc-a',
        unidadeOrigemId: a!.id,
        unidadeDestinoId: b!.id,
        justificativa: 'Mudança de unidade da docente.',
      }),
    ).rejects.toThrow(/demonstração/);
  });
});
