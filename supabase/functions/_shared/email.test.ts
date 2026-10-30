import { describe, expect, it, vi } from 'vitest';
import { criarEnviadorDeEmail, emailDeConvite } from './email.ts';

const ambiente =
  (valores: Record<string, string>) =>
  (nome: string): string | undefined =>
    valores[nome];

describe('envio de e-mail', () => {
  it('sem provedor configurado, recusa com mensagem clara', () => {
    expect(() => criarEnviadorDeEmail(ambiente({}))).toThrow('Envio de e-mail não configurado.');
  });

  it('envia pelo Mailpit (API HTTP local) com remetente e destinatário', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const enviador = criarEnviadorDeEmail(
      ambiente({
        EMAIL_PROVEDOR: 'mailpit',
        MAILPIT_URL: 'http://mailpit:8025/',
        EMAIL_REMETENTE: 'Maratona SAEP <nao-responda@exemplo.invalid>',
      }),
      fetchFalso,
    );
    await enviador.enviar({
      para: 'ana@exemplo.invalid',
      nomePara: 'Ana',
      assunto: 'Assunto',
      texto: 'Texto',
      html: '<p>Texto</p>',
    });
    expect(fetchFalso).toHaveBeenCalledOnce();
    const [url, opcoes] = fetchFalso.mock.calls[0]!;
    expect(url).toBe('http://mailpit:8025/api/v1/send');
    expect(JSON.parse(opcoes.body)).toEqual({
      From: { Email: 'nao-responda@exemplo.invalid', Name: 'Maratona SAEP' },
      To: [{ Email: 'ana@exemplo.invalid', Name: 'Ana' }],
      Subject: 'Assunto',
      Text: 'Texto',
      HTML: '<p>Texto</p>',
    });
  });

  it('falha do provedor vira erro (nunca sucesso silencioso)', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response('erro', { status: 500 }));
    const enviador = criarEnviadorDeEmail(
      ambiente({ EMAIL_PROVEDOR: 'mailpit', MAILPIT_URL: 'http://mailpit:8025' }),
      fetchFalso,
    );
    await expect(
      enviador.enviar({ para: 'a@exemplo.invalid', assunto: 'x', texto: 'x', html: 'x' }),
    ).rejects.toThrow('Falha no envio do e-mail (500).');
  });

  it('provedor desconhecido é recusado', () => {
    expect(() => criarEnviadorDeEmail(ambiente({ EMAIL_PROVEDOR: 'outro' }))).toThrow(
      'Provedor de e-mail não suportado: outro.',
    );
  });
});

describe('e-mail de convite', () => {
  it('traz o nome, o link e o prazo, com o nome escapado no HTML', () => {
    const m = emailDeConvite({
      nome: 'Ana <b>Exemplo</b>',
      link: 'http://x/primeiro-acesso#t=abc',
    });
    expect(m.assunto).toBe('Seu acesso à Maratona SAEP');
    expect(m.texto).toContain('http://x/primeiro-acesso#t=abc');
    expect(m.texto).toContain('7 dias');
    expect(m.html).toContain('Ana &lt;b&gt;Exemplo&lt;/b&gt;');
    expect(m.html).not.toContain('<b>Exemplo</b>');
  });
});
