import type { APIRequestContext } from '@playwright/test';

// Leitura da caixa de e-mail de teste do Supabase LOCAL (Mailpit). Recusa endereços não locais.
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:54424';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(MAILPIT)) {
  throw new Error(`E2E_MAILPIT_URL precisa ser local; recebido: ${MAILPIT}`);
}

interface Resumo {
  ID: string;
  Created: string;
}

/** Texto da mensagem mais recente para o destinatário (aguarda até ~10 s). */
export async function ultimoEmailPara(
  request: APIRequestContext,
  para: string,
  depoisDe?: Date,
): Promise<string> {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const r = await request.get(`${MAILPIT}/api/v1/search`, {
      params: { query: `to:"${para}"` },
    });
    const { messages } = (await r.json()) as { messages: Resumo[] };
    const recentes = messages.filter((m) => !depoisDe || new Date(m.Created) >= depoisDe);
    if (recentes.length) {
      const m = await request.get(`${MAILPIT}/api/v1/message/${recentes[0]!.ID}`);
      return ((await m.json()) as { Text: string }).Text;
    }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  throw new Error(`Nenhum e-mail para ${para} no Mailpit.`);
}

export function tokenDoConvite(texto: string): string {
  const m = /\/primeiro-acesso#t=([A-Za-z0-9_-]+)/.exec(texto);
  if (!m) throw new Error('O e-mail não contém o link de primeiro acesso.');
  return m[1]!;
}

export async function quantosEmailsPara(request: APIRequestContext, para: string) {
  const r = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${para}"` } });
  return ((await r.json()) as { messages: Resumo[] }).messages.length;
}
