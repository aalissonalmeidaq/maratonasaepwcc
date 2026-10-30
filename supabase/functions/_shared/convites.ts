// Convite de primeiro acesso (spec 002, FR-011): token aleatório que só existe no e-mail; o banco
// guarda apenas o hash. Usa só APIs web (crypto), então roda no Deno e nos testes do Vitest.

/** 32 bytes aleatórios em base64url (43 caracteres, sem preenchimento). */
export function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 em hexadecimal — é o que vai para `convites_acesso.token_hash`. */
export async function hashDoToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** O token vai no fragmento (#), que o navegador não envia ao servidor nem aos logs. */
export function linkDePrimeiroAcesso(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/+$/, '')}/primeiro-acesso#t=${token}`;
}
