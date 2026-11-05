import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { build } from 'vite';
/** Dois builds reais e servidor controlado pelo teste; nenhuma exclusão recursiva. */
export async function servidorAtualizacao() {
  const pastas = { a: resolve('dist-e2e-atualizacao-a'), b: resolve('dist-e2e-atualizacao-b') };
  const modoAnterior = process.env.VITE_DEMO_MODE;
  process.env.VITE_DEMO_MODE = 'true';
  try {
    for (const id of ['a', 'b'] as const)
      await build({
        build: { outDir: pastas[id] },
        plugins: [
          {
            name: 'identificar-build-e2e',
            transformIndexHtml: () => [
              { tag: 'meta', attrs: { name: 'maratona-build', content: id }, injectTo: 'head' },
            ],
          },
        ],
      });
  } finally {
    if (modoAnterior === undefined) delete process.env.VITE_DEMO_MODE;
    else process.env.VITE_DEMO_MODE = modoAnterior;
  }
  let atual: 'a' | 'b' = 'a';
  const mime: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  };
  const servidor = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
      const raiz = pastas[atual];
      const arquivo = resolve(raiz, '.' + pathname);
      if (arquivo !== raiz && !arquivo.startsWith(raiz + sep)) {
        res.writeHead(403).end();
        return;
      }
      const destino = extname(arquivo) ? arquivo : resolve(raiz, 'index.html');
      const body = await readFile(destino);
      res
        .writeHead(200, {
          'Content-Type': mime[extname(destino)] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        })
        .end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((ok) => servidor.listen(4177, '127.0.0.1', ok));
  return {
    publicarB: () => {
      atual = 'b';
    },
    fechar: async () => {
      servidor.closeAllConnections();
      await new Promise<void>((ok, fail) => servidor.close((e) => (e ? fail(e) : ok())));
    },
  };
}
