// Envio de e-mail das Edge Functions (spec 002, research R2). Local: Mailpit pela API HTTP.
// O provedor de homologação/produção será outro adaptador, escolhido pela unidade.

export interface MensagemDeEmail {
  para: string;
  nomePara?: string;
  assunto: string;
  texto: string;
  html: string;
}

export interface EnviadorDeEmail {
  enviar(mensagem: MensagemDeEmail): Promise<void>;
}

type LerVariavel = (nome: string) => string | undefined;

function remetente(valor: string | undefined): { Email: string; Name: string } {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(valor ?? '');
  if (m) return { Name: m[1] ?? '', Email: m[2]! };
  return { Name: 'Maratona SAEP', Email: valor?.trim() || 'nao-responda@exemplo.invalid' };
}

export function criarEnviadorDeEmail(
  ler: LerVariavel,
  fetchFn: typeof fetch = fetch,
): EnviadorDeEmail {
  const provedor = ler('EMAIL_PROVEDOR');
  if (!provedor) throw new Error('Envio de e-mail não configurado.');
  if (provedor !== 'mailpit') throw new Error(`Provedor de e-mail não suportado: ${provedor}.`);

  const base = (ler('MAILPIT_URL') ?? '').replace(/\/+$/, '');
  if (!base) throw new Error('Envio de e-mail não configurado.');
  const de = remetente(ler('EMAIL_REMETENTE'));
  return {
    async enviar(m) {
      const resposta = await fetchFn(`${base}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          From: de,
          To: [{ Email: m.para, Name: m.nomePara ?? '' }],
          Subject: m.assunto,
          Text: m.texto,
          HTML: m.html,
        }),
      });
      if (!resposta.ok) throw new Error(`Falha no envio do e-mail (${resposta.status}).`);
    },
  };
}

const escapar = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' }[c]};`,
  );

/** Convite de primeiro acesso: só nome, link e prazo (nenhum outro dado pessoal). */
export function emailDeConvite({
  nome,
  link,
  prazoDias = 7,
}: {
  nome: string;
  link: string;
  prazoDias?: number;
}): Pick<MensagemDeEmail, 'assunto' | 'texto' | 'html'> {
  const assunto = 'Seu acesso à Maratona SAEP';
  const texto = [
    `Olá, ${nome}!`,
    '',
    'Sua conta na Maratona de Competências SAEP foi criada. Para entrar, crie a sua senha neste link:',
    link,
    '',
    `O link vale por ${prazoDias} dias e pode ser usado uma única vez. Se ele vencer, peça um novo à coordenação ou use “Esqueci minha senha” na tela de entrada.`,
    '',
    'Se você não esperava este e-mail, ignore-o.',
  ].join('\n');
  const html = `<p>Olá, ${escapar(nome)}!</p>
<p>Sua conta na Maratona de Competências SAEP foi criada. Para entrar, crie a sua senha:</p>
<p><a href="${escapar(link)}">Criar minha senha</a></p>
<p>O link vale por ${prazoDias} dias e pode ser usado uma única vez. Se ele vencer, peça um novo à coordenação ou use “Esqueci minha senha” na tela de entrada.</p>
<p>Se você não esperava este e-mail, ignore-o.</p>`;
  return { assunto, texto, html };
}
